/**
 * Drive, Mars: where the enemies live (docs/specs/mars-world.md, "Enemies"). Pure: the world's
 * habitat for lib/art/mars-foes.ts, taken from what stands on Mars (lib/art/mars.ts): robots round
 * the factories, the mega works and the wrecks; ghosts round the wrecks and the alien ruins;
 * spiders down both canyons' floors and round two loops on the open plain; manta flocks over the
 * dunes; UFOs over the busy places; squids high over the whole world.
 */

import { ARTEFACTS, SITES, siteHit, WRECKS } from '@/lib/art/mars';
import { CANYONS, canyonPoint } from '@/lib/art/mars-canyons';
import {
  type Foe,
  type Habitat,
  type Lair,
  makePath,
  type Path,
  placeFoes,
} from '@/lib/art/mars-foes';

/** A canyon's floor as a walk, its middle every 20 m from mouth to mouth. */
function canyonWalk(arcs: (typeof CANYONS)[number]): Path {
  const x: number[] = [];
  const y: number[] = [];
  for (const a of arcs) {
    const n = Math.max(2, Math.ceil((Math.abs(a.sweep) * a.R) / 20));
    for (let i = 0; i < n; i++) {
      const p = canyonPoint(a, i / n);
      x.push(p.x);
      y.push(p.y);
    }
  }
  return makePath(x, y, false);
}

/** A loop on the plain: a wobbly circle round a point. */
function plainLoop(cx: number, cy: number, r: number, seed: number): Path {
  const x: number[] = [];
  const y: number[] = [];
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    const rr = r * (1 + 0.18 * Math.sin(3 * a + seed));
    x.push(cx + Math.cos(a) * rr);
    y.push(cy + Math.sin(a) * rr);
  }
  return makePath(x, y, true);
}

/** The plain loops the two open-ground spiders walk. */
export const PLAIN_WALKS: [number, number, number, number][] = [
  [1650, 250, 330, 0.4],
  [-1300, 1150, 300, 2.1],
];

export function marsHabitat(): Habitat {
  const works: Lair[] = [
    ...SITES.filter(
      (s) =>
        s.kind === 'factory' ||
        s.kind === 'preheater' ||
        s.kind === 'silos' ||
        (s.kind === 'cooling' && s.r >= 30 && !isTownTower(s.x, s.y)),
    ).map((s) => ({ x: s.x, y: s.y, r: s.r })),
    // Round a wreck, outside its hull's length (they never roll through its shell).
    ...WRECKS.map((w) => ({
      x: w.x,
      y: w.y,
      r: Math.hypot(w.hull.bx - w.hull.ax, w.hull.by - w.hull.ay) / 2 + 10,
    })),
  ];
  const haunts: Lair[] = [
    ...WRECKS.map((w) => ({ x: w.x, y: w.y, r: 110 })),
    ...ARTEFACTS.filter((a) => a.kind === 'ruins').map((a) => ({ x: a.x, y: a.y, r: 46 })),
  ];
  const walks = [
    ...CANYONS.map(canyonWalk),
    ...PLAIN_WALKS.map(([x, y, r, s]) => plainLoop(x, y, r, s)),
  ];
  const flocks: Lair[] = [
    { x: 1400, y: 900, r: 420 },
    { x: -1900, y: 900, r: 400 },
    { x: 900, y: 4400, r: 380 },
  ];
  const skies: Lair[] = [
    { x: 0, y: 700, r: 500 },
    { x: -300, y: 2900, r: 600 },
    { x: 2500, y: 2600, r: 600 },
    { x: -1500, y: -500, r: 480 },
    { x: 0, y: 5600, r: 600 },
  ];
  const heights: Lair[] = [
    { x: -2500, y: -1500, r: 600 },
    { x: 2500, y: -1000, r: 600 },
    { x: 3500, y: 3500, r: 600 },
    { x: -3000, y: 4500, r: 600 },
    { x: 500, y: 7000, r: 600 },
    { x: -1000, y: 1500, r: 600 },
    { x: 1800, y: 5000, r: 600 },
    { x: -3800, y: 600, r: 600 },
  ];
  return {
    works,
    haunts,
    walks,
    flocks,
    skies,
    heights,
    clear: (x, y, r) => !siteHit(x, y, r + 2),
  };
}

/** The nuclear towns' ring towers stand among workers' blocks: no robots there. */
function isTownTower(x: number, y: number): boolean {
  return SITES.some((s) => s.kind === 'reactor' && Math.hypot(s.x - x, s.y - y) < 260);
}

/** Every foe at home, laid out once. */
const HOME: Foe[] = placeFoes(marsHabitat());

/** A fresh set of foes for a run (copies, so a run's hits never touch the next). */
export function spawnFoes(): Foe[] {
  return HOME.map((f) => ({ ...f }));
}
