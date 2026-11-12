import { describe, expect, it } from 'vitest';

import type { Vec3 } from './bigbang';
import {
  GROUND as CITY_GROUND,
  fade,
  flier,
  gauges,
  makeParticles,
  PHASES,
  pieceAt,
  pieceCamera,
  pieceLook,
  SHIP_KEYS,
  SKY,
  STRATOSPHERE,
  setFly,
  slowMode,
  tally,
} from './city';
import { hasChar, textPixels } from './city-font';
import {
  advancePulses,
  BANDS,
  blocked,
  blockTower,
  CANAL_DEPTH,
  cruiser,
  DISTRICTS,
  districtAt,
  districtOf,
  floorAt,
  gameItems,
  inBore,
  LANDMARKS,
  lanternLit,
  PORTALS,
  portalJump,
  pulseAt,
  pulseSpeed,
  pulses,
  SHIP_SLOTS,
  SKY_LANTERNS,
  shipGrain,
  skyLantern,
  touchLanterns,
  viewAt,
} from './city-game';
import { BLOCK_X, BLOCK_Z, beat, GROUND, TILE_I, TILE_J } from './city-grid';
import { CAR_LEN, CARS, carAt, HANG, RAIL, railAt, railCeiling, TRAINS } from './city-metro';
import {
  race,
  raceBanner,
  raceStep,
  resetRace,
  rival,
  TRACKS,
  trackItems,
  trackLength,
} from './city-race';
import { CONSTELLATIONS, skyGrain, starDir } from './city-sky';
import { fade as journeyFade } from './journey';

const finite = (v: number[]) => v.every(Number.isFinite);
const ship = PHASES.findIndex((p) => p.id === 'ship');

describe('the game city: its plan', () => {
  it('stands on the chapter’s ground', () => {
    expect(GROUND).toBe(CITY_GROUND);
  });

  it('lays out six bands of districts, a district each side of the avenue, the same every time', () => {
    expect(BANDS).toHaveLength(TILE_J / 8);
    const seen = new Set(BANDS.flat());
    expect(seen.size).toBe(Object.keys(DISTRICTS).length);
    for (let J = 0; J < TILE_J; J++) {
      const band = BANDS[Math.floor(J / 8)] as [string, string];
      expect(districtOf(-1, J)).toBe(band[0]);
      expect(districtOf(0, J)).toBe(band[1]);
      // The plan repeats every tile, across and along.
      expect(districtOf(-1, J + TILE_J)).toBe(band[0]);
      expect(districtOf(TILE_I, J)).toBe(band[1]);
    }
    const a = JSON.stringify(blockTower(3, 17));
    expect(JSON.stringify(blockTower(3, 17))).toBe(a);
    expect(DISTRICTS.chinatown.name).toBe('Chinatown');
    // Every district has its own beat, a simple ratio of the city's one clock.
    for (const d of Object.values(DISTRICTS)) expect(d.tempo).toBeGreaterThan(0);
  });

  it('builds each landmark on an open plaza at its district’s middle crossing', () => {
    expect(LANDMARKS.length).toBeGreaterThanOrEqual(8);
    for (const L of LANDMARKS) {
      expect(districtAt(L.x + (L.x > 0 ? 1 : -1), L.z + 1)).toBe(L.d);
      for (const [dx, dz] of [
        [-5, -5],
        [5, -5],
        [5, 5],
        [-5, 5],
      ]) {
        const tw = blockTower(
          Math.floor((L.x + (dx as number)) / BLOCK_X),
          Math.floor((L.z + (dz as number)) / BLOCK_Z),
        );
        expect(tw.shape).toBe('plaza');
      }
    }
    // The Studio's buildings join the city as whole districts.
    expect(
      LANDMARKS.filter((l) => l.kind === 'studio')
        .map((l) => l.set)
        .sort(),
    ).toEqual(['domes', 'factories', 'temples']);
  });

  it('keeps every tower out of the avenue and leaves streets of six or more', () => {
    for (let I = -6; I < 6; I++) {
      for (let J = 0; J < TILE_J; J++) {
        const tw = blockTower(I, J);
        if (tw.shape !== 'box') continue;
        expect(Math.abs(tw.x) - tw.hx).toBeGreaterThanOrEqual(9 - 1e-9);
        expect(tw.x - tw.hx - I * BLOCK_X).toBeGreaterThanOrEqual(3 - 1e-9);
        expect((I + 1) * BLOCK_X - tw.x - tw.hx).toBeGreaterThanOrEqual(3 - 1e-9);
        expect(tw.z - tw.hz - J * BLOCK_Z).toBeGreaterThanOrEqual(3 - 1e-9);
      }
    }
  });

  it('holds you out of walls but lets you through a tower’s tunnel and down into a canal', () => {
    let bored = null as ReturnType<typeof blockTower> | null;
    for (let I = -6; I < 6 && !bored; I++)
      for (let J = 0; J < TILE_J && !bored; J++)
        if (blockTower(I, J).bore) bored = blockTower(I, J);
    expect(bored).not.toBeNull();
    const tw = bored as ReturnType<typeof blockTower>;
    const b = tw.bore as NonNullable<typeof tw.bore>;
    expect(blocked([tw.x, GROUND + 3, tw.z + (b.axis === 0 ? b.hw + 3 : 0)])).toBe(
      Math.abs(GROUND + 3 - b.y) >= b.hh - 1.2 || b.axis === 2,
    );
    const inside: Vec3 = [tw.x, b.y, tw.z];
    expect(inBore(tw, inside)).toBe(true);
    expect(blocked(inside)).toBe(false);
    expect(blocked([tw.x, b.y + b.hh + 0.5, tw.z])).toBe(true);
    // A canal under a cross street of the Canals district.
    const z = 20 * BLOCK_Z;
    expect(floorAt(80, z)).toBe(GROUND - CANAL_DEPTH);
    expect(floorAt(80, z + 8)).toBe(GROUND);
    expect(blocked([80, GROUND - 10, z])).toBe(false);
    expect(blocked([80, GROUND - 10, z + 8])).toBe(true);
  });

  it('lights everything it adds at finite places, in reach, high and low', () => {
    const eyes: Vec3[] = [
      [0, GROUND + 9, 150],
      [60, GROUND + 25, 400],
      [-70, GROUND + 15, 960],
      [80, GROUND - 10, 680],
      [0, GROUND + 450, 800],
    ];
    const o = [0, 0, 0, 0, 0, 0];
    for (const eye of eyes) {
      const items = [...gameItems(eye, [0, -0.2, -1], 12), ...trackItems(eye, 12, 160)];
      expect(items.length).toBeGreaterThan(0);
      for (const it of items) {
        expect(Number.isFinite(it.d)).toBe(true);
        for (let s = 0; s < it.count; s += Math.max(1, Math.floor(it.count / 25))) {
          if (!it.site(s, o)) continue;
          expect(finite(o)).toBe(true);
          expect(Math.min(o[3] as number, o[4] as number, o[5] as number)).toBeGreaterThanOrEqual(
            0,
          );
        }
      }
    }
    expect(viewAt(GROUND + 20)).toBe(160);
    expect(viewAt(GROUND + 500)).toBeGreaterThan(700);
  });

  it('spells its word signs from a pixel font, and welcomes you to the City of Dreams', () => {
    for (const ch of 'WELCOME TO THE CITY OF DREAMS BANK BAR HOTEL METRO RACE')
      if (ch !== ' ') expect(hasChar(ch)).toBe(true);
    const t = textPixels('BANK');
    expect(t.px.length).toBeGreaterThan(40);
    for (let i = 0; i < t.px.length; i += 2) {
      expect(t.px[i]).toBeLessThan(t.w);
      expect(t.px[i + 1]).toBeLessThan(t.h);
    }
    expect(textPixels('WELCOME TO THE\nCITY OF DREAMS').h).toBeGreaterThan(t.h);
  });
});

describe('the game city: what moves', () => {
  it('sends the tunnels’ pulses on ahead of the ship, always faster than it', () => {
    for (const v of [0, 9, 27]) expect(pulseSpeed(v)).toBeGreaterThan(v);
    const f0 = pulses.front;
    advancePulses(1, 27, [0, 0, -1]);
    expect(pulses.front - f0).toBeGreaterThan(27);
    expect(pulses.dz).toBe(-1);
    // A ring's brightness follows the front down the tunnel the way you fly.
    for (let z = 0; z < 30; z++) {
      const p = pulseAt(z, 2);
      expect(p).toBeGreaterThanOrEqual(0.25);
      expect(p).toBeLessThanOrEqual(1);
    }
  });

  it('runs the metro on a smooth closed rail, its carriages hanging under it, the towers below', () => {
    let worst = 0;
    const step = RAIL.length / RAIL.n;
    for (let i = 0; i < RAIL.n; i++) {
      const a = railAt(i * step);
      const b = railAt((i + 1) * step);
      expect(Math.hypot(b.c[0] - a.c[0], b.c[1] - a.c[1], b.c[2] - a.c[2])).toBeLessThan(
        step * 1.5,
      );
      // The heading turns gently: no corners, only curves.
      worst = Math.max(
        worst,
        Math.acos(Math.max(-1, Math.min(1, a.f[0] * b.f[0] + a.f[1] * b.f[1] + a.f[2] * b.f[2]))),
      );
    }
    expect(worst).toBeLessThan(0.07);
    for (let j = 0; j < TRAINS; j++) {
      for (let car = 0; car < CARS; car++) {
        for (const t of [0, 17, 123]) {
          const K = carAt(j, car, t);
          expect(finite(K.c)).toBe(true);
          const s = (j / TRAINS) * RAIL.length + 13 * t - car * (CAR_LEN + 0.8);
          const r = railAt(s);
          expect(Math.hypot(K.c[0] - r.c[0], K.c[1] - r.c[1], K.c[2] - r.c[2])).toBeCloseTo(
            HANG,
            3,
          );
        }
      }
    }
    // Every tower the rail passes over stands below it.
    for (let i = 0; i < RAIL.n; i += 7) {
      const r = railAt(i * step);
      const tw = blockTower(Math.floor(r.c[0] / BLOCK_X), Math.floor(r.c[2] / BLOCK_Z));
      if (
        tw.shape === 'box' &&
        Math.abs(r.c[0] - tw.x) < tw.hx + 2 &&
        Math.abs(r.c[2] - tw.z) < tw.hz + 2
      )
        expect(GROUND + tw.h).toBeLessThan(r.c[1] - HANG - 1);
    }
    expect(railCeiling(100, 5)).toBe(railCeiling(100 + TILE_I, 5 + TILE_J));
  });

  it('keeps the other ships finite, in the streets, moving aside as you come near', () => {
    const eye: Vec3 = [0, GROUND + 20, 300];
    for (let slot = 0; slot < SHIP_SLOTS; slot++) {
      const a = cruiser(slot, 10, eye, [1000, 1000, 1000]);
      expect(finite(a.c)).toBe(true);
      expect(blocked(a.c)).toBe(false);
      for (const q of [0.1, 0.5, 0.9])
        expect(finite(shipGrain(a.design, q, slot * 7, a.c, a.f, 10).pos)).toBe(true);
      // You right beside it: it rises out of your way.
      const b = cruiser(slot, 10, eye, a.c);
      expect(b.c[1]).toBeGreaterThan(a.c[1] + 2);
    }
  });

  it('lights a sky lantern you fly through, and keeps it lit', () => {
    let t = 5;
    let L = skyLantern(0, 3, t);
    while (L.k < 0.9) {
      t += 0.5;
      L = skyLantern(0, 3, t);
    }
    expect(lanternLit(L.id)).toBe(false);
    expect(touchLanterns(L.c, t)).toBeGreaterThan(0);
    expect(lanternLit(L.id)).toBe(true);
    expect(SKY_LANTERNS).toBeGreaterThan(10);
  });

  it('carries you through a portal on to another district, ahead the way you fly', () => {
    const p = PORTALS[0] as (typeof PORTALS)[number];
    const a: Vec3 = [0, p.y, p.z + 0.5];
    const b: Vec3 = [0, p.y, p.z - 0.5];
    const dz = portalJump(a, b);
    expect(dz).toBeLessThan(0);
    expect(districtAt(0.5, b[2] + dz)).not.toBe(districtAt(0.5, b[2]));
    expect(portalJump([30, p.y, p.z + 0.5], [30, p.y, p.z - 0.5])).toBe(0);
    expect(portalJump([0, p.y, p.z + 3], [0, p.y, p.z + 2])).toBe(0);
  });

  it('beats on one slow clock, a soft swell, never a jump', () => {
    for (let t = 0; t < 4; t += 0.001) {
      const a = beat(t);
      expect(a).toBeGreaterThanOrEqual(0);
      expect(a).toBeLessThanOrEqual(1);
      expect(Math.abs(beat(t + 0.001) - a)).toBeLessThan(0.03);
    }
  });
});

describe('the game city: the sky', () => {
  it('keeps the Big Dipper and Cassiopeia up all night, and Orion in the south', () => {
    for (const t of [0, 200, 450, 700]) {
      for (const c of CONSTELLATIONS)
        for (const s of c.stars) expect(starDir(s.ra, s.dec, t)[1]).toBeGreaterThan(0);
      const rigel = CONSTELLATIONS[0]?.stars[6] as { ra: number; dec: number };
      expect(starDir(rigel.ra, rigel.dec, t)[2]).toBeGreaterThan(0);
    }
  });

  it('puts every sky grain somewhere finite, brighter the higher you are', () => {
    const c: Vec3 = [0, GROUND + 20, 0];
    let low = 0;
    let high = 0;
    for (let L = 0; L < 450; L++) {
      const a = skyGrain(L, 450, c, 200, 0, 30);
      const b = skyGrain(L, 450, c, 200, 1, 30);
      expect(finite([...a.pos, ...a.rgb])).toBe(true);
      low += a.rgb[0];
      high += b.rgb[0];
    }
    expect(high).toBeGreaterThan(low);
  });
});

describe('the game city: flying it', () => {
  const run = (keys: string[], seconds: number, t0: number) => {
    let t = t0;
    for (let i = 0; i < seconds * 60; i++) {
      t += 1 / 60;
      setFly(true, keys, 1 / 60, t);
    }
    return t;
  };

  it('super boosts into the stratosphere on Space and W, sees the whole city, and comes back down', () => {
    setFly(false, [], 0, 50);
    let t = run(['w', ' '], 2, 50);
    t = run(['w'], 14, t);
    const top = flier(t).c;
    expect(top[1]).toBeGreaterThan(GROUND + 400);
    expect(top[1]).toBeLessThanOrEqual(STRATOSPHERE + 1e-9);
    expect(gauges()[0]?.max).toBe(STRATOSPHERE - GROUND);
    // The eye stands far back and high, looking down on the plan.
    const { eye, target } = pieceCamera(ship, t);
    expect(eye[1] - top[1]).toBeGreaterThan(100);
    expect(target[1]).toBeLessThan(top[1] - 200);
    // From up there the city is laid out: lit grains everywhere.
    const all = makeParticles(3000);
    let lit = 0;
    for (const f of [0, 1, 2]) {
      setFly(true, [], 1 / 60, t + f / 60);
      lit = all
        .map((p) => pieceAt(p, ship, t + f / 60))
        .filter((g) => g.rgb[0] + g.rgb[1] + g.rgb[2] > 0).length;
    }
    expect(lit).toBeGreaterThan(1500);
    t = run(['s'], 14, t + 3 / 60);
    expect(flier(t).c[1]).toBeLessThan(SKY);
    setFly(false, [], 0, 0);
  });

  it('shows the plan clearly from the stratosphere: lit through the player’s fade, large grains, districts in their hues', () => {
    // 2026-11-12: "make city more visible from above".
    setFly(false, [], 0, 50);
    let t = run(['w', ' '], 2, 50);
    t = run(['w'], 14, t);
    const all = makeParticles(9000);
    for (const f of [0, 1, 2, 3]) {
      setFly(true, [], 1 / 60, t + f / 60);
      for (const p of all) pieceAt(p, ship, t + f / 60);
    }
    t += 3 / 60;
    const { eye } = pieceCamera(ship, t);
    // The grains are drawn large up there, as the Golden plan's are from its height.
    expect(pieceLook(ship).size).toBeGreaterThan(8);
    let ground = 0;
    let shown = 0;
    let glow = 0;
    const hues = new Set<string>();
    const colours = Object.values(DISTRICTS).map((d) => {
      const m = Math.max(...d.colour);
      return { id: d.id, c: d.colour.map((v) => v / m) };
    });
    for (const p of all) {
      const g = pieceAt(p, ship, t);
      const l = g.rgb[0] + g.rgb[1] + g.rgb[2];
      if (l <= 0 || g.pos[1] > GROUND + 140) continue;
      ground++;
      // What the player shows: through its fade, and inside its far plane (1600).
      const d = Math.hypot(g.pos[0] - eye[0], g.pos[1] - eye[1], g.pos[2] - eye[2]);
      const f = d < 1600 ? fade(g.pos, eye) : 0;
      if (f > 0.5) shown++;
      glow += l * f;
      const m = Math.max(...g.rgb);
      const near = colours.find((c) =>
        c.c.every((v, i) => Math.abs(v - (g.rgb[i] as number) / m) < 0.02),
      );
      if (near && g.pos[1] > GROUND + 1) hues.add(near.id);
    }
    // Before (2026-11-12) the player's fade, gone by 260 from the eye, left it all black: the mean
    // shown brightness of the plan's grains was 0.0002.
    expect(ground).toBeGreaterThan(2500);
    expect(shown / ground).toBeGreaterThan(0.9);
    expect(glow / ground).toBeGreaterThan(0.3);
    // Several districts, each read in its own hue.
    expect(hues.size).toBeGreaterThanOrEqual(4);
    t = run(['s'], 14, t);
    for (const p of all.slice(0, 200)) pieceAt(p, ship, t);
    expect(pieceLook(ship).size).toBe(1);
    setFly(false, [], 0, 0);
  });

  it('keeps the journey’s fade for every eye under the towers’ sky (every piece but the Ship climbing)', () => {
    const pos: Vec3 = [30, GROUND, -180];
    for (let k = 0; k < PHASES.length; k++) {
      for (const s of [0, 7, 19]) {
        const { eye } = pieceCamera(k, s);
        expect(eye[1]).toBeLessThan(SKY);
        expect(fade(pos, eye)).toBe(journeyFade(pos, eye));
      }
    }
  });

  it('slows to a drift and looks down on L, and back on L again', () => {
    setFly(false, [], 0, 60);
    let t = run([], 1, 60);
    expect(slowMode()).toBe(false);
    t = run(['l'], 1 / 60, t);
    t = run([], 3, t);
    expect(slowMode()).toBe(true);
    expect(gauges()[1]?.value).toBeLessThan(4);
    const { c } = flier(t);
    const { eye, target } = pieceCamera(ship, t);
    expect(eye[1]).toBeGreaterThan(c[1] + 6);
    expect(target[1]).toBeLessThan(c[1] - 5);
    expect(tally()).toMatch(/Slow|[A-Z]/);
    t = run(['l'], 1 / 60, t);
    t = run([], 3, t);
    expect(slowMode()).toBe(false);
    expect(gauges()[1]?.value).toBeGreaterThan(7);
    setFly(false, [], 0, 0);
  });

  it('gives L, Enter and V round buttons on a phone, with Space', () => {
    expect(SHIP_KEYS).toEqual([' ', 'l', 'enter', 'v']);
  });
});

describe('the game city: races', () => {
  it('keeps its tracks as data, one per quarter, Chinatown’s and the undercity’s full', () => {
    expect(TRACKS.filter((t) => t.full).map((t) => t.district)).toEqual(['chinatown', 'canals']);
    expect(new Set(TRACKS.map((t) => t.district)).size).toBe(TRACKS.length);
    for (const t of TRACKS) {
      expect(t.gates.length).toBeGreaterThanOrEqual(3);
      expect(trackLength(t)).toBeGreaterThan(50);
      for (const g of [t.start, ...t.gates]) expect(finite(g)).toBe(true);
    }
    const ct = TRACKS[0] as (typeof TRACKS)[number];
    expect(ct.bars.length).toBeGreaterThanOrEqual(4);
    expect(ct.bars.some((b) => b.spin !== 0)).toBe(true);
    // The undercity's run goes down under the street; the sky island's is high over the city.
    expect(Math.min(...(TRACKS[1]?.gates.map((g) => g[1]) ?? []))).toBeLessThan(GROUND);
    expect(TRACKS.find((t) => t.name === 'Sky Island Loop')?.start[1]).toBeGreaterThan(
      GROUND + 250,
    );
    // Every gate of the full tracks lies in open air.
    for (const t of TRACKS.filter((q) => q.full))
      for (const g of t.gates) expect(blocked(g)).toBe(false);
  });

  it('runs idle → prompt → countdown → racing → finished, gates in order, with rivals', () => {
    resetRace();
    const track = TRACKS[0] as (typeof TRACKS)[number];
    let t = 100;
    raceStep({ active: true, pos: [0, GROUND + 20, 500], enter: false, t });
    expect(race.phase).toBe('idle');
    raceStep({ active: true, pos: track.start, enter: false, t });
    expect(race.phase).toBe('prompt');
    expect(raceBanner(t)).toMatch(/Start the race\?/);
    const go = raceStep({ active: true, pos: track.start, enter: true, t });
    expect(race.phase).toBe('countdown');
    expect(go.hold).not.toBeNull();
    expect(raceBanner(t + 0.1)).toBe('3');
    expect(raceBanner(t + 2.1)).toBe('1');
    for (let j = 0; j < 3; j++) expect(finite(rival(j, t + 1)?.c ?? [Number.NaN])).toBe(true);
    t += 3.05;
    raceStep({ active: true, pos: track.start, enter: false, t });
    expect(race.phase).toBe('racing');
    // Skipping a gate does not count: the second before the first.
    t += 1;
    raceStep({ active: true, pos: track.gates[1] as Vec3, enter: false, t: t });
    expect(race.next).toBe(0);
    for (const g of track.gates) {
      t += 2;
      raceStep({ active: true, pos: g, enter: false, t });
    }
    expect(race.phase).toBe('finished');
    expect(race.place).toBeGreaterThanOrEqual(1);
    expect(raceBanner(t)).toMatch(/^(1st|2nd|3rd|4th) · 0:/);
    expect(race.best).not.toBeNull();
    t += 9;
    raceStep({ active: true, pos: [0, GROUND + 20, 500], enter: false, t });
    expect(race.phase).toBe('idle');
  });

  it('calls a race off on Esc or when you stray, and a bar slows you a moment', () => {
    resetRace();
    const track = TRACKS[0] as (typeof TRACKS)[number];
    let t = 300;
    raceStep({ active: true, pos: track.start, enter: false, t });
    raceStep({ active: true, pos: track.start, enter: true, t });
    t += 1;
    raceStep({ active: false, pos: track.start, enter: false, t: t });
    expect(race.phase).toBe('cancelled');
    expect(raceBanner(t)).toBe('Race off');
    t += 3;
    raceStep({ active: true, pos: track.start, enter: false, t });
    raceStep({ active: true, pos: track.start, enter: true, t });
    t += 3.1;
    raceStep({ active: true, pos: track.start, enter: false, t });
    expect(race.phase).toBe('racing');
    const bar = track.bars[0] as (typeof track.bars)[number];
    t += 0.1;
    const hit = raceStep({ active: true, pos: bar.at, enter: false, t: t });
    expect(hit.pace).toBeLessThan(1);
    t += 0.1;
    raceStep({
      active: true,
      pos: [track.start[0] + 300, track.start[1], track.start[2]],
      enter: false,
      t,
    });
    expect(race.phase).toBe('cancelled');
    resetRace();
  });
});
