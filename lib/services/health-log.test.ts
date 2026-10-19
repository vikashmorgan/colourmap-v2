import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deleteLog, getLogByUser, upsertLog } = vi.hoisted(() => ({
  deleteLog: vi.fn(),
  getLogByUser: vi.fn(),
  upsertLog: vi.fn(),
}));

vi.mock('@/lib/db/queries/health-log', () => ({ deleteLog, getLogByUser, upsertLog }));

import {
  HealthLogValidationError,
  listLog,
  MAX_ENTRIES,
  MAX_VALUE_LENGTH,
  writeLog,
} from './health-log';

describe('health log service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('lists the user log', async () => {
    getLogByUser.mockResolvedValue([{ day: '2026-10-19', key: 'feel', value: 'ok' }]);
    expect(await listLog('user-1')).toHaveLength(1);
    expect(getLogByUser).toHaveBeenCalledWith('user-1');
  });

  it('writes ticks, numbers and the day note, trimmed', async () => {
    await writeLog('user-1', [
      { day: '2026-10-19', key: 'am|lift-sky', value: '1' },
      { day: '2026-10-19', key: 'pain|knee', value: '3' },
      { day: '2026-10-19', key: 'feel', value: '  Knee calmer after the wall sit.  ' },
    ]);
    expect(upsertLog).toHaveBeenCalledWith('user-1', [
      { day: '2026-10-19', key: 'am|lift-sky', value: '1' },
      { day: '2026-10-19', key: 'pain|knee', value: '3' },
      { day: '2026-10-19', key: 'feel', value: 'Knee calmer after the wall sit.' },
    ]);
    expect(deleteLog).not.toHaveBeenCalled();
  });

  it('clears a key on null or empty text', async () => {
    await writeLog('user-1', [
      { day: '2026-10-19', key: 'am|lift-sky', value: null },
      { day: '2026-10-19', key: 'feel', value: '   ' },
    ]);
    expect(deleteLog).toHaveBeenCalledWith('user-1', '2026-10-19', 'am|lift-sky');
    expect(deleteLog).toHaveBeenCalledWith('user-1', '2026-10-19', 'feel');
    expect(upsertLog).toHaveBeenCalledWith('user-1', []);
  });

  it('keeps only the last change to the same day and key', async () => {
    await writeLog('user-1', [
      { day: '2026-10-19', key: 'am|lift-sky', value: '1' },
      { day: '2026-10-19', key: 'am|lift-sky', value: null },
    ]);
    expect(deleteLog).toHaveBeenCalledTimes(1);
    expect(upsertLog).toHaveBeenCalledWith('user-1', []);
  });

  it('refuses bad input and writes nothing', async () => {
    const bad = [
      undefined,
      [],
      Array.from({ length: MAX_ENTRIES + 1 }, () => ({ day: '2026-10-19', key: 'k', value: '1' })),
      [{ day: '19/10/2026', key: 'k', value: '1' }],
      [{ day: '2026-02-30', key: 'k', value: '1' }],
      [{ day: '2026-10-19', key: '', value: '1' }],
      [{ day: '2026-10-19', key: 'x'.repeat(101), value: '1' }],
      [{ day: '2026-10-19', key: 'k', value: 3 }],
      [{ day: '2026-10-19', key: 'feel', value: 'x'.repeat(MAX_VALUE_LENGTH + 1) }],
      [{ day: '2026-10-19', key: 'ok', value: '1' }, null],
    ];
    for (const entries of bad) {
      await expect(writeLog('user-1', entries)).rejects.toBeInstanceOf(HealthLogValidationError);
    }
    expect(upsertLog).not.toHaveBeenCalled();
    expect(deleteLog).not.toHaveBeenCalled();
  });
});
