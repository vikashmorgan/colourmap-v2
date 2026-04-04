import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';
import { desc, eq } from 'drizzle-orm';

import { getDb } from '@/lib/db/client';
import { getRecentCheckIns } from '@/lib/db/queries/check-ins';
import { lifeScanAnswers } from '@/lib/db/schema';
import { getEmotionalWord } from '@/lib/emotional-vocabulary';
import { createClient } from '@/lib/supabase/server';

const TONE_PROMPTS: Record<string, string> = {
  cowboy:
    'Speak like a wise cowboy — laconic, honest, earthy metaphors. Short sentences. "Reckon you been riding hard." Keep it to 3-4 sentences.',
  warrior:
    'Speak like a warrior mentor — direct, disciplined, respectful. Martial metaphors. "The blade is sharpened in difficulty." Keep it to 3-4 sentences.',
  princess:
    'Speak with grace and warmth — poetic, nurturing, empowering. Royal metaphors. "Your inner kingdom grows." Keep it to 3-4 sentences.',
  mythic:
    'Speak like a mythic oracle — symbolic, archetypal, layered. "The hero descends before ascending." Keep it to 3-4 sentences.',
  practical:
    'Speak practically — data-driven, clear, structured. No metaphors. Use numbers and patterns. Keep it to 3-4 sentences.',
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { prompt, tone } = await req.json();
  const db = getDb();

  const [checkIns, scanRows] = await Promise.all([
    getRecentCheckIns(db, user.id, 20),
    db
      .select()
      .from(lifeScanAnswers)
      .where(eq(lifeScanAnswers.userId, user.id))
      .orderBy(desc(lifeScanAnswers.updatedAt)),
  ]);

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
  const vision = scanAnswers.vision_where || '';

  const checkInSummary = checkIns
    .slice(0, 10)
    .map((ci) => {
      const word = ci.emotionName || getEmotionalWord(ci.sliderValue);
      return `${word} (${ci.sliderValue}/100)${ci.note ? ` — ${ci.note.slice(0, 60)}` : ''}`;
    })
    .join('\n');

  const tonePrompt = TONE_PROMPTS[tone] || TONE_PROMPTS.cowboy;

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: `You are a companion cat inside Colourmap, a personal journey app.
${tonePrompt}
You are reflecting on the user's journey — their emotional patterns, their challenges, their growth.
Do not advise unless asked. Name what you see. Be warm, not clinical.
If the user is in a dark period, acknowledge it with compassion. Darkness is part of the path.`,
    prompt: [
      prompt,
      checkInSummary ? `\nRecent emotional states:\n${checkInSummary}` : '',
      fears.length > 0 ? `\nFears they identified: ${fears.join(', ')}` : '',
      strengths.length > 0 ? `\nStrengths they identified: ${strengths.join(', ')}` : '',
      vision ? `\nTheir vision: ${vision}` : '',
    ]
      .filter(Boolean)
      .join('\n'),
  });

  return result.toTextStreamResponse();
}
