import { describe, it } from 'vitest';

import { makeParticles, type Vec3 } from './bigbang';
import { flier, PHASES, pieceAt, pieceCamera, placeShip, setFly } from './city';
import { GROUND } from './city-grid';
import { inAtlantis, lanePhase, MOUTH, resetSpeedway } from './city-speedway';

/*
 * The speed tunnel's frame against the city's (2026-11-15: "the speed tunnel to atlantis ... cuts
 * the fps or feels laggy"). Off by default (timings, not checks); run with
 *   CITY_BENCH=1 NODE_OPTIONS=--no-experimental-webstorage bunx vitest run \
 *     lib/city-speedway.bench.test.ts --silent=false --reporter=verbose
 * Each line: the frame's cost (setFly + pieceCamera + pieceAt over every grain) after 30 frames to
 * settle; `fill` the grains' screen area in megapixels on a 1080-high screen (the GPU's work with
 * additive points), `near` the grains closer than 15, `lit` those lit in view, `gain` how far the
 * racing lights move a frame and `rel` how far they gain on the ship.
 */

const ship = PHASES.findIndex((p) => p.id === 'ship');

function run(label: string, at: Vec3, n: number, keys: string[], laneZ: number | null) {
  const ps = makeParticles(n);
  setFly(false, [], 0, 0);
  resetSpeedway();
  setFly(true, [], 1 / 60, 5);
  placeShip(at, 0);
  const dt = 1 / 60;
  let t = 5;
  if (laneZ !== null) {
    for (; t < 20 && !inAtlantis(); t += dt) setFly(true, [' '], dt, t + dt);
    placeShip([0, GROUND + 60, laneZ], 0);
  }
  const ms: number[] = [];
  let fill = 0;
  let near = 0;
  let lit = 0;
  let gain = 0;
  let rel = 0;
  let m = 0;
  for (let f = 0; f < 150; f++) {
    const ph = lanePhase();
    const z = flier(t).c[2];
    const a = performance.now();
    setFly(true, keys, dt, t + dt);
    t += dt;
    const cam = pieceCamera(ship, t);
    const spots = ps.map((p) => pieceAt(p, ship, t));
    const took = performance.now() - a;
    if (f < 30) continue;
    ms.push(took);
    m++;
    gain += lanePhase() - ph;
    rel += lanePhase() - ph - Math.abs(flier(t).c[2] - z);
    const e = cam.eye;
    const fw = [cam.target[0] - e[0], cam.target[1] - e[1], cam.target[2] - e[2]];
    const fl = Math.hypot(fw[0] as number, fw[1] as number, fw[2] as number);
    for (const s of spots) {
      const dx = s.pos[0] - e[0];
      const dy = s.pos[1] - e[1];
      const dz = s.pos[2] - e[2];
      const d = (dx * (fw[0] as number) + dy * (fw[1] as number) + dz * (fw[2] as number)) / fl;
      if (d < 0.3 || dx * dx + dy * dy + dz * dz - d * d > (d * 0.9) ** 2) continue;
      const px = Math.min((1080 * 0.42) / d, 400);
      fill += px * px;
      if (d < 15) near++;
      if (s.rgb[0] + s.rgb[1] + s.rgb[2] > 0.004) lit++;
    }
  }
  ms.sort((x, y) => x - y);
  const mean = ms.reduce((s, x) => s + x, 0) / ms.length;
  const at95 = ms[Math.floor(ms.length * 0.95)] as number;
  console.log(
    `${label.padEnd(12)} n=${n} mean=${mean.toFixed(2)}ms p95=${at95.toFixed(2)} max=${(ms[ms.length - 1] as number).toFixed(2)} fill=${(fill / m / 1e6).toFixed(2)}Mpx near=${Math.round(near / m)} lit=${Math.round(lit / m)} gain=${(gain / m).toFixed(2)} rel=${(rel / m).toFixed(2)} atlantis=${inAtlantis()}`,
  );
}

describe.skipIf(!process.env.CITY_BENCH)('speed tunnel bench', () => {
  it('times a frame in the city, the mouth and along the lane', () => {
    for (const n of [6500, 15000]) {
      run('city', [0, GROUND + 60, 900], n, [' '], null);
      run('mouth', [0, MOUTH.deck + 30, MOUTH.zIn + 4], n, [], null);
      for (const z of [-40, -250, -450, -560])
        run(`lane${z}`, [0, GROUND + 60, MOUTH.zIn + 20], n, [' '], z);
      run('lane-shift', [0, GROUND + 60, MOUTH.zIn + 20], n, [' ', 'shift'], -40);
    }
  }, 300000);
});
