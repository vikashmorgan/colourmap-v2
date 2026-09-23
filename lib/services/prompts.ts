import { and, desc, eq, inArray } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { prompts } from '@/lib/db/schema';

/*
 * THE PROMPT QUEUE.
 *
 *   queued  written down, nobody started it
 *   taken   a session is working on it
 *   done    shipped. `prUrl` usually says where, `doneAt` always says when
 *   parked  deliberately not now
 *
 * `parked` exists so that deciding *against* something is recorded rather than
 * deleted. A queue where the only exits are "did it" and "gone" loses the
 * reason a thing was dropped, and the same idea comes back in three months
 * with nothing to argue against it.
 */

export type PromptRow = typeof prompts.$inferSelect;

export const OPEN: readonly string[] = ['queued', 'taken'];
export const STATUSES: readonly string[] = ['queued', 'taken', 'done', 'parked'];

/** The longest prompt worth storing. Past this it is a spec, not a prompt. */
export const MAX_BODY = 4000;

export function isStatus(value: unknown): value is PromptRow['status'] {
  return typeof value === 'string' && STATUSES.includes(value);
}

export async function listPrompts(userId: string, limit = 50) {
  const db = getDb();
  return db
    .select()
    .from(prompts)
    .where(eq(prompts.userId, userId))
    .orderBy(desc(prompts.createdAt))
    .limit(limit);
}

/**
 * The queue, oldest first.
 *
 * Oldest first on purpose, unlike every other list here. A queue read
 * newest-first quietly becomes a stack, and the things written when you were
 * most tired sink to the bottom and never come back up.
 */
export async function listOpen(userId: string, limit = 50) {
  const db = getDb();
  return db
    .select()
    .from(prompts)
    .where(and(eq(prompts.userId, userId), inArray(prompts.status, [...OPEN])))
    .orderBy(prompts.createdAt)
    .limit(limit);
}

export async function createPrompt(userId: string, body: string) {
  const db = getDb();
  const [row] = await db
    .insert(prompts)
    .values({ userId, body: body.trim().slice(0, MAX_BODY) })
    .returning();
  return row;
}

export type UpdatePromptInput = {
  status?: PromptRow['status'];
  prUrl?: string | null;
  note?: string | null;
};

/**
 * Move a prompt along.
 *
 * `doneAt` is set here rather than trusted from the caller, and cleared when a
 * prompt moves back out of `done`. The database rejects a `done` row without a
 * date, so getting this wrong is a failed write rather than a quiet lie about
 * when something shipped.
 */
export async function updatePrompt(userId: string, id: string, input: UpdatePromptInput) {
  const db = getDb();

  const patch: Record<string, unknown> = {};
  if (input.status) {
    patch.status = input.status;
    patch.doneAt = input.status === 'done' ? new Date() : null;
  }
  if (input.prUrl !== undefined) patch.prUrl = input.prUrl;
  if (input.note !== undefined) patch.note = input.note;

  if (Object.keys(patch).length === 0) return null;

  const [row] = await db
    .update(prompts)
    .set(patch)
    .where(and(eq(prompts.userId, userId), eq(prompts.id, id)))
    .returning();
  return row ?? null;
}

export async function deletePrompt(userId: string, id: string) {
  const db = getDb();
  const [row] = await db
    .delete(prompts)
    .where(and(eq(prompts.userId, userId), eq(prompts.id, id)))
    .returning();
  return row ?? null;
}
