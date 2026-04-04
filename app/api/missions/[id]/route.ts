import { NextResponse } from 'next/server';

import { removeMission, updateMissionFields } from '@/lib/services/missions';
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

  const { completed, description, blocking, nextStep, title } = body as {
    completed?: unknown;
    description?: unknown;
    blocking?: unknown;
    nextStep?: unknown;
    title?: unknown;
  };

  const data: {
    completed?: boolean;
    description?: string | null;
    blocking?: string | null;
    nextStep?: string | null;
    title?: string;
  } = {};

  if (typeof completed === 'boolean') data.completed = completed;
  if (typeof description === 'string' || description === null) data.description = description;
  if (typeof blocking === 'string' || blocking === null) data.blocking = blocking;
  if (typeof nextStep === 'string' || nextStep === null) data.nextStep = nextStep;
  if (typeof title === 'string' && title.trim()) data.title = title;

  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const mission = await updateMissionFields(user.id, id, data);
  if (!mission) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json(mission);
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
  const deleted = await removeMission(user.id, id);

  if (!deleted) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
