/*
 * THE GALLERY: a room you walk through, for the AI Sculptures · Flow
 * collection (asked for 2026-10-16: "build the 3D room for me").
 *
 * A long hall. The collection's pictures hang in frames down both long walls;
 * sculptures stand on plinths down the middle, each in a noble material
 * (marble, bronze, gold or glass) that can be changed; your own 3D models (.glb
 * from Tripo or Meshy) can be dropped in and take the next free plinth.
 *
 * Three moods for the room: a white cube, a golden temple, and a dark space of
 * light.
 *
 * Pure: the numbers the scene is built from. The drawing is in
 * components/GalleryRoom.tsx.
 */

export type RoomFeel = 'white' | 'temple' | 'dark';
export type Material = 'marble' | 'bronze' | 'gold' | 'glass';
export type Form = 'flow' | 'wave' | 'fracture' | 'ascension' | 'lotus' | 'circles' | 'rings';

export const ROOM_FEELS: { id: RoomFeel; name: string; line: string }[] = [
  { id: 'white', name: 'White cube', line: 'Bright, quiet, nothing but the work.' },
  { id: 'temple', name: 'Golden temple', line: 'Warm gold walls, columns, a marble floor.' },
  {
    id: 'dark',
    name: 'Dark space of light',
    line: 'Black space, the pieces lit from above, motes of light.',
  },
];

/** What each material is made of, for a physical renderer. */
export const MATERIALS: Record<
  Material,
  {
    name: string;
    color: string;
    metalness: number;
    roughness: number;
    transmission?: number;
    clearcoat?: number;
    veins?: boolean;
  }
> = {
  marble: {
    name: 'Marble',
    color: '#f2eee6',
    metalness: 0,
    roughness: 0.28,
    clearcoat: 0.6,
    veins: true,
  },
  bronze: { name: 'Bronze', color: '#8a5a2e', metalness: 1, roughness: 0.38 },
  gold: { name: 'Gold', color: '#d4a64a', metalness: 1, roughness: 0.22 },
  glass: { name: 'Glass', color: '#e8f3ff', metalness: 0, roughness: 0.05, transmission: 1 },
};

export type Sculpture = {
  id: string;
  name: string;
  form: Form;
  material: Material;
  line: string;
  /** For the circles: which of the seven. */
  variant?: number;
  /** For the generated rings: the recipe's number (see `ringRecipe`). */
  seed?: number;
};

/** The pieces that stand in the room from the start: forms of the collection's themes, until the real 3D models arrive. */
export const SCULPTURES: Sculpture[] = [
  {
    id: 'flow',
    name: 'Flow',
    form: 'flow',
    material: 'bronze',
    line: 'A knot of movement that never stops, the collection in one line.',
  },
  {
    id: 'fracture',
    name: 'Total fracture',
    form: 'fracture',
    material: 'glass',
    line: 'A man curled into a ball on the ground, back curved, everything broken like glass.',
  },
  {
    id: 'wave',
    name: 'Wave',
    form: 'wave',
    material: 'marble',
    line: 'A ribbon of stone rising and falling like water.',
  },
  {
    id: 'ascension',
    name: 'Ascension',
    form: 'ascension',
    material: 'gold',
    line: 'Rings turning as they climb.',
  },
  {
    id: 'lotus',
    name: 'Lotus',
    form: 'lotus',
    material: 'marble',
    line: 'Petals opening around a still heart.',
  },
];

/**
 * THE CIRCLES (asked for 2026-10-16: "I love the golden circles sculpture, can
 * you do 7 of them, 7 different ones"): seven variations on Ascension's gold
 * rings, standing in a ring of their own at the end of the hall, a circle of
 * circles.
 */
export const CIRCLES: Sculpture[] = [
  {
    id: 'orbit',
    name: 'Orbit',
    form: 'circles',
    variant: 0,
    material: 'gold',
    line: 'Three great circles crossing like an armillary sphere, round a small golden sun.',
  },
  {
    id: 'spiral',
    name: 'Spiral',
    form: 'circles',
    variant: 1,
    material: 'gold',
    line: 'Rings climbing a helix, each a step higher and further round.',
  },
  {
    id: 'cascade',
    name: 'Cascade',
    form: 'circles',
    variant: 2,
    material: 'gold',
    line: 'Rings falling and tilting like water down a fall.',
  },
  {
    id: 'gyroscope',
    name: 'Gyroscope',
    form: 'circles',
    variant: 3,
    material: 'gold',
    line: 'A ring in a ring in a ring, each turning on its own axis.',
  },
  {
    id: 'chain',
    name: 'Chain',
    form: 'circles',
    variant: 4,
    material: 'gold',
    line: 'Five rings linked, rising one through the next.',
  },
  {
    id: 'bloom',
    name: 'Bloom',
    form: 'circles',
    variant: 5,
    material: 'gold',
    line: 'Eight rings opening round one axis, like petals.',
  },
  {
    id: 'infinity',
    name: 'Infinity',
    form: 'circles',
    variant: 6,
    material: 'gold',
    line: 'Two rings in a figure-eight, crossed by a thin third that turns.',
  },
];

/** The round room of the circles, at the end of the hall: how deep it is, and the ring the plinths stand on. */
export const CIRCLE_ROOM = { depth: 18, radius: 4.6 } as const;

/** Where the circles stand: evenly round a ring at the centre of the round room (the hall's last `depth` metres). */
export function circlePlaces(count: number, length: number): { x: number; z: number }[] {
  const cz = length - CIRCLE_ROOM.depth / 2;
  return Array.from({ length: count }, (_, i) => {
    // Start at the far side, so the first piece faces you as you come in.
    const a = Math.PI / 2 + (i / count) * Math.PI * 2;
    return { x: Math.cos(a) * CIRCLE_ROOM.radius, z: cz + Math.sin(a) * CIRCLE_ROOM.radius };
  });
}

/** The hall: x across (−W/2 … W/2), z along (0 … L), y up. */
export const HALL = {
  width: 14,
  height: 6.5,
  frameW: 2.4,
  frameH: 3,
  frameGap: 3.6,
  plinthGap: 6.5,
  plinthH: 1.1,
} as const;

/** How long the hall is, to hold `pictures` on its two long walls and `plinths` down its middle. */
export function hallLength(pictures: number, plinths: number): number {
  const perWall = Math.ceil(pictures / 2);
  return Math.max(perWall * HALL.frameGap + 6, (plinths + 1) * HALL.plinthGap, 24);
}

/** Where each picture hangs: alternating walls, evenly down the hall, facing in. */
export function framePlaces(
  pictures: number,
  length: number,
): { x: number; y: number; z: number; facing: 1 | -1 }[] {
  const perWall = Math.ceil(pictures / 2);
  const start = (length - (perWall - 1) * HALL.frameGap) / 2;
  return Array.from({ length: pictures }, (_, i) => {
    const wall = i % 2 === 0 ? -1 : 1;
    const k = Math.floor(i / 2);
    // Facing +x on the left wall (x = −W/2), −x on the right.
    return {
      x: (wall * HALL.width) / 2 - wall * 0.06,
      y: 2.6,
      z: start + k * HALL.frameGap,
      facing: (wall === -1 ? 1 : -1) as 1 | -1,
    };
  });
}

/** Where the plinths stand: down the middle, evenly. */
export function plinthPlaces(plinths: number, length: number): { x: number; z: number }[] {
  const gap = length / (plinths + 1);
  return Array.from({ length: plinths }, (_, i) => ({ x: 0, z: gap * (i + 1) }));
}

/** Keep a visitor inside the walls and out of the plinths. */
export function walkable(
  x: number,
  z: number,
  length: number,
  plinths: { x: number; z: number }[],
  radius = 0.45,
): { x: number; z: number } {
  const inner = HALL.width / 2 - radius - 0.3;
  let nx = Math.max(-inner, Math.min(inner, x));
  let nz = Math.max(radius + 0.3, Math.min(length - radius - 0.3, z));
  for (const p of plinths) {
    const dx = nx - p.x;
    const dz = nz - p.z;
    const d = Math.hypot(dx, dz);
    const min = 1.1 + radius;
    if (d < min) {
      const k = d > 1e-6 ? min / d : 1;
      nx = p.x + (d > 1e-6 ? dx * k : min);
      nz = p.z + (d > 1e-6 ? dz * k : 0);
    }
  }
  return { x: nx, z: nz };
}

/* ── the three rooms ── */

/*
 * The owner's vision (2026-10-16): "one room for projections; one room, the
 * corridor with 7 sculptures; one room a circle room with the 24 sculptures
 * disposed in a circle."
 *
 *   the corridor         the collection's pictures on both walls, the seven
 *                        circles down the middle
 *   the circle room      truly round, wider than the corridor: twenty-four
 *                        ring sculptures standing in a circle, and in the
 *                        middle the plinth where your own model appears
 *   the projection room  black, the Geometry Builder projected on three walls
 *
 * Earlier asks it absorbs: "30 different sculptures in that style … a wall with
 * 24 smaller sculptures … to see more options" (the 24 are those options, full
 * size); "the glass one is also very interesting" (some of the 24 are glass);
 * "the quantum liquid ones and the ones I love the most" (the projections).
 */

/** The width of the doorway in each wall between rooms. */
export const DOOR = 4;
/** The circle room: its radius, and the ring the twenty-four stand on. */
export const ROUND_ROOM = { radius: 13, ring: 9.5 } as const;
export const PROJECTION_ROOM = { depth: 22 } as const;
/** The corridor holds the seven circles. */
export const CORRIDOR_PLINTHS = 7;

export type Rooms = {
  /** Where the corridor ends (it starts at 0). */
  corridor: number;
  /** The circle room: where it starts and its centre. */
  round: number;
  roundCentre: number;
  /** Where the projection room starts, and the whole length. */
  projection: number;
  length: number;
  /** The walls between rooms, each with a doorway in its middle. */
  walls: number[];
};

export function rooms(pictures: number): Rooms {
  const corridor = hallLength(pictures, CORRIDOR_PLINTHS);
  const round = corridor;
  const roundCentre = round + ROUND_ROOM.radius;
  const projection = round + 2 * ROUND_ROOM.radius;
  const length = projection + PROJECTION_ROOM.depth;
  return { corridor, round, roundCentre, projection, length, walls: [corridor, projection] };
}

/** Where the twenty-four stand: evenly round the circle room's ring, leaving the two doorways clear. */
export function roundRoomPlaces(count: number, centre: number): { x: number; z: number }[] {
  return Array.from({ length: count }, (_, i) => {
    // Half a step off the doorway axis, so no piece stands in a doorway.
    const a = ((i + 0.5) / count) * Math.PI * 2;
    return { x: Math.sin(a) * ROUND_ROOM.ring, z: centre - Math.cos(a) * ROUND_ROOM.ring };
  });
}

/** Can a visitor stand at (x, z)? Inside the corridor, the round room or the projection room, or in a doorway. */
export function allowed(x: number, z: number, r: Rooms, radius = 0.45): boolean {
  const inner = HALL.width / 2 - radius - 0.3;
  if (z < radius + 0.3 || z > r.length - radius - 0.3) return false;
  // The doorways: a passage through each wall between rooms.
  for (const w of r.walls)
    if (Math.abs(z - w) < 1.6 && Math.abs(x) < DOOR / 2 - radius) return true;
  if (z <= r.corridor) return Math.abs(x) < inner && z < r.corridor - radius - 0.1;
  if (z >= r.projection) return Math.abs(x) < inner && z > r.projection + radius + 0.1;
  return Math.hypot(x, z - r.roundCentre) < ROUND_ROOM.radius - radius - 0.3;
}

/** Take a step: slide along a wall rather than stop dead, and step round the plinths. */
export function step(
  from: { x: number; z: number },
  to: { x: number; z: number },
  r: Rooms,
  plinths: { x: number; z: number; size?: number }[],
  radius = 0.45,
): { x: number; z: number } {
  let next = to;
  if (!allowed(next.x, next.z, r, radius)) {
    if (allowed(to.x, from.z, r, radius)) next = { x: to.x, z: from.z };
    else if (allowed(from.x, to.z, r, radius)) next = { x: from.x, z: to.z };
    else next = from;
  }
  for (const p of plinths) {
    const dx = next.x - p.x;
    const dz = next.z - p.z;
    const d = Math.hypot(dx, dz);
    const min = (p.size ?? 1.1) + radius;
    if (d < min && d > 1e-6) next = { x: p.x + (dx * min) / d, z: p.z + (dz * min) / d };
  }
  return allowed(next.x, next.z, r, radius) ? next : from;
}

/** A ring sculpture's recipe: which family of shape, and its numbers, all drawn from one seed. */
export type RingRecipe = {
  family: number;
  count: number;
  radius: number;
  tube: number;
  tilt: number;
  twist: number;
  spin: number;
};
export const RING_FAMILIES = 10;

export function ringRecipe(seed: number): RingRecipe {
  let x = (seed * 2654435761) % 2147483647 || 1;
  const rand = () => {
    x = (x * 16807) % 2147483647;
    return x / 2147483647;
  };
  rand();
  return {
    family: seed % RING_FAMILIES,
    count: 3 + Math.floor(rand() * 7),
    radius: 0.32 + rand() * 0.38,
    tube: 0.028 + rand() * 0.035,
    tilt: rand() * 0.9,
    twist: 0.3 + rand() * 1.1,
    spin: rand() < 0.4 ? 0.2 + rand() * 0.6 : 0,
  };
}

const RING_NAMES = [
  'Halo',
  'Vortex',
  'Lantern',
  'Crown',
  'Pulse',
  'Tide',
  'Ember',
  'Harmony',
  'Ascent',
  'Eclipse',
  'Rosette',
  'Cradle',
  'Echo',
  'Zenith',
  'Ripple',
  'Comet',
  'Mandala',
  'Oracle',
  'Drift',
  'Prism',
  'Garland',
  'Solstice',
  'Whirl',
  'Beacon',
];

/** The twenty-four of the circle room: mostly gold, some bronze and some glass (both were loved). */
export const CIRCLE_SERIES: Sculpture[] = RING_NAMES.map((name, i) => {
  const material: Material = i % 5 === 2 ? 'bronze' : i % 7 === 4 ? 'glass' : 'gold';
  return {
    id: `rings-${i + 1}`,
    name,
    form: 'rings',
    seed: i + 1,
    material,
    line: `Circles · ${String(i + 1).padStart(2, '0')}, in ${material}.`,
  };
});

/** The projection room's programs, from the Geometry Builder: the quantum and liquid fields, the sands, the galaxies. */
export const PROJECTIONS = [
  'Liquid Quantum',
  'Quantum Chaos',
  'Liquid Chaos',
  'Music Liquid Chaos',
  'Magnetic Sand',
  'Magnetic Sands 2',
  'Star Sand Lines',
  'Starflow Galaxy',
  'Liquid Pearl',
] as const;

export const PROJECTOR_URL = 'https://artprojection.vercel.app/';
export const projectionUrl = (preset: string) =>
  `${PROJECTOR_URL}?preset=${encodeURIComponent(preset)}&display=1`;
