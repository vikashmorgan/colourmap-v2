import { google } from '@ai-sdk/google';
import { generateObject } from 'ai';
import { z } from 'zod';

/*
 * READING A VOICE NOTE.
 *
 * WHY NOT THE BROWSER
 *
 * This replaces `useSpeechToText`, which wrapped the Web Speech API. That
 * choice was defensible when it was made — free, instant, no key — and three
 * things killed it:
 *
 *   1. It does not render on iOS, which is where this app is used. The mic
 *      simply was not there.
 *   2. It takes ONE language per session. Thinking happens in French, Italian
 *      and English, often inside one sentence, and no fixed `lang` survives
 *      that.
 *   3. Failure lost the thought. Nothing was stored but the text it produced.
 *
 * WHY NOT CLAUDE, WHICH THIS REPO ALREADY USES
 *
 * Claude does not accept audio input. `@ai-sdk/anthropic` is the right client
 * for `api/ai/presence` and cannot be the transcriber. That is a capability
 * fact, not a preference, and it is written here so nobody spends an evening
 * trying.
 *
 * WHY ONE CALL THAT BOTH HEARS AND SORTS
 *
 * The obvious build is transcribe first, classify second. It is worse: it pays
 * two round trips, and the classifier reads a flattened transcript instead of
 * the audio — losing the hesitation, the trailing-off, the "actually, no",
 * which is exactly the evidence for whether something was a real intention or
 * thinking aloud.
 *
 * So one call returns the words AND the shape. Everything except `text` is a
 * guess the model is explicitly allowed to decline, because a wrong branch on
 * a confident-looking note is worse than no branch at all.
 */

export const READING = z.object({
  /*
   * The words, punctuated, in whatever languages were spoken — NOT translated.
   * A note thought in French is a French note; rendering it in English is a
   * silent edit of somebody's own words.
   */
  text: z.string(),
  /** BCP-47 of the dominant language. 'mixed' when genuinely code-switched. */
  lang: z.string(),
  /*
   * Which branch of the tree this belongs to, or null.
   *
   * Nullable and allowed to stay null. `lib/branches.ts` owns these three and
   * the model is told to answer only when the note actually says so.
   */
  branch: z.enum(['art', 'admin', 'energy']).nullable(),
  /*
   * Whether this sounds like something to DO rather than something to keep.
   *
   * Deliberately not acted on automatically. It sorts the review queue; a
   * person still confirms, which is the rule the whole system runs on.
   */
  isIntention: z.boolean(),
});

export type Reading = z.infer<typeof READING>;

/*
 * Flash rather than Pro, on purpose. This is transcription with a light sort
 * on top, not reasoning, and Pro costs several times more to be no better at
 * hearing French. If proper nouns come back mangled, the fix is to change this
 * one line — which is the entire argument for doing this server-side.
 */
export const MODEL = 'gemini-2.5-flash';

const INSTRUCTION = `You are reading a voice note somebody recorded for themselves.

Transcribe exactly what was said, with punctuation, in the language it was
spoken in. Do not translate. Do not summarise. Do not tidy up grammar or
remove repetition — this is a record of what a person said, not a polished
note. Keep names and places as spoken; if a name is unclear, write your best
guess rather than omitting it.

The speaker moves between French, Italian and English, sometimes inside one
sentence. Follow them. Set lang to the dominant language, or "mixed" if no
single one dominates.

Then make two judgements, and decline both rather than guess:

- branch: "art" for creative and musical work, "admin" for paperwork, money,
  logistics and obligations, "energy" for the body, health, sleep and mood.
  Answer null unless the note is clearly about one of them.
- isIntention: true only if this states something to DO. Thinking aloud,
  noticing, and remembering are all false.`;

export type TranscribeResult = { ok: true; reading: Reading } | { ok: false; error: string };

/**
 * Turn recorded audio into a reading.
 *
 * Returns a result rather than throwing: a failed transcription is an ordinary
 * outcome here, not an exception. The audio is already safe in storage, the
 * row already exists, and the caller's job is to write down why it failed so
 * the note can be retried — not to unwind anything.
 */
export async function transcribe(audio: Uint8Array, mediaType: string): Promise<TranscribeResult> {
  if (audio.byteLength === 0) return { ok: false, error: 'empty recording' };

  try {
    const { object } = await generateObject({
      model: google(MODEL),
      schema: READING,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: INSTRUCTION },
            { type: 'file', data: audio, mediaType },
          ],
        },
      ],
    });

    /*
     * A schema-valid empty transcript is a failure wearing a success's
     * clothes. Silence, a muted microphone, or a recording that never got
     * permission all land here, and calling that 'transcribed' would file an
     * empty note as read and hide it from the retry queue for good.
     */
    if (!object.text.trim()) return { ok: false, error: 'nothing audible' };

    return { ok: true, reading: { ...object, text: object.text.trim() } };
  } catch (cause) {
    return { ok: false, error: cause instanceof Error ? cause.message : 'transcription failed' };
  }
}
