'use client';

import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  CORE,
  type Dir,
  GOLD,
  type GridNode,
  HUBS,
  type Hub,
  type HubId,
  hubById,
  hubOnline,
  hubPoint,
  isOnline,
  lastSeen,
  nextInDirection,
  nodePoint,
  type Point,
  readVisits,
  recordVisit,
  SIGNALS,
  satellitePoint,
  type Visits,
} from '@/lib/grid';

/*
 * THE GRID — the app as a network you move through like a game menu
 * (2026-10-25). The data and the rules are in `lib/grid.ts`; this draws them.
 *
 *   overview  the core (You) in the middle, seven hubs round it, the two
 *             separate apps as satellites off Sound, signals on real links
 *   zoomed    one hub in the middle, its pages round it; the rest faint behind
 *
 * Hover or focus anything for its scan panel. Arrows move, Enter opens, Esc
 * goes back out. Opening a page "jacks in": a line runs out from the core,
 * then the page opens. A short boot plays the first time in a session; any key
 * or click skips it. With reduced motion asked for there is no boot, no
 * pulses and no jack-in.
 */

const BOOT_KEY = 'cb-grid-booted';
const BOOT_MS = 2000;
const JACK_MS = 380;
const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

type Item =
  | { kind: 'hub'; hub: Hub; at: Point }
  | { kind: 'node'; node: GridNode; hub: Hub; at: Point; satellite?: boolean };

const keyOf = (it: Item) => (it.kind === 'hub' ? `hub:${it.hub.id}` : `node:${it.node.href}`);

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  } catch {
    return false;
  }
}

const CORE_HUB = hubById('you');
const RING = HUBS.filter((h) => h.id !== 'you');

const ARROWS: Record<string, Dir> = {
  ArrowUp: 'up',
  ArrowDown: 'down',
  ArrowLeft: 'left',
  ArrowRight: 'right',
};

export default function TheGrid() {
  const router = useRouter();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const itemRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [size, setSize] = useState({ w: 1000, h: 700 });
  const [zoom, setZoom] = useState<HubId | null>(null);
  const [selected, setSelected] = useState(0);
  const [hovered, setHovered] = useState<string | null>(null);
  const [visits, setVisits] = useState<Visits>({});
  const [now, setNow] = useState(0);
  const [reduced, setReduced] = useState(false);
  const [booting, setBooting] = useState(false);
  const [jack, setJack] = useState<{ at: Point; colour: string } | null>(null);

  useEffect(() => {
    setVisits(readVisits());
    setNow(Date.now());
    const r = prefersReducedMotion();
    setReduced(r);
    let seen = true;
    try {
      seen = window.sessionStorage.getItem(BOOT_KEY) === '1';
      window.sessionStorage.setItem(BOOT_KEY, '1');
    } catch {
      seen = true;
    }
    if (r || seen) return;
    setBooting(true);
    const t = window.setTimeout(() => setBooting(false), BOOT_MS);
    return () => window.clearTimeout(t);
  }, []);

  useLayoutEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize({ w: r.width, h: r.height });
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const aspect = size.w / size.h;
  const px = useCallback((p: Point) => ({ x: p.x * size.w, y: p.y * size.h }), [size]);

  const hubAt = useMemo(() => {
    const m = new Map<HubId, Point>([['you', CORE]]);
    RING.forEach((h, i) => m.set(h.id, hubPoint(i, RING.length, aspect)));
    return m;
  }, [aspect]);

  const overview: Item[] = useMemo(() => {
    const items: Item[] = [{ kind: 'hub', hub: CORE_HUB, at: CORE }];
    for (const h of RING) items.push({ kind: 'hub', hub: h, at: hubAt.get(h.id) as Point });
    for (const h of RING) {
      const sats = h.nodes.filter((n) => n.external);
      sats.forEach((n, k) => {
        items.push({
          kind: 'node',
          node: n,
          hub: h,
          at: satellitePoint(hubAt.get(h.id) as Point, k, sats.length),
          satellite: true,
        });
      });
    }
    return items;
  }, [hubAt]);

  const zoomed: Item[] = useMemo(() => {
    if (!zoom) return [];
    const hub = hubById(zoom);
    return [
      { kind: 'hub', hub, at: CORE },
      ...hub.nodes.map(
        (node, i): Item => ({
          kind: 'node',
          node,
          hub,
          at: nodePoint(i, hub.nodes.length, aspect),
          satellite: node.external,
        }),
      ),
    ];
  }, [zoom, aspect]);

  const items = zoom ? zoomed : overview;

  const focusItem = useCallback((it: Item | undefined) => {
    if (!it) return;
    itemRefs.current.get(keyOf(it))?.focus({ preventScroll: true });
  }, []);

  // After a zoom, put focus where the selection is.
  // biome-ignore lint/correctness/useExhaustiveDependencies: the zoom is the trigger; items follows it
  useEffect(() => {
    if (document.activeElement && rootRef.current?.contains(document.activeElement))
      focusItem(items[selected]);
  }, [zoom]);

  const zoomIn = (id: HubId) => {
    setBooting(false);
    setZoom(id);
    setSelected(0);
    setHovered(null);
  };

  const zoomOut = () => {
    if (!zoom) return;
    const from = overview.findIndex((it) => it.kind === 'hub' && it.hub.id === zoom);
    setZoom(null);
    setSelected(Math.max(0, from));
    setHovered(null);
  };

  const open = (node: GridNode, at: Point, colour: string) => {
    recordVisit(node.href);
    const go = () => {
      if (node.external) window.open(node.href, '_blank', 'noopener');
      else if (node.plain) window.location.assign(node.href);
      else router.push(node.href);
    };
    if (reduced || node.external) {
      go();
      return;
    }
    setJack({ at, colour });
    window.setTimeout(go, JACK_MS);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (booting) setBooting(false);
    if (e.key === 'Escape') {
      e.preventDefault();
      zoomOut();
      return;
    }
    const dir = ARROWS[e.key];
    if (!dir) return;
    e.preventDefault();
    const next = nextInDirection(
      items.map((it) => it.at),
      selected,
      dir,
    );
    if (next === null) return;
    setSelected(next);
    setHovered(null);
    focusItem(items[next]);
  };

  const scanItem = items.find((it) => keyOf(it) === hovered) ?? items[selected];

  const line = (a: Point, b: Point) => {
    const p = px(a);
    const q = px(b);
    return { x1: p.x, y1: p.y, x2: q.x, y2: q.y, d: `M ${p.x} ${p.y} L ${q.x} ${q.y}` };
  };

  const pulse = (d: string, colour: string, delay: number, key: string) =>
    reduced ? null : (
      <circle key={key} r={2.2} fill={colour} opacity={0.9}>
        <animateMotion dur="3.2s" begin={`${delay}s`} repeatCount="indefinite" path={d} />
      </circle>
    );

  const ref = (it: Item) => (el: HTMLElement | null) => {
    if (el) itemRefs.current.set(keyOf(it), el);
    else itemRefs.current.delete(keyOf(it));
  };

  const common = (it: Item, i: number) => ({
    ref: ref(it),
    onMouseEnter: () => setHovered(keyOf(it)),
    onMouseLeave: () => setHovered((h) => (h === keyOf(it) ? null : h)),
    onFocus: () => {
      setSelected(i);
      setHovered(null);
    },
    className: 'grid-item',
    style: {
      position: 'absolute' as const,
      left: px(it.at).x,
      top: px(it.at).y,
      transform: 'translate(-50%, -50%)',
      ['--d' as string]: `${0.5 + i * 0.07}s`,
    },
  });

  function renderItem(it: Item, i: number) {
    const isSel = i === selected;
    if (it.kind === 'hub') {
      const isCore = it.hub.id === 'you';
      const centre = Boolean(zoom);
      const online = hubOnline(visits, it.hub, now);
      const dot = isCore && !centre ? 74 : centre ? 92 : 50;
      return (
        <button
          key={keyOf(it)}
          type="button"
          {...common(it, i)}
          onClick={() => (centre ? zoomOut() : zoomIn(it.hub.id))}
          aria-label={centre ? `${it.hub.label}: back to the grid` : `${it.hub.label} hub`}
          data-selected={isSel || undefined}
        >
          <span
            aria-hidden
            className={online ? 'grid-online' : undefined}
            style={{
              display: 'block',
              width: dot,
              height: dot,
              margin: '0 auto',
              borderRadius: '50%',
              border: `1.5px solid ${isCore ? GOLD : it.hub.accent}`,
              outline: isCore ? `1px solid ${GOLD}55` : undefined,
              outlineOffset: isCore ? 6 : undefined,
              background: `radial-gradient(circle, ${it.hub.accent}${online ? '40' : '1c'} 0%, transparent 70%)`,
              boxShadow: `0 0 ${online ? 22 : 10}px ${it.hub.accent}${online ? '66' : '33'}`,
              ['--glow' as string]: it.hub.accent,
            }}
          />
          <span
            className="grid-label"
            style={{ color: isCore ? GOLD : '#e8dcc2', fontSize: isCore || centre ? 13 : 12 }}
          >
            {it.hub.label}
          </span>
        </button>
      );
    }
    const { node, hub } = it;
    const online = isOnline(visits, node.href, now);
    const sat = it.satellite;
    const s = sat ? 16 : 18;
    return (
      <a
        key={keyOf(it)}
        href={node.href}
        {...common(it, i)}
        {...(node.external ? { target: '_blank', rel: 'noreferrer' } : {})}
        onClick={(e) => {
          if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
          e.preventDefault();
          open(node, it.at, hub.accent);
        }}
        aria-label={`${node.label}${node.external ? ' (separate app)' : ''}`}
        data-selected={isSel || undefined}
      >
        <span
          aria-hidden
          className={online ? 'grid-online' : undefined}
          style={{
            display: 'block',
            width: s,
            height: s,
            margin: '0 auto',
            borderRadius: sat ? 3 : '50%',
            transform: sat ? 'rotate(45deg)' : undefined,
            border: `1.5px ${node.prototype ? 'dashed' : 'solid'} ${hub.accent}`,
            background: online ? hub.accent : `${hub.accent}22`,
            boxShadow: `0 0 ${online ? 16 : 6}px ${hub.accent}${online ? '99' : '44'}`,
            opacity: online ? 1 : 0.75,
            ['--glow' as string]: hub.accent,
          }}
        />
        <span className="grid-label" style={{ color: online ? '#f3e7cc' : '#b9ab8e' }}>
          {node.label}
        </span>
      </a>
    );
  }

  const zoomHub = zoom ? hubById(zoom) : null;

  return (
    <div
      ref={rootRef}
      className={`the-grid${booting ? ' grid-boot' : ''}${reduced ? ' grid-still' : ''}`}
      onKeyDown={onKeyDown}
      onPointerDown={() => booting && setBooting(false)}
      role="application"
      aria-label="The Grid: every page in the app as a network"
      style={{
        position: 'relative',
        width: '100%',
        height: 'calc(100dvh - 64px)',
        minHeight: 520,
        overflow: 'hidden',
        background: '#050506',
        color: '#e8dcc2',
        fontFamily: MONO,
      }}
    >
      <style>{GRID_CSS}</style>
      <div aria-hidden className="grid-floor" />

      <svg aria-hidden width={size.w} height={size.h} style={{ position: 'absolute', inset: 0 }}>
        {/* The overview's lines: full when it is open, faint behind a zoomed hub. */}
        <g opacity={zoom ? 0.1 : 1}>
          {RING.map((h, i) => {
            const l = line(CORE, hubAt.get(h.id) as Point);
            return (
              <g key={`spoke-${h.id}`}>
                <line
                  {...l}
                  pathLength={1}
                  className="grid-line"
                  stroke={`${GOLD}`}
                  strokeOpacity={0.35}
                  strokeWidth={1}
                />
                {!zoom && pulse(l.d, GOLD, i * 0.45, `p-${h.id}`)}
              </g>
            );
          })}
          {SIGNALS.map((s, i) => {
            const l = line(hubAt.get(s.from) as Point, hubAt.get(s.to) as Point);
            const c = hubById(s.from).accent;
            return (
              <g key={`sig-${s.from}-${s.to}`}>
                <line
                  {...l}
                  pathLength={1}
                  className="grid-line"
                  stroke={c}
                  strokeOpacity={0.22}
                  strokeWidth={1}
                  strokeDasharray="2 6"
                />
                {!zoom && pulse(l.d, c, 0.8 + i * 0.6, `ps-${i}`)}
              </g>
            );
          })}
          {overview
            .filter((it): it is Extract<Item, { kind: 'node' }> => it.kind === 'node')
            .map((it) => {
              const l = line(hubAt.get(it.hub.id) as Point, it.at);
              return (
                <line
                  key={`bridge-${it.node.href}`}
                  {...l}
                  pathLength={1}
                  className="grid-line"
                  stroke={it.hub.accent}
                  strokeOpacity={0.4}
                  strokeDasharray="1 5"
                />
              );
            })}
        </g>
        {zoomHub &&
          zoomed.slice(1).map((it, i) => {
            if (it.kind !== 'node') return null;
            const l = line(CORE, it.at);
            return (
              <g key={`z-${it.node.href}`}>
                <line
                  {...l}
                  stroke={zoomHub.accent}
                  strokeOpacity={0.45}
                  strokeWidth={1}
                  strokeDasharray={it.node.prototype || it.node.external ? '3 5' : undefined}
                />
                {pulse(l.d, zoomHub.accent, i * 0.3, `pz-${i}`)}
              </g>
            );
          })}
        {jack && (
          <line
            {...line(CORE, jack.at)}
            pathLength={1}
            className="grid-jack"
            stroke={jack.colour}
            strokeWidth={2.5}
            style={{ filter: `drop-shadow(0 0 6px ${jack.colour})` }}
          />
        )}
      </svg>

      {items.map(renderItem)}

      {/* HUD */}
      <div
        className="grid-hud"
        style={{
          position: 'absolute',
          top: 14,
          left: 16,
          right: 16,
          display: 'flex',
          justifyContent: 'space-between',
          pointerEvents: 'none',
        }}
      >
        <p style={{ margin: 0, fontSize: 11, letterSpacing: '0.3em', color: GOLD }}>
          THE GRID
          {zoomHub ? (
            <span style={{ color: '#b9ab8e' }}> / {zoomHub.label.toUpperCase()}</span>
          ) : null}
        </p>
        <p
          className="grid-keys"
          style={{ margin: 0, fontSize: 10, letterSpacing: '0.2em', color: '#7d725c' }}
        >
          ARROWS · ENTER · ESC
        </p>
      </div>
      {zoom && (
        <button
          type="button"
          onClick={zoomOut}
          className="grid-back"
          style={{
            position: 'absolute',
            top: 40,
            left: 10,
            minHeight: 44,
            padding: '0 10px',
            fontSize: 11,
            letterSpacing: '0.2em',
            color: '#b9ab8e',
            background: 'transparent',
            border: 'none',
            cursor: 'pointer',
            fontFamily: MONO,
          }}
        >
          ← GRID
        </button>
      )}

      {scanItem && !booting && <Scan item={scanItem} visits={visits} now={now} />}

      {jack && <div aria-hidden className="grid-flash" style={{ background: jack.colour }} />}
      <div aria-hidden className="grid-scanlines" />
    </div>
  );
}

function Scan({ item, visits, now }: { item: Item; visits: Visits; now: number }) {
  const accent = item.hub.accent;
  const title = item.kind === 'hub' ? item.hub.label : item.node.label;
  const what = item.kind === 'hub' ? item.hub.line : item.node.line;
  let status: string;
  if (item.kind === 'hub') status = hubOnline(visits, item.hub, now) ? 'online' : 'idle';
  else if (item.node.external) status = 'satellite · separate app';
  else
    status = `${isOnline(visits, item.node.href, now) ? 'online' : 'idle'} · last opened ${lastSeen(visits, item.node.href, now)}`;
  const proto = item.kind === 'node' && item.node.prototype;
  return (
    <aside
      className="grid-scan"
      aria-live="polite"
      style={{
        position: 'absolute',
        background: 'rgba(8,8,10,0.82)',
        border: `1px solid ${accent}55`,
        borderLeft: `2px solid ${accent}`,
        borderRadius: 4,
        padding: '10px 14px',
        boxShadow: `0 0 24px ${accent}22`,
        pointerEvents: 'none',
      }}
    >
      <p style={{ margin: 0, fontSize: 10, letterSpacing: '0.25em', color: accent }}>
        {item.kind === 'hub' ? 'HUB' : 'NODE'} · SCAN
      </p>
      <p style={{ margin: '4px 0 2px', fontSize: 15, letterSpacing: '0.08em', color: '#f3e7cc' }}>
        {title}
      </p>
      <p style={{ margin: 0, fontSize: 12, color: '#b9ab8e', lineHeight: 1.45 }}>{what}</p>
      <p
        style={{
          margin: '6px 0 0',
          fontSize: 10,
          letterSpacing: '0.15em',
          color: '#7d725c',
          textTransform: 'uppercase',
        }}
      >
        {status}
        {proto ? ' · prototype' : ''}
      </p>
    </aside>
  );
}

const GRID_CSS = `
.the-grid:focus { outline: none; }
.the-grid .grid-item { background: transparent; border: none; padding: 4px; cursor: pointer; text-decoration: none; min-width: 44px; min-height: 44px; display: flex; flex-direction: column; align-items: center; justify-content: center; z-index: 2; }
.the-grid .grid-item:focus-visible, .the-grid .grid-item[data-selected] { outline: none; }
.the-grid .grid-item:focus-visible .grid-label { color: #fff !important; text-shadow: 0 0 8px ${GOLD}; }
.the-grid .grid-item:focus-visible > span:first-child, .the-grid .grid-item:hover > span:first-child { box-shadow: 0 0 0 2px #050506, 0 0 0 3px ${GOLD}, 0 0 22px var(--glow) !important; }
.the-grid .grid-label { display: block; margin-top: 7px; font-size: 11px; letter-spacing: 0.18em; text-transform: uppercase; white-space: nowrap; background: rgba(5,5,6,0.7); padding: 1px 4px; }
.the-grid .grid-floor { position: absolute; inset: -40px; background-image: linear-gradient(${GOLD}0d 1px, transparent 1px), linear-gradient(90deg, ${GOLD}0d 1px, transparent 1px); background-size: 40px 40px; animation: grid-drift 40s linear infinite; }
.the-grid .grid-scanlines { position: absolute; inset: 0; pointer-events: none; z-index: 5; background: repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px); }
.the-grid .grid-online { animation: grid-breathe 3.6s ease-in-out infinite; }
.the-grid .grid-scan { right: 16px; top: 44px; width: 260px; z-index: 4; }
.the-grid .grid-jack { stroke-dasharray: 1; stroke-dashoffset: 1; animation: grid-draw ${JACK_MS}ms ease-out forwards; }
.the-grid .grid-flash { position: absolute; inset: 0; z-index: 6; opacity: 0; animation: grid-flash ${JACK_MS}ms ease-in forwards; pointer-events: none; }
.the-grid.grid-boot .grid-line { stroke-dasharray: 1; stroke-dashoffset: 1; animation: grid-draw 0.9s ease-out 0.15s forwards; }
.the-grid.grid-boot .grid-item, .the-grid.grid-boot .grid-hud { opacity: 0; animation: grid-in 0.35s ease-out forwards; animation-delay: var(--d, 0.2s); }
.the-grid.grid-still .grid-floor, .the-grid.grid-still .grid-online { animation: none; }
@media (max-width: 640px) {
  .the-grid .grid-scan { left: 12px; right: 12px; top: auto; bottom: 64px; width: auto; }
  .the-grid .grid-keys { display: none; }
  .the-grid .grid-label { font-size: 10px; letter-spacing: 0.12em; }
}
@keyframes grid-draw { to { stroke-dashoffset: 0; } }
@keyframes grid-in { to { opacity: 1; } }
@keyframes grid-drift { to { transform: translate(40px, 40px); } }
@keyframes grid-breathe { 0%, 100% { filter: brightness(1); } 50% { filter: brightness(1.45); } }
@keyframes grid-flash { 0% { opacity: 0; } 80% { opacity: 0.12; } 100% { opacity: 0.35; } }
`;
