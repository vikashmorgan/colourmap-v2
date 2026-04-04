import { desc, eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db/client';
import { notebookEntries } from '@/lib/db/schema';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const db = getDb();
  const entries = await db
    .select()
    .from(notebookEntries)
    .where(eq(notebookEntries.userId, user.id))
    .orderBy(desc(notebookEntries.updatedAt));

  return NextResponse.json(entries);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json();
  const { category, title, content, tags } = body as {
    category?: string;
    title?: string;
    content?: string;
    tags?: string[];
  };

  if (!category || !title) {
    return NextResponse.json({ error: 'category and title required' }, { status: 400 });
  }

  const db = getDb();
  const [entry] = await db
    .insert(notebookEntries)
    .values({
      userId: user.id,
      category,
      title: title.trim(),
      content: content?.trim() || null,
      tags: tags || null,
    })
    .returning();

  return NextResponse.json(entry, { status: 201 });
}
