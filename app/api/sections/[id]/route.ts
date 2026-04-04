import { NextResponse } from 'next/server';

import { and, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { deleteSection, insertTracker } from '@/lib/db/queries/cockpit-sections';
import { cockpitSections, sectionTrackers } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json();
  if (typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const db = getDb();
  await db.update(cockpitSections)
    .set({ name: body.name.trim() })
    .where(and(eq(cockpitSections.id, id), eq(cockpitSections.userId, user.id)));

  return NextResponse.json({ ok: true });
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
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

  const { deleteTrackerId, label, type } = body as { deleteTrackerId?: string; label?: string; type?: string };

  // Delete a tracker
  if (deleteTrackerId) {
    const db = getDb();
    await db.delete(sectionTrackers).where(eq(sectionTrackers.id, deleteTrackerId));
    return NextResponse.json({ ok: true });
  }

  // Add a tracker
  if (!label || !type) {
    return NextResponse.json({ error: 'label and type are required' }, { status: 400 });
  }

  const tracker = await insertTracker(getDb(), { sectionId: id, label, type });
  return NextResponse.json(tracker, { status: 201 });
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
  const deleted = await deleteSection(getDb(), user.id, id);

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
