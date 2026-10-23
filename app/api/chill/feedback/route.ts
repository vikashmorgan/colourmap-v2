import { NextResponse } from 'next/server';
import { clientIp, createRateLimiter } from '@/lib/api/rate-limit';
import { jsonError, parseJsonBody } from '@/lib/api/route-helpers';
import { isOwnerEmail } from '@/lib/auth/owner';
import { insertChillFeedback, listChillFeedback } from '@/lib/db/queries/chill-feedback';
import { createClient } from '@/lib/supabase/server';

/*
 * Notes for Martin from the public Chill Machine.
 *
 *   POST { message, name?, palette?, website? }  → { ok: true } | 400 | 429 { error }
 *   GET                                          → { notes } for the owner, 404 for anyone else
 *
 * Anyone may POST: guests (rate-limited per IP) and signed-in users (per user
 * id). `website` is a honeypot — a filled one answers 200 and stores nothing.
 */

const MAX_MESSAGE = 2000;
const MAX_NAME = 80;
const MAX_PALETTE = 40;
const HOUR = 60 * 60 * 1000;

// In-memory, per instance — fine for v1 (see lib/api/rate-limit.ts).
const guestLimiter = createRateLimiter({ limit: 5, windowMs: HOUR });
const userLimiter = createRateLimiter({ limit: 30, windowMs: HOUR });

const TOO_MANY = "That's a lot of notes for one hour — try again a bit later";

async function currentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}

export async function POST(request: Request) {
  const bodyResult = await parseJsonBody(request);
  if (!bodyResult.ok) return bodyResult.response;
  const body = (bodyResult.value ?? {}) as Record<string, unknown>;

  if (typeof body.website === 'string' && body.website.trim()) {
    return NextResponse.json({ ok: true });
  }

  const message = typeof body.message === 'string' ? body.message.trim() : '';
  if (!message) return jsonError('Write a note first', 400);
  if (message.length > MAX_MESSAGE) {
    return jsonError(`Notes are up to ${MAX_MESSAGE} characters`, 400);
  }

  if (body.name !== undefined && body.name !== null && typeof body.name !== 'string') {
    return jsonError('Name must be text', 400);
  }
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (name.length > MAX_NAME) return jsonError(`Names are up to ${MAX_NAME} characters`, 400);

  const palette =
    typeof body.palette === 'string' && body.palette.trim()
      ? body.palette.trim().slice(0, MAX_PALETTE)
      : null;

  const user = await currentUser();
  const allowed = user ? userLimiter.hit(user.id) : guestLimiter.hit(clientIp(request));
  if (!allowed) return jsonError(TOO_MANY, 429);

  await insertChillFeedback({
    userId: user?.id ?? null,
    name: user ? null : name || null,
    message,
    palette,
  });

  return NextResponse.json({ ok: true });
}

export async function GET() {
  const user = await currentUser();
  if (!user || !isOwnerEmail(user.email)) return jsonError('Not found', 404);
  return NextResponse.json({ notes: await listChillFeedback(200) });
}
