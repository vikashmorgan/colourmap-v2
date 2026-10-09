import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deleteBox, getMarksByUser, upsertBoxes } = vi.hoisted(() => ({
  deleteBox: vi.fn(),
  getMarksByUser: vi.fn(),
  upsertBoxes: vi.fn(),
}));

vi.mock('@/lib/db/queries/coding-marks', () => ({ deleteBox, getMarksByUser, upsertBoxes }));

import {
  CodingMarkValidationError,
  getState,
  MAX_MERGE,
  MAX_NOTE_LENGTH,
  mergeState,
  saveBox,
} from './coding-marks';

const question = (text: string) => ({ text, kind: 'question' });
const comment = (text: string) => ({ text, kind: 'comment' });

describe('coding marks service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getMarksByUser.mockResolvedValue([]);
  });

  it('returns marks and notes keyed by box, skipping unknown values', async () => {
    getMarksByUser.mockResolvedValue([
      { itemKey: 's3|while', mark: 'got', note: null, noteKind: null },
      { itemKey: 's2|.split()', mark: 'mid', note: 'Default separator?', noteKind: 'question' },
      { itemKey: 's1|print()', mark: null, note: 'Like console.log', noteKind: 'comment' },
      { itemKey: 's1|#', mark: 'bogus', note: 'x', noteKind: 'bogus' },
    ]);

    expect(await getState('user-1')).toEqual({
      marks: { 's3|while': 'got', 's2|.split()': 'mid' },
      notes: {
        's2|.split()': { text: 'Default separator?', kind: 'question' },
        's1|print()': { text: 'Like console.log', kind: 'comment' },
      },
    });
    expect(getMarksByUser).toHaveBeenCalledWith('user-1');
  });

  it('saves a box with its mark and trimmed note', async () => {
    await saveBox('user-1', 's3|while', 'mid', question('  When does it stop?  '));
    expect(upsertBoxes).toHaveBeenCalledWith('user-1', [
      { itemKey: 's3|while', mark: 'mid', note: 'When does it stop?', noteKind: 'question' },
    ]);
  });

  it('accepts the solid level', async () => {
    await saveBox('user-1', 's4|def', 'solid', null);
    expect(upsertBoxes).toHaveBeenCalledWith('user-1', [
      { itemKey: 's4|def', mark: 'solid', note: null, noteKind: null },
    ]);
  });

  it('saves a comment without a mark', async () => {
    await saveBox('user-1', 's3|while', null, comment('Loops until the condition is false'));
    expect(upsertBoxes).toHaveBeenCalledWith('user-1', [
      {
        itemKey: 's3|while',
        mark: null,
        note: 'Loops until the condition is false',
        noteKind: 'comment',
      },
    ]);
  });

  it('deletes the box when both mark and note are empty', async () => {
    await saveBox('user-1', 's3|while', null, question('   '));
    expect(deleteBox).toHaveBeenCalledWith('user-1', 's3|while');
    expect(upsertBoxes).not.toHaveBeenCalled();
  });

  it('rejects a bad key, mark or note', async () => {
    const bad = [
      saveBox('user-1', 's3|while', 'maybe', null),
      saveBox('user-1', '', 'got', null),
      saveBox('user-1', 'x'.repeat(201), 'got', null),
      saveBox('user-1', 42, 'got', null),
      saveBox('user-1', 's3|while', null, 'plain text'),
      saveBox('user-1', 's3|while', null, { text: 7, kind: 'question' }),
      saveBox('user-1', 's3|while', null, { text: 'hi', kind: 'rant' }),
      saveBox('user-1', 's3|while', null, question('x'.repeat(MAX_NOTE_LENGTH + 1))),
    ];
    for (const attempt of bad) {
      await expect(attempt).rejects.toBeInstanceOf(CodingMarkValidationError);
    }
    expect(upsertBoxes).not.toHaveBeenCalled();
    expect(deleteBox).not.toHaveBeenCalled();
  });

  it('merges marks and notes from the browser into one upsert', async () => {
    const count = await mergeState(
      'user-1',
      { 's1|print()': 'got', 's3|if': 'mid' },
      { 's3|if': question('elif vs else?'), 's4|def': comment('Like a recipe') },
    );
    expect(count).toBe(3);
    expect(upsertBoxes).toHaveBeenCalledWith('user-1', [
      { itemKey: 's1|print()', mark: 'got', note: null, noteKind: null },
      { itemKey: 's3|if', mark: 'mid', note: 'elif vs else?', noteKind: 'question' },
      { itemKey: 's4|def', mark: null, note: 'Like a recipe', noteKind: 'comment' },
    ]);
  });

  it('refuses a merge that is not objects, too big, or carries a bad value', async () => {
    await expect(mergeState('user-1', ['got'], {})).rejects.toBeInstanceOf(
      CodingMarkValidationError,
    );
    await expect(mergeState('user-1', {}, null)).rejects.toBeInstanceOf(CodingMarkValidationError);
    const tooMany = Object.fromEntries(
      Array.from({ length: MAX_MERGE + 1 }, (_, i) => [`k${i}`, 'got']),
    );
    await expect(mergeState('user-1', tooMany, {})).rejects.toBeInstanceOf(
      CodingMarkValidationError,
    );
    await expect(mergeState('user-1', { 's1|x': 'nope' }, {})).rejects.toBeInstanceOf(
      CodingMarkValidationError,
    );
    expect(upsertBoxes).not.toHaveBeenCalled();
  });
});
