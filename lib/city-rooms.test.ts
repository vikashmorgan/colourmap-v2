import { describe, expect, it } from 'vitest';

import { makeParticles, type Vec3 } from './bigbang';
import { PHASES, pieceAt, placeShip, setFly, tally } from './city';
import { DOCK_PROMPT, DOCKS, dockAt, dockItems, PAD_R, placeDock, roomPoint } from './city-docks';
import { type Item, TILE_X, TILE_Z } from './city-grid';
import {
  currentRoom,
  enterRoom,
  inRoom,
  leaveRoom,
  onSeat,
  roomCamera,
  roomFree,
  roomGrain,
  roomSeeThrough,
  roomStep,
  roomWalker,
} from './city-rooms';
import { newWalker, SIT_AFTER, stepWalker, WALK_SPEED, walkerBody } from './dot-walker';

const ship = PHASES.findIndex((p) => p.id === 'ship');
const dt = 1 / 60;
const run = (keys: string[], seconds: number, t0: number) => {
  let t = t0;
  for (let f = 0; f < seconds * 60; f++) {
    t += dt;
    roomStep(true, keys, dt, t);
  }
  return t;
};

describe('the Dot Walker, smoother (2026-11-12: "improve the dot walker to walk across these")', () => {
  it('eases into its pace and its turns, and slides along a wall instead of stopping', () => {
    const w = newWalker(0, 0, 0);
    const open = () => true;
    stepWalker(w, ['w'], dt, open);
    expect(w.speed).toBeGreaterThan(0);
    expect(w.speed).toBeLessThan(WALK_SPEED * 0.2);
    for (let f = 0; f < 90; f++) stepWalker(w, ['w'], dt, open);
    expect(w.speed).toBeCloseTo(WALK_SPEED, 1);
    for (let f = 0; f < 60; f++) stepWalker(w, ['w', 'shift'], dt, open);
    expect(w.speed).toBeGreaterThan(WALK_SPEED * 1.8);
    // Turning eases in: the first frame turns less than a full-rate frame.
    const y0 = w.yaw;
    stepWalker(w, ['a'], dt, open);
    expect(w.yaw - y0).toBeGreaterThan(0);
    expect(w.yaw - y0).toBeLessThan(1.9 * dt * 0.5);
    // A wall along x = 1: walking at it on a slant, it slides along z.
    const v = newWalker(0, 0, Math.PI / 4 + Math.PI);
    const wall = (x: number) => x < 1;
    for (let f = 0; f < 120; f++) stepWalker(v, ['w'], dt, wall);
    expect(v.x).toBeLessThan(1);
    expect(Math.abs(v.z)).toBeGreaterThan(2);
    // Space jumps and it comes back down.
    stepWalker(v, [' '], dt, wall);
    expect(v.jump).toBeGreaterThan(0);
    for (let f = 0; f < 90; f++) stepWalker(v, [], dt, wall);
    expect(v.jump).toBe(0);
  });

  it('keeps the Vegetal body, and sits: hips down, thighs forward', () => {
    const p = { i: 5, a: 0.8, b: 0.4, d: 0.3 };
    const standing = walkerBody(p, { c: [0, 0, 0], f: [0, 0, -1], stride: 0, pace: 0 }, 1);
    const seated = walkerBody(p, { c: [0, 0, 0], f: [0, 0, -1], stride: 0, pace: 0, sit: 1 }, 1);
    expect(seated[1]).toBeLessThan(standing[1]);
    const head = walkerBody(
      { i: 1, a: 0.05, b: 0.5, d: 0.5 },
      { c: [0, 0, 0], f: [0, 0, -1], stride: 0, pace: 0 },
      1,
    );
    expect(head[1]).toBeGreaterThan(2.6);
  });
});

describe('docks and rooms (queued: "docking the ship and cyberpunk rooms ... with panoramas")', () => {
  it('has four docks, each its own pad design, view and word, every tile', () => {
    expect(new Set(DOCKS.map((d) => d.pad)).size).toBe(4);
    expect(new Set(DOCKS.map((d) => d.name)).size).toBe(DOCKS.length);
    expect(new Set(DOCKS.map((d) => `${d.view}`)).size).toBeGreaterThan(2);
    for (let i = 0; i < DOCKS.length; i++) {
      const P = placeDock(i, [0, 0, 0]);
      const Q = placeDock(i, [TILE_X, 0, 2 * TILE_Z]);
      expect(Q.c[0] - P.c[0]).toBeCloseTo(TILE_X, 9);
      expect(Q.c[2] - P.c[2]).toBeCloseTo(2 * TILE_Z, 9);
      // The pad is outside the room, on its right.
      const [x, , z] = P.pad;
      expect(Math.hypot(x - P.c[0], z - P.c[2])).toBeGreaterThan(P.dock.w + PAD_R);
      expect(dockAt([x, P.pad[1] + 2.5, z])?.i).toBe(i);
      expect(dockAt([x, P.pad[1] + 12, z])).toBeNull();
    }
  });

  it('draws pads and shells near the eye, finite and lit', () => {
    const P = placeDock(1, [0, 0, 0]);
    const out: Item[] = [];
    dockItems([P.pad[0] + 20, P.pad[1] + 5, P.pad[2] + 20], 10, 160, out);
    expect(out.length).toBeGreaterThanOrEqual(2);
    const o = [0, 0, 0, 0, 0, 0];
    let lit = 0;
    for (const it of out) {
      for (let s = 0; s < it.count; s++) {
        expect(it.site(s, o)).toBe(true);
        expect(o.every(Number.isFinite)).toBe(true);
        expect(Math.min(o[3], o[4], o[5])).toBeGreaterThanOrEqual(0);
        if (Math.max(o[3], o[4], o[5]) > 0.15) lit++;
      }
    }
    expect(lit).toBeGreaterThan(200);
  });

  it('holds the walker inside the walls, and it sits on the sofa to rest', () => {
    const P = placeDock(0, [0, 0, 0]);
    enterRoom(P, 100);
    expect(inRoom()).toBe(true);
    let t = run(['w'], 6, 100);
    const { w, d } = P.dock;
    const inside = (q: Vec3) => {
      const dx = q[0] - P.c[0];
      const dz = q[2] - P.c[2];
      return (
        Math.abs(dx * P.r[0] + dz * P.r[2]) <= w && Math.abs(dx * P.v[0] + dz * P.v[2]) <= d / 2
      );
    };
    let me = roomWalker();
    expect(inside([me.x, 0, me.z])).toBe(true);
    expect(roomFree(P, me.x, me.z)).toBe(true);
    // Walls everywhere round: turning and walking a long while never leaves the room.
    t = run(['w', 'a'], 8, t);
    t = run(['w', 'shift', 'd'], 8, t);
    me = roomWalker();
    expect(inside([me.x, 0, me.z])).toBe(true);
    // On the seat, standing still, it sits after a moment, facing the view.
    const seat = roomPoint(P, 0, d / 2 - 2.1, 0);
    expect(onSeat(P, seat[0], seat[2])).toBe(true);
    me.x = seat[0];
    me.z = seat[2];
    me.speed = 0;
    t = run([], SIT_AFTER + 2, t);
    expect(roomWalker().sit).toBeGreaterThan(0.9);
    // Seated, the eye sits behind its head looking out of the window, and drifts slowly.
    const a = roomCamera(t) as { eye: Vec3; target: Vec3 };
    const b = roomCamera(t + 20) as { eye: Vec3; target: Vec3 };
    const look = [a.target[0] - a.eye[0], a.target[2] - a.eye[2]];
    expect(look[0] * P.v[0] + look[1] * P.v[2]).toBeGreaterThan(0);
    expect(Math.hypot(a.target[0] - b.target[0], a.target[2] - b.target[2])).toBeGreaterThan(0.5);
    // A step stands it up again.
    run(['w'], 1.5, t);
    expect(roomWalker().sit).toBe(0);
    leaveRoom();
  });

  it('shows the city only through the window, and draws its own grains finite', () => {
    const P = placeDock(1, [0, 0, 0]);
    enterRoom(P, 0);
    const cam = roomCamera(0) as { eye: Vec3; target: Vec3 };
    const see = roomSeeThrough(cam.eye) as (x: number, y: number, z: number) => boolean;
    const out = roomPoint(P, 0, 40, 2);
    const behind = roomPoint(P, 0, -40, 2);
    const side = roomPoint(P, 40, 0, 2);
    const within = roomPoint(P, 0, 0, 2);
    expect(see(out[0], out[1], out[2])).toBe(true);
    expect(see(behind[0], behind[1], behind[2])).toBe(false);
    expect(see(side[0], side[1], side[2])).toBe(false);
    expect(see(within[0], within[1], within[2])).toBe(false);
    for (let L = 0; L < 900; L++) {
      const g = roomGrain(L, 900, 3);
      expect([...g.pos, ...g.rgb].every(Number.isFinite)).toBe(true);
      expect(Math.min(...g.rgb)).toBeGreaterThanOrEqual(0);
    }
    leaveRoom();
  });

  it('docks in the game: on a pad "Docked — Enter to go inside", Enter in, Enter out to the ship', () => {
    const t0 = 2000;
    setFly(false, [], 0, t0);
    setFly(true, [], dt, t0 + dt);
    const P = placeDock(2, [0, 0, 0]);
    placeShip([P.pad[0], P.pad[1] + 2.5, P.pad[2]], 0);
    let t = t0 + 2 * dt;
    const tick = (keys: string[], on = true) => {
      t += dt;
      setFly(on, keys, dt, t);
    };
    setFly(true, [], dt, t);
    expect(tally()).toBe(DOCK_PROMPT);
    // Settling on the pad: it does not drift away while no key flies it on.
    for (let f = 0; f < 60; f++) tick([]);
    expect(tally()).toBe(DOCK_PROMPT);
    tick(['enter']);
    expect(inRoom()).toBe(true);
    expect(currentRoom()?.i).toBe(2);
    expect(tally()).toContain('Street lounge');
    // The picture is drawn from inside the room: the camera within its walls.
    tick([]);
    const ps = makeParticles(2000);
    for (const p of ps) {
      const g = pieceAt(p, ship, t);
      expect([...g.pos, ...g.rgb].every(Number.isFinite)).toBe(true);
    }
    // W walks the Dot Walker in the room.
    const x0 = roomWalker().x;
    const z0 = roomWalker().z;
    for (let f = 0; f < 60; f++) tick(['w']);
    expect(Math.hypot(roomWalker().x - x0, roomWalker().z - z0)).toBeGreaterThan(1);
    // Enter: back to the ship on its pad.
    tick([]);
    tick(['enter']);
    expect(inRoom()).toBe(false);
    expect(tally()).toBe(DOCK_PROMPT);
    // Esc in a room lets go too.
    tick([]);
    tick(['enter']);
    expect(inRoom()).toBe(true);
    tick([], false);
    expect(inRoom()).toBe(false);
    setFly(false, [], 0, 0);
  });
});
