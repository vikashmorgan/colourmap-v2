'use client';

/*
 * THE CITY MAP — the engine's view: any MapData (lib/city-map.ts) drawn as
 * cities seen from above, a memory palace where every kind of thing has one
 * shape and one place. Nothing here knows the data's subject; an adapter
 * hands in the data, how lit each building is, and the sheets' content (the
 * first adapter is components/PandasCity.tsx). Spec: docs/specs/pandas-city.md.
 *
 * The region: the cities on a golden ring, clockwise from the top, around a
 * glowing plaza. Every city has the same bones, so orientation transfers: the
 * gate in the south, the avenue (the midrib) up to the spots in the north, the
 * heart with its star in the middle, the districts as octagons around the
 * heart clockwise from the gate, the buildings as squares inside them, the
 * shelf on the east edge. The roads branch like veins from the heart.
 *
 * Three depths, by zoom or by the pills: Core (the region, titles and core
 * lines), Parts (one city, its octagons and blocks), Detail (one district
 * close up). A tap opens sheets on top, each deeper sheet higher.
 *
 * Move: drag, the wheel or a pinch, the arrows or W A S D, + and −.
 * Esc closes the top sheet, then steps back out a depth.
 */

import {
  type CSSProperties,
  type ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  breadcrumb,
  CITY_R,
  type CityPlan,
  cityVeins,
  DISTRICT_RING,
  HEART_R,
  INNER_RING,
  layoutMap,
  type MapData,
  openPanel,
  type Panel,
  PHI,
  panelDepth,
  panelTitle,
  polygon,
  popPanel,
  RING_R,
  regionVeins,
  ringRoads,
  star,
  type Vein,
} from '@/lib/city-map';

import {
  DIM,
  Glyph,
  type GlyphKind,
  GOLD,
  GOLD_LIT,
  GUIDE,
  INK,
  INK_SOFT,
  Inline,
  IVORY,
  LINE,
  PAPER_2,
  paper,
  SERIF,
  SKY,
  SKY_2,
  WARN,
} from './ui';

export type Lit = 'full' | 'half' | undefined;
export type Level = 'core' | 'parts' | 'detail';
export type CityMapProps = {
  data: MapData;
  back: { href: string; label: string };
  /** How lit a building is: full (done), half (begun), or not at all. */
  litOf?: (n: number, buildingId: string) => Lit;
  /** A sheet's content. The engine draws the sheet itself, its breadcrumb, back and close. */
  renderPanel: (panel: Panel, open: (panel: Panel) => void) => ReactNode;
};

type View = { x: number; y: number; k: number };
type Popup = { n: number } | { plaza: true };

const REGION_HALF = RING_R + CITY_R + 80;
const VEIN_ALPHA = [0.55, 0.4, 0.22, 0.3];

/** The view that shows a square of half-size `half` around (x, y). */
const frame = (x: number, y: number, half: number, w: number, h: number): View => ({
  x,
  y,
  k: Math.min(w, h) / (2 * half),
});

/** A name cut to fit `max` characters. */
const clip = (s: string, max: number) =>
  s.length > max ? `${s.slice(0, Math.max(1, max - 1)).trimEnd()}…` : s;

/** The whole region, centred in the space below the top bar. */
const TOP_BAR = 80;
function regionView(w: number, h: number): View {
  const k = Math.min(w, Math.max(h - TOP_BAR, 200)) / (2 * REGION_HALF);
  return { x: 0, y: -TOP_BAR / 2 / k, k };
}

/** The depth a zoom shows. */
export function levelOf(k: number, w: number, h: number): Level {
  const city = 2 * CITY_R * k;
  const m = Math.min(w, h);
  if (city < 0.6 * m) return 'core';
  if (city > 1.7 * m) return 'detail';
  return 'parts';
}

export default function CityMap({ data, back, litOf, renderPanel }: CityMapProps) {
  const plan = useMemo(() => layoutMap(data), [data]);
  const veins = useMemo(
    () => ({
      region: regionVeins(plan),
      ring: ringRoads(plan),
      cities: plan.cities.map(cityVeins),
    }),
    [plan],
  );
  const words = data.words;

  const boxRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 390, h: 700 });
  const [view, setView] = useState<View>(() => regionView(390, 700));
  const viewRef = useRef(view);
  const target = useRef<View | null>(null);
  const raf = useRef(0);
  const [stack, setStack] = useState<Panel[]>([]);
  const [popup, setPopup] = useState<Popup | null>(null);
  const [legend, setLegend] = useState(false);
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null);

  const apply = useCallback((v: View) => {
    viewRef.current = v;
    setView(v);
  }, []);

  // Glide toward the target view, in log space for the zoom.
  const flyTo = useCallback(
    (v: View) => {
      target.current = v;
      cancelAnimationFrame(raf.current);
      const step = () => {
        const t = target.current;
        if (!t) return;
        const c = viewRef.current;
        const lk = Math.log(c.k) + (Math.log(t.k) - Math.log(c.k)) * 0.2;
        const next = { x: c.x + (t.x - c.x) * 0.2, y: c.y + (t.y - c.y) * 0.2, k: Math.exp(lk) };
        const done =
          Math.abs(t.x - next.x) * next.k < 0.5 &&
          Math.abs(t.y - next.y) * next.k < 0.5 &&
          Math.abs(lk - Math.log(t.k)) < 0.004;
        apply(done ? t : next);
        if (done) target.current = null;
        else raf.current = requestAnimationFrame(step);
      };
      raf.current = requestAnimationFrame(step);
    },
    [apply],
  );
  const stopGlide = useCallback(() => {
    target.current = null;
    cancelAnimationFrame(raf.current);
  }, []);

  // Size: the region fits the screen on first measure.
  useEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    let first = true;
    const measure = () => {
      const w = el.clientWidth || 390;
      const h = el.clientHeight || 700;
      setSize({ w, h });
      if (first) {
        first = false;
        apply(regionView(w, h));
      }
    };
    measure();
    if (typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [apply]);
  useEffect(() => () => cancelAnimationFrame(raf.current), []);

  const { w, h } = size;
  const level = levelOf(view.k, w, h);
  const narrow = w < 640;

  /* where the eye is: the nearest city, and in it the nearest district */
  const here = useMemo(() => {
    let city: CityPlan | null = null;
    let best = Number.POSITIVE_INFINITY;
    for (const c of plan.cities) {
      const d = Math.hypot(c.x - view.x, c.y - view.y);
      if (d < best) {
        best = d;
        city = c;
      }
    }
    if (!city || best > CITY_R + 60 || level === 'core')
      return { city: null as CityPlan | null, text: data.title };
    let part = '';
    let pd = Number.POSITIVE_INFINITY;
    for (const d of city.districts) {
      const dd = Math.hypot(d.x - view.x, d.y - view.y);
      if (dd < pd && dd < d.r * 1.6) {
        pd = dd;
        part = d.name;
      }
    }
    const name = city.city
      ? `${words.city} ${city.n} · ${city.city.short}`
      : `${words.city} ${city.n} · to come`;
    return { city, text: part ? `${name} › ${part}` : name };
  }, [plan, view.x, view.y, level, data.title, words.city]);

  const cityView = useCallback((c: CityPlan) => frame(c.x, c.y, CITY_R + 50, w, h), [w, h]);
  const districtView = useCallback(
    (c: CityPlan, k: number) => {
      const d = c.districts[k];
      return d ? frame(d.x, d.y, d.r * 1.9, w, h) : frame(c.x, c.y, CITY_R + 50, w, h);
    },
    [w, h],
  );

  const goLevel = useCallback(
    (to: Level) => {
      setPopup(null);
      if (to === 'core') {
        flyTo(regionView(w, h));
        return;
      }
      const n = stack[0]?.n ?? here.city?.n ?? plan.cities.find((c) => c.lit)?.n ?? 1;
      const c = plan.cities[n - 1];
      if (to === 'parts') {
        flyTo(cityView(c));
        return;
      }
      const deep = [...stack].reverse().find((p) => 'district' in p);
      flyTo(districtView(c, deep && 'district' in deep ? deep.district : 0));
    },
    [flyTo, w, h, stack, here.city, plan, cityView, districtView],
  );

  const open = useCallback((panel: Panel) => {
    setPopup(null);
    setStack((s) => openPanel(s, panel));
  }, []);

  const zoomBy = useCallback(
    (f: number, sx = w / 2, sy = h / 2) => {
      stopGlide();
      const v = viewRef.current;
      const k = Math.min(40, Math.max(0.03, v.k * f));
      const wx = v.x + (sx - w / 2) / v.k;
      const wy = v.y + (sy - h / 2) / v.k;
      apply({ k, x: wx - (sx - w / 2) / k, y: wy - (sy - h / 2) / k });
    },
    [apply, stopGlide, w, h],
  );
  const panBy = useCallback(
    (dx: number, dy: number) => {
      stopGlide();
      const v = viewRef.current;
      apply({ ...v, x: v.x - dx / v.k, y: v.y - dy / v.k });
    },
    [apply, stopGlide],
  );

  /* ── taps on the map: data-hit="kind:n:district:building" ── */
  const tap = useCallback(
    (hit: string) => {
      const [what, a, b, c] = hit.split(':');
      if (what === 'plaza') {
        setPopup({ plaza: true });
        return;
      }
      const n = Number(a);
      const city = plan.cities[n - 1];
      if (!city) return;
      if (!city.lit || level === 'core') {
        setPopup({ n });
        return;
      }
      if (what === 'district') {
        flyTo(districtView(city, Number(b)));
        open({ kind: 'district', n, district: Number(b) });
      } else if (what === 'building')
        open({ kind: 'building', n, district: Number(b), building: c });
      else if (what === 'heart' || what === 'gate') open({ kind: 'city', n });
      else if (what === 'spot') open({ kind: 'spots', n });
      else if (what === 'shelf') open({ kind: 'shelf', n });
      else if (what === 'city') flyTo(cityView(city));
    },
    [plan, level, flyTo, districtView, cityView, open],
  );

  const hoverText = useCallback(
    (hit: string): string => {
      const [what, a, b, c] = hit.split(':');
      if (what === 'plaza') return data.centre.name;
      const city = data.slots[Number(a) - 1];
      if (!city) return `${words.city} ${a} · to come`;
      if (what === 'city' || what === 'gate') return `${words.city} ${a} · ${city.title}`;
      if (what === 'heart') return words.core;
      if (what === 'district') return city.districts[Number(b)]?.name ?? '';
      if (what === 'building')
        return city.districts[Number(b)]?.buildings.find((x) => x.id === c)?.name ?? '';
      if (what === 'spot') return city.spots.find((x) => x.id === b)?.name ?? words.spots;
      if (what === 'shelf') return `${words.shelf} · ${city.shelf}`;
      return '';
    },
    [data, words],
  );

  /* ── pointers: drag, pinch, tap ── */
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ moved: number; hit: string | null; dist: number }>({
    moved: 0,
    hit: null,
    dist: 0,
  });

  const onPointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    stopGlide();
    const hit = (e.target as Element).closest?.('[data-hit]')?.getAttribute('data-hit') ?? null;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 1) gesture.current = { moved: 0, hit, dist: 0 };
    else gesture.current.hit = null;
    if (pointers.current.size === 2) {
      const [p, q] = [...pointers.current.values()];
      gesture.current.dist = Math.hypot(p.x - q.x, p.y - q.y);
    }
    e.currentTarget.setPointerCapture?.(e.pointerId);
  };
  const onPointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) {
      if (e.pointerType === 'mouse') {
        const hit = (e.target as Element).closest?.('[data-hit]')?.getAttribute('data-hit');
        const rect = boxRef.current?.getBoundingClientRect();
        const text = hit ? hoverText(hit) : '';
        setHover(text && rect ? { x: e.clientX - rect.left, y: e.clientY - rect.top, text } : null);
      }
      return;
    }
    const now = { x: e.clientX, y: e.clientY };
    if (pointers.current.size === 2) {
      const other = [...pointers.current.entries()].find(([id]) => id !== e.pointerId)?.[1];
      pointers.current.set(e.pointerId, now);
      if (!other) return;
      const dist = Math.hypot(now.x - other.x, now.y - other.y);
      const rect = boxRef.current?.getBoundingClientRect();
      const mx = (now.x + other.x) / 2 - (rect?.left ?? 0);
      const my = (now.y + other.y) / 2 - (rect?.top ?? 0);
      if (gesture.current.dist > 0) zoomBy(dist / gesture.current.dist, mx, my);
      panBy((now.x - prev.x) / 2, (now.y - prev.y) / 2);
      gesture.current.dist = dist;
      gesture.current.moved += 10;
      return;
    }
    pointers.current.set(e.pointerId, now);
    gesture.current.moved += Math.hypot(now.x - prev.x, now.y - prev.y);
    if (gesture.current.moved > 6) {
      setHover(null);
      panBy(now.x - prev.x, now.y - prev.y);
    }
  };
  const onPointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (!pointers.current.delete(e.pointerId)) return;
    if (pointers.current.size === 0 && gesture.current.moved <= 6) {
      if (gesture.current.hit) tap(gesture.current.hit);
      else setPopup(null);
    }
  };

  // The wheel zooms around the pointer (a non-passive listener, to keep the page still).
  useEffect(() => {
    const svg = svgRef.current;
    if (!svg) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = svg.getBoundingClientRect();
      zoomBy(Math.exp(-e.deltaY * 0.0015), e.clientX - rect.left, e.clientY - rect.top);
    };
    svg.addEventListener('wheel', onWheel, { passive: false });
    return () => svg.removeEventListener('wheel', onWheel);
  }, [zoomBy]);

  // Keys: arrows and W A S D move, + and − zoom, Esc goes back one step.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'arrowleft' || k === 'a') panBy(90, 0);
      else if (k === 'arrowright' || k === 'd') panBy(-90, 0);
      else if (k === 'arrowup' || k === 'w') panBy(0, 90);
      else if (k === 'arrowdown' || k === 's') panBy(0, -90);
      else if (k === '+' || k === '=') zoomBy(1.25);
      else if (k === '-' || k === '_') zoomBy(0.8);
      else if (k === 'escape') {
        if (legend) setLegend(false);
        else if (stack.length) setStack(popPanel);
        else if (popup) setPopup(null);
        else if (level === 'detail') goLevel('parts');
        else if (level === 'parts') goLevel('core');
        else return;
      } else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [panBy, zoomBy, legend, stack, popup, level, goLevel]);

  /* ── drawing ── */
  const k = view.k;
  const px = (n: number) => n / k;
  const showParts = CITY_R * k > 90;
  const showBlocks = level !== 'core';
  const label = (x: number, y: number, text: string, size: number, color = IVORY, weight = 400) => (
    <text
      x={x}
      y={y}
      fontSize={px(size)}
      fill={color}
      fontWeight={weight}
      textAnchor="middle"
      dominantBaseline="middle"
      style={{
        paintOrder: 'stroke',
        stroke: SKY,
        strokeWidth: px(3.5),
        strokeLinejoin: 'round',
        fontFamily: SERIF,
        pointerEvents: 'none',
      }}
    >
      {text}
    </text>
  );
  const vein = (v: Vein, i: number, color: string) =>
    v.gen === 3 && !showBlocks ? null : (
      <path
        key={i}
        d={v.d}
        fill="none"
        stroke={color}
        strokeOpacity={VEIN_ALPHA[v.gen]}
        strokeWidth={Math.max(v.w, px(v.gen < 2 ? 1.5 : 0.8))}
        strokeLinecap="round"
        pointerEvents="none"
      />
    );

  const drawCity = (c: CityPlan) => {
    if (!c.city) {
      return (
        <g key={c.n} data-hit={`city:${c.n}`} style={{ cursor: 'pointer' }}>
          <circle
            cx={c.x}
            cy={c.y}
            r={CITY_R * 0.62}
            fill="rgba(242,230,204,0.03)"
            stroke={DIM}
            strokeWidth={px(1)}
            strokeDasharray={`${px(4)} ${px(6)}`}
          />
          <polygon
            points={polygon(c.x, c.y, CITY_R * 0.3, 8, Math.PI / 8)}
            fill="none"
            stroke={DIM}
            strokeWidth={px(1)}
          />
          <circle
            cx={c.x}
            cy={c.y}
            r={HEART_R * 0.5}
            fill="none"
            stroke={DIM}
            strokeWidth={px(1)}
          />
          {label(
            c.x,
            c.y + CITY_R * 0.62 + px(16),
            `${words.city} ${c.n} · to come`,
            13,
            'rgba(242,230,204,0.6)',
          )}
        </g>
      );
    }
    const accent = c.accent;
    return (
      <g key={c.n}>
        {/* the ground, its construction circles and its ring roads */}
        <circle
          data-hit={`city:${c.n}`}
          cx={c.x}
          cy={c.y}
          r={CITY_R + 24}
          fill="rgba(226,182,90,0.035)"
          stroke={GUIDE}
          strokeWidth={px(1)}
        />
        <circle
          cx={c.x}
          cy={c.y}
          r={HEART_R * PHI ** 4.5}
          fill="url(#cm-glow)"
          pointerEvents="none"
        />
        {[1, 2, 3].map((i) => (
          <circle
            key={i}
            cx={c.x}
            cy={c.y}
            r={HEART_R * PHI ** i}
            fill="none"
            stroke={GUIDE}
            strokeWidth={px(0.8)}
            pointerEvents="none"
          />
        ))}
        {[DISTRICT_RING, CITY_R - 8].map((r) => (
          <circle
            key={r}
            cx={c.x}
            cy={c.y}
            r={r}
            fill="none"
            stroke={accent}
            strokeOpacity={0.16}
            strokeWidth={Math.max(2, px(0.8))}
            pointerEvents="none"
          />
        ))}
        {/* the veins */}
        {veins.cities[c.n - 1].map((v, i) => vein(v, i, accent))}
        {/* districts: octagons, with their buildings */}
        {c.districts.map((d) => (
          <g key={d.index}>
            <polygon
              data-hit={`district:${c.n}:${d.index}`}
              points={polygon(d.x, d.y, d.r, 8, Math.PI / 8)}
              fill={SKY}
              fillOpacity={0.55}
              stroke={accent}
              strokeWidth={px(1.4)}
              style={{ cursor: 'pointer' }}
            />
            <polygon
              points={polygon(d.x, d.y, d.r, 8, Math.PI / 8)}
              fill={accent}
              fillOpacity={0.08}
              pointerEvents="none"
            />
            {showBlocks &&
              d.blocks.map((b) => {
                const lit = litOf?.(c.n, b.id);
                const half = b.side / 2;
                return (
                  <g
                    key={b.id}
                    data-hit={`building:${c.n}:${d.index}:${b.id}`}
                    style={{ cursor: 'pointer' }}
                  >
                    <rect
                      x={b.x - b.cell / 2}
                      y={b.y - b.cell / 2}
                      width={b.cell}
                      height={b.cell}
                      fill="transparent"
                    />
                    {lit === 'full' && (
                      <rect
                        x={b.x - half - 3}
                        y={b.y - half - 3}
                        width={b.side + 6}
                        height={b.side + 6}
                        fill={GOLD_LIT}
                        opacity={0.28}
                        rx={2}
                      />
                    )}
                    <rect
                      x={b.x - half}
                      y={b.y - half}
                      width={b.side}
                      height={b.side}
                      fill={
                        lit === 'full'
                          ? GOLD_LIT
                          : lit === 'half'
                            ? 'rgba(242,230,204,0.32)'
                            : SKY_2
                      }
                      stroke={lit === 'full' ? GOLD_LIT : IVORY}
                      strokeOpacity={lit === 'full' ? 1 : 0.75}
                      strokeWidth={px(1.2)}
                    />
                    {b.flag && (
                      <polygon
                        points={polygon(
                          b.x + b.cell / 2 - b.cell * 0.12,
                          b.y - b.cell / 2 + b.cell * 0.14,
                          b.cell * 0.11,
                          3,
                        )}
                        fill={WARN}
                        pointerEvents="none"
                      />
                    )}
                    {b.tag &&
                      b.cell * k >= 30 &&
                      label(
                        b.x,
                        b.y,
                        b.tag,
                        Math.min(12, b.side * k * 0.4),
                        lit === 'full' ? INK : IVORY,
                        600,
                      )}
                    {b.cell * k >= 110 &&
                      label(
                        b.x,
                        b.y + b.cell / 2 - px(7),
                        clip(b.name, Math.floor((b.cell * k) / 6.2)),
                        11,
                      )}
                  </g>
                );
              })}
            {showParts &&
              (showBlocks
                ? label(d.x, d.y - d.r - px(10), d.name, 12, GOLD, 600)
                : label(d.x, d.y, d.name.split(' ').slice(0, 2).join(' '), 11, GOLD, 600))}
          </g>
        ))}
        {/* the heart, with the star of the core lines */}
        <g data-hit={`heart:${c.n}`} style={{ cursor: 'pointer' }}>
          <circle
            cx={c.x}
            cy={c.y}
            r={HEART_R}
            fill={SKY_2}
            stroke={accent}
            strokeWidth={px(1.6)}
          />
          <polygon points={star(c.x, c.y, HEART_R * 0.72)} fill={accent} fillOpacity={0.9} />
        </g>
        {/* the spots in the north */}
        {c.spots.map((s) => (
          <g key={s.id} data-hit={`spot:${c.n}:${s.id}`} style={{ cursor: 'pointer' }}>
            <polygon
              points={polygon(s.x, s.y, s.r, 6, 0)}
              fill={SKY_2}
              stroke={IVORY}
              strokeWidth={px(1.2)}
            />
            <circle cx={s.x} cy={s.y} r={s.r / PHI ** 2} fill={IVORY} fillOpacity={0.75} />
          </g>
        ))}
        {showBlocks &&
          c.spots.length > 0 &&
          label(c.x, c.spots[0].y - c.spots[0].r - px(10), words.spots, 12, IVORY, 600)}
        {/* the shelf on the east edge */}
        <g data-hit={`shelf:${c.n}`} style={{ cursor: 'pointer' }}>
          <rect
            x={c.shelf.x}
            y={c.shelf.y}
            width={c.shelf.w}
            height={c.shelf.h}
            fill={SKY_2}
            stroke={IVORY}
            strokeWidth={px(1.2)}
          />
          {Array.from({ length: c.shelf.entries }, (_, i) => {
            const y = c.shelf.y + ((i + 0.5) * c.shelf.h) / c.shelf.entries;
            return (
              <line
                key={i}
                x1={c.shelf.x + 5}
                x2={c.shelf.x + c.shelf.w - 5}
                y1={y}
                y2={y}
                stroke={IVORY}
                strokeOpacity={0.5}
                strokeWidth={px(1)}
              />
            );
          })}
        </g>
        {showBlocks &&
          label(c.shelf.x + c.shelf.w / 2, c.shelf.y - px(12), words.shelf, 12, IVORY, 600)}
        {/* the gate in the south */}
        <g data-hit={`gate:${c.n}`} style={{ cursor: 'pointer' }}>
          <rect
            x={c.gate.x - c.gate.w / 2}
            y={c.gate.y - 14}
            width={c.gate.w}
            height={28}
            fill="transparent"
          />
          <path
            d={`M${c.gate.x - c.gate.w / 2} ${c.gate.y + 12} V${c.gate.y - 10} H${c.gate.x + c.gate.w / 2} V${c.gate.y + 12}`}
            fill="none"
            stroke={accent}
            strokeWidth={Math.max(px(2), 4)}
          />
        </g>
        {label(
          c.x,
          c.gate.y + 16 + px(20),
          showBlocks ? `${words.city} ${c.n} · ${c.city.title}` : `${c.n} · ${c.city.short}`,
          showBlocks ? 14 : 13,
          IVORY,
          600,
        )}
      </g>
    );
  };

  const toScreen = (x: number, y: number) => ({
    x: (x - view.x) * k + w / 2,
    y: (y - view.y) * k + h / 2,
  });
  const crumbs = breadcrumb(stack, data);
  const popN = popup && 'n' in popup ? popup.n : 0;
  const popCity = popN ? plan.cities[popN - 1] : null;
  const popAt = popCity ? toScreen(popCity.x, popCity.y) : toScreen(0, 0);

  const chip: CSSProperties = {
    font: `600 13px ${SERIF}`,
    color: IVORY,
    background: 'rgba(20,27,46,0.72)',
    border: '1px solid rgba(226,182,90,0.35)',
    borderRadius: 999,
    padding: '8px 12px',
    cursor: 'pointer',
    minHeight: 36,
  };
  const legendRows: [GlyphKind, string][] = [
    ['circle', `The plaza (${data.centre.name}) at the centre, and each city’s heart`],
    ['star', `In the heart: ${words.core.toLowerCase()}`],
    ['octagon', `A ${words.district}, clockwise from the gate`],
    ['square', `A ${words.building}: bigger when it holds more`],
    ['lit', `A ${words.building} you have marked`],
    ['triangle', `A ${words.building} with a “watch out”`],
    ['hexagon', `${words.spots}: in the north`],
    ['shelf', `${words.shelf}: on the east edge`],
    ['gate', 'The gate in the south: where a city begins'],
  ];

  return (
    <div
      ref={boxRef}
      style={{
        position: 'fixed',
        inset: 0,
        overflow: 'hidden',
        background: `radial-gradient(circle at 50% 45%, ${SKY_2}, ${SKY} 70%)`,
        fontFamily: SERIF,
        color: IVORY,
        touchAction: 'none',
        userSelect: 'none',
      }}
    >
      <svg
        ref={svgRef}
        width={w}
        height={h}
        role="application"
        aria-label={`${data.title}, seen from above. Drag to move, scroll or pinch to zoom, tap a place to open it.`}
        style={{ display: 'block', cursor: 'grab' }}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <radialGradient id="cm-glow">
            <stop offset="0" stopColor={GOLD} stopOpacity={0.32} />
            <stop offset="1" stopColor={GOLD} stopOpacity={0} />
          </radialGradient>
        </defs>
        <g transform={`translate(${w / 2} ${h / 2}) scale(${k}) translate(${-view.x} ${-view.y})`}>
          {/* construction: golden guides around the great ring */}
          {[RING_R / PHI, RING_R * PHI ** 0.5].map((r) => (
            <circle
              key={r}
              cx={0}
              cy={0}
              r={r}
              fill="none"
              stroke={GUIDE}
              strokeWidth={px(1)}
              pointerEvents="none"
            />
          ))}
          <polygon
            points={polygon(0, 0, RING_R, plan.cities.length)}
            fill="none"
            stroke={GUIDE}
            strokeWidth={px(1)}
            pointerEvents="none"
          />
          {/* roads: the ring road and the veins from the plaza */}
          {veins.ring.map((d) => (
            <path
              key={d}
              d={d}
              fill="none"
              stroke={GOLD}
              strokeOpacity={0.3}
              strokeWidth={Math.max(px(2), 8)}
              strokeLinecap="round"
              pointerEvents="none"
            />
          ))}
          <circle
            cx={0}
            cy={0}
            r={INNER_RING}
            fill="none"
            stroke={GOLD}
            strokeOpacity={0.12}
            strokeWidth={Math.max(px(1), 3)}
            pointerEvents="none"
          />
          {veins.region.map((v, i) => vein(v, i, GOLD))}
          <circle
            cx={0}
            cy={0}
            r={plan.plaza.r * PHI ** 2}
            fill="url(#cm-glow)"
            pointerEvents="none"
          />
          <g data-hit="plaza" style={{ cursor: 'pointer' }}>
            <circle
              cx={0}
              cy={0}
              r={plan.plaza.r}
              fill={GOLD}
              fillOpacity={0.16}
              stroke={GOLD}
              strokeWidth={px(1.6)}
            />
            <circle
              cx={0}
              cy={0}
              r={plan.plaza.r / PHI}
              fill="none"
              stroke={GOLD}
              strokeOpacity={0.6}
              strokeWidth={px(1)}
            />
            <polygon
              points={polygon(0, 0, plan.plaza.r / PHI ** 2, 8, Math.PI / 8)}
              fill={GOLD}
              fillOpacity={0.55}
            />
          </g>
          {label(0, plan.plaza.r + px(16), data.centre.name, 14, GOLD, 600)}
          {plan.cities.map(drawCity)}
        </g>
      </svg>

      {/* top bar: back, the depths, the legend, where you are */}
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          padding: '12px 16px',
          display: 'flex',
          flexWrap: 'wrap',
          gap: 8,
          alignItems: 'center',
          pointerEvents: 'none',
        }}
      >
        <a
          href={back.href}
          style={{
            ...chip,
            textDecoration: 'none',
            pointerEvents: 'auto',
            display: 'inline-flex',
            alignItems: 'center',
          }}
        >
          ← {back.label}
        </a>
        <fieldset
          aria-label="Depth"
          style={{
            display: 'flex',
            gap: 4,
            pointerEvents: 'auto',
            border: 0,
            margin: 0,
            padding: 0,
            minWidth: 0,
          }}
        >
          {(['core', 'parts', 'detail'] as Level[]).map((lv) => (
            <button
              key={lv}
              type="button"
              aria-pressed={level === lv}
              onClick={() => goLevel(lv)}
              style={{
                ...chip,
                background: level === lv ? GOLD : chip.background,
                color: level === lv ? INK : IVORY,
              }}
            >
              {lv === 'core' ? 'Core' : lv === 'parts' ? 'Parts' : 'Detail'}
            </button>
          ))}
        </fieldset>
        <button
          type="button"
          aria-label="What the shapes mean"
          aria-expanded={legend}
          onClick={() => setLegend((v) => !v)}
          style={{ ...chip, pointerEvents: 'auto', marginLeft: 'auto', width: 36, padding: 0 }}
        >
          ?
        </button>
        <p
          aria-live="polite"
          style={{
            flexBasis: '100%',
            margin: 0,
            font: `600 13px ${SERIF}`,
            color: GOLD,
            letterSpacing: '.04em',
            textShadow: `0 1px 3px ${SKY}`,
          }}
        >
          {here.text}
        </p>
      </div>

      {legend && (
        <div
          role="dialog"
          aria-label="What the shapes mean"
          style={{
            ...paper(3),
            position: 'absolute',
            top: 100,
            right: 16,
            left: narrow ? 16 : 'auto',
            width: narrow ? 'auto' : 340,
            padding: 16,
            display: 'grid',
            gap: 8,
            zIndex: 3,
          }}
        >
          <b style={{ fontSize: 16 }}>Every shape has one meaning</b>
          {legendRows.map(([g, t]) => (
            <div key={g} style={{ display: 'flex', gap: 12, alignItems: 'center', fontSize: 14 }}>
              <Glyph kind={g} />
              <span>{t}</span>
            </div>
          ))}
          <p style={{ margin: 0, fontSize: 13, color: INK_SOFT }}>
            The cities stand on the ring in order, clockwise from the top. Inside each, the{' '}
            {words.district}s follow in order clockwise from the gate.
          </p>
        </div>
      )}

      {hover && !popup && (
        <div
          style={{
            position: 'absolute',
            left: Math.min(hover.x + 14, w - 236),
            top: hover.y + 14,
            ...paper(1),
            padding: '4px 12px',
            fontSize: 13,
            maxWidth: 220,
            pointerEvents: 'none',
          }}
        >
          {hover.text}
        </div>
      )}

      {/* the pop-up box: a city's core lines, or the plaza */}
      {popup && (
        <div
          role="dialog"
          aria-label={popCity ? `${words.city} ${popN}` : data.centre.name}
          style={{
            ...paper(2),
            position: 'absolute',
            left: Math.max(16, Math.min(popAt.x - 150, w - 316)),
            top: Math.max(96, Math.min(popAt.y + 24, h - 340)),
            width: Math.min(300, w - 32),
            padding: 16,
            display: 'grid',
            gap: 8,
          }}
        >
          {!popCity ? (
            <>
              <b style={{ fontSize: 16 }}>{data.centre.name}</b>
              <p style={{ margin: 0, fontSize: 14 }}>{data.centre.blurb}</p>
            </>
          ) : popCity.city ? (
            <>
              <span style={{ fontSize: 13, color: INK_SOFT }}>
                {words.city} {popN} · {words.core}
              </span>
              <b style={{ fontSize: 16, lineHeight: 1.25 }}>{popCity.city.title}</b>
              <ul
                style={{
                  margin: 0,
                  paddingLeft: 18,
                  fontSize: 14,
                  display: 'grid',
                  gap: 4,
                  maxHeight: 180,
                  overflow: 'auto',
                }}
              >
                {popCity.city.core.map((r) => (
                  <li key={r}>
                    <Inline text={r} />
                  </li>
                ))}
              </ul>
              <button
                type="button"
                onClick={() => {
                  setPopup(null);
                  flyTo(cityView(popCity));
                }}
                style={{
                  justifySelf: 'start',
                  font: `600 14px ${SERIF}`,
                  color: INK,
                  background: GOLD,
                  border: 0,
                  borderRadius: 999,
                  padding: '8px 16px',
                  cursor: 'pointer',
                }}
              >
                Enter the city
              </button>
            </>
          ) : (
            <>
              <b style={{ fontSize: 16 }}>
                {words.city} {popN} · to come
              </b>
              <p style={{ margin: 0, fontSize: 14 }}>
                An empty plot, waiting for its {words.city.toLowerCase()}.
              </p>
            </>
          )}
        </div>
      )}

      {/* zoom buttons and the minimap */}
      <div style={{ position: 'absolute', right: 16, bottom: 16, display: 'grid', gap: 8 }}>
        <button
          type="button"
          aria-label="Zoom in"
          style={{ ...chip, width: 40, height: 40, padding: 0, fontSize: 18 }}
          onClick={() => zoomBy(1.4)}
        >
          +
        </button>
        <button
          type="button"
          aria-label="Zoom out"
          style={{ ...chip, width: 40, height: 40, padding: 0, fontSize: 18 }}
          onClick={() => zoomBy(1 / 1.4)}
        >
          −
        </button>
      </div>
      <svg
        width={88}
        height={88}
        viewBox="-1500 -1500 3000 3000"
        role="img"
        aria-label="Where you are on the ring"
        style={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          background: 'rgba(20,27,46,0.72)',
          borderRadius: '50%',
          border: '1px solid rgba(226,182,90,0.35)',
        }}
      >
        <circle
          cx={0}
          cy={0}
          r={RING_R}
          fill="none"
          stroke={GOLD}
          strokeOpacity={0.45}
          strokeWidth={40}
        />
        <circle cx={0} cy={0} r={plan.plaza.r} fill={GOLD} fillOpacity={0.6} />
        {plan.cities.map((c) => (
          <circle
            key={c.n}
            cx={c.x}
            cy={c.y}
            r={170}
            fill={c.lit ? GOLD : 'none'}
            fillOpacity={0.8}
            stroke={c.lit ? GOLD : DIM}
            strokeWidth={30}
          />
        ))}
        <circle
          cx={Math.max(-1400, Math.min(1400, view.x))}
          cy={Math.max(-1400, Math.min(1400, view.y))}
          r={110}
          fill={IVORY}
          stroke={SKY}
          strokeWidth={40}
        />
      </svg>

      {/* the sheets: the deeper, the higher */}
      {stack.length > 0 && (
        <div
          style={{
            position: 'absolute',
            right: narrow ? 0 : 16,
            left: narrow ? 0 : 'auto',
            bottom: narrow ? 0 : 16,
            width: narrow ? 'auto' : 400,
            height: narrow ? '62vh' : 'min(70vh, 640px)',
            pointerEvents: 'none',
          }}
        >
          {stack.map((p, i) => {
            const top = i === stack.length - 1;
            const below = stack.length - 1 - i;
            return (
              <section
                key={`${p.kind}-${panelDepth(p)}`}
                aria-label={panelTitle(p, data)}
                aria-hidden={!top}
                inert={!top}
                data-depth={panelDepth(p)}
                style={{
                  ...paper(panelDepth(p) + 1),
                  position: 'absolute',
                  inset: 0,
                  transform: `translateY(${below * 12}px) scale(${1 - below * 0.03})`,
                  transformOrigin: '50% 100%',
                  borderRadius: narrow ? '16px 16px 0 0' : 16,
                  display: 'flex',
                  flexDirection: 'column',
                  pointerEvents: top ? 'auto' : 'none',
                  overflow: 'hidden',
                }}
              >
                {top && (
                  <>
                    <div
                      style={{
                        padding: '16px 16px 8px',
                        borderBottom: `1px solid ${LINE}`,
                        display: 'grid',
                        gap: 8,
                      }}
                    >
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <button
                          type="button"
                          aria-label="Back"
                          onClick={() => setStack(popPanel)}
                          style={sheetBtn}
                        >
                          ‹
                        </button>
                        <nav
                          aria-label="Where this sheet is"
                          style={{
                            fontSize: 13,
                            color: INK_SOFT,
                            display: 'flex',
                            flexWrap: 'wrap',
                            gap: 4,
                            flex: 1,
                            minWidth: 0,
                          }}
                        >
                          {crumbs.map((c, ci) => (
                            <span key={ci} style={{ overflowWrap: 'anywhere' }}>
                              {ci > 0 && '› '}
                              {ci === 1 ? (
                                <button
                                  type="button"
                                  onClick={() => setStack([{ kind: 'city', n: p.n }])}
                                  style={crumbBtn}
                                >
                                  {c}
                                </button>
                              ) : (
                                c
                              )}
                            </span>
                          ))}
                        </nav>
                        <button
                          type="button"
                          aria-label="Close"
                          onClick={() => setStack([])}
                          style={sheetBtn}
                        >
                          ×
                        </button>
                      </div>
                      <h2 style={{ margin: 0, font: `600 20px/1.25 ${SERIF}`, color: INK }}>
                        {panelTitle(p, data)}
                      </h2>
                    </div>
                    <div
                      style={{
                        padding: 16,
                        overflow: 'auto',
                        display: 'grid',
                        gap: 12,
                        alignContent: 'start',
                        font: `15px/1.5 ${SERIF}`,
                        color: INK,
                        userSelect: 'text',
                      }}
                    >
                      {renderPanel(p, open)}
                    </div>
                  </>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

const sheetBtn: CSSProperties = {
  width: 36,
  height: 36,
  flex: 'none',
  borderRadius: 999,
  border: `1px solid ${LINE}`,
  background: PAPER_2,
  color: INK,
  font: `18px ${SERIF}`,
  cursor: 'pointer',
};
const crumbBtn: CSSProperties = {
  background: 'none',
  border: 0,
  padding: 0,
  font: 'inherit',
  color: INK,
  textDecoration: 'underline',
  textUnderlineOffset: 3,
  cursor: 'pointer',
};
