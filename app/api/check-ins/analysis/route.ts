import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

import { getDb } from '@/lib/db/client';
import { getRecentCheckIns } from '@/lib/db/queries/check-ins';
import { getMissions } from '@/lib/db/queries/missions';
import { getEmotionalWord } from '@/lib/emotional-vocabulary';
import { createClient } from '@/lib/supabase/server';

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const db = getDb();
  const [checkIns, missions] = await Promise.all([
    getRecentCheckIns(db, user.id, 20),
    getMissions(db, user.id),
  ]);

  if (checkIns.length === 0) {
    return new Response('No check-ins to analyze', { status: 400 });
  }

  const missionMap = new Map(missions.map((m) => [m.id, m]));

  const checkInSummary = checkIns
    .map((ci) => {
      const word = getEmotionalWord(ci.sliderValue);
      const time = new Date(ci.createdAt).toLocaleString();
      const mission = ci.missionId ? missionMap.get(ci.missionId) : null;
      const parts = [`${word} (${ci.sliderValue}/100) at ${time}`];
      if (ci.note) parts.push(`Note: "${ci.note}"`);
      if (ci.tags?.length) parts.push(`Tags: ${ci.tags.join(', ')}`);
      if (mission) {
        parts.push(`Mission: "${mission.title}"`);
        if (mission.blocking) parts.push(`Challenge: "${mission.blocking}"`);
      }
      return parts.join(' | ');
    })
    .join('\n');

  const activeMissions = missions
    .filter((m) => !m.completed)
    .map((m) => {
      const parts = [m.title];
      if (m.nextStep) parts.push(`Objective: ${m.nextStep}`);
      if (m.blocking) parts.push(`Challenge: ${m.blocking}`);
      return parts.join(' — ');
    })
    .join('\n');

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: `You are a warm, insightful reflection companion inside a personal cockpit app called Colourmap.
The user checks in with how they feel (slider from 0=Crushed to 100=Expansive) and tracks missions.
Your role: reflect on their recent emotional pattern and connect it to what they're doing.
Be poetic but grounded. Short — 3-5 sentences max. No bullet points, no headers.
Speak as a wise friend, not a therapist. Name what you see, don't prescribe.
Use their actual words and emotional states. If you notice a pattern, name it gently.`,
    prompt: `Here are the user's recent check-ins (most recent first):
${checkInSummary}

${activeMissions ? `Active missions:\n${activeMissions}` : 'No active missions right now.'}

Reflect on their emotional trajectory and how it connects to what they're working on. What pattern do you see?`,
  });

  return result.toTextStreamResponse();
}
