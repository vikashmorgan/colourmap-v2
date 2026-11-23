import { ARCHETYPES, type ArchetypeId, type Member } from './model';
import { linksBetween, THEMES } from './themes';

export const COLLECTIVE_MODEL = 'claude-sonnet-5-5';
export const MAX_QUESTION = 600;
export const MAX_MEMBERS = 13;

const archetypeName = (id: ArchetypeId) => ARCHETYPES.find((a) => a.id === id)?.name ?? id;
const list = (xs: string[]) => (xs.length ? xs.join('; ') : 'not shared');

export function describeMember(m: Member): string {
  return [
    `${m.name} (${archetypeName(m.archetype)})`,
    `  works best: ${m.style || 'not shared'}`,
    `  good at: ${list(m.skills)}`,
    `  people come to them for: ${list(m.strengths)}`,
    `  most comfortable in: ${list(m.places)}`,
    `  at their best when: ${list(m.moments)}`,
    `  wants to make next: ${list(m.intentions)}`,
  ].join('\n');
}

export const SYSTEM_PROMPT = `You are the Collective Brain of a small group of friends and classmates.
You see each person's profile: how they work, what they are good at, where they feel at their best, and what they want to make next.
Your job is to help them see how they combine: who fits with whom, for what, and the first small step they could take together.
Be warm, concrete and honest. Name real people and real overlaps from the profiles. If a combination is weak, say so kindly and suggest who could complete it.
Never invent facts about people beyond their profiles. Never rank people as better or worse.
Answer in under 220 words, plain text, short paragraphs, no markdown symbols.`;

/** The user message for Claude: the selected profiles, how they link, and the group's question. */
export function buildPrompt(members: Member[], question: string): string {
  const links = linksBetween(members);
  const name = (id: string) => members.find((m) => m.id === id)?.name ?? id;
  const themeName = (id: string) => THEMES.find((t) => t.id === id)?.name ?? id;
  const linkLines = links.map(
    (l) =>
      `- ${name(l.a)} and ${name(l.b)}: ${l.kind === 'shared' ? 'both want' : 'one can help the other with'} ${l.themes.map(themeName).join(', ')}`,
  );
  return [
    `The combination (${members.length} ${members.length === 1 ? 'person' : 'people'}):`,
    members.map(describeMember).join('\n\n'),
    '',
    'Links the map found:',
    linkLines.length ? linkLines.join('\n') : '- none yet',
    '',
    `Their question: ${question}`,
  ].join('\n');
}
