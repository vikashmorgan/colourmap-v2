/**
 * Labs: the standalone prototypes (first built as single-page sketches) that now
 * live inside Colour Brain. Each one is a self-contained HTML page under
 * `public/labs/<slug>/index.html`, framed full-screen at `/labs/<slug>`.
 */
export type Lab = {
  slug: string;
  title: string;
  line: string;
};

export const LABS: readonly Lab[] = [
  {
    slug: 'mandala',
    title: 'Mandala of Ideas',
    line: 'Three worlds, nine paths, twenty-seven steps: a life laid out on one wheel.',
  },
  {
    slug: 'reflection-bubbles',
    title: 'Reflection Bubbles',
    line: 'A small group as stars, their thoughts in orbit, shared themes as planets.',
  },
  {
    slug: 'frontier-bubbles',
    title: 'Frontier Bubbles',
    line: 'A living map of collective intelligence: projects, people and next moves.',
  },
  {
    slug: 'tool-city',
    title: 'Tool City',
    line: 'Every tool as a block in a 3D city around the Mandala, linked by golden strings.',
  },
];

export function findLab(slug: string): Lab | undefined {
  return LABS.find((lab) => lab.slug === slug);
}

export function labSrc(lab: Lab): string {
  return `/labs/${lab.slug}/index.html`;
}
