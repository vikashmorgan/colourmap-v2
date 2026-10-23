/*
 * WHY LEARN THE REAL TOOLS — a set of notes, in the owner's words.
 *
 * Shown at /ai/why-learn, opened from the AI tab. It is a set of notes rather
 * than an essay: each note is one thought, and new ones are added at the end.
 */

export type WhyNote = { id: string; title: string; body: string };

export const WHY_LEARN_TITLE = 'Why learn the real tools';
export const WHY_LEARN_LINE =
  'AI is a tool we have to challenge, not a mind we can hand our thinking to. These are the notes on why we still need to learn the real tools, such as coding and SQL.';

export const WHY_LEARN_NOTES: WhyNote[] = [
  {
    id: 'mediocrity',
    title: 'AI made mediocrity cheaper',
    body: 'Anything average can now be made in seconds. That is not the same as making something good.',
  },
  {
    id: 'lazy',
    title: 'It made us lazy',
    body: 'When the answer arrives instantly, we stop asking whether it is the right answer.',
  },
  {
    id: 'deeper',
    title: 'We need to go deeper into the problem',
    body: 'We have to challenge the AI. Accepting its first answer is skipping the problem, not solving it.',
  },
  {
    id: 'assumptions',
    title: 'AI works on assumptions, and the assumptions add up',
    body: 'Every answer rests on choices it made for you without saying so. Each one is small; together they decide the result.',
  },
  {
    id: 'business',
    title: 'In a business, a problem shows you what you did not control',
    body: 'When something breaks, you realise you were never clear on the assumptions. You kept adding subconscious assumptions, and you do not control them anymore.',
  },
  {
    id: 'art',
    title: 'The art is to check and to challenge the code',
    body: 'Read what it wrote. Ask why. Test it against what is true. Ownership comes from understanding, not from having pressed generate.',
  },
  {
    id: 'tools',
    title: 'So we learn the real tools',
    body: 'Coding, SQL and the rest are how you read, check and own what AI produces, instead of trusting it blind.',
  },
];
