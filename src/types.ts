
export type CardType = 'number' | 'flip3' | 'second-chance' | 'double';

export interface Card {
  id: string;
  type: CardType;
  value: number; // 0-12 for numbers, 0 for specials
  label: string;
}

export interface Player {
  id: number;
  name: string;
  score: number;
  isEliminated: boolean;
}

export type GameStatus = 'setup' | 'playing' | 'busted' | 'stayed' | 'gameover';

export interface GameState {
  players: Player[];
  currentPlayerIndex: number;
  deck: Card[];
  currentTurnCards: Card[];
  status: GameStatus;
  winner: Player | null;
  hasSecondChance: boolean;
  isFlip3Active: boolean;
  flip3Count: number;
}
