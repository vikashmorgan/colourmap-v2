import { describe, expect, it } from 'vitest';

import { hash, makeParticles, type Vec3 } from './bigbang';
import {
  FLY_SPEED,
  PHASES,
  pieceAt,
  pieceCamera,
  placeShip,
  policeLight,
  STREET_BOOST,
  setFly,
} from './city';
import { BOUNTY_SLOT } from './city-bounty';
import { CORRIDOR_X } from './city-corridors';
import { blocked } from './city-game';
import { GROUND, type Item } from './city-grid';
import {
  CATCH_TIME,
  COOLDOWN,
  COP_GAPS,
  copAt,
  crumbAt,
  crumbHead,
  DRAG_LOW,
  HEAT_DOUBLE,
  HIDE_TIME,
  type LawInput,
  makeCrumbs,
  makePursuit,
  PURSUIT_SPEED,
  type Pursuit,
  pursuitDrag,
  pursuitItems,
  pursuitShows,
  pursuitStep,
  pushCrumb,
  SEARCH_TIME,
} from './city-pursuit';

/*
 * 2026-11-15: "space police with the flare lights ... think how police chases could be ... and
 * police stops chasing when u hide."
 */

const DT = 1 / 30;
const X = CORRIDOR_X[1] as number;

/** A straight flight down the corridor at `speed`, from z, `secs` long; the state stepped each frame. */
type Fly = {
  P: Pursuit;
  t: number;
  z: number;
  speed: number;
  double?: boolean;
  wall?: number;
  buzz?: boolean;
  calm?: boolean;
  on?: boolean;
  sees?: (from: Vec3, to: Vec3, t: number) => boolean;
};
function fly(f: Fly, secs: number, each?: (f: Fly) => void) {
  for (let k = 0; k < Math.round(secs / DT); k++) {
    f.t += DT;
    f.z -= f.speed * DT;
    const pos: Vec3 = [X, GROUND + 20, f.z];
    const inp: LawInput = {
      t: f.t,
      dt: DT,
      on: f.on ?? true,
      pos,
      speed: f.speed,
      double: f.double ?? false,
      low: true,
      wall: f.wall ?? 0,
      buzz: f.buzz ?? false,
      calm: f.calm ?? false,
      sees: (a, b) => (f.sees ? f.sees(a, b, f.t) : true),
    };
    pursuitStep(f.P, inp);
    each?.(f);
  }
}
const start = (speed = FLY_SPEED): Fly => ({ P: makePursuit(), t: 100, z: 0, speed });
/** A flight with the police already after it. */
function chased(speed = FLY_SPEED): Fly {
  const f = start(STREET_BOOST * FLY_SPEED * 2);
  f.double = true;
  for (let k = 0; k < 600 && f.P.phase !== 'pursue'; k++) fly(f, DT);
  expect(f.P.phase).toBe('pursue');
  f.double = false;
  f.speed = speed;
  return f;
}
const copPos = (P: Pursuit, i: number): Vec3 => {
  const p: Vec3 = [0, 0, 0];
  copAt(P, i, p, [0, 0, 0]);
  return p;
};

describe('the space police chase you: the path you flew', () => {
  it('keeps your path, measured along, and finds any place on it', () => {
    const c = makeCrumbs();
    for (let z = 0; z >= -300; z -= 0.5) pushCrumb(c, [0, 4, z]);
    expect(crumbHead(c)).toBeCloseTo(300, 0);
    const o: Vec3 = [0, 0, 0];
    const f: Vec3 = [0, 0, 0];
    crumbAt(c, 100, o, f);
    expect(o[2]).toBeCloseTo(-100, 0);
    expect(f[2]).toBeCloseTo(-1);
    // A leap starts it afresh.
    expect(pushCrumb(c, [0, 4, 500])).toBe(false);
    expect(crumbHead(c)).toBe(0);
  });
});

describe('the space police chase you: what brings them', () => {
  it('never come for calm flying, even fast up high', () => {
    const f = start();
    fly(f, 60);
    expect(f.P.phase).toBe('off');
    const g = start(STREET_BOOST * FLY_SPEED);
    fly(g, 60);
    expect(g.P.phase).toBe('off');
  });

  it('come after the double boost held low in the streets for a while', () => {
    const f = start(STREET_BOOST * FLY_SPEED * 2);
    f.double = true;
    fly(f, HEAT_DOUBLE - 1);
    expect(f.P.phase).toBe('off');
    fly(f, 1.5);
    expect(f.P.phase).toBe('pursue');
    expect(f.P.cops).toBeGreaterThanOrEqual(1);
    expect(f.P.cops).toBeLessThanOrEqual(3);
  });

  it('come for scraping the walls at speed, and at once for buzzing a patrol', () => {
    const f = start(30);
    f.wall = 1;
    fly(f, 3);
    expect(f.P.phase).toBe('pursue');
    const g = start(30);
    g.buzz = true;
    fly(g, 0.1);
    expect(g.P.phase).toBe('pursue');
  });

  it('never while you tail a wanted ship, and the heat cools when you calm down', () => {
    const f = start(STREET_BOOST * FLY_SPEED * 2);
    f.double = true;
    f.calm = true;
    fly(f, 20);
    expect(f.P.phase).toBe('off');
    f.calm = false;
    fly(f, HEAT_DOUBLE / 2);
    const warm = f.P.heat;
    f.double = false;
    fly(f, 20);
    expect(f.P.heat).toBeLessThan(warm);
  });
});

describe('the space police chase you: the chase', () => {
  it('come up from behind along your path, keep behind you, and catch a cruise', () => {
    const f = chased(FLY_SPEED);
    expect(PURSUIT_SPEED).toBeGreaterThan(FLY_SPEED * 1.8);
    expect(PURSUIT_SPEED).toBeLessThan(FLY_SPEED * STREET_BOOST);
    let caught = false;
    fly(f, 12, (g) => {
      for (let i = 0; i < g.P.cops; i++) {
        const p = copPos(g.P, i);
        // On your path down the corridor, behind you (you fly toward -z), never in a wall.
        expect(Math.abs(p[0] - X)).toBeLessThan(1e-6);
        expect(p[2]).toBeGreaterThan(g.z + (COP_GAPS[i] as number) - 1);
        expect(blocked(p)).toBe(false);
      }
      if (g.P.phase === 'caught') caught = true;
    });
    expect(caught).toBe(true);
  });

  it('caught: a soft slowdown easing back, no game over, then they leave and cool down', () => {
    const f = chased(FLY_SPEED);
    fly(f, 12, (g) => {
      if (g.P.phase !== 'caught') return;
      const at = g.P.caughtAt;
      expect(pursuitDrag(g.P, at)).toBeCloseTo(DRAG_LOW);
      expect(pursuitDrag(g.P, at + 1)).toBeGreaterThan(DRAG_LOW);
      expect(pursuitDrag(g.P, at + 10)).toBe(1);
    });
    expect(f.P.close).toBeGreaterThanOrEqual(CATCH_TIME);
    fly(f, 6);
    expect(f.P.phase).toBe('off');
    expect(pursuitShows(f.P, f.t)).toBe(0);
    // A while before they come again, however wild.
    f.double = true;
    f.speed = 60;
    fly(f, COOLDOWN - 6);
    expect(f.P.phase).toBe('off');
  });

  it('lose you when the boost takes you out of their sight', () => {
    const f = chased(STREET_BOOST * FLY_SPEED * 2);
    const phases = new Set<string>();
    fly(f, 30, (g) => phases.add(g.P.phase));
    expect(phases.has('caught')).toBe(false);
    expect(phases.has('search')).toBe(true);
    expect(f.P.phase === 'off' || f.P.phase === 'leave').toBe(true);
  });

  it('lose you when you hide: search where they last saw you, never past it, then give up', () => {
    const f = chased(FLY_SPEED);
    // Out of sight from now on: behind a tower, under a deck, in a tunnel.
    const from = f.t + 0.2;
    f.sees = (_a, _b, t) => t < from;
    let lostAt = Number.NaN;
    let searched = 0;
    const alerts: number[] = [];
    fly(f, HIDE_TIME + SEARCH_TIME + 4, (g) => {
      alerts.push(g.P.alert);
      if (g.P.phase === 'search') {
        if (Number.isNaN(lostAt)) lostAt = g.t;
        searched += DT;
        for (let i = 0; i < g.P.cops; i++) {
          // Round where they lost you, never on after you.
          expect(g.P.s[i] as number).toBeLessThanOrEqual(g.P.lastSeen + 3 + 1e-6);
          expect(copPos(g.P, i)[2] - g.z).toBeGreaterThan(10);
        }
      }
    });
    expect(lostAt - from).toBeGreaterThan(HIDE_TIME - 0.2);
    expect(lostAt - from).toBeLessThan(HIDE_TIME + 0.3);
    expect(searched).toBeGreaterThan(SEARCH_TIME - 0.2);
    expect(f.P.phase).toBe('off');
    // The edge glow fades as you hide.
    expect(alerts.at(-1) as number).toBeLessThan(0.05);
    expect(Math.max(...alerts.slice(0, 5))).toBeGreaterThan(
      alerts[Math.round(HIDE_TIME / DT)] as number,
    );
  });

  it('take up the chase again when they spot you close while searching', () => {
    const f = chased(4);
    let hide = true;
    f.sees = () => !hide;
    fly(f, HIDE_TIME + 0.5);
    expect(f.P.phase).toBe('search');
    hide = false;
    fly(f, 0.2);
    expect(f.P.phase).toBe('pursue');
  });

  it('leave at once when you stop piloting (a race, a room, a fast trip)', () => {
    const f = chased(FLY_SPEED);
    f.on = false;
    fly(f, 0.1);
    expect(f.P.phase).toBe('leave');
    fly(f, 3);
    expect(f.P.phase).toBe('off');
  });

  it('draws the cruisers near the eye with their flares, nothing when no chase', () => {
    const f = chased(FLY_SPEED);
    fly(f, 1);
    const out: Item[] = [];
    const eye: Vec3 = [X, GROUND + 20, f.z];
    pursuitItems(f.P, eye, [0, 0, 1], f.t, out);
    expect(out.length).toBe(f.P.cops);
    const o = [0, 0, 0, 0, 0, 0];
    for (const it of out)
      for (let s = 0; s < it.count; s++) {
        it.site(s, o);
        expect(o.every(Number.isFinite)).toBe(true);
      }
    const none: Item[] = [];
    pursuitItems(makePursuit(), eye, [0, 0, 1], f.t, none);
    expect(none.length).toBe(0);
  });
});

describe('the space police chase you: in the city', () => {
  it('come for the double boost held low down a corridor, their glow at the screen’s edges', () => {
    // A slot with no wanted ship (it would calm the police while you tail it).
    const n = Array.from({ length: 40 }, (_, k) => k + 1).find(
      (k) => hash(k, 1501) >= 0.6,
    ) as number;
    let t = n * BOUNTY_SLOT + 1;
    setFly(false, [], 0, t);
    setFly(true, [], DT, t);
    placeShip([X, GROUND + 20, 300], 0);
    let most = 0;
    for (let k = 0; k < Math.round(12 / DT); k++) {
      t += DT;
      setFly(true, ['shift'], DT, t);
      most = Math.max(most, policeLight().k);
    }
    expect(most).toBeGreaterThan(0.5);
    // Within a phone's grains, the cruisers on your tail.
    const ship = PHASES.findIndex((p) => p.id === 'ship');
    const n0 = 6500;
    pieceCamera(ship, t);
    let lit = 0;
    let finite = true;
    for (const p of makeParticles(n0)) {
      const g = pieceAt(p, ship, t);
      finite &&= g.pos.every(Number.isFinite) && g.rgb.every(Number.isFinite);
      if (g.rgb[0] + g.rgb[1] + g.rgb[2] > 0.004) lit++;
    }
    expect(finite).toBe(true);
    expect(lit).toBeLessThanOrEqual(n0);
    setFly(false, [], 0, 0);
  }, 60_000);
});
