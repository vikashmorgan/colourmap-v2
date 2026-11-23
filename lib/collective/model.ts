/**
 * Collective Brain: each member's second brain (how they work, what they are good
 * at, where they feel at their best, what they want to make), and the group as the
 * sum of those profiles.
 */

/** The eight archetype stars: how a person tends to work in a group. */
export const ARCHETYPES = [
  { id: 'seer', name: 'Seer', line: 'sees where things could go' },
  { id: 'rebel', name: 'Rebel', line: 'questions the way it is done' },
  { id: 'maker', name: 'Maker', line: 'turns ideas into things' },
  { id: 'architect', name: 'Architect', line: 'designs the structure' },
  { id: 'keeper', name: 'Keeper', line: 'keeps it running and reliable' },
  { id: 'healer', name: 'Healer', line: 'cares for the people' },
  { id: 'wanderer', name: 'Wanderer', line: 'brings in the outside world' },
  { id: 'muse', name: 'Muse', line: 'inspires and gives it soul' },
] as const;

export type ArchetypeId = (typeof ARCHETYPES)[number]['id'];

export type Member = {
  id: string;
  name: string;
  color: string;
  archetype: ArchetypeId;
  /** How they like to work, in their own words. */
  style: string;
  skills: string[];
  strengths: string[];
  /** Places where they feel most comfortable. */
  places: string[];
  /** Moments when they felt empowered, at their best. */
  moments: string[];
  /** What they want to make or do next. */
  intentions: string[];
};

export const MEMBER_COLORS = ['#e8c27a', '#8fd0c4', '#8ed99c', '#b9a3f0', '#ec9a80', '#8fc4ef'];

/** Invented demo group, so the map has life before real members join. */
export const DEMO_MEMBERS: Member[] = [
  {
    id: 'vic',
    name: 'Vic',
    color: '#e8c27a',
    archetype: 'seer',
    style: 'Big picture first, then building with my hands late at night.',
    skills: ['sculpture', 'visual design', 'pitching ideas'],
    strengths: ['seeing how people could connect', 'energy that gets things started'],
    places: ['a studio with music on', 'long tables with friends'],
    moments: ['showing a finished piece to a room of strangers'],
    intentions: ['open a studio where people come to make things', 'build an app for the group'],
  },
  {
    id: 'martin',
    name: 'Martin',
    color: '#8fd0c4',
    archetype: 'architect',
    style: 'Calm focus, clear plans, short feedback loops.',
    skills: ['software engineering', 'product strategy', 'data'],
    strengths: ['turning a vague idea into a plan', 'keeping the scope small'],
    places: ['a quiet desk early in the morning', 'whiteboard sessions'],
    moments: ['shipping a product people used the same day'],
    intentions: ['build something that is ours, not a client’s', 'build an app for the group'],
  },
  {
    id: 'lino',
    name: 'Lino',
    color: '#8ed99c',
    archetype: 'wanderer',
    style: 'Walks first, decides later. Learns by looking.',
    skills: ['photography', 'storytelling', 'editing'],
    strengths: ['noticing people others miss', 'patience'],
    places: ['the city at dawn', 'trains between cities'],
    moments: ['a stranger crying at one of my photos'],
    intentions: ['turn my photos of the city into a book', 'photograph the people of the studio'],
  },
  {
    id: 'shadow',
    name: 'Shadow',
    color: '#b9a3f0',
    archetype: 'muse',
    style: 'Nocturnal. Works in bursts, needs space to feel it.',
    skills: ['music production', 'live performance', 'sound design'],
    strengths: ['setting the mood of a room', 'honesty'],
    places: ['small dark rooms with good speakers', 'home studio at night'],
    moments: ['playing three songs live without hiding'],
    intentions: ['play live at night more often', 'score a short film'],
  },
  {
    id: 'waji',
    name: 'Waji',
    color: '#ec9a80',
    archetype: 'healer',
    style: 'People first. Organises through food and warmth.',
    skills: ['cooking', 'hosting events', 'community building'],
    strengths: ['making strangers feel at home', 'reliability'],
    places: ['a busy kitchen', 'Sunday tables'],
    moments: ['twelve strangers who became friends over one dinner'],
    intentions: ['cook for strangers every Sunday', 'host a dinner with a live set'],
  },
];
