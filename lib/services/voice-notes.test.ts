import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectLimit = vi.fn();
const selectOrderBy = vi.fn(() => ({ limit: selectLimit }));
const selectWhere = vi.fn(() => ({ orderBy: selectOrderBy, limit: selectLimit }));
const selectFrom = vi.fn(() => ({ where: selectWhere }));
const select = vi.fn(() => ({ from: selectFrom }));

const insertReturning = vi.fn();
const insertValues = vi.fn(() => ({ returning: insertReturning }));
const insert = vi.fn(() => ({ values: insertValues }));

const updateReturning = vi.fn();
const updateWhere = vi.fn(() => ({ returning: updateReturning }));
const updateSet = vi.fn(() => ({ where: updateWhere }));
const update = vi.fn(() => ({ set: updateSet }));

const deleteReturning = vi.fn();
const deleteWhere = vi.fn(() => ({ returning: deleteReturning }));
const deleteFn = vi.fn(() => ({ where: deleteWhere }));

const { getDb } = vi.hoisted(() => ({
  getDb: vi.fn(() => ({ select, insert, update, delete: deleteFn })),
}));

vi.mock('@/lib/db/client', () => ({ getDb }));

import {
  attachReading,
  claimForTranscription,
  createVoiceNote,
  deleteVoiceNote,
  getVoiceNote,
  listPending,
  listVoiceNotes,
  markFailed,
  PENDING,
  reopen,
} from './voice-notes';

const NOTE = {
  id: 'note-1',
  userId: 'user-1',
  storagePath: 'user-1/voice/1.webm',
  status: 'captured',
  transcript: null,
};

const READING = {
  text: 'Rappeler la commune demain.',
  lang: 'fr',
  branch: 'admin' as const,
  isIntention: true,
};

describe('voice notes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    selectLimit.mockResolvedValue([NOTE]);
    insertReturning.mockResolvedValue([NOTE]);
    updateReturning.mockResolvedValue([NOTE]);
    deleteReturning.mockResolvedValue([NOTE]);
  });

  it('records that audio exists before anything has read it', async () => {
    /*
     * The row is created with no transcript and no status argument. That is
     * the whole design: reaching 'captured' is what makes a thought safe, and
     * everything after it is allowed to fail.
     */
    await createVoiceNote('user-1', { storagePath: 'user-1/voice/1.webm', durationSecs: 12 });

    const values = insertValues.mock.calls[0]?.[0];
    expect(values).toEqual({
      userId: 'user-1',
      storagePath: 'user-1/voice/1.webm',
      durationSecs: 12,
    });
    expect(values).not.toHaveProperty('transcript');
    expect(values).not.toHaveProperty('status');
  });

  it('lists the newest notes first', async () => {
    await listVoiceNotes('user-1');

    expect(selectOrderBy).toHaveBeenCalled();
    expect(selectLimit).toHaveBeenCalledWith(50);
  });

  it('treats captured and transcribing as the queue', () => {
    /*
     * Both are unread. A note claimed by a reader that then died is still
     * waiting for somebody, and leaving it out of the queue is how it would
     * be lost in plain sight.
     */
    expect([...PENDING].sort()).toEqual(['captured', 'transcribing']);
  });

  it('lists what has not been read yet, oldest first', async () => {
    await listPending('user-1', 10);

    expect(selectOrderBy).toHaveBeenCalled();
    expect(selectLimit).toHaveBeenCalledWith(10);
  });

  it('returns null rather than undefined for a note that is not there', async () => {
    selectLimit.mockResolvedValue([]);

    expect(await getVoiceNote('user-1', 'nope')).toBeNull();
  });

  it('claims a note by moving it out of captured', async () => {
    await claimForTranscription('user-1', 'note-1');

    expect(updateSet).toHaveBeenCalledWith({ status: 'transcribing', error: null });
  });

  it('refuses the claim when somebody already took it', async () => {
    /*
     * The conditional update is the lock. Without it a phone and a cron job
     * both pay to read the same audio, and the slower answer overwrites the
     * faster one.
     */
    updateReturning.mockResolvedValue([]);

    expect(await claimForTranscription('user-1', 'note-1')).toBeNull();
  });

  it('writes the words, the language and the branch together', async () => {
    await attachReading('user-1', 'note-1', READING);

    const set = updateSet.mock.calls[0]?.[0];
    expect(set.status).toBe('transcribed');
    expect(set.transcript).toBe(READING.text);
    expect(set.lang).toBe('fr');
    expect(set.branch).toBe('admin');
    expect(set.error).toBeNull();
    expect(set.transcribedAt).toBeInstanceOf(Date);
  });

  it('does not store the intention judgement on the note', async () => {
    /*
     * isIntention sorts a review queue; it is not a property of the recording.
     * Writing it here would make a guess look like a fact about what was said.
     */
    await attachReading('user-1', 'note-1', READING);

    expect(updateSet.mock.calls[0]?.[0]).not.toHaveProperty('isIntention');
  });

  it('writes down why a reading failed', async () => {
    await markFailed('user-1', 'note-1', 'quota exceeded');

    expect(updateSet).toHaveBeenCalledWith({ status: 'failed', error: 'quota exceeded' });
  });

  it('never leaves a note stuck in transcribing', async () => {
    /*
     * A note claimed by a request that died would otherwise be invisible to
     * the queue forever. Failure has to return it to something retryable.
     */
    await markFailed('user-1', 'note-1', 'boom');

    expect(updateSet.mock.calls[0]?.[0].status).not.toBe('transcribing');
  });

  it('reopens a failed note back into the queue', async () => {
    await reopen('user-1', 'note-1');

    expect(updateSet).toHaveBeenCalledWith({ status: 'captured', error: null });
  });

  it('returns null when reopening something that did not fail', async () => {
    updateReturning.mockResolvedValue([]);

    expect(await reopen('user-1', 'note-1')).toBeNull();
  });

  it('returns the deleted row, so the caller can remove its audio', async () => {
    /*
     * Postgres cannot delete a storage object. Returning the row is what lets
     * the caller clean up the bucket instead of orphaning minutes of audio.
     */
    const row = await deleteVoiceNote('user-1', 'note-1');

    expect(row).toEqual(NOTE);
  });
});
