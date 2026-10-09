import { and, desc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { voiceNotes } from '@/lib/db/schema';
import type { Reading } from '@/lib/transcribe';

/*
 * THE LIFE OF A VOICE NOTE.
 *
 *   captured     audio is in storage. This is the only state capture needs to
 *                reach, and reaching it is what makes the note safe.
 *   transcribing something is reading it. Claimed, so two readers cannot both
 *                pay for the same note.
 *   transcribed  it has words.
 *   failed       reading it did not work, and `error` says why. The audio is
 *                untouched, so this is a retry rather than a loss.
 *
 * Every transition is one function here. Routes do not write status strings,
 * because a status invented at a call site is how a state machine rots.
 */

export type VoiceNoteRow = typeof voiceNotes.$inferSelect;

export const PENDING: readonly string[] = ['captured', 'transcribing'];

export type CreateVoiceNoteInput = {
  storagePath: string;
  durationSecs: number | null;
};

export async function listVoiceNotes(userId: string, limit = 50) {
  const db = getDb();
  return db
    .select()
    .from(voiceNotes)
    .where(eq(voiceNotes.userId, userId))
    .orderBy(desc(voiceNotes.createdAt))
    .limit(limit);
}

/** Notes recorded but not yet read. The queue, for the app and the terminal alike. */
export async function listPending(userId: string, limit = 50) {
  const db = getDb();
  return db
    .select()
    .from(voiceNotes)
    .where(and(eq(voiceNotes.userId, userId), inArray(voiceNotes.status, [...PENDING])))
    .orderBy(voiceNotes.createdAt)
    .limit(limit);
}

export async function getVoiceNote(userId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .select()
    .from(voiceNotes)
    .where(and(eq(voiceNotes.userId, userId), eq(voiceNotes.id, id)))
    .limit(1);
  return row ?? null;
}

/**
 * Write down that audio exists.
 *
 * Called the moment the upload lands and before anything has tried to read it.
 * That order is the whole point of this table: everything after this can fail
 * without losing what was said.
 */
export async function createVoiceNote(userId: string, input: CreateVoiceNoteInput) {
  const db = getDb();
  const [row] = await db
    .insert(voiceNotes)
    .values({ userId, storagePath: input.storagePath, durationSecs: input.durationSecs })
    .returning();
  return row;
}

/**
 * Claim a note for reading.
 *
 * Returns null when somebody got there first. The `captured` condition in the
 * WHERE clause is the lock — without it a phone and a cron job can both pay
 * to transcribe the same audio, and the second result silently overwrites the
 * first.
 */
export async function claimForTranscription(userId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .update(voiceNotes)
    .set({ status: 'transcribing', error: null })
    .where(
      and(eq(voiceNotes.userId, userId), eq(voiceNotes.id, id), eq(voiceNotes.status, 'captured')),
    )
    .returning();
  return row ?? null;
}

/** Attach what was heard. The only path to 'transcribed'. */
export async function attachReading(userId: string, id: string, reading: Reading) {
  const db = getDb();
  const [row] = await db
    .update(voiceNotes)
    .set({
      status: 'transcribed',
      transcript: reading.text,
      lang: reading.lang,
      branch: reading.branch,
      error: null,
      transcribedAt: new Date(),
    })
    .where(and(eq(voiceNotes.userId, userId), eq(voiceNotes.id, id)))
    .returning();
  return row ?? null;
}

/**
 * Record that reading it did not work.
 *
 * Returns the note to something retryable rather than leaving it claimed. A
 * note stuck in 'transcribing' because a request died is invisible to the
 * queue forever, which is the failure this exists to prevent.
 */
export async function markFailed(userId: string, id: string, error: string) {
  const db = getDb();
  const [row] = await db
    .update(voiceNotes)
    .set({ status: 'failed', error })
    .where(and(eq(voiceNotes.userId, userId), eq(voiceNotes.id, id)))
    .returning();
  return row ?? null;
}

/** Put a failed note back in the queue. Retry is a decision, never automatic. */
export async function reopen(userId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .update(voiceNotes)
    .set({ status: 'captured', error: null })
    .where(
      and(eq(voiceNotes.userId, userId), eq(voiceNotes.id, id), eq(voiceNotes.status, 'failed')),
    )
    .returning();
  return row ?? null;
}

export async function deleteVoiceNote(userId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .delete(voiceNotes)
    .where(and(eq(voiceNotes.userId, userId), eq(voiceNotes.id, id)))
    .returning();
  return row ?? null;
}
