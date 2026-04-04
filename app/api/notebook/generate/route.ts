import { anthropic } from '@ai-sdk/anthropic';
import { streamText } from 'ai';

import { createClient } from '@/lib/supabase/server';

const PROMPTS: Record<string, { system: string; build: (ctx: string) => string }> = {
  chorus: {
    system: `You are a songwriting partner. Generate 2-3 chorus ideas based on the context given.
Keep each idea short (2-4 lines). Show the lyrical idea, not just a description.
Be creative, poetic, and varied in style. No explanations — just the ideas, separated by blank lines.
Label each with a short vibe tag like [uplifting], [melancholic], [raw], etc.`,
    build: (ctx) => `Here's what I'm working on:\n${ctx}\n\nGive me chorus ideas.`,
  },
  verse: {
    system: `You are a songwriting partner. Generate 2-3 verse ideas based on the context given.
Keep each idea short (3-5 lines). Show the actual lyrics, not descriptions.
Vary the tone and angle. No explanations — just the ideas, separated by blank lines.
Label each with a short vibe tag like [storytelling], [introspective], [vivid], etc.`,
    build: (ctx) => `Here's what I'm working on:\n${ctx}\n\nGive me verse ideas.`,
  },
  chords: {
    system: `You are a music theory partner. Suggest 3 chord progression ideas based on the context.
For each: show the progression (e.g. Am - F - C - G), name the key, and add a one-line description of the feel.
If lyrics or a mood are given, match the harmonic feel to them.
Keep it concise. No long explanations.`,
    build: (ctx) => `Here's what I'm working on:\n${ctx}\n\nSuggest chord progressions.`,
  },
  bridge: {
    system: `You are a songwriting partner. Generate 2 bridge ideas that create contrast with the context given.
A bridge should shift perspective, key, or energy. Show the actual lyrics (2-3 lines each).
Label each with a vibe tag. No explanations.`,
    build: (ctx) => `Here's what I'm working on:\n${ctx}\n\nGive me bridge ideas.`,
  },
};

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return new Response('Unauthorized', { status: 401 });
  }

  const { type, context } = await req.json();

  const prompt = PROMPTS[type];
  if (!prompt) {
    return new Response('Invalid type', { status: 400 });
  }

  const result = streamText({
    model: anthropic('claude-haiku-4-5-20251001'),
    system: prompt.system,
    prompt: prompt.build(context || 'No context yet — surprise me with something fresh.'),
  });

  return result.toTextStreamResponse();
}
