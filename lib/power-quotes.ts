/*
 * POWER QUOTES — one under the life tree when G opens (components/LifeTree.tsx).
 *
 * Martin, 2026-10-30: "a power quote below it. Form a list of 50 cool quotes:
 * Kerouac, Jack London, artists, rockstars, boxers etc."
 *
 * Kept to lines that are on the record as theirs -- from their books, letters
 * and interviews -- and short enough to read at a glance. Left out on purpose:
 * the many famous lines that were never said by the person they are hung on
 * (most of what passes for Kerouac and Bukowski online), and song lyrics.
 * Where a line is a trim of a longer sentence, the trim keeps its sense.
 */

export type Quote = { text: string; who: string };

export const POWER_QUOTES: Quote[] = [
  // Writers on the road
  {
    text: 'Nothing behind me, everything ahead of me, as is ever so on the road.',
    who: 'Jack Kerouac',
  },
  { text: 'The only people for me are the mad ones.', who: 'Jack Kerouac' },
  { text: 'Walking on water wasn’t built in a day.', who: 'Jack Kerouac' },
  {
    text: 'My fault, my failure, is not in the passions I have, but in my lack of control of them.',
    who: 'Jack Kerouac',
  },
  {
    text: 'You can’t wait for inspiration. You have to go after it with a club.',
    who: 'Jack London',
  },
  { text: 'I would rather be ashes than dust.', who: 'Jack London' },
  { text: 'The proper function of man is to live, not to exist.', who: 'Jack London' },
  { text: 'Courage is grace under pressure.', who: 'Ernest Hemingway' },
  {
    text: 'The world breaks everyone, and afterward many are strong at the broken places.',
    who: 'Ernest Hemingway',
  },
  { text: 'Never mistake motion for action.', who: 'Ernest Hemingway' },
  { text: 'Buy the ticket, take the ride.', who: 'Hunter S. Thompson' },
  {
    text: 'We have to continually be jumping off cliffs and developing our wings on the way down.',
    who: 'Kurt Vonnegut',
  },
  { text: 'What matters most is how well you walk through the fire.', who: 'Charles Bukowski' },

  // Painters and makers
  { text: 'Inspiration exists, but it has to find you working.', who: 'Pablo Picasso' },
  {
    text: 'Every child is an artist. The problem is how to remain an artist once we grow up.',
    who: 'Pablo Picasso',
  },
  { text: 'I dream my painting and I paint my dream.', who: 'Vincent van Gogh' },
  { text: 'What would life be if we had no courage to attempt anything?', who: 'Vincent van Gogh' },
  {
    text: 'Great things are done by a series of small things brought together.',
    who: 'Vincent van Gogh',
  },
  { text: 'Feet, what do I need you for when I have wings to fly?', who: 'Frida Kahlo' },
  {
    text: 'At the end of the day, we can endure much more than we think we can.',
    who: 'Frida Kahlo',
  },
  {
    text: 'I don’t think about art when I’m working. I try to think about life.',
    who: 'Jean-Michel Basquiat',
  },
  {
    text: 'I’ve been absolutely terrified every moment of my life, and I’ve never let it keep me from doing a single thing I wanted to do.',
    who: 'Georgia O’Keeffe',
  },
  { text: 'Have no fear of perfection. You’ll never reach it.', who: 'Salvador Dalí' },
  {
    text: 'They always say time changes things, but you actually have to change them yourself.',
    who: 'Andy Warhol',
  },
  {
    text: 'Painting is self-discovery. Every good artist paints what he is.',
    who: 'Jackson Pollock',
  },
  { text: 'Creativity takes courage.', who: 'Henri Matisse' },
  { text: 'Nothing is a waste of time if you use the experience wisely.', who: 'Auguste Rodin' },
  {
    text: 'Art lives through the imaginations of the people who are seeing it.',
    who: 'Keith Haring',
  },

  // Musicians
  { text: 'Do not fear mistakes. There are none.', who: 'Miles Davis' },
  {
    text: 'Sometimes you have to play a long time to be able to play like yourself.',
    who: 'Miles Davis',
  },
  { text: 'Knowledge speaks, but wisdom listens.', who: 'Jimi Hendrix' },
  { text: 'Wanting to be someone else is a waste of who you are.', who: 'Kurt Cobain' },
  {
    text: 'I don’t know where I’m going from here, but I promise it won’t be boring.',
    who: 'David Bowie',
  },
  { text: 'The future is unwritten.', who: 'Joe Strummer' },
  { text: 'You build on failure. You use it as a stepping stone.', who: 'Johnny Cash' },
  { text: 'Don’t compromise yourself. You’re all you’ve got.', who: 'Janis Joplin' },
  { text: 'Build a good name. Keep your name clean.', who: 'Patti Smith' },
  { text: 'I won’t be a rock star. I will be a legend.', who: 'Freddie Mercury' },

  // Fighters
  { text: 'Float like a butterfly, sting like a bee.', who: 'Muhammad Ali' },
  {
    text: 'Don’t quit. Suffer now and live the rest of your life as a champion.',
    who: 'Muhammad Ali',
  },
  {
    text: 'Champions aren’t made in gyms. Champions are made from something they have deep inside them: a desire, a dream, a vision.',
    who: 'Muhammad Ali',
  },
  {
    text: 'It isn’t the mountains ahead to climb that wear you out; it’s the pebble in your shoe.',
    who: 'Muhammad Ali',
  },
  {
    text: 'Service to others is the rent you pay for your room here on earth.',
    who: 'Muhammad Ali',
  },
  { text: 'Everybody has a plan until they get punched in the mouth.', who: 'Mike Tyson' },
  {
    text: 'Discipline is doing what you hate to do, but doing it like you love it.',
    who: 'Mike Tyson',
  },
  {
    text: 'Fear is like fire. It can cook for you, or it can burn your house down.',
    who: 'Cus D’Amato',
  },
  {
    text: 'It ain’t about how hard you hit. It’s about how hard you can get hit and keep moving forward.',
    who: 'Rocky Balboa',
  },
  { text: 'Be water, my friend.', who: 'Bruce Lee' },
  {
    text: 'Absorb what is useful, discard what is useless, add what is specifically your own.',
    who: 'Bruce Lee',
  },
  {
    text: 'Do not pray for an easy life. Pray for the strength to endure a difficult one.',
    who: 'Bruce Lee',
  },
];

/** A quote other than the one showing, from a 0..1 draw. */
export function nextQuote(current: number, r: number): number {
  const n = POWER_QUOTES.length;
  if (n < 2) return 0;
  const k = Math.floor(r * (n - 1)) % (n - 1);
  return k >= current ? k + 1 : k;
}
