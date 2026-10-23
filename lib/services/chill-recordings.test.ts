import { beforeEach, describe, expect, it, vi } from 'vitest';

const selectLimit = vi.fn();
const selectOrderBy = vi.fn();
const selectWhere = vi.fn(() => ({ orderBy: selectOrderBy, limit: selectLimit }));
const selectFrom = vi.fn(() => ({ where: selectWhere }));
const select = vi.fn(() => ({ from: selectFrom }));

const insertReturning = vi.fn();
const insertValues = vi.fn((_values: unknown) => ({ returning: insertReturning }));
const insert = vi.fn(() => ({ values: insertValues }));

const deleteReturning = vi.fn();
const deleteWhere = vi.fn(() => ({ returning: deleteReturning }));
const deleteFn = vi.fn(() => ({ where: deleteWhere }));

const { getDb } = vi.hoisted(() => ({ getDb: vi.fn() }));

vi.mock('@/lib/db/client', () => ({ getDb }));

import {
  baseRecordingMime,
  checkRecordingSize,
  chillRecordingPath,
  createChillRecording,
  deleteChillRecording,
  getChillRecording,
  isOwnChillPath,
  listChillRecordings,
  MAX_RECORDING_BYTES,
  parseRecordingMeta,
} from './chill-recordings';

const USER = '11111111-1111-4111-8111-111111111111';
const ID = '22222222-2222-4222-8222-222222222222';

describe('chill-recordings helpers', () => {
  it('accepts only mp4 and webm audio, ignoring codec parameters', () => {
    expect(baseRecordingMime('audio/mp4')).toBe('audio/mp4');
    expect(baseRecordingMime('audio/webm;codecs=opus')).toBe('audio/webm');
    expect(baseRecordingMime('audio/mpeg')).toBeNull();
    expect(baseRecordingMime('video/webm')).toBeNull();
    expect(baseRecordingMime(undefined)).toBeNull();
  });

  it('builds paths inside the user folder', () => {
    expect(chillRecordingPath(USER, ID, 'audio/mp4')).toBe(`${USER}/chill/${ID}.m4a`);
    expect(chillRecordingPath(USER, ID, 'audio/webm')).toBe(`${USER}/chill/${ID}.webm`);
  });

  it('recognises only the user’s own chill paths', () => {
    expect(isOwnChillPath(USER, `${USER}/chill/${ID}.m4a`, 'audio/mp4')).toBe(true);
    expect(isOwnChillPath(USER, `${USER}/chill/${ID}.webm`, 'audio/mp4')).toBe(false);
    expect(isOwnChillPath(USER, `other/chill/${ID}.m4a`, 'audio/mp4')).toBe(false);
    expect(isOwnChillPath(USER, `${USER}/chill/../x/${ID}.m4a`, 'audio/mp4')).toBe(false);
    expect(isOwnChillPath(USER, 42, 'audio/mp4')).toBe(false);
  });

  it('checks sizes against the 200 MB cap', () => {
    expect(checkRecordingSize(1024)).toEqual({ ok: true, value: 1024 });
    expect(checkRecordingSize(MAX_RECORDING_BYTES + 1)).toMatchObject({ ok: false, status: 413 });
    expect(checkRecordingSize(0)).toMatchObject({ ok: false, status: 400 });
    expect(checkRecordingSize('5')).toMatchObject({ ok: false, status: 400 });
  });

  it('parses metadata from form strings', () => {
    expect(
      parseRecordingMeta({
        title: ' Take 1 ',
        durationSecs: '61.6',
        palette: 'warm',
        cues: JSON.stringify([{ at: 0, label: 'Intro' }]),
      }),
    ).toEqual({
      ok: true,
      value: {
        title: 'Take 1',
        durationSecs: 62,
        palette: 'warm',
        cues: [{ at: 0, label: 'Intro' }],
      },
    });
    expect(parseRecordingMeta({ title: 'a' })).toEqual({
      ok: true,
      value: { title: 'a', durationSecs: null, palette: null, cues: null },
    });
  });

  it('rejects bad metadata', () => {
    expect(parseRecordingMeta({ title: '' })).toMatchObject({ ok: false, status: 400 });
    expect(parseRecordingMeta({ title: 'x'.repeat(121) })).toMatchObject({ ok: false });
    expect(parseRecordingMeta({ title: 'a', durationSecs: 'abc' })).toMatchObject({ ok: false });
    expect(parseRecordingMeta({ title: 'a', durationSecs: -1 })).toMatchObject({ ok: false });
    expect(parseRecordingMeta({ title: 'a', cues: '{bad' })).toMatchObject({ ok: false });
    expect(parseRecordingMeta({ title: 'a', cues: { at: 1 } })).toMatchObject({ ok: false });
    expect(parseRecordingMeta({ title: 'a', cues: [{ at: 'x', label: 'y' }] })).toMatchObject({
      ok: false,
    });
  });
});

describe('chill-recordings data access', () => {
  const ROW = { id: ID, userId: USER, title: 'Take', storagePath: 'p', mimeType: 'audio/mp4' };

  beforeEach(() => {
    vi.clearAllMocks();
    getDb.mockReturnValue({ select, insert, delete: deleteFn });
  });

  it('lists, gets, creates and deletes rows', async () => {
    selectOrderBy.mockResolvedValue([ROW]);
    await expect(listChillRecordings(USER)).resolves.toEqual([ROW]);

    selectLimit.mockResolvedValue([ROW]);
    await expect(getChillRecording(USER, ID)).resolves.toEqual(ROW);
    selectLimit.mockResolvedValue([]);
    await expect(getChillRecording(USER, ID)).resolves.toBeNull();

    insertReturning.mockResolvedValue([ROW]);
    const input = {
      title: 'Take',
      storagePath: 'p',
      mimeType: 'audio/mp4',
      durationSecs: null,
      palette: null,
      cues: null,
    };
    await expect(createChillRecording(USER, input)).resolves.toEqual(ROW);
    expect(insertValues).toHaveBeenCalledWith({ userId: USER, ...input });

    deleteReturning.mockResolvedValue([ROW]);
    await expect(deleteChillRecording(USER, ID)).resolves.toEqual(ROW);
    deleteReturning.mockResolvedValue([]);
    await expect(deleteChillRecording(USER, ID)).resolves.toBeNull();
  });
});
