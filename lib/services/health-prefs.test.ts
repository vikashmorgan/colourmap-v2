import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deletePref, getPrefsByUser, upsertPrefs } = vi.hoisted(() => ({
  deletePref: vi.fn(),
  getPrefsByUser: vi.fn(),
  upsertPrefs: vi.fn(),
}));

vi.mock('@/lib/db/queries/health-prefs', () => ({ deletePref, getPrefsByUser, upsertPrefs }));

import { HealthPrefValidationError, listPrefs, MAX_PREFS, writePrefs } from './health-prefs';

describe('health prefs service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists the user prefs', async () => {
    getPrefsByUser.mockResolvedValue([{ key: 'order|knee', value: 'a,b' }]);
    expect(await listPrefs('user-1')).toEqual([{ key: 'order|knee', value: 'a,b' }]);
  });

  it('writes an order and sets one aside', async () => {
    await writePrefs('user-1', [
      { key: 'order|knee', value: 'clamshell,wall-sit' },
      { key: 'aside|step-down', value: '1' },
    ]);
    expect(upsertPrefs).toHaveBeenCalledWith('user-1', [
      { key: 'order|knee', value: 'clamshell,wall-sit' },
      { key: 'aside|step-down', value: '1' },
    ]);
  });

  it('clears a key on null, the last change winning', async () => {
    await writePrefs('user-1', [
      { key: 'aside|step-down', value: '1' },
      { key: 'aside|step-down', value: null },
    ]);
    expect(deletePref).toHaveBeenCalledWith('user-1', 'aside|step-down');
    expect(upsertPrefs).toHaveBeenCalledWith('user-1', []);
  });

  it('refuses bad input and writes nothing', async () => {
    const bad = [
      undefined,
      [],
      Array.from({ length: MAX_PREFS + 1 }, () => ({ key: 'k', value: '1' })),
      [{ key: '', value: '1' }],
      [{ key: 'k', value: 1 }],
      [{ key: 'k', value: 'x'.repeat(2001) }],
      [null],
    ];
    for (const prefs of bad) {
      await expect(writePrefs('user-1', prefs)).rejects.toBeInstanceOf(HealthPrefValidationError);
    }
    expect(upsertPrefs).not.toHaveBeenCalled();
    expect(deletePref).not.toHaveBeenCalled();
  });
});
