/**
 * Echo engine — what a Chill sound event does to the visualizer canvas.
 * Pure (no DOM): the visualizer spawns echoes from bus events, steps them
 * every frame, asks for the push on each dot, and draws rings and glows.
 * Spec: docs/specs/chill-machine-public.md → Visuals and Echo.
 */

import type { ChillEvent } from './bus';

export type EchoType = 'ripple' | 'bubble' | 'burst' | 'glow' | 'trail';

/** All values 0–1. */
export type EchoTypeSettings = {
  on: boolean;
  /** How far the echo reaches. */
  size: number;
  /** How fast it travels and fades; low = slow motion. */
  speed: number;
  /** How hard it pushes the dots. */
  strength: number;
  /** 0 = only notes and pads, 1 = every beat too. */
  sensitivity: number;
};

export type EchoSettings = Record<EchoType, EchoTypeSettings>;

export const ECHO_TYPES: readonly EchoType[] = ['ripple', 'bubble', 'burst', 'glow', 'trail'];

export const ECHO_LS = 'colourmap:chill-echo';

/** Most echoes alive at once; the oldest is dropped. */
export const MAX_ECHOES = 24;

const MID: Omit<EchoTypeSettings, 'on'> = {
  size: 0.5,
  speed: 0.5,
  strength: 0.5,
  sensitivity: 0.5,
};

export const DEFAULT_ECHO: EchoSettings = {
  ripple: { on: true, ...MID },
  bubble: { on: false, ...MID },
  burst: { on: false, ...MID },
  glow: { on: false, ...MID },
  trail: { on: false, ...MID },
};

function unit(v: unknown, fallback: number): number {
  return typeof v === 'number' && Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : fallback;
}

/** Validates anything (parsed JSON) into full echo settings, filling gaps from defaults. */
export function parseEcho(raw: unknown): EchoSettings {
  const src = raw && typeof raw === 'object' ? (raw as Record<string, unknown>) : {};
  const out = {} as EchoSettings;
  for (const type of ECHO_TYPES) {
    const d = DEFAULT_ECHO[type];
    const v =
      src[type] && typeof src[type] === 'object' ? (src[type] as Record<string, unknown>) : {};
    out[type] = {
      on: typeof v.on === 'boolean' ? v.on : d.on,
      size: unit(v.size, d.size),
      speed: unit(v.speed, d.speed),
      strength: unit(v.strength, d.strength),
      sensitivity: unit(v.sensitivity, d.sensitivity),
    };
  }
  return out;
}

export function loadEcho(): EchoSettings {
  try {
    const raw = localStorage.getItem(ECHO_LS);
    return parseEcho(raw ? JSON.parse(raw) : null);
  } catch {
    return parseEcho(null);
  }
}

export function saveEcho(settings: EchoSettings): void {
  try {
    localStorage.setItem(ECHO_LS, JSON.stringify(settings));
  } catch {
    // Private mode / quota — echoes just won't persist.
  }
}

/**
 * Notes and pads always trigger an echo that is on. Kicks and peaks need
 * sensitivity: at 0 none get through, at 1 all do, in between only hits
 * strong enough to clear `1 - sensitivity`.
 */
export function shouldTrigger(event: ChillEvent, settings: EchoTypeSettings): boolean {
  if (!settings.on) return false;
  if (event.kind === 'note' || event.kind === 'pad') return true;
  if (settings.sensitivity <= 0) return false;
  return event.strength >= 1 - settings.sensitivity;
}

export type Echo = {
  type: EchoType;
  /** Hit point in canvas px. */
  x: number;
  y: number;
  born: number;
  /** Lifetime in ms (speed-scaled). */
  life: number;
  /** Reach in px (size-scaled). */
  reach: number;
  /** Push scale (strength × hit strength). */
  push: number;
  color?: string;
};

export type EchoMark = { x: number; y: number; radius: number; alpha: number; color?: string };

/** Base lifetimes (ms) at mid speed. */
const BASE_LIFE: Record<EchoType, number> = {
  ripple: 1600,
  bubble: 2800,
  burst: 800,
  glow: 1400,
  trail: 1200,
};

export class EchoField {
  echoes: Echo[] = [];
  private settings: EchoSettings;

  constructor(settings: EchoSettings = DEFAULT_ECHO) {
    this.settings = settings;
  }

  setSettings(settings: EchoSettings): void {
    this.settings = settings;
  }

  /** Spawns one echo of `type` at the event's point, using that type's current settings. */
  spawn(event: ChillEvent, type: EchoType, w: number, h: number, now: number): Echo {
    const s = this.settings[type];
    // speed 0 → 4× longer (slow motion), 1 → ~0.6× (snappy)
    const speedMul = 0.25 + s.speed * 1.5;
    const echo: Echo = {
      type,
      x: unit(event.x, 0.5) * w,
      y: unit(event.y, 0.5) * h,
      born: now,
      life: BASE_LIFE[type] / speedMul,
      reach: Math.min(w, h) * (0.12 + s.size * 0.6),
      push: s.strength * (0.4 + unit(event.strength, 0.5) * 0.6),
      color: event.color,
    };
    this.echoes.push(echo);
    while (this.echoes.length > MAX_ECHOES) this.echoes.shift();
    return echo;
  }

  /** Drops expired echoes. */
  step(now: number): void {
    if (this.echoes.length === 0) return;
    this.echoes = this.echoes.filter((e) => now - e.born < e.life);
  }

  get size(): number {
    return this.echoes.length;
  }

  /** Velocity push for a dot at (x, y). */
  forceAt(x: number, y: number, now: number): { dx: number; dy: number } {
    let dx = 0;
    let dy = 0;
    for (const e of this.echoes) {
      const age = (now - e.born) / e.life;
      if (age < 0 || age >= 1) continue;
      const ox = x - e.x;
      const oy = y - e.y;
      const dist = Math.sqrt(ox * ox + oy * oy);
      if (dist < 0.01) continue;
      let f = 0;
      if (e.type === 'ripple') {
        // A ring wavefront travels out to `reach`; dots on it get shoved.
        const front = age * e.reach;
        const band = 10 + e.reach * 0.08;
        const off = Math.abs(dist - front);
        if (off < band) f = (1 - off / band) * e.push * 2.5 * (1 - age);
      } else if (e.type === 'bubble') {
        // Opens fast (first 20%), then slowly closes.
        const r = bubbleRadius(e, age);
        if (dist < r) f = (1 - dist / r) * e.push * 3;
      } else if (e.type === 'burst') {
        // A short outward kick near the hit, in the first 30% of life.
        const r = e.reach * 0.6;
        if (age < 0.3 && dist < r) f = (1 - dist / r) * e.push * 4 * (1 - age / 0.3);
      }
      if (f > 0) {
        dx += (ox / dist) * f;
        dy += (oy / dist) * f;
      }
    }
    return { dx, dy };
  }

  /** Ripple rings to stroke this frame. */
  rings(now: number): EchoMark[] {
    const out: EchoMark[] = [];
    for (const e of this.echoes) {
      if (e.type !== 'ripple') continue;
      const age = (now - e.born) / e.life;
      if (age < 0 || age >= 1) continue;
      out.push({ x: e.x, y: e.y, radius: age * e.reach, alpha: (1 - age) * 0.6, color: e.color });
    }
    return out;
  }

  /** Soft colour blooms to fill this frame. */
  glows(now: number): EchoMark[] {
    const out: EchoMark[] = [];
    for (const e of this.echoes) {
      if (e.type !== 'glow') continue;
      const age = (now - e.born) / e.life;
      if (age < 0 || age >= 1) continue;
      // Blooms in the first 15%, fades for the rest.
      const bloom = age < 0.15 ? age / 0.15 : 1 - (age - 0.15) / 0.85;
      out.push({
        x: e.x,
        y: e.y,
        radius: e.reach * (0.4 + Math.min(1, age / 0.15) * 0.6),
        alpha: bloom * (0.25 + e.push * 0.5),
        color: e.color,
      });
    }
    return out;
  }

  /**
   * How much of the previous frame to erase: 1 = clear fully (no trail),
   * lower = dots leave fading tails. Strongest live trail wins.
   */
  trailAlpha(now: number): number {
    let tail = 0;
    for (const e of this.echoes) {
      if (e.type !== 'trail') continue;
      const age = (now - e.born) / e.life;
      if (age < 0 || age >= 1) continue;
      tail = Math.max(tail, (1 - age) * (0.3 + e.push * 0.7));
    }
    return tail === 0 ? 1 : 0.35 - tail * 0.27;
  }
}

function bubbleRadius(e: Echo, age: number): number {
  const max = e.reach * 0.5;
  if (age < 0.2) return max * Math.sin((age / 0.2) * (Math.PI / 2));
  return max * (1 - (age - 0.2) / 0.8);
}
