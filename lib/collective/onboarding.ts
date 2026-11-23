import { ARCHETYPES, type ArchetypeId, MEMBER_COLORS, type Member } from './model';

/** The guided questions that build a person's second brain, one per screen. */
export const QUESTIONS = [
  {
    field: 'archetype',
    title: 'Which star are you, most days?',
    hint: 'How you tend to work in a group. Pick the one that feels most like you.',
  },
  {
    field: 'style',
    title: 'How do you work best?',
    hint: 'Time of day, alone or together, fast or slow. One or two lines.',
  },
  {
    field: 'skills',
    title: 'What are you good at?',
    hint: 'Skills and crafts, separated by commas.',
  },
  {
    field: 'strengths',
    title: 'What do people come to you for?',
    hint: 'Your strengths as others see them.',
  },
  {
    field: 'places',
    title: 'Where do you feel most comfortable?',
    hint: 'Places, rooms, cities, situations.',
  },
  {
    field: 'moments',
    title: 'When did you feel at your best?',
    hint: 'A moment you felt empowered. A short sentence is enough.',
  },
  {
    field: 'intentions',
    title: 'What do you want to make or do next?',
    hint: 'Intentions for the coming months, separated by commas.',
  },
] as const;

export type Answers = { name: string } & Partial<
  Record<(typeof QUESTIONS)[number]['field'], string>
>;

const LIST_MAX = 6;
const TEXT_MAX = 160;

export function splitList(text: string | undefined): string[] {
  return (text ?? '')
    .split(/[,;\n]/)
    .map((s) => s.trim().slice(0, TEXT_MAX))
    .filter(Boolean)
    .slice(0, LIST_MAX);
}

function isArchetype(v: string | undefined): v is ArchetypeId {
  return ARCHETYPES.some((a) => a.id === v);
}

/** Turns onboarding answers into a member profile. Returns null until a name is given. */
export function profileFrom(answers: Answers, index: number): Member | null {
  const name = answers.name.trim().slice(0, 40);
  if (!name) return null;
  return {
    id: `me-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
    name,
    color: MEMBER_COLORS[index % MEMBER_COLORS.length],
    archetype: isArchetype(answers.archetype) ? answers.archetype : 'maker',
    style: (answers.style ?? '').trim().slice(0, TEXT_MAX),
    skills: splitList(answers.skills),
    strengths: splitList(answers.strengths),
    places: splitList(answers.places),
    moments: splitList(answers.moments),
    intentions: splitList(answers.intentions),
  };
}
