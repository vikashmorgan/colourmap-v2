import { existsSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  HUBS,
  hubOnline,
  hubPoint,
  isMenuKey,
  isOnline,
  lastSeen,
  nextInDirection,
  nodePoint,
  ONLINE_FOR,
  parseMenuMode,
  parseVisits,
  SIGNALS,
  satellitePoint,
  step,
  visitKey,
  wheelPoint,
  withVisit,
} from './grid';

/** Where a page's code lives: an app screen, or a standalone route handler. */
function routeExists(href: string): boolean {
  const root = join(__dirname, '..', 'app');
  return [
    join(root, '(app)', href, 'page.tsx'),
    join(root, href, 'route.ts'),
    join(root, href, 'page.tsx'),
  ].some(existsSync);
}

describe('the hubs', () => {
  it('has the core and seven hubs', () => {
    expect(HUBS[0]?.id).toBe('you');
    expect(HUBS).toHaveLength(8);
  });

  it('points every page at a route that exists', () => {
    const missing = HUBS.flatMap((h) => h.nodes)
      .filter((n) => !n.external)
      .map((n) => n.href)
      .filter((href) => !routeExists(href));
    expect(missing).toEqual([]);
  });

  it('lists each page once', () => {
    const all = HUBS.flatMap((h) => h.nodes.map((n) => n.href));
    expect(new Set(all).size).toBe(all.length);
  });

  it('only joins hubs that exist', () => {
    const ids = new Set(HUBS.map((h) => h.id));
    for (const s of SIGNALS) {
      expect(ids.has(s.from) && ids.has(s.to)).toBe(true);
    }
  });

  it('keeps the separate apps as external satellites', () => {
    const ext = HUBS.flatMap((h) => h.nodes).filter((n) => n.external);
    expect(ext.map((n) => n.label).sort()).toEqual(['Chill Machine', 'TunnelSurfer']);
    expect(ext.every((n) => n.href.startsWith('https://'))).toBe(true);
  });
});

describe('layout', () => {
  it('puts the first hub at the top and keeps every hub on screen', () => {
    expect(hubPoint(0, 7).y).toBeLessThan(0.5);
    expect(hubPoint(0, 7).x).toBeCloseTo(0.5);
    for (let i = 0; i < 7; i++) {
      const p = hubPoint(i, 7, 0.5);
      expect(p.x).toBeGreaterThan(0.05);
      expect(p.x).toBeLessThan(0.95);
    }
  });

  it('spreads nodes round their hub', () => {
    expect(nodePoint(0, 4).y).toBeLessThan(0.5);
    expect(nodePoint(2, 4).y).toBeGreaterThan(0.5);
  });

  it('puts satellites further out than their hub, inside the screen', () => {
    const hub = hubPoint(0, 7);
    const s = satellitePoint(hub, 0, 2);
    expect(s.y).toBeLessThan(hub.y);
    expect(s.y).toBeGreaterThanOrEqual(0.04);
    expect(satellitePoint(hub, 0, 2).x).not.toBeCloseTo(satellitePoint(hub, 1, 2).x);
  });
});

describe('arrow keys', () => {
  const pts = [
    { x: 0.5, y: 0.5 },
    { x: 0.5, y: 0.1 },
    { x: 0.9, y: 0.5 },
    { x: 0.1, y: 0.55 },
    { x: 0.5, y: 0.9 },
  ];

  it('moves to the nearest point that way', () => {
    expect(nextInDirection(pts, 0, 'up')).toBe(1);
    expect(nextInDirection(pts, 0, 'right')).toBe(2);
    expect(nextInDirection(pts, 0, 'left')).toBe(3);
    expect(nextInDirection(pts, 0, 'down')).toBe(4);
  });

  it('stays put when nothing is that way', () => {
    expect(nextInDirection(pts, 1, 'up')).toBeNull();
    expect(nextInDirection([], 0, 'up')).toBeNull();
  });
});

describe('visits', () => {
  const now = new Date('2026-10-25T15:00:00').getTime();
  const day = 24 * 60 * 60 * 1000;

  it('files a visit under its plain path', () => {
    expect(visitKey('/figures?mode=billy')).toBe('/figures');
    expect(visitKey('/day/')).toBe('/day');
    expect(visitKey('/')).toBe('/');
  });

  it('reads only good entries and survives junk', () => {
    expect(parseVisits('{"/day":5,"/ai":"x"}')).toEqual({ '/day': 5 });
    expect(parseVisits('not json')).toEqual({});
    expect(parseVisits(null)).toEqual({});
  });

  it('is online for a week after a visit', () => {
    const v = withVisit({}, '/day', now);
    expect(isOnline(v, '/day', now + ONLINE_FOR - 1)).toBe(true);
    expect(isOnline(v, '/day', now + ONLINE_FOR)).toBe(false);
    expect(isOnline(v, '/ai', now)).toBe(false);
    expect(hubOnline(v, HUBS[0] as (typeof HUBS)[number], now)).toBe(true);
  });

  it('says when it was last opened', () => {
    expect(lastSeen({}, '/day', now)).toBe('not yet');
    expect(lastSeen({ '/day': now - 60_000 }, '/day', now)).toBe('today');
    expect(lastSeen({ '/day': now - day }, '/day', now)).toBe('yesterday');
    expect(lastSeen({ '/day': now - 4 * day }, '/day', now)).toBe('4 days ago');
    expect(lastSeen({ '/day': now - 60 * day }, '/day', now)).toBe('a while ago');
  });
});

describe('the quick menu', () => {
  it('reads the saved look, defaulting to the wheel', () => {
    expect(parseMenuMode('terminal')).toBe('terminal');
    expect(parseMenuMode('wheel')).toBe('wheel');
    expect(parseMenuMode(null)).toBe('tree');
    expect(parseMenuMode('x')).toBe('tree');
  });

  it('puts the first item at the top of the wheel', () => {
    const p = wheelPoint(0, 8, 10);
    expect(p.x).toBeCloseTo(0);
    expect(p.y).toBeCloseTo(-10);
    expect(wheelPoint(2, 8, 10).x).toBeCloseTo(10);
  });

  it('wraps round the ring both ways', () => {
    expect(step(7, 8, 1)).toBe(0);
    expect(step(0, 8, -1)).toBe(7);
    expect(step(0, 0, 1)).toBe(0);
  });

  it('opens on G or backtick, never while typing or with a modifier', () => {
    const k = (key: string, mod = false) => ({ key, ctrlKey: mod, metaKey: false, altKey: false });
    expect(isMenuKey(k('g'), false)).toBe(true);
    expect(isMenuKey(k('`'), false)).toBe(true);
    expect(isMenuKey(k('g'), true)).toBe(false);
    expect(isMenuKey(k('g', true), false)).toBe(false);
    expect(isMenuKey(k('h'), false)).toBe(false);
  });
});
