import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db/client';
import { getBacklogItems, insertBacklogItem } from '@/lib/db/queries/backlog';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const items = await getBacklogItems(getDb(), user.id);
  return NextResponse.json(items);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || !('title' in body)) {
    return NextResponse.json({ error: 'title is required' }, { status: 400 });
  }

  const { title } = body as { title: unknown };
  if (typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'title must be a non-empty string' }, { status: 400 });
  }

  const item = await insertBacklogItem(getDb(), { userId: user.id, title: title.trim() });
  return NextResponse.json(item, { status: 201 });
}
