import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db/client';
import { deleteBacklogItem, toggleBacklogItem } from '@/lib/db/queries/backlog';
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

  if (typeof body !== 'object' || body === null || !('done' in body)) {
    return NextResponse.json({ error: 'done is required' }, { status: 400 });
  }

  const { done } = body as { done: unknown };
  if (typeof done !== 'boolean') {
    return NextResponse.json({ error: 'done must be a boolean' }, { status: 400 });
  }

  const item = await toggleBacklogItem(getDb(), user.id, id, done);
  if (!item) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(item);
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
