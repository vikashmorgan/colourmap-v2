import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db/client';
import { notebookEntries } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const db = getDb();
  const [updated] = await db
    .update(notebookEntries)
    .set({ ...body, updatedAt: new Date() })
    .where(and(eq(notebookEntries.id, id), eq(notebookEntries.userId, user.id)))
    .returning();

  return NextResponse.json(updated);
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  await db
    .delete(notebookEntries)
    .where(and(eq(notebookEntries.id, id), eq(notebookEntries.userId, user.id)));

  return NextResponse.json({ ok: true });
}
