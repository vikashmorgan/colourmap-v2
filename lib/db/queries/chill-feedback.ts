import { desc, eq } from 'drizzle-orm';
import { pgSchema, text, uuid } from 'drizzle-orm/pg-core';

import { getDb } from '@/lib/db/client';
import { chillFeedback } from '@/lib/db/schema';

/*
 * Notes for Martin from the public Chill Machine.
 *
 * Writes and reads go through the server db connection, which bypasses RLS on
 * purpose: guests have no session, and only the owner ever reads (the route
 * and page check that before calling here).
 */

// Supabase's own users table, read-only, only to show a signed-in sender's email.
// Kept out of lib/db/schema.ts so drizzle-kit never tries to manage it.
const authUsers = pgSchema('auth').table('users', {
  id: uuid('id').primaryKey(),
  email: text('email'),
});

export type ChillFeedbackInput = {
  userId: string | null;
  name: string | null;
  message: string;
  palette: string | null;
};

export type ChillFeedbackNote = {
  id: string;
  userId: string | null;
  name: string | null;
  email: string | null;
  message: string;
  palette: string | null;
  createdAt: Date;
};

export async function insertChillFeedback(input: ChillFeedbackInput): Promise<void> {
  await getDb().insert(chillFeedback).values(input);
}

export async function listChillFeedback(limit = 200): Promise<ChillFeedbackNote[]> {
  return getDb()
    .select({
      id: chillFeedback.id,
      userId: chillFeedback.userId,
      name: chillFeedback.name,
      email: authUsers.email,
      message: chillFeedback.message,
      palette: chillFeedback.palette,
      createdAt: chillFeedback.createdAt,
    })
    .from(chillFeedback)
    .leftJoin(authUsers, eq(authUsers.id, chillFeedback.userId))
    .orderBy(desc(chillFeedback.createdAt))
    .limit(limit);
}
