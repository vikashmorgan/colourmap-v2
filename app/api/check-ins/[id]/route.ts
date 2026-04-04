import { and, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db/client';
import { checkIns } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const updates: Record<string, unknown> = {};

  if (typeof body.sliderValue === 'number') updates.sliderValue = body.sliderValue;
  if (typeof body.note === 'string' || body.note === null) updates.note = body.note;
  if (Array.isArray(body.tags) || body.tags === null) updates.tags = body.tags;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'No valid fields' }, { status: 400 });
  }

  const db = getDb();
  const [updated] = await db
    .update(checkIns)
    .set(updates)
    .where(and(eq(checkIns.id, id), eq(checkIns.userId, user.id)))
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
  await db.delete(checkIns).where(and(eq(checkIns.id, id), eq(checkIns.userId, user.id)));
  return NextResponse.json({ ok: true });
}
