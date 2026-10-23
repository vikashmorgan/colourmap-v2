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
export type Form = 'flow' | 'wave' | 'fracture' | 'ascension' | 'lotus';

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

export type Sculpture = { id: string; name: string; form: Form; material: Material; line: string };

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
