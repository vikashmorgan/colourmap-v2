import { NextResponse } from 'next/server';

import { and, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { deleteBacklogItem, toggleBacklogItem } from '@/lib/db/queries/backlog';
import { backlog } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { done, notes } = body as { done?: unknown; notes?: unknown };

  // Update notes
  if (typeof notes === 'string' || notes === null) {
    const db = getDb();
    const [updated] = await db.update(backlog)
      .set({ notes: notes as string | null })
      .where(and(eq(backlog.id, id), eq(backlog.userId, user.id)))
      .returning();
    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    if (done === undefined) return NextResponse.json(updated);
  }

  // Toggle done
  if (typeof done === 'boolean') {
    const item = await toggleBacklogItem(getDb(), user.id, id, done);
    if (!item) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(item);
  }

  return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const deleted = await deleteBacklogItem(getDb(), user.id, id);

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
