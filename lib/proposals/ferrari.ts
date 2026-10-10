/*
 * THE FERRARI PITCH — the words, kept apart from the page so they can be
 * edited quickly. The page is components/FerrariPitch.tsx at /proposal/ferrari.
 * The reasoning behind the structure is docs/specs/ferrari-pitch.md.
 */

export const FERRARI_THESIS =
  'Technique gives a dream its form. Spirit gives the form its reason. Ferrari is where the two meet.';

export const FERRARI_WORDS = ['Roots', 'Technique', 'Spirit'] as const;

export const FERRARI_CONTEXT = [
  'The world is changing fast.',
  'In this new future, innovation is not a department. It is a mindset, a way of life: a way of staying brave while staying connected to our roots.',
];

export type PitchSection = {
  n: number;
  title: string;
  question: string;
  body: string[];
};

export const FERRARI_SECTIONS: PitchSection[] = [
  {
    n: 1,
    title: 'Context',
    question: 'Why now?',
    body: [
      'The world is changing fast. Innovation is a mindset and a way of life: staying brave and connected to our roots.',
    ],
  },
  {
    n: 2,
    title: 'Roots',
    question: 'What does not change?',
    body: [
      "Ferrari's philosophy: the engine as the heart, red as identity, never satisfied with the last result.",
      'Anything new grows out of the roots, not away from them.',
    ],
  },
  {
    n: 3,
    title: 'Technique vs spirit',
    question: 'What does it take?',
    body: [
      'Technique: precision, engineering, planning, discipline. Spirit: courage, boldness, passion, drive.',
      'Technique alone is cold; spirit alone is a dream with no road. A Ferrari is the proof that together they make something alive.',
    ],
  },
  {
    n: 4,
    title: "The artist's method",
    question: 'How do you work?',
    body: [
      "As an artist: taking time to think about a project, to plan and organise, and to make sure every choice is aligned with the brand's roots, values and philosophy.",
      'Technique in service of spirit.',
    ],
  },
  {
    n: 5,
    title: 'The spirit made visible',
    question: 'What will people feel?',
    body: [
      "Art reflects the brand's philosophy. The spirit is innovation, boldness, courage, and standing up for our highest potential and our dreams: ambition, focus, passion and drive, made visible.",
    ],
  },
  {
    n: 6,
    title: 'Discussion',
    question: 'Where do we go together?',
    body: ['Open questions, so the pitch ends as a conversation rather than a sale.'],
  },
];

/** The project shown in section 5: the AI Sculptures · Flow collection. */
export const FERRARI_PROJECT = {
  title: 'AI Sculptures · Flow',
  line: 'Sculptures imagined with AI, gathered under one idea: flow.',
  why: 'Technique and spirit in one process: the idea is free and imagined; the making is precise and engineered, with no compromise between the two.',
  steps: [
    'AI images',
    '3D videos',
    '3D assets',
    '3D print (extrusion)',
    'Delivered to clients',
    '3D gallery to walk through',
  ],
  aim: 'From AI images to real 3D videos and 3D assets, printed with extrusion methods, so the art reaches clients without anything built by hand. The final mission: a 3D gallery space, the sculptures in different materials, that visitors walk through.',
  link: '/art/flow',
};

export const FERRARI_QUESTIONS = [
  "Where does Ferrari's technique end and its spirit begin, or is that border the point?",
  'How does a brand stay brave as it grows, without losing its roots?',
  'What does "standing up for our highest potential" mean for a team, not only for a driver?',
  "How should art reflect a brand's philosophy without illustrating it literally?",
];

export type PitchQuote = { text: string; use: string };

/** Widely attributed to Enzo Ferrari; check the wording against his memoir before printing. */
export const FERRARI_QUOTES: PitchQuote[] = [
  {
    text: 'The best Ferrari ever made is the next one.',
    use: 'Context and close: innovation as a mindset',
  },
  {
    text: 'Ask a child to draw a car, and certainly he will draw it red.',
    use: 'Roots: identity strong enough to become instinct',
  },
  {
    text: 'Race cars are neither beautiful nor ugly. They become beautiful when they win.',
    use: 'Technique vs spirit: beauty earned through performance and courage',
  },
  { text: "I don't sell cars; I sell engines.", use: 'Technique: the engine as the heart' },
  { text: 'The Ferrari is a dream.', use: 'Spirit: standing up for dreams' },
];

export const FERRARI_AVOID = 'If you can dream it, you can do it.';

export const FERRARI_DINO =
  'Dino Ferrari died in 1956, aged 24. In late 1955 he had suggested a V6 engine, and he was writing about direct injection and smaller engines while carburettors were the norm. Ferrari later named the engines and a line of cars "Dino" after him, and Enzo dedicated his memoir to him. A young man\'s idea (spirit), made real through engineering (technique), carried forward as part of the roots.';

/** What is left before the application goes in. */
export const FERRARI_TODO = [
  'Confirm AI Sculptures · Flow as the project in section 5, or name another',
  'Verify each quote against Le mie gioie terribili (1962)',
  'Check the Dino dates against Ferrari’s own history pages',
  'Choose the format (slides, booklet or spoken) and the length',
  'Add the application details: role, contact, deadline',
];
