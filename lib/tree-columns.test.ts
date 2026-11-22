import { describe, expect, it } from 'vitest';

import {
  type CheckIn,
  MAX_PRIORITIES,
  type Mission,
  type Objective,
  priorities,
  stateLines,
  whenLabel,
} from './tree-columns';

const obj = (text: string, position: number, done = false, list = 'today'): Objective => ({
  id: text,
  text,
  done,
  list,
  position,
});
const mission = (title: string, dueOn: string | null, completed = false): Mission => ({
  id: title,
  title,
  completed,
  dueOn,
  branch: null,
});
const checkIn = (over: Partial<CheckIn>): CheckIn => ({
  sliderValue: 50,
  emotionName: null,
  emotionColor: null,
  pulses: null,
  feelingCompass: null,
  createdAt: '2026-11-22T10:00:00Z',
  ...over,
});

describe('the G tree’s priorities column', () => {
  it('puts today’s open objectives first in their order, then open missions soonest due', () => {
    const p = priorities(
      [obj('call', 2), obj('write', 1), obj('done', 0, true), obj('later', 0, false, 'tomorrow')],
      [mission('no date', null), mission('soon', '2026-11-25'), mission('sooner', '2026-11-23')],
    );
    expect(p.map((x) => x.text)).toEqual(['write', 'call', 'sooner', 'soon', 'no date']);
    expect(p[0].when).toBe('today');
  });

  it('leaves out finished missions and stops at a column’s worth', () => {
    const many = Array.from({ length: 12 }, (_, i) => obj(`o${i}`, i));
    expect(priorities(many, [])).toHaveLength(MAX_PRIORITIES);
    expect(priorities([], [mission('done', null, true)])).toEqual([]);
  });

  it('says when, briefly', () => {
    expect(whenLabel('today')).toBe('today');
    expect(whenLabel('2026-11-30')).toBe('30 Nov');
    expect(whenLabel(null)).toBe('');
    expect(whenLabel('nonsense')).toBe('');
  });
});

describe('the G tree’s state column', () => {
  it('reads the newest check-in: mood, feeling, the named emotion and the body, in words', () => {
    const lines = stateLines([
      checkIn({ sliderValue: 10, createdAt: '2026-11-20T08:00:00Z' }),
      checkIn({
        sliderValue: 100,
        emotionName: 'Grateful',
        emotionColor: '#e2b04a',
        pulses: { body: 0 },
        feelingCompass: { emotions: 85 },
      }),
    ]);
    expect(lines.map((l) => `${l.label} ${l.word}`)).toEqual([
      'Mood Radiant',
      'Feeling Warm',
      'Emotion Grateful',
      'Body Disconnected',
    ]);
    expect(lines[2].colour).toBe('#e2b04a');
    expect(lines[2].level).toBeNull();
    expect(lines[0].level).toBe(1);
  });

  it('shows only what was written, and nothing before the first check-in', () => {
    expect(stateLines([]).length).toBe(0);
    expect(stateLines([checkIn({})]).map((l) => l.label)).toEqual(['Mood']);
  });
});
