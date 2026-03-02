import { Card, CardType } from './types';

export const DECK_CONFIG: { type: CardType; value: number; count: number; label: string }[] = [
  { type: 'number', value: 0, count: 3, label: '0' },
  { type: 'number', value: 1, count: 1, label: '1' },
  { type: 'number', value: 2, count: 2, label: '2' },
  { type: 'number', value: 3, count: 3, label: '3' },
  { type: 'number', value: 4, count: 4, label: '4' },
  { type: 'number', value: 5, count: 5, label: '5' },
  { type: 'number', value: 6, count: 6, label: '6' },
  { type: 'number', value: 7, count: 7, label: '7' },
  { type: 'number', value: 8, count: 8, label: '8' },
  { type: 'number', value: 9, count: 9, label: '9' },
  { type: 'number', value: 10, count: 10, label: '10' },
  { type: 'number', value: 11, count: 11, label: '11' },
  { type: 'number', value: 12, count: 12, label: '12' },
  { type: 'flip3', value: 0, count: 3, label: 'Flip 3' },
  { type: 'second-chance', value: 0, count: 2, label: 'Second Chance' },
  { type: 'double', value: 0, count: 2, label: 'Double' },
];

export const TARGET_SCORE = 200;
export const FLIP_7_BONUS = 15;
