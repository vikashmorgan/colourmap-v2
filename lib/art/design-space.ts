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
  | 'city'
  | 'chinatown'
  | 'neon'
  | 'gates';

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
      // 2026-11-24: "love the fire sparking on the sides at start do more passages like that".
      v(
        'passage',
        'Stage passage',
        'Like the start: mirror pairs of flame columns down both edges, lighting one after another as you come in, gold sparks arcing over the road to cross.',
      ),
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
  {
    // 2026-11-23: "enrich chinatown run with elements from the city's amazing chinatown, adapted to
    // the 3d world of the drive", and the same for the Neon District.
    id: 'chinatown',
    name: 'Chinatown',
    vars: [
      v(
        'gate',
        'Red gate',
        'The City’s red gate across the road every 400 m: four pillars, upturned roofs, 中華街 on its plaque.',
      ),
      v('lanterns', 'Lantern strings', 'Strings of red lanterns hung across the road every 28 m.'),
      v(
        'signs',
        'Tall signs',
        'Signs hanging over the road’s edges: ラーメン, 茶, 龍, 酒, 夢, 麺, 福, 喫茶.',
      ),
      v('pagodas', 'Pagodas', 'Five-tiered pagodas beside the road, their eaves in gold.'),
      v('dragon', 'Dragon', 'A dragon of light flying just ahead of you, weaving over the road.'),
      v('sky', 'Sky lanterns', 'Paper lanterns rising slowly beside the road.'),
      v(
        'undertown',
        'Undertown',
        'On the road’s underside, where Chinatown Run flips over its edge: hanging shophouses in deep red and violet, lanterns rising on strings of light, a gate saying UNDERTOWN.',
      ),
      // 2026-11-24: "other parts with rows of fires shooting up as u pass … explosions. and circle
      // of fire to pass through". Placed by Chinatown Run's lap (lib/art/chinatown-lap.ts).
      v(
        'firerows',
        'Fire rows',
        'Burners down both edges that shoot up one after another as you come to them: a wave of fire running just ahead of you.',
      ),
      v(
        'blasts',
        'Explosions',
        'Drums beside the road that blow as you come: a flash, a fireball, sparks flung high and a shock ring along the ground.',
      ),
      v(
        'firerings',
        'Rings of fire',
        'Burning rings standing over the road; through one, a surge, and it flares as you pass.',
      ),
    ],
  },
  {
    id: 'neon',
    name: 'Neon District',
    vars: [
      v(
        'towers',
        'Neon towers',
        'Towers either side wearing bands of neon, a beacon on every spire.',
      ),
      v('blades', 'Blade signs', 'Tall neon blade signs standing out over the road’s edges.'),
      v('bridges', 'Sky bridges', 'Lit tubes crossing high over the road between two towers.'),
      v('docks', 'Docks', 'Landing platforms on posts beside the road, lights round their rims.'),
      v('traffic', 'Traffic', 'Ships in lanes over the road at four heights, one colour each.'),
      v(
        'jumps',
        'Jump bridges',
        'Neon frames up every kicker, a bridge across the void under your flight, arrows down the landing.',
      ),
    ],
  },
  {
    // 2026-11-23: "i want different awesome gates … u pass through them and get the boosters and
    // weapons." The looks a track's gates can wear (lib/art/drive-gates.ts), one every 240 m here.
    id: 'gates',
    name: 'Gates',
    vars: [
      v(
        'fire',
        'Fire spitters',
        'Two iron pillars spitting fire in toward the road and out the sides.',
      ),
      v('halo', 'Halo', 'A half ring of soft light standing over the road.'),
      v('glow', 'Inner light', 'An arch filled with a soft sheet of light you drive through.'),
      v(
        'chrome',
        'Old chrome',
        'Polished chrome columns and arch, the sky and horizon in its curves.',
      ),
      v('rust', 'Rusty metal', 'A riveted girder portal, rusted through: Mars’s own.'),
      v(
        'fabric',
        'Local fabric',
        'Poles hung with the place’s cloth, swaying: red silk, neon mesh, sail.',
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

/** The cells a track wears for good (2026-11-23: "then use them on the track"): Chinatown Run and
 * the Neon District dressed in their own district's pieces. Chinatown Run's tall signs are its
 * street's own now (lib/art/chinatown-street.ts, 2026-11-24), up every shophouse face, so it no
 * longer wears Design's (still there to pick). */
/** The stage passages run on every road (2026-11-24). */
const PASSAGE: [CategoryId, string] = ['slide', 'passage'];
const DRESS: Record<string, [CategoryId, string][]> = {
  gold: [PASSAGE],
  coast: [PASSAGE],
  canyon: [PASSAGE],
  night: [PASSAGE],
  sky: [PASSAGE],
  chinatown: [
    PASSAGE,
    ['chinatown', 'gate'],
    ['chinatown', 'lanterns'],
    ['chinatown', 'sky'],
    ['chinatown', 'undertown'],
    ['chinatown', 'firerows'],
    ['chinatown', 'blasts'],
    ['chinatown', 'firerings'],
  ],
  neon: [PASSAGE, ['neon', 'blades'], ['neon', 'bridges'], ['neon', 'traffic'], ['neon', 'jumps']],
};

export function cellOf(cat: CategoryId, id: string): Pos | null {
  const ci = CATEGORIES.findIndex((c) => c.id === cat);
  const vi = ci < 0 ? -1 : CATEGORIES[ci].vars.findIndex((x) => x.id === id);
  return vi < 0 ? null : { cat: ci, v: vi };
}

/** A world's own dressing (empty for the rest). */
export function dressingFor(world: string): Pos[] {
  return (DRESS[world] ?? []).map(([c, id]) => cellOf(c, id)).filter((p): p is Pos => p !== null);
}

/** Where the design space opens on a world: its own district's category, else where you left it. */
export function designStart(world: string, saved: Pos): Pos {
  const own =
    world === 'chinatown' || world === 'neon'
      ? cellOf(world, CATEGORIES.find((c) => c.id === world)?.vars[0].id ?? '')
      : null;
  return own ?? saved;
}
