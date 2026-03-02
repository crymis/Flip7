import { Card } from '../types';
import { DECK_CONFIG } from '../constants';

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  let idCounter = 0;

  DECK_CONFIG.forEach((config) => {
    for (let i = 0; i < config.count; i++) {
      deck.push({
        id: `${config.type}-${config.value}-${idCounter++}`,
        type: config.type,
        value: config.value,
        label: config.label,
      });
    }
  });

  return shuffle(deck);
};

export const shuffle = <T,>(array: T[]): T[] => {
  const newArray = [...array];
  for (let i = newArray.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
  }
  return newArray;
};

export const calculateTurnScore = (cards: Card[]): number => {
  let score = 0;
  let multiplier = 1;
  const uniqueNumbers = new Set<number>();

  cards.forEach((card) => {
    if (card.type === 'number') {
      uniqueNumbers.add(card.value);
      score += card.value;
    } else if (card.type === 'modifier-add') {
      score += card.value;
    } else if (card.type === 'modifier-mult') {
      multiplier *= card.value;
    }
  });

  // Flip 7 Bonus: If 7 unique numbers are flipped
  if (uniqueNumbers.size >= 7) {
    score += 15;
  }

  return score * multiplier;
};
