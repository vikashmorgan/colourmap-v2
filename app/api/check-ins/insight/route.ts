import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { desc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { getRecentCheckIns } from '@/lib/db/queries/check-ins';
import { getMissions } from '@/lib/db/queries/missions';
import { lifeScanAnswers } from '@/lib/db/schema';
import { getEmotionalWord } from '@/lib/emotional-vocabulary';
import { createClient } from '@/lib/supabase/server';

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { checkInId } = await req.json();
  const db = getDb();

  const [checkIns, missions, scanRows] = await Promise.all([
    getRecentCheckIns(db, user.id, 5),
    getMissions(db, user.id),
    db
      .select()
      .from(lifeScanAnswers)
      .where(eq(lifeScanAnswers.userId, user.id))
      .orderBy(desc(lifeScanAnswers.updatedAt)),
  ]);

  const current = checkIns.find((ci) => ci.id === checkInId) || checkIns[0];
  if (!current) {
    return new Response('No check-in found', { status: 400 });
  }

  const previous = checkIns.filter((ci) => ci.id !== current.id).slice(0, 3);
  const linkedMission = current.missionId ? missions.find((m) => m.id === current.missionId) : null;

  // Build scan answers map
  const scanAnswers: Record<string, string> = {};
  const seen = new Set<string>();
  for (const row of scanRows) {
    if (!seen.has(row.key)) {
      seen.add(row.key);
      scanAnswers[row.key] = row.value;
    }
  }

  const fears = (scanAnswers.block_fears_list || '').split('|||').filter(Boolean);
  const strengths = (scanAnswers.flow_strengths_list || '').split('|||').filter(Boolean);

  const currentWord = current.emotionName || getEmotionalWord(current.sliderValue);
  const trajectory = previous
    .map((ci) => `${ci.emotionName || getEmotionalWord(ci.sliderValue)} (${ci.sliderValue}/100)`)
    .join(' → ');

  const contextParts: string[] = [`Just checked in: ${currentWord} (${current.sliderValue}/100)`];
  if (current.note) contextParts.push(`Note: "${current.note}"`);
  if (trajectory) contextParts.push(`Recent trajectory: ${trajectory}`);
  if (linkedMission) {
    contextParts.push(`Working on: "${linkedMission.title}"`);
    if (linkedMission.blocking) contextParts.push(`Challenge: "${linkedMission.blocking}"`);
  }
  if (fears.length > 0) contextParts.push(`Self-identified fears: ${fears.join(', ')}`);
  if (strengths.length > 0) contextParts.push(`Self-identified strengths: ${strengths.join(', ')}`);

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: `You are a reflection companion inside Colourmap, a personal cockpit app.
The user just checked in. Generate exactly 2 sentences.
Sentence 1: Name what you notice about this moment — the emotional state, what they wrote, or the shift from before. Be specific, use their words.
Sentence 2: Connect it to something — a trend from recent check-ins, a mission they're working on, or a fear/strength from their life scan. If there's no connection, name the texture of this moment.
Do not advise. Do not prescribe. Do not use bullet points. Speak as a wise friend noticing something aloud.`,
    prompt: contextParts.join('\n'),
  });

  return result.toTextStreamResponse();
}
