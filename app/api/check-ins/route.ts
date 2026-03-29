import { NextResponse } from 'next/server';

import { CheckInValidationError, createCheckIn } from '@/lib/services/check-ins';
import { createClient } from '@/lib/supabase/server';

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

  if (typeof body !== 'object' || body === null || !('sliderValue' in body)) {
    return NextResponse.json({ error: 'sliderValue is required' }, { status: 400 });
  }

  const { sliderValue, note } = body as { sliderValue: unknown; note?: unknown };

  if (typeof sliderValue !== 'number') {
    return NextResponse.json({ error: 'sliderValue must be a number' }, { status: 400 });
  }

  try {
    const checkIn = await createCheckIn(user.id, {
      sliderValue,
      note: typeof note === 'string' ? note : null,
    });
    return NextResponse.json(checkIn, { status: 201 });
  } catch (error) {
    if (error instanceof CheckInValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
