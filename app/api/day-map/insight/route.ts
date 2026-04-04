import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

import { getDb } from '@/lib/db/client';
import { getRecentCheckIns } from '@/lib/db/queries/check-ins';
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

  const { dayMapEntries } = await req.json();
  const db = getDb();

  const checkIns = await getRecentCheckIns(db, user.id, 20);
  const today = new Date().toDateString();
  const todayCheckIns = checkIns.filter((ci) => new Date(ci.createdAt).toDateString() === today);

  if ((!dayMapEntries || dayMapEntries.length === 0) && todayCheckIns.length === 0) {
    return new Response('Not enough data', { status: 400 });
  }

  const dayMapSummary = (dayMapEntries || [])
    .map(
      (e: { time: string; activity: string; energy: number; category?: string; tag?: string }) =>
        `${e.time} ${e.activity}${e.category ? ` (${e.category})` : ''}${e.tag === 'good' ? ' [works]' : e.tag === 'drop' ? ' [drops]' : ''}`,
    )
    .join('\n');

  const checkInSummary = todayCheckIns
    .map((ci) => {
      const word = ci.emotionName || getEmotionalWord(ci.sliderValue);
      const time = new Date(ci.createdAt).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      });
      return `${time} ${word} (${ci.sliderValue}/100)${ci.note ? ` — ${ci.note.slice(0, 80)}` : ''}`;
    })
    .join('\n');

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: `You are an energy pattern observer inside Colourmap.
Generate exactly 1 sentence connecting the user's day map activities to their emotional check-ins.
Look for: energy peaks/drops after specific activities, meal patterns, correlations between activity type and emotional state.
Be specific — name the activity, name the time, name the pattern.
Do not advise. Just observe.`,
    prompt: `Day map:\n${dayMapSummary || 'No entries yet.'}\n\nCheck-ins:\n${checkInSummary || 'No check-ins yet.'}`,
  });

  return result.toTextStreamResponse();
}
