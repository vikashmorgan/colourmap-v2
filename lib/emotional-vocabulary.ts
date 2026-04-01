const EMOTIONAL_RANGES = [
  { max: 12, word: 'Crushed' },
  { max: 25, word: 'Heavy' },
  { max: 37, word: 'Stuck' },
  { max: 50, word: 'Still' },
  { max: 62, word: 'Steady' },
  { max: 75, word: 'Open' },
  { max: 87, word: 'Alive' },
  { max: 100, word: 'Expansive' },
] as const;

export type EmotionalWord = (typeof EMOTIONAL_RANGES)[number]['word'];

export function getEmotionalWord(value: number): EmotionalWord {
  for (const range of EMOTIONAL_RANGES) {
    if (value <= range.max) return range.word;
  }
  return 'Expansive';
}
