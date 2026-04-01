import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db/client';
import {
  getEntriesForDate,
  getSectionsWithTrackers,
  insertSection,
  insertTracker,
} from '@/lib/db/queries/cockpit-sections';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const db = getDb();
  const sections = await getSectionsWithTrackers(db, user.id);
  const today = new Date().toISOString().split('T')[0];
  const entries = await getEntriesForDate(db, user.id, today);

  const entryMap: Record<string, number> = {};
  for (const e of entries) {
    entryMap[e.trackerId] = e.value;
  }

  return NextResponse.json({ sections, entries: entryMap });
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

  if (typeof body !== 'object' || body === null || !('name' in body)) {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  const { name, trackers } = body as {
    name: string;
    trackers?: { label: string; type: string }[];
  };

  if (typeof name !== 'string' || !name.trim()) {
    return NextResponse.json({ error: 'name must be non-empty' }, { status: 400 });
  }

  const db = getDb();
  const section = await insertSection(db, { userId: user.id, name: name.trim() });

  if (Array.isArray(trackers)) {
    for (let i = 0; i < trackers.length; i++) {
      const t = trackers[i];
      if (typeof t.label === 'string' && typeof t.type === 'string') {
        await insertTracker(db, {
          sectionId: section.id,
          label: t.label,
          type: t.type,
          position: i,
        });
      }
    }
  }

  return NextResponse.json(section, { status: 201 });
}
