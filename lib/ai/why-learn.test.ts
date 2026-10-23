import { describe, expect, it } from 'vitest';

import { WHY_LEARN_LINE, WHY_LEARN_NOTES, WHY_LEARN_TITLE } from './why-learn';

describe('why learn the real tools', () => {
  it('keeps the notes in order, from cheap mediocrity to the real tools', () => {
    expect(WHY_LEARN_TITLE).toBe('Why learn the real tools');
    expect(WHY_LEARN_NOTES[0].title).toBe('AI made mediocrity cheaper');
    expect(WHY_LEARN_NOTES.at(-1)?.title).toBe('So we learn the real tools');
    expect(WHY_LEARN_LINE).toMatch(/coding and SQL/);
  });

  it('has unique, non-empty notes', () => {
    expect(new Set(WHY_LEARN_NOTES.map((n) => n.id)).size).toBe(WHY_LEARN_NOTES.length);
    for (const n of WHY_LEARN_NOTES) {
      expect(n.title.length).toBeGreaterThan(0);
      expect(n.body.length).toBeGreaterThan(0);
    }
  });

  it('says the heart of it: assumptions add up, and the art is to challenge the code', () => {
    const all = WHY_LEARN_NOTES.map((n) => `${n.title} ${n.body}`).join(' ');
    expect(all).toMatch(/assumptions add up/);
    expect(all).toMatch(/subconscious assumptions/);
    expect(all).toMatch(/challenge the code/);
  });
});
