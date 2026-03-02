import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  RotateCcw, 
  Users, 
  Play, 
  Hand, 
  AlertCircle, 
  CheckCircle2,
  ChevronRight,
  Info
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Card, Player, GameStatus, GameState } from './types';
import { createDeck, calculateTurnScore } from './utils/gameLogic';
import { TARGET_SCORE, FLIP_7_BONUS } from './constants';

const CardComponent = ({ card, isFlipped, isBusting }: { card: Card; isFlipped: boolean; isBusting?: boolean }) => {
  const getCardColor = (type: string, value: number) => {
    if (type !== 'number') return 'bg-indigo-600 text-white';
    if (value === 0) return 'bg-slate-800 text-white';
    if (value === 7) return 'bg-amber-500 text-white';
    if (value >= 10) return 'bg-rose-600 text-white';
    if (value >= 5) return 'bg-emerald-600 text-white';
    return 'bg-sky-600 text-white';
  };

  return (
    <motion.div
      layout
      initial={{ scale: 0.8, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      className={`relative w-24 h-36 sm:w-32 sm:h-48 rounded-xl card-shadow overflow-hidden ${isBusting ? 'ring-4 ring-red-500 ring-offset-2' : ''}`}
    >
      <div className={`absolute inset-0 flex flex-col items-center justify-center p-4 text-center ${getCardColor(card.type, card.value)}`}>
        <span className="text-xs font-mono uppercase tracking-widest opacity-70 mb-2">
          {card.type === 'number' ? 'Value' : 'Special'}
        </span>
        <span className="text-3xl sm:text-4xl font-display font-bold">
          {card.label}
        </span>
        {card.type === 'flip3' && <span className="text-[10px] mt-2 leading-tight">Draw 3 more cards automatically</span>}
        {card.type === 'second-chance' && <span className="text-[10px] mt-2 leading-tight">Discard next duplicate</span>}
        {card.type === 'double' && <span className="text-[10px] mt-2 leading-tight">Double points this turn</span>}
      </div>
    </motion.div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>({
    players: [],
    currentPlayerIndex: 0,
    deck: [],
    currentTurnCards: [],
    status: 'setup',
    winner: null,
    hasSecondChance: false,
    isFlip3Active: false,
    flip3Count: 0,
  });

  const [playerCount, setPlayerCount] = useState(2);
  const [playerNames, setPlayerNames] = useState(['Player 1', 'Player 2', 'Player 3', 'Player 4']);

  const startGame = () => {
    const players: Player[] = Array.from({ length: playerCount }).map((_, i) => ({
      id: i,
      name: playerNames[i] || `Player ${i + 1}`,
      score: 0,
      isEliminated: false,
    }));

    setGameState({
      players,
      currentPlayerIndex: 0,
      deck: createDeck(),
      currentTurnCards: [],
      status: 'playing',
      winner: null,
      hasSecondChance: false,
      isFlip3Active: false,
      flip3Count: 0,
    });
  };

  const nextTurn = useCallback(() => {
    setGameState(prev => {
      const nextIndex = (prev.currentPlayerIndex + 1) % prev.players.length;
      return {
        ...prev,
        currentPlayerIndex: nextIndex,
        currentTurnCards: [],
        status: 'playing',
        hasSecondChance: false,
        isFlip3Active: false,
        flip3Count: 0,
      };
    });
  }, []);

  const checkWinCondition = useCallback((players: Player[]) => {
    const winner = players.find(p => p.score >= TARGET_SCORE);
    if (winner) {
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 }
      });
      return winner;
    }
    return null;
  }, []);

  const stay = () => {
    const turnScore = calculateTurnScore(gameState.currentTurnCards);
    const updatedPlayers = gameState.players.map((p, i) => 
      i === gameState.currentPlayerIndex ? { ...p, score: p.score + turnScore } : p
    );

    const winner = checkWinCondition(updatedPlayers);

    setGameState(prev => ({
      ...prev,
      players: updatedPlayers,
      status: winner ? 'gameover' : 'stayed',
      winner,
    }));
  };

  const flip = useCallback(() => {
    if (gameState.status !== 'playing' && !gameState.isFlip3Active) return;

    setGameState(prev => {
      if (prev.deck.length === 0) {
        // Reshuffle discard pile if deck is empty (simplified: just new deck)
        prev.deck = createDeck();
      }

      const newDeck = [...prev.deck];
      const drawnCard = newDeck.pop()!;
      const newTurnCards = [...prev.currentTurnCards, drawnCard];

      // Check for bust
      const isDuplicate = drawnCard.type === 'number' && 
        prev.currentTurnCards.some(c => c.type === 'number' && c.value === drawnCard.value);

      if (isDuplicate) {
        if (prev.hasSecondChance) {
          // Use second chance: remove the duplicate card and continue
          return {
            ...prev,
            deck: newDeck,
            currentTurnCards: prev.currentTurnCards, // Don't add the duplicate
            hasSecondChance: false,
          };
        } else {
          // BUST
          return {
            ...prev,
            deck: newDeck,
            currentTurnCards: newTurnCards,
            status: 'busted',
            isFlip3Active: false,
            flip3Count: 0,
          };
        }
      }

      // Handle special cards
      let newHasSecondChance = prev.hasSecondChance;
      let newIsFlip3Active = prev.isFlip3Active;
      let newFlip3Count = prev.flip3Count;

      if (drawnCard.type === 'second-chance') {
        newHasSecondChance = true;
      }

      if (drawnCard.type === 'flip3') {
        newIsFlip3Active = true;
        newFlip3Count = 3;
      }

      if (newIsFlip3Active) {
        newFlip3Count--;
        if (newFlip3Count <= 0) {
          newIsFlip3Active = false;
        }
      }

      // Check for Flip 7 (7 unique numbers)
      const uniqueNumbers = new Set(newTurnCards.filter(c => c.type === 'number').map(c => c.value));
      if (uniqueNumbers.size >= 7) {
        // Auto-stay with bonus
        const turnScore = calculateTurnScore(newTurnCards);
        const updatedPlayers = prev.players.map((p, i) => 
          i === prev.currentPlayerIndex ? { ...p, score: p.score + turnScore } : p
        );
        const winner = checkWinCondition(updatedPlayers);
        
        return {
          ...prev,
          players: updatedPlayers,
          deck: newDeck,
          currentTurnCards: newTurnCards,
          status: winner ? 'gameover' : 'stayed',
          winner,
          isFlip3Active: false,
          flip3Count: 0,
        };
      }

      return {
        ...prev,
        deck: newDeck,
        currentTurnCards: newTurnCards,
        hasSecondChance: newHasSecondChance,
        isFlip3Active: newIsFlip3Active,
        flip3Count: newFlip3Count,
      };
    });
  }, [gameState.status, gameState.isFlip3Active, checkWinCondition]);

  // Auto-flip for Flip 3
  useEffect(() => {
    if (gameState.isFlip3Active && (gameState.status === 'playing' || gameState.status === 'busted' || gameState.status === 'stayed')) {
      const timer = setTimeout(() => {
        if (gameState.status === 'playing') {
          flip();
        }
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [gameState.isFlip3Active, gameState.status, flip]);

  const currentPlayer = gameState.players[gameState.currentPlayerIndex];
  const currentTurnScore = calculateTurnScore(gameState.currentTurnCards);
  const uniqueCount = new Set(gameState.currentTurnCards.filter(c => c.type === 'number').map(c => c.value)).size;

  if (gameState.status === 'setup') {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white rounded-3xl p-8 shadow-2xl border border-black/5"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg rotate-3">
              <span className="text-4xl font-display font-black text-white">7</span>
            </div>
            <h1 className="text-4xl font-display font-bold tracking-tight mb-2">FLIP 7</h1>
            <p className="text-slate-500 text-sm">Strategic push-your-luck card game</p>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-mono uppercase tracking-widest text-slate-400 mb-3">
                Number of Players
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[2, 3, 4].map(num => (
                  <button
                    key={num}
                    onClick={() => setPlayerCount(num)}
                    className={`py-3 rounded-xl font-display font-bold transition-all ${
                      playerCount === num 
                        ? 'bg-amber-500 text-white shadow-md scale-105' 
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {num} Players
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <label className="block text-xs font-mono uppercase tracking-widest text-slate-400">
                Player Names
              </label>
              {Array.from({ length: playerCount }).map((_, i) => (
                <div key={i} className="relative">
                  <Users className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    value={playerNames[i]}
                    onChange={(e) => {
                      const newNames = [...playerNames];
                      newNames[i] = e.target.value;
                      setPlayerNames(newNames);
                    }}
                    placeholder={`Player ${i + 1}`}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 focus:ring-2 focus:ring-amber-500 focus:border-transparent outline-none transition-all"
                  />
                </div>
              ))}
            </div>

            <button
              onClick={startGame}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
            >
              <Play className="w-5 h-5 fill-current" />
              Start Game
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="flex items-start gap-3 text-slate-500 text-xs leading-relaxed">
              <Info className="w-4 h-4 mt-0.5 flex-shrink-0" />
              <p>
                Flip cards one by one. If you flip a duplicate number, you bust! 
                Stay to bank your points. Reach {TARGET_SCORE} to win. 
                Flip 7 unique numbers for a {FLIP_7_BONUS}pt bonus!
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f5f5f0]">
      {/* Header / Scoreboard */}
      <header className="bg-white border-b border-black/5 p-4 sticky top-0 z-10 shadow-sm">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 bg-amber-500 rounded-lg flex items-center justify-center shadow-md rotate-3">
              <span className="text-xl font-display font-black text-white">7</span>
            </div>
            <h1 className="text-xl font-display font-bold hidden sm:block">FLIP 7</h1>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 sm:pb-0 px-2">
            {gameState.players.map((player, i) => (
              <div 
                key={player.id}
                className={`flex flex-col items-center px-4 py-2 rounded-xl border transition-all min-w-[100px] ${
                  i === gameState.currentPlayerIndex 
                    ? 'bg-slate-900 border-slate-900 text-white shadow-lg scale-105' 
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <span className="text-[10px] font-mono uppercase tracking-tighter opacity-70">
                  {player.name}
                </span>
                <span className="text-lg font-display font-bold">
                  {player.score}
                </span>
                <div className="w-full h-1 bg-slate-200 rounded-full mt-1 overflow-hidden">
                  <div 
                    className={`h-full transition-all duration-500 ${i === gameState.currentPlayerIndex ? 'bg-amber-400' : 'bg-slate-400'}`}
                    style={{ width: `${Math.min(100, (player.score / TARGET_SCORE) * 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>

          <button 
            onClick={() => setGameState(prev => ({ ...prev, status: 'setup' }))}
            className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
            title="Reset Game"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* Main Game Area */}
      <main className="flex-1 flex flex-col items-center justify-center p-6 max-w-6xl mx-auto w-full">
        <div className="w-full flex flex-col items-center gap-8">
          {/* Turn Status */}
          <div className="text-center">
            <motion.div
              key={gameState.currentPlayerIndex}
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-100 text-amber-800 rounded-full text-sm font-bold mb-2"
            >
              <Users className="w-4 h-4" />
              {currentPlayer.name}'s Turn
            </motion.div>
            
            <div className="flex items-center justify-center gap-8 mt-4">
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Turn Score</span>
                <span className="text-4xl font-display font-black text-slate-900">{currentTurnScore}</span>
              </div>
              <div className="w-px h-10 bg-slate-200" />
              <div className="flex flex-col items-center">
                <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400">Unique Cards</span>
                <div className="flex items-center gap-1">
                  <span className="text-4xl font-display font-black text-slate-900">{uniqueCount}</span>
                  <span className="text-xl font-display font-bold text-slate-300">/ 7</span>
                </div>
              </div>
            </div>
          </div>

          {/* Cards Display */}
          <div className="flex flex-wrap justify-center gap-4 min-h-[200px] sm:min-h-[250px] w-full py-8">
            <AnimatePresence mode="popLayout">
              {gameState.currentTurnCards.length === 0 ? (
                <motion.div 
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-3xl w-32 h-48 sm:w-40 sm:h-56"
                >
                  <Hand className="w-12 h-12 mb-2 opacity-20" />
                  <span className="text-xs font-bold uppercase tracking-widest opacity-40">Flip to Start</span>
                </motion.div>
              ) : (
                gameState.currentTurnCards.map((card, idx) => {
                  const isBustingCard = gameState.status === 'busted' && idx === gameState.currentTurnCards.length - 1;
                  return (
                    <CardComponent 
                      key={card.id} 
                      card={card} 
                      isFlipped={true} 
                      isBusting={isBustingCard}
                    />
                  );
                })
              )}
            </AnimatePresence>
          </div>

          {/* Active Buffs */}
          <div className="flex gap-3">
            {gameState.hasSecondChance && (
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="flex items-center gap-2 px-3 py-1 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold border border-emerald-200"
              >
                <CheckCircle2 className="w-3 h-3" />
                Second Chance Active
              </motion.div>
            )}
            {gameState.isFlip3Active && (
              <motion.div 
                initial={{ scale: 0 }} animate={{ scale: 1 }}
                className="flex items-center gap-2 px-3 py-1 bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold border border-indigo-200 animate-pulse"
              >
                <AlertCircle className="w-3 h-3" />
                Flipping 3 Cards... ({gameState.flip3Count} left)
              </motion.div>
            )}
          </div>
        </div>
      </main>

      {/* Controls */}
      <footer className="p-6 bg-white border-t border-black/5 sticky bottom-0">
        <div className="max-w-md mx-auto flex gap-4">
          {gameState.status === 'playing' ? (
            <>
              <button
                onClick={stay}
                disabled={gameState.currentTurnCards.length === 0 || gameState.isFlip3Active}
                className="flex-1 bg-slate-100 text-slate-900 py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-200 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Hand className="w-5 h-5" />
                Stay
              </button>
              <button
                onClick={flip}
                disabled={gameState.isFlip3Active}
                className="flex-[2] bg-amber-500 text-white py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 hover:bg-amber-600 transition-all shadow-lg shadow-amber-200 active:scale-95 disabled:opacity-50"
              >
                <RotateCcw className="w-5 h-5 rotate-180" />
                Flip Card
              </button>
            </>
          ) : (
            <button
              onClick={nextTurn}
              className="w-full bg-slate-900 text-white py-4 rounded-2xl font-display font-bold text-lg flex items-center justify-center gap-2 hover:bg-slate-800 transition-all shadow-xl active:scale-95"
            >
              Next Player
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </footer>

      {/* Modals */}
      <AnimatePresence>
        {gameState.status === 'busted' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <AlertCircle className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-display font-bold mb-2">BUSTED!</h2>
              <p className="text-slate-500 mb-8">You flipped a duplicate number and lost all points this turn.</p>
              <button
                onClick={nextTurn}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-display font-bold text-lg hover:bg-slate-800 transition-all"
              >
                Next Player
              </button>
            </motion.div>
          </motion.div>
        )}

        {gameState.status === 'stayed' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/60 backdrop-blur-sm"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl"
            >
              <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <CheckCircle2 className="w-10 h-10" />
              </div>
              <h2 className="text-3xl font-display font-bold mb-2">BANKED!</h2>
              <p className="text-slate-500 mb-2">You successfully banked your points.</p>
              <div className="text-4xl font-display font-black text-slate-900 mb-8">+{currentTurnScore}</div>
              <button
                onClick={nextTurn}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-display font-bold text-lg hover:bg-slate-800 transition-all"
              >
                Next Player
              </button>
            </motion.div>
          </motion.div>
        )}

        {gameState.status === 'gameover' && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/80 backdrop-blur-md"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }}
              className="bg-white rounded-3xl p-10 max-w-md w-full text-center shadow-2xl border-4 border-amber-400"
            >
              <div className="w-24 h-24 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <Trophy className="w-12 h-12" />
              </div>
              <h2 className="text-4xl font-display font-bold mb-2">WE HAVE A WINNER!</h2>
              <p className="text-slate-500 mb-6 font-medium">Congratulations to the champion</p>
              <div className="text-5xl font-display font-black text-slate-900 mb-4">{gameState.winner?.name}</div>
              <div className="text-2xl font-display font-bold text-amber-600 mb-10">Final Score: {gameState.winner?.score}</div>
              
              <button
                onClick={() => setGameState(prev => ({ ...prev, status: 'setup' }))}
                className="w-full bg-slate-900 text-white py-4 rounded-2xl font-display font-bold text-lg hover:bg-slate-800 transition-all shadow-xl"
              >
                Play Again
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
