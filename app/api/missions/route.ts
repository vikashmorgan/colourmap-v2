import { NextResponse } from 'next/server';

import { createMission, listMissions, MissionValidationError } from '@/lib/services/missions';
import { createClient } from '@/lib/supabase/server';

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const missions = await listMissions(user.id);
  return NextResponse.json(missions);
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

  if (typeof title !== 'string') {
    return NextResponse.json({ error: 'title must be a string' }, { status: 400 });
  }

  try {
    const mission = await createMission(user.id, title);
    return NextResponse.json(mission, { status: 201 });
  } catch (error) {
    if (error instanceof MissionValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
