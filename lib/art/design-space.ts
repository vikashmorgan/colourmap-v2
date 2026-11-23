/**
 * The Golden Track's design space (docs/specs/drive-tracks.md, "Design space"): the real track on
 * autopilot, one element at a time laid along it, to choose what to build next (2026-11-23:
 * "create a design space for the golden racetrack where u can play with elements u would add …
 * move up for variation move right for another category of element", then "use the actual universe
 * of the track in question"). Pure: the catalogue, moving round it, and the picks. The drawing is
 * components/drive/design-space.ts.
 */

export type CategoryId =
  | 'arches'
  | 'slide'
  | 'fireworks'
  | 'surface'
  | 'markings'
  | 'bridges'
  | 'tunnels'
  | 'city';

export interface Variation {
  id: string;
  name: string;
  note: string;
}

export interface Category {
  id: CategoryId;
  name: string;
  vars: Variation[];
}

const v = (id: string, name: string, note: string): Variation => ({ id, name, note });

export const CATEGORIES: Category[] = [
  {
    id: 'arches',
    name: 'Fire arches',
    vars: [
      v(
        'ring',
        'Ring of fire',
        'A gold hoop every 120 m, fifteen burners round it licking in toward you.',
      ),
      v('pillars', 'Flame pillars', 'Two posts and a lintel; fire columns roar off the post tops.'),
      v(
        'gothic',
        'Blue gothic',
        'A pointed arch of gas-blue tongues burning outward from its two arcs.',
      ),
      v(
        'spiral',
        'Spiral tunnel',
        'Rings every 9 m; the burner turns round each ring, so the fire spirals as you pass.',
      ),
      v(
        'dragon',
        'Dragon breath',
        'Jets fire across the road above you, left then right, taking turns.',
      ),
      v('sparks', 'Spark curtain', 'Gold sparks rain from the lintel and you drive through them.'),
    ],
  },
  {
    id: 'slide',
    name: 'Slide fire',
    vars: [
      v(
        'jets',
        'Outer jets',
        'On every bend the outside edge shoots fire sideways as you slide past.',
      ),
      v(
        'wave',
        'Wave',
        'Both edges flare just ahead of you: a wave of fire riding along with the car.',
      ),
      v('wall', 'Red wall', 'A dense wall of red fire leaning out over the outside of the bend.'),
      v(
        'tongues',
        'Blue tongues',
        'Long blue jets trailing backward, drawn out like the slide itself.',
      ),
      v('fans', 'Fans', 'Each outside burner sprays three ways in gold fire.'),
      v('geysers', 'Geysers', 'White-hot columns straight up off the outside edge.'),
    ],
  },
  {
    id: 'fireworks',
    name: 'Fireworks',
    vars: [
      v(
        'chrys',
        'Chrysanthemum',
        'Gold spheres bursting over the road ahead, rockets climbing from both sides.',
      ),
      v('peony', 'Peony', 'Round bursts in red, gold, rose, white and a soft blue.'),
      v('ring', 'Rings', 'Flat rings of colour, each turned its own way.'),
      v('willow', 'Willow', 'Slow gold bursts that hang and drift down for seconds.'),
      v('palm', 'Palm', 'Nine fiery arms per burst, like a palm opening.'),
      v(
        'arch',
        'Rocket arch',
        'Rockets from both edges in turn burst over the road: an arch of gold ahead.',
      ),
      v('finale', 'Grand finale', 'Everything at once, for the end of the lap.'),
    ],
  },
  {
    id: 'surface',
    name: 'Road surface',
    vars: [
      v('dots', 'Gold dots', 'A field of gold dots on the dark road.'),
      v(
        'glass',
        'Glass, lit below',
        'A glass road with bands of gold light rolling forward under it.',
      ),
      v('hex', 'Hex tiles', 'Hexagon tiles with glowing seams, like the golden city’s floors.'),
      v('rails', 'Light rails', 'A dark road with two rails of light and ties every 8 m.'),
      v('tarmac', 'Race tarmac', 'Warm tarmac, a gold double centre line, red and white kerbs.'),
      v('mirror', 'Black mirror', 'Wet black glass with gold streaks sliding in it.'),
    ],
  },
  {
    id: 'markings',
    name: 'Road markings',
    vars: [
      v('chevrons', 'Chevrons', 'Gold chevrons pointing forward, flowing toward you.'),
      v(
        'dashes',
        'Flowing dashes',
        'The centre line runs forward with you; lane lights race faster.',
      ),
      v('kerbs', 'Kerbs', 'Red and gold kerbs at both edges.'),
      v(
        'pulse',
        'Pulse rings',
        'Bands of light sweep forward across the road, a little faster than you.',
      ),
      v('grid', 'Light grid', 'A 3 m grid with cyan-gold edges.'),
      v('arrows', 'Edge arrows', 'Small arrows near each edge, running forward.'),
    ],
  },
  {
    id: 'bridges',
    name: 'Bridges',
    vars: [
      v('arcades', 'Arcades', 'Walls of arches along both edges, an arch every 12 m.'),
      v(
        'suspension',
        'Suspension',
        'Towers every 260 m, main cables sagging between them, hangers every 8 m.',
      ),
      v(
        'stayed',
        'Cable-stayed',
        'An A-shaped pylon every 240 m, its cables fanning down to both edges.',
      ),
      v(
        'bowstring',
        'Bowstring',
        'Arches over the road every 120 m, hung with cables, braced across the top.',
      ),
      v('truss', 'Truss', 'A Warren truss box: chords at both edges, diagonals every 8 m.'),
      v(
        'rings',
        'Golden rings',
        'The road threads gold rings every 16 m; every fourth stands on a column.',
      ),
    ],
  },
  {
    id: 'tunnels',
    name: 'Tunnels',
    vars: [
      v(
        'lattice',
        'Lattice tube',
        'Sixteen golden helices crossing into a diamond lattice round the road.',
      ),
      v(
        'rings',
        'Ring of light',
        'Rings every 6 m, a pulse of light running through them ahead of you.',
      ),
      v(
        'gallery',
        'Gallery',
        'A cantilevered canopy over one side, ribs every 5 m, open to the other.',
      ),
      v(
        'pergola',
        'Pergola',
        'Portal frames every 8 m; every third stands φ times taller with braces.',
      ),
      v('hex', 'Hex tube', 'A six-sided glass tube, a frame every 10 m, one diagonal per pane.'),
      v(
        'spiral',
        'Spiral ribbon',
        'One wide ribbon of light winding round the road, a turn every 60 m.',
      ),
    ],
  },
  {
    id: 'city',
    name: 'City backdrop',
    vars: [
      v(
        'plan',
        'Golden plan',
        'The golden city beside the road: rings growing φ times taller toward a lattice heart.',
      ),
      v(
        'temples',
        'Temples',
        'Ziggurats, Kepler pyramids and rotundas built from φ along the way.',
      ),
      v(
        'domes',
        'Domes',
        'Golden geodesic glasshouses and bubble clusters, a warm light inside each.',
      ),
      v('skyline', 'Skyline', 'Towers either side, floor lines every 6 m, beacons on top.'),
      v(
        'solar',
        'Solar tower',
        'A tower 150 m tall, six rings of mirrors each √φ further out, beams climbing to it.',
      ),
      v(
        'lanes',
        'Sky lanes',
        'Towers with ships flying lanes beside the road, white one way, red the other.',
      ),
    ],
  },
];

export interface Pos {
  cat: number;
  v: number;
}

/** Right is the next category, up the next variation; both wrap. A new category keeps the row
 * when it has one. */
export function move(p: Pos, dCat: number, dVar: number): Pos {
  const n = CATEGORIES.length;
  let cat = p.cat;
  let vi = p.v;
  if (dCat) {
    cat = (((cat + dCat) % n) + n) % n;
    vi = Math.min(vi, CATEGORIES[cat].vars.length - 1);
  }
  if (dVar) {
    const m = CATEGORIES[cat].vars.length;
    vi = (((vi + dVar) % m) + m) % m;
  }
  return { cat, v: vi };
}

/** A pick's name as the list shows and copies it: "Category · Variation". */
export function pickKey(p: Pos): string {
  const c = CATEGORIES[p.cat];
  return `${c.name} · ${c.vars[p.v].name}`;
}

/** A saved position, made safe (anything unknown falls back to the first cell). */
export function safePos(x: unknown): Pos {
  if (!Array.isArray(x) || x.length !== 2) return { cat: 0, v: 0 };
  const [c, vi] = x;
  if (!Number.isInteger(c) || c < 0 || c >= CATEGORIES.length) return { cat: 0, v: 0 };
  const m = CATEGORIES[c].vars.length;
  return { cat: c, v: Number.isInteger(vi) && vi >= 0 && vi < m ? vi : 0 };
}

/** Saved picks, kept only if they still name a cell. */
export function safePicks(x: unknown): string[] {
  if (!Array.isArray(x)) return [];
  const all = new Set(
    CATEGORIES.flatMap((c, ci) => c.vars.map((_, vi) => pickKey({ cat: ci, v: vi }))),
  );
  return [...new Set(x.filter((k): k is string => typeof k === 'string' && all.has(k)))];
}

/** The road-surface and marking looks, as the overlay shader numbers them. */
export const SURFACE_STYLE: Record<string, number> = {
  dots: 0,
  glass: 1,
  hex: 2,
  rails: 3,
  tarmac: 4,
  mirror: 5,
};
export const MARKING: Record<string, number> = {
  chevrons: 1,
  dashes: 2,
  kerbs: 3,
  pulse: 4,
  grid: 5,
  arrows: 6,
};
