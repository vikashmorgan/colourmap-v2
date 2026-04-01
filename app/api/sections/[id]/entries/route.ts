import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db/client';
import { upsertEntry } from '@/lib/db/queries/cockpit-sections';
import { createClient } from '@/lib/supabase/server';

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // id here is the section id, but we need trackerId from the body
  await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  if (typeof body !== 'object' || body === null || !('trackerId' in body) || !('value' in body)) {
    return NextResponse.json({ error: 'trackerId and value are required' }, { status: 400 });
  }

  const { trackerId, value } = body as { trackerId: string; value: number };
  const today = new Date().toISOString().split('T')[0];

  const entry = await upsertEntry(getDb(), {
    trackerId,
    userId: user.id,
    date: today,
    value,
  });

  return NextResponse.json(entry);
}
