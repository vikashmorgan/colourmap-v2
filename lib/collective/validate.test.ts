import { describe, expect, it } from 'vitest';

import { DEMO_MEMBERS } from './model';
import { parseAsk } from './validate';

describe('parseAsk', () => {
  it('accepts profiles and a question', () => {
    const r = parseAsk({ members: DEMO_MEMBERS.slice(0, 2), question: '  Why us? ' });
    expect(r).toEqual({
      ok: true,
      value: { members: DEMO_MEMBERS.slice(0, 2), question: 'Why us?' },
    });
  });

  it('rejects bad input with a reason', () => {
    expect(parseAsk(null)).toEqual({ ok: false, error: 'Invalid input' });
    expect(parseAsk({ members: DEMO_MEMBERS, question: '' })).toMatchObject({ ok: false });
    expect(parseAsk({ members: DEMO_MEMBERS, question: 'x'.repeat(601) })).toEqual({
      ok: false,
      error: 'Question too long',
    });
    expect(parseAsk({ members: [], question: 'q' })).toEqual({
      ok: false,
      error: 'Pick at least one person',
    });
    expect(parseAsk({ members: Array(14).fill(DEMO_MEMBERS[0]), question: 'q' })).toEqual({
      ok: false,
      error: 'Too many people',
    });
    expect(parseAsk({ members: [{ name: '' }], question: 'q' })).toEqual({
      ok: false,
      error: 'Invalid person',
    });
    expect(parseAsk({ members: ['x'], question: 'q' })).toMatchObject({ ok: false });
  });

  it('trims long fields and fills safe defaults', () => {
    const r = parseAsk({
      members: [{ name: 'Al', archetype: 'nope', skills: ['a', 3, 'b'], style: 'x'.repeat(400) }],
      question: 'q',
    });
    expect(r.ok && r.value.members[0]).toMatchObject({
      id: 'Al',
      archetype: 'maker',
      skills: ['a', 'b'],
      intentions: [],
    });
    expect(r.ok && r.value.members[0].style).toHaveLength(160);
  });
});
