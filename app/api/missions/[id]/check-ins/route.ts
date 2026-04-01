import { NextResponse } from 'next/server';

import { getDb } from '@/lib/db/client';
import { getCheckInsForMission } from '@/lib/db/queries/check-ins';
import { createClient } from '@/lib/supabase/server';

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const checkIns = await getCheckInsForMission(getDb(), user.id, id);
  return NextResponse.json(checkIns);
}
