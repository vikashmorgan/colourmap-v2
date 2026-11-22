/**
 * Drive: the race intro (docs/specs/drive-menus.md, "The race intro"). Before a race the camera
 * flies the track high up, cuts to a crane coming down behind the grid, waits for a click, then
 * three lights count down and the racers launch together. Pure: the timeline, the camera's path
 * and the lights; the engine (components/drive/engine.ts) draws them.
 */

import { frameAt, heightAt, pointAt, type Track } from '@/lib/art/track';

export type IntroPhase = 'fly' | 'grid' | 'ready' | 'count' | 'go';

/** How long each part lasts (s). */
export const FLY = 4;
export const GRID = 1.8;
/** One light of the countdown, and how long GO shows. */
export const BEAT = 0.8;
export const GO_HOLD = 1.2;
export const LIGHTS = 3;

export interface IntroClock {
  /** Time since the intro began (s), and since the click, if there has been one. */
  t: number;
  launchedAt: number | null;
  /** Restarts skip the flyover. */
  skipFly: boolean;
}

export function newIntro(skipFly = false): IntroClock {
  return { t: skipFly ? FLY : 0, launchedAt: null, skipFly };
}

/** The intro's phase now, and how far through it (0–1). Null once GO has shown. */
export function introPhase(c: IntroClock): { phase: IntroPhase; k: number } | null {
  if (c.launchedAt !== null) {
    const since = c.t - c.launchedAt;
    if (since < BEAT * LIGHTS) return { phase: 'count', k: since / (BEAT * LIGHTS) };
    if (since < BEAT * LIGHTS + GO_HOLD)
      return { phase: 'go', k: (since - BEAT * LIGHTS) / GO_HOLD };
    return null;
  }
  if (c.t < FLY) return { phase: 'fly', k: c.t / FLY };
  if (c.t < FLY + GRID) return { phase: 'grid', k: (c.t - FLY) / GRID };
  return { phase: 'ready', k: 0 };
}

/** The racers may drive once the lights have gone out. */
export function racing(c: IntroClock): boolean {
  return c.launchedAt !== null && c.t - c.launchedAt >= BEAT * LIGHTS;
}

/** How many of the three lights are lit (red), and whether they have all turned to GO. */
export function lightsAt(c: IntroClock): { lit: number; go: boolean } {
  if (c.launchedAt === null) return { lit: 0, go: false };
  const since = c.t - c.launchedAt;
  if (since >= BEAT * LIGHTS) return { lit: LIGHTS, go: true };
  return { lit: Math.min(LIGHTS, Math.floor(since / BEAT) + 1), go: false };
}

const smooth = (k: number) => {
  const x = Math.min(1, Math.max(0, k));
  return x * x * (3 - 2 * x);
};
const mix = (a: number, b: number, k: number) => a + (b - a) * k;

export interface Shot {
  /** Camera and the point it looks at, in world coordinates (x, y on the plane, z up). */
  cam: { x: number; y: number; z: number };
  look: { x: number; y: number; z: number };
}

/** Where the drone flies over the road (s from the start) and how high. */
export const FLY_FROM = 150;
export const FLY_TO = 1300;
export const FLY_HIGH = 70;

/** The camera for a phase on a track: the drone along the road, then the crane behind the grid. */
export function trackShot(track: Track, startS: number, phase: IntroPhase, k: number): Shot {
  if (phase === 'fly') {
    const e = smooth(k);
    const s = startS + mix(FLY_FROM, FLY_TO, e);
    // It drifts across the road as it goes, and sinks a little.
    const u = mix(-45, 35, e);
    const p = pointAt(track, s, u);
    const ahead = s + 260;
    const q = pointAt(track, ahead, 0);
    return {
      cam: { x: p.x, y: p.y, z: heightAt(track, s, 0) + mix(FLY_HIGH, FLY_HIGH * 0.7, e) },
      look: { x: q.x, y: q.y, z: heightAt(track, ahead, 0) },
    };
  }
  // The crane: from high behind the grid down to the racers' height, looking up the road over them.
  const e = phase === 'grid' ? smooth(k) : 1;
  const back = mix(60, 16, e);
  const s = startS - back;
  const p = pointAt(track, Math.max(0, s), 0);
  const f = frameAt(track, Math.max(0, s));
  const x = s < 0 ? p.x + Math.cos(f.h) * s : p.x;
  const y = s < 0 ? p.y + Math.sin(f.h) * s : p.y;
  const ahead = startS + mix(30, 22, e);
  const q = pointAt(track, ahead, 0);
  const ground = heightAt(track, Math.max(0, startS), 0);
  return {
    cam: { x, y, z: ground + mix(28, 3.2, e) },
    look: { x: q.x, y: q.y, z: ground + mix(0, 1.4, e) },
  };
}

/** On the open plains (no road): one slow circle round the vehicle, coming down behind it. */
export function plainShot(
  v: { x: number; y: number; z: number; h: number },
  phase: IntroPhase,
  k: number,
): Shot {
  const e = phase === 'fly' ? smooth(k) : 1;
  const a = v.h + Math.PI + (1 - e) * Math.PI * 1.6;
  const r = mix(60, 8, e);
  return {
    cam: { x: v.x + Math.cos(a) * r, y: v.y + Math.sin(a) * r, z: v.z + mix(36, 2.4, e) },
    look: { x: v.x + Math.cos(v.h) * 6 * e, y: v.y + Math.sin(v.h) * 6 * e, z: v.z + 0.8 },
  };
}
