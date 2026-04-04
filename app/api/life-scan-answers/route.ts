import { and, desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db/client';
import { lifeScanAnswers } from '@/lib/db/schema';
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
  const rows = await db
    .select()
    .from(lifeScanAnswers)
    .where(eq(lifeScanAnswers.userId, user.id))
    .orderBy(desc(lifeScanAnswers.updatedAt));

  // Deduplicate: keep only the most recent value per key
  const seen = new Set<string>();
  const answers: Record<string, string> = {};
  for (const row of rows) {
    if (!seen.has(row.key)) {
      seen.add(row.key);
      answers[row.key] = row.value;
    }
  }

  return NextResponse.json({ answers });
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

  if (typeof body !== 'object' || body === null || !('answers' in body)) {
    return NextResponse.json({ error: 'answers object is required' }, { status: 400 });
  }

  const { answers } = body as { answers: Record<string, string> };

  if (typeof answers !== 'object' || answers === null) {
    return NextResponse.json({ error: 'answers must be an object' }, { status: 400 });
  }

  const db = getDb();
  const now = new Date();

  for (const [key, value] of Object.entries(answers)) {
    if (typeof value !== 'string') continue;

    // Check if row exists for this user+key
    const existing = await db
      .select({ id: lifeScanAnswers.id })
      .from(lifeScanAnswers)
      .where(and(eq(lifeScanAnswers.userId, user.id), eq(lifeScanAnswers.key, key)))
      .limit(1);

    if (existing.length > 0) {
      await db
        .update(lifeScanAnswers)
        .set({ value, updatedAt: now })
        .where(eq(lifeScanAnswers.id, existing[0].id));
    } else {
      await db.insert(lifeScanAnswers).values({
        userId: user.id,
        key,
        value,
        updatedAt: now,
      });
    }
  }

  return NextResponse.json({ ok: true });
}
