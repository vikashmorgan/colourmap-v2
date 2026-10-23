import { afterEach, describe, expect, it, vi } from 'vitest';

import type { ChillEvent } from './bus';
import {
  DEFAULT_ECHO,
  ECHO_LS,
  EchoField,
  type EchoSettings,
  loadEcho,
  MAX_ECHOES,
  parseEcho,
  saveEcho,
  shouldTrigger,
} from './echo';

const hit = (kind: ChillEvent['kind'], strength = 1): ChillEvent => ({
  kind,
  x: 0.5,
  y: 0.5,
  strength,
  color: '#E53935',
});

function allOn(over: Partial<EchoSettings[keyof EchoSettings]> = {}): EchoSettings {
  const s = parseEcho(null);
  for (const k of Object.keys(s) as (keyof EchoSettings)[]) s[k] = { ...s[k], on: true, ...over };
  return s;
}

describe('shouldTrigger', () => {
  it('never fires when the type is off', () => {
    expect(shouldTrigger(hit('note'), { ...DEFAULT_ECHO.bubble, on: false })).toBe(false);
  });

  it('at sensitivity 0 only notes and pads fire', () => {
    const s = { ...DEFAULT_ECHO.ripple, sensitivity: 0 };
    expect(shouldTrigger(hit('note'), s)).toBe(true);
    expect(shouldTrigger(hit('pad'), s)).toBe(true);
    expect(shouldTrigger(hit('kick'), s)).toBe(false);
    expect(shouldTrigger(hit('peak'), s)).toBe(false);
  });

  it('at sensitivity 1 every event fires', () => {
    const s = { ...DEFAULT_ECHO.ripple, sensitivity: 1 };
    expect(shouldTrigger(hit('kick', 0), s)).toBe(true);
    expect(shouldTrigger(hit('peak', 0.1), s)).toBe(true);
  });

  it('in between, only strong enough beats fire', () => {
    const s = { ...DEFAULT_ECHO.ripple, sensitivity: 0.4 };
    expect(shouldTrigger(hit('kick', 0.7), s)).toBe(true);
    expect(shouldTrigger(hit('kick', 0.5), s)).toBe(false);
  });
});

describe('EchoField', () => {
  it('maps the event point into canvas px and caps live echoes, dropping the oldest', () => {
    const f = new EchoField(allOn());
    const first = f.spawn({ ...hit('note'), x: 0.25, y: 0.75 }, 'ripple', 400, 200, 0);
    expect(first.x).toBe(100);
    expect(first.y).toBe(150);
    for (let i = 1; i <= MAX_ECHOES + 5; i++) f.spawn(hit('note'), 'ripple', 400, 200, i);
    expect(f.size).toBe(MAX_ECHOES);
    expect(f.echoes).not.toContain(first);
    expect(f.echoes[0].born).toBe(6);
  });

  it('expires echoes once their life is over', () => {
    const f = new EchoField(allOn());
    const e = f.spawn(hit('note'), 'burst', 400, 200, 0);
    f.step(e.life - 1);
    expect(f.size).toBe(1);
    f.step(e.life + 1);
    expect(f.size).toBe(0);
  });

  it('low speed lives longer (slow motion), size reaches further', () => {
    const slow = new EchoField(allOn({ speed: 0, size: 1 }));
    const fast = new EchoField(allOn({ speed: 1, size: 0 }));
    const a = slow.spawn(hit('note'), 'ripple', 400, 200, 0);
    const b = fast.spawn(hit('note'), 'ripple', 400, 200, 0);
    expect(a.life).toBeGreaterThan(b.life * 3);
    expect(a.reach).toBeGreaterThan(b.reach * 3);
  });

  it('ripple pushes dots on its wavefront outward, not dots far from it', () => {
    const f = new EchoField(allOn());
    const e = f.spawn(hit('note'), 'ripple', 400, 200, 0);
    const now = e.life / 2;
    const front = e.reach / 2;
    const onFront = f.forceAt(200 + front, 100, now);
    expect(onFront.dx).toBeGreaterThan(0);
    expect(Math.abs(onFront.dy)).toBeLessThan(1e-9);
    expect(f.forceAt(200 + e.reach * 2, 100, now)).toEqual({ dx: 0, dy: 0 });
  });

  it('bubble clears dots inside it, opening then slowly closing', () => {
    const f = new EchoField(allOn());
    const e = f.spawn(hit('note'), 'bubble', 400, 200, 0);
    const inside = (t: number) => f.forceAt(200, 100 - e.reach * 0.2, t).dy;
    // Pushes up (away from centre) while open
    expect(inside(e.life * 0.2)).toBeLessThan(0);
    // Mostly closed near the end: that dot is outside the bubble
    expect(inside(e.life * 0.95)).toBe(0);
  });

  it('burst kicks only early in its life', () => {
    const f = new EchoField(allOn());
    const e = f.spawn(hit('note'), 'burst', 400, 200, 0);
    expect(f.forceAt(190, 100, 1).dx).toBeLessThan(0);
    expect(f.forceAt(190, 100, e.life * 0.5)).toEqual({ dx: 0, dy: 0 });
  });

  it('strength scales the push', () => {
    const weak = new EchoField(allOn({ strength: 0.1 }));
    const strong = new EchoField(allOn({ strength: 1 }));
    weak.spawn(hit('note'), 'burst', 400, 200, 0);
    strong.spawn(hit('note'), 'burst', 400, 200, 0);
    expect(strong.forceAt(190, 100, 1).dx).toBeLessThan(weak.forceAt(190, 100, 1).dx);
  });

  it('glow and trail do not push; they report blooms and a trail fade', () => {
    const f = new EchoField(allOn());
    expect(f.trailAlpha(0)).toBe(1);
    const g = f.spawn(hit('note'), 'glow', 400, 200, 0);
    f.spawn(hit('note'), 'trail', 400, 200, 0);
    expect(f.forceAt(190, 100, 10)).toEqual({ dx: 0, dy: 0 });
    const glows = f.glows(g.life * 0.15);
    expect(glows).toHaveLength(1);
    expect(glows[0].color).toBe('#E53935');
    expect(glows[0].alpha).toBeGreaterThan(0);
    expect(f.trailAlpha(10)).toBeLessThan(1);
    expect(f.rings(10)).toEqual([]);
  });

  it('reports ripple rings growing with age', () => {
    const f = new EchoField(allOn());
    const e = f.spawn(hit('note'), 'ripple', 400, 200, 0);
    const [early] = f.rings(e.life * 0.1);
    const [late] = f.rings(e.life * 0.8);
    expect(late.radius).toBeGreaterThan(early.radius);
    expect(late.alpha).toBeLessThan(early.alpha);
  });
});

describe('echo storage', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('fills gaps and clamps bad values from defaults', () => {
    const s = parseEcho({
      ripple: { on: false, size: 3, speed: 'x' },
      glow: { on: true },
      junk: 1,
    });
    expect(s.ripple).toEqual({ ...DEFAULT_ECHO.ripple, on: false, size: 1 });
    expect(s.glow.on).toBe(true);
    expect(s.bubble).toEqual(DEFAULT_ECHO.bubble);
    expect(parseEcho('nope')).toEqual(DEFAULT_ECHO);
  });

  it('round-trips through localStorage', () => {
    const store = new Map<string, string>();
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => store.set(k, v),
    });
    expect(loadEcho()).toEqual(DEFAULT_ECHO);
    const next = { ...DEFAULT_ECHO, burst: { ...DEFAULT_ECHO.burst, on: true, size: 0.9 } };
    saveEcho(next);
    expect(store.has(ECHO_LS)).toBe(true);
    expect(loadEcho()).toEqual(next);
  });

  it('survives broken storage and bad JSON', () => {
    vi.stubGlobal('localStorage', {
      getItem: () => '{bad',
      setItem: () => {
        throw new Error('quota');
      },
    });
    expect(loadEcho()).toEqual(DEFAULT_ECHO);
    expect(() => saveEcho(DEFAULT_ECHO)).not.toThrow();
  });
});
