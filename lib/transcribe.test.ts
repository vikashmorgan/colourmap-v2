import { beforeEach, describe, expect, it, vi } from 'vitest';

const { generateObject } = vi.hoisted(() => ({ generateObject: vi.fn() }));
const { google } = vi.hoisted(() => ({ google: vi.fn((id: string) => ({ id })) }));

vi.mock('ai', () => ({ generateObject }));
vi.mock('@ai-sdk/google', () => ({ google }));

import { MODEL, READING, transcribe } from './transcribe';

const HEARD = {
  text: 'Il faut que je rappelle la commune de Pregny-Chambésy demain.',
  lang: 'fr',
  branch: 'admin' as const,
  isIntention: true,
};

const AUDIO = new Uint8Array([1, 2, 3, 4]);

describe('reading a voice note', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    generateObject.mockResolvedValue({ object: HEARD });
  });

  it('returns what was heard', async () => {
    const result = await transcribe(AUDIO, 'audio/webm');

    expect(result).toEqual({ ok: true, reading: HEARD });
  });

  it('sends the audio as a file part alongside the instruction', async () => {
    await transcribe(AUDIO, 'audio/mp4');

    const call = generateObject.mock.calls[0]?.[0];
    const content = call.messages[0].content;

    expect(call.messages[0].role).toBe('user');
    expect(content[0].type).toBe('text');
    expect(content[1]).toEqual({ type: 'file', data: AUDIO, mediaType: 'audio/mp4' });
  });

  it('asks the model not to translate', async () => {
    /*
     * A note thought in French is a French note. Rendering it in English is a
     * silent edit of somebody's own words, and the instruction is the only
     * thing preventing it — so it is worth a test rather than trust.
     */
    await transcribe(AUDIO, 'audio/webm');

    const instruction = generateObject.mock.calls[0]?.[0].messages[0].content[0].text;
    expect(instruction).toMatch(/Do not translate/i);
  });

  it('uses the cheap model, because this is hearing and not reasoning', () => {
    expect(MODEL).toContain('flash');
  });

  it('refuses an empty recording without paying for a call', async () => {
    const result = await transcribe(new Uint8Array(), 'audio/webm');

    expect(result).toEqual({ ok: false, error: 'empty recording' });
    expect(generateObject).not.toHaveBeenCalled();
  });

  it('treats a blank transcript as a failure, not a success', async () => {
    /*
     * Silence, a muted microphone, and a permission that was never granted
     * all come back schema-valid and empty. Calling that 'transcribed' files
     * an empty note as read and hides it from retry for good.
     */
    generateObject.mockResolvedValue({ object: { ...HEARD, text: '   ' } });

    const result = await transcribe(AUDIO, 'audio/webm');

    expect(result).toEqual({ ok: false, error: 'nothing audible' });
  });

  it('trims the words it keeps', async () => {
    generateObject.mockResolvedValue({ object: { ...HEARD, text: '  bonjour  ' } });

    const result = await transcribe(AUDIO, 'audio/webm');

    expect(result.ok && result.reading.text).toBe('bonjour');
  });

  it('returns the failure rather than throwing it', async () => {
    /*
     * The audio is already safe in storage and the row already exists. There
     * is nothing to unwind, so a failed reading is an ordinary outcome and the
     * caller's job is to write down why — not to catch an exception.
     */
    generateObject.mockRejectedValue(new Error('quota exceeded'));

    const result = await transcribe(AUDIO, 'audio/webm');

    expect(result).toEqual({ ok: false, error: 'quota exceeded' });
  });

  it('survives a thrown non-error', async () => {
    generateObject.mockRejectedValue('nope');

    const result = await transcribe(AUDIO, 'audio/webm');

    expect(result).toEqual({ ok: false, error: 'transcription failed' });
  });
});

describe('the shape a reading has to have', () => {
  it('lets the model decline a branch', () => {
    /*
     * A wrong branch on a confident-looking note is worse than no branch:
     * it files the thought somewhere it will not be looked for.
     */
    expect(READING.safeParse({ ...HEARD, branch: null }).success).toBe(true);
  });

  it('refuses a branch outside the three that exist', () => {
    expect(READING.safeParse({ ...HEARD, branch: 'work' }).success).toBe(false);
  });

  it('requires the words themselves', () => {
    const { text: _text, ...withoutText } = HEARD;

    expect(READING.safeParse(withoutText).success).toBe(false);
  });

  it('keeps intention a judgement, not a fact about the audio', () => {
    expect(READING.safeParse({ ...HEARD, isIntention: false }).success).toBe(true);
    expect(READING.safeParse({ ...HEARD, isIntention: 'maybe' }).success).toBe(false);
  });
});
