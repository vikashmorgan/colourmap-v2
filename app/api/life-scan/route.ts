import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db/client';
import { getLatestScans, insertLifeScan, insertReflection } from '@/lib/db/queries/life-scans';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const scans = await getLatestScans(getDb(), user.id);
  return NextResponse.json(scans);
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

  if (typeof body !== 'object' || body === null) {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const { doors, reflections, scanGroup } = body as {
    doors?: { door: string; sliders: Record<string, number> }[];
    reflections?: { question: string; answer: string }[];
    scanGroup?: string;
  };

  if (!Array.isArray(doors) || doors.length === 0) {
    return NextResponse.json({ error: 'doors array is required' }, { status: 400 });
  }

  if (!scanGroup || typeof scanGroup !== 'string') {
    return NextResponse.json({ error: 'scanGroup is required' }, { status: 400 });
  }

  const db = getDb();
  const savedScans = [];

  for (const d of doors) {
    if (typeof d.door !== 'string' || typeof d.sliders !== 'object') continue;
    const scan = await insertLifeScan(db, {
      userId: user.id,
      door: d.door,
      sliders: d.sliders,
    });
    savedScans.push(scan);
  }

  if (Array.isArray(reflections)) {
    for (const r of reflections) {
      if (typeof r.question === 'string' && typeof r.answer === 'string' && r.answer.trim()) {
        await insertReflection(db, {
          userId: user.id,
          scanGroup,
          question: r.question,
          answer: r.answer.trim(),
        });
      }
    }
  }

  return NextResponse.json({ scans: savedScans, scanGroup }, { status: 201 });
}
