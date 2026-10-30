'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { type Design, DesignTab, parseDesign } from '@/components/DesignTab';
import { drawOrb, makeOrb } from '@/components/starOrb';
import {
  BRANCH_BLURBS,
  BRANCH_LABELS,
  BRANCHES,
  type Branch,
  CENTRE_ROUTES,
  type Grouping,
  groupingsIn,
} from '@/lib/branches';
import { GOLD, type GridNode, HUBS, isOnline, readVisits, step, type Visits } from '@/lib/grid';
import {
  buildLifeTrees,
  crownPoint,
  type Frame,
  GROWN,
  pulse,
  ROOT_RADIUS,
  rootPoint,
  routeLabel,
  SWITCH_SECONDS,
  scatter,
  shifted,
  tipLeaves,
  treeToScreen,
  type View,
  viewFor,
} from '@/lib/life-tree';
import {
  AREAS_2,
  branchWarmth,
  CENTRE_2,
  GROWN_2,
  limbPoint,
  matchPages,
  page,
  pagePoints,
  recentPages,
  sectors,
  spreadLabels,
} from '@/lib/life-tree-2';
import { nextQuote, POWER_QUOTES } from '@/lib/power-quotes';
import { along, routeLength, STEP } from '@/lib/star-tree';

/*
 * THE TREE LOOK OF THE G MENU (lib/life-tree.ts): you at the centre, a pulse
 * leaving the root, and three trees of stars growing out of it -- Art,
 * Admin, Energy. All in gold for now.
 *
 * TWO DESIGNS, one figure, switched by the DESIGN tab at the top left and
 * remembered. A switch disintegrates the stars and rebuilds them in two
 * seconds, the new design's names arriving at the turn.
 *
 * DESIGN I reads lib/branches.ts. Places to stand, Esc stepping back out:
 *
 *   trees     the three names beyond their crowns, and YOU at the root
 *   branch    that tree evolves -- grows, takes the middle, the other two
 *             shrink back -- and its areas hang from its branch tips
 *   area      an area with several pages: its pages hang from the tips
 *   root      the pages about how you are, round the centre
 *
 * DESIGN II reads lib/life-tree-2.ts: every page the Grid knows, placed.
 * A branch opens in one view -- its areas named on the limbs, every page
 * hanging from the tips of its own limb. Pages opened this week glow, and
 * the trees you use shine brighter. Your last three pages sit by YOU, and
 * typing finds any page.
 *
 * An area with no page yet is shown, dim, and does nothing: the tree says
 * honestly where nothing has been built.
 */

export const DESIGN_KEY = 'cb-life-tree-design';

type Level =
  | { kind: 'trees' }
  | { kind: 'branch'; branch: Branch }
  | { kind: 'area'; branch: Branch; area: Grouping }
  | { kind: 'root' };

type Item = {
  key: string;
  label: string;
  line?: string;
  dim?: boolean;
  /** Opened this week (design II). */
  warm?: boolean;
  small?: boolean;
  /** The ball of stars at the root, which is you: no pill, only the stars. */
  orb?: boolean;
  at: [number, number];
  act?: () => void;
};

type Limb = { key: string; label: string; dim: boolean; at: [number, number] };

const [GR, GG, GB] = [196, 160, 96];
/*
 * THE ROOT IS A BALL OF STARS (2026-10-30): "not the you button and pulse in
 * the centre, because it denatures the tree. Can be a ball of star dots
 * instead, so it keeps style." The trunks leave from inside it.
 */
const ORB_STARS = 700;
const ORB_RADIUS = ROOT_RADIUS * 1.5;
/** How long a power quote stays before the next fades in. */
const QUOTE_SECONDS = 30;
// Enough that each crown reads full and branchy at a glance (2026-10-30).
const STARS_PER_TREE = 2400;

const ALL_NODES: GridNode[] = HUBS.flatMap((h) => h.nodes);
const nodeFor = (href: string): GridNode =>
  ALL_NODES.find((n) => n.href === href) ?? { href, label: routeLabel(href), line: '' };

type Props = {
  go: (node: GridNode) => void;
  close: () => void;
  /** Come in from another look: the stars stream together instead of standing ready. */
  arrive?: boolean;
};

export function LifeTree({ go, close, arrive = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState<Frame>({ cx: 0, cy: 0, min: 0 });
  const [design, setDesign] = useState<Design>(1);
  const [fading, setFading] = useState(false);
  const [level, setLevel] = useState<Level>({ kind: 'trees' });
  const [sel, setSel] = useState(0);
  const [query, setQuery] = useState('');
  const [visits, setVisits] = useState<Visits>({});
  const [now, setNow] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const [quote, setQuote] = useState(-1);
  const [quoteIn, setQuoteIn] = useState(false);

  // A power quote under the tree: a new one each time G opens, then every half minute.
  useEffect(() => {
    setQuote(Math.floor(Math.random() * POWER_QUOTES.length));
    setQuoteIn(true);
    let swap = 0;
    const tick = window.setInterval(() => {
      setQuoteIn(false);
      swap = window.setTimeout(() => {
        setQuote((q) => nextQuote(q, Math.random()));
        setQuoteIn(true);
      }, 700);
    }, QUOTE_SECONDS * 1000);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(swap);
    };
  }, []);

  // The tree stood in, if any. At the top none is: all three stay full.
  const litRef = useRef<Branch | null>(null);
  // How awake each tree is (design II), and when the last switch began.
  const warmRef = useRef<Record<Branch, number> | null>(null);
  const designRef = useRef<Design>(1);
  const switchRef = useRef(0);
  // Read once, on arrival.
  const arriveRef = useRef(arrive);
  const trees = useMemo(() => buildLifeTrees(), []);

  useEffect(() => {
    try {
      setDesign(parseDesign(window.localStorage.getItem(DESIGN_KEY)));
    } catch {
      // Not remembered: design I.
    }
    setVisits(readVisits());
    setNow(Date.now());
    if (arriveRef.current) switchRef.current = performance.now() - (SWITCH_SECONDS * 1000) / 2;
    const fitFrame = () =>
      setFrame({
        cx: window.innerWidth / 2,
        cy: window.innerHeight / 2 + 12,
        min: Math.min(window.innerWidth, window.innerHeight),
      });
    fitFrame();
    window.addEventListener('resize', fitFrame);
    return () => window.removeEventListener('resize', fitFrame);
  }, []);

  const pickDesign = (d: Design) => {
    if (d === design || fading) return;
    switchRef.current = performance.now();
    setFading(true);
    // The names change at the turn, while the stars are furthest apart.
    window.setTimeout(
      () => {
        setDesign(d);
        setLevel({ kind: 'trees' });
        setSel(0);
        setQuery('');
        setFading(false);
      },
      (SWITCH_SECONDS * 1000) / 2,
    );
    try {
      window.localStorage.setItem(DESIGN_KEY, String(d));
    } catch {
      // Not remembered; still switched.
    }
  };

  const { items, limbs } = useMemo((): { items: Item[]; limbs: Limb[] } => {
    if (frame.min === 0) return { items: [], limbs: [] };
    const openPage = (href: string) => go(design === 2 ? page(href) : nodeFor(href));
    const warm = (href: string) => design === 2 && isOnline(visits, href, now);
    const pageItem = (href: string, at: [number, number]): Item => {
      const node = design === 2 ? page(href) : nodeFor(href);
      return {
        key: href,
        label: node.label,
        line: node.line,
        warm: warm(href),
        at,
        act: () => openPage(href),
      };
    };

    // Typing finds a page (design II): the matches in a row above the line.
    if (design === 2 && query) {
      const found = matchPages(query);
      const H = (frame.cy - 12) * 2;
      return {
        items: found.map((href, i) =>
          pageItem(href, [frame.cx + (i - (found.length - 1) / 2) * 170, H - 150]),
        ),
        limbs: [],
      };
    }

    if (level.kind === 'trees') {
      const top: Item[] = [
        ...BRANCHES.map((b) => ({
          key: b,
          label: BRANCH_LABELS[b],
          line: BRANCH_BLURBS[b],
          at: crownPoint(b, frame),
          act: () => {
            setLevel({ kind: 'branch', branch: b });
            setSel(0);
          },
        })),
        {
          key: 'you',
          label: 'You',
          orb: true,
          line: 'How you are: today, the notebook, the road',
          at: [frame.cx, frame.cy] as [number, number],
          act: () => {
            setLevel({ kind: 'root' });
            setSel(0);
          },
        },
      ];
      if (design === 2) {
        // The last pages you opened, just under YOU, for a quick way back.
        const recent = recentPages(visits);
        recent.forEach((href, i) => {
          top.push({
            ...pageItem(href, [
              frame.cx + (i - (recent.length - 1) / 2) * 130,
              frame.cy + frame.min * 0.3,
            ]),
            small: true,
          });
        });
      }
      return { items: top, limbs: [] };
    }

    if (level.kind === 'root') {
      const centre = design === 2 ? CENTRE_2 : CENTRE_ROUTES;
      return {
        items: centre.map((href, i) => pageItem(href, rootPoint(i, centre.length, frame))),
        limbs: [],
      };
    }

    const b = level.branch;
    const size = design === 2 ? GROWN_2 : GROWN;
    const grown = shifted(frame, viewFor(b, size));
    const toScreen = (p: [number, number]) => treeToScreen(b, p[0], p[1], grown, size);

    if (design === 2) {
      // One view: the areas named on their limbs, every page at the tips of its own.
      const secs = sectors(trees[b], AREAS_2[b]);
      return {
        limbs: secs.map((s) => ({
          key: s.area.label,
          label: s.area.label,
          dim: s.area.pages.length === 0,
          at: toScreen(limbPoint(trees[b], s)),
        })),
        items: secs.flatMap((s) => {
          const points = pagePoints(trees[b], s, s.area.pages.length);
          return s.area.pages.map((href, i) =>
            pageItem(href, toScreen(points[i] as [number, number])),
          );
        }),
      };
    }

    if (level.kind === 'branch') {
      const areas = groupingsIn(b);
      const tips = tipLeaves(trees[b], areas.length);
      return {
        items: areas.map((g, i) => ({
          key: g.label,
          label: g.label,
          line: g.routes.length ? undefined : 'Nothing built here yet',
          dim: g.routes.length === 0,
          at: toScreen(tips[i] as [number, number]),
          act: g.routes.length
            ? () => {
                if (g.routes.length === 1) openPage(g.routes[0] as string);
                else {
                  setLevel({ kind: 'area', branch: b, area: g });
                  setSel(0);
                }
              }
            : undefined,
        })),
        limbs: [],
      };
    }

    const { routes } = level.area;
    const tips = tipLeaves(trees[b], routes.length);
    return {
      items: routes.map((href, i) => pageItem(href, toScreen(tips[i] as [number, number]))),
      limbs: [],
    };
  }, [level, frame, go, trees, design, visits, now, query]);

  // Every name on screen, clear of the switchers above and the line below.
  const W = frame.cx * 2;
  const H = (frame.cy - 12) * 2;
  const keepIn = (p: [number, number]): [number, number] => [
    Math.min(W - 70, Math.max(70, p[0])),
    Math.min(H - 110, Math.max(80, p[1])),
  ];
  for (const it of items) it.at = keepIn(it.at);
  for (const l of limbs) l.at = keepIn(l.at);
  // No two names on top of each other; sizes roughly as the pills draw them.
  for (const p of spreadLabels(
    items.map((it) => ({
      it,
      at: it.at,
      w: it.orb ? frame.min * ORB_RADIUS * 2.4 : it.label.length * (it.small ? 7.5 : 9) + 30,
      h: it.orb ? frame.min * ORB_RADIUS * 2.4 : it.small ? 30 : 40,
    })),
  )) {
    p.it.at = keepIn(p.at);
  }

  const current = items[sel];
  litRef.current = level.kind === 'branch' || level.kind === 'area' ? level.branch : null;
  designRef.current = design;
  warmRef.current =
    design === 2
      ? {
          art: branchWarmth('art', visits, now),
          admin: branchWarmth('admin', visits, now),
          energy: branchWarmth('energy', visits, now),
        }
      : null;

  const back = () => {
    if (query) return setQuery('');
    if (level.kind === 'trees') return close();
    if (level.kind === 'area') {
      setLevel({ kind: 'branch', branch: level.branch });
      setSel(Math.max(0, groupingsIn(level.branch).indexOf(level.area)));
      return;
    }
    setSel(level.kind === 'root' ? 3 : BRANCHES.indexOf(level.branch));
    setLevel({ kind: 'trees' });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: the level and query change which buttons are on screen
  useEffect(() => {
    refs.current[sel]?.focus({ preventScroll: true });
  }, [sel, level, query, design]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = items.length;
    const stop = () => {
      e.preventDefault();
      e.stopPropagation();
    };
    if (
      design === 2 &&
      e.key.length === 1 &&
      /[a-z0-9 ]/i.test(e.key) &&
      !e.ctrlKey &&
      !e.metaKey &&
      !e.altKey
    ) {
      if (e.key === ' ' && !query) return;
      stop();
      setQuery((q) => q + e.key.toLowerCase());
      setSel(0);
    } else if (e.key === 'Backspace' && query) {
      stop();
      setQuery((q) => q.slice(0, -1));
      setSel(0);
    } else if (e.key === 'Escape' || e.key === 'Backspace') {
      stop();
      back();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      stop();
      setSel((i) => step(i, n, 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      stop();
      setSel((i) => step(i, n, -1));
    }
  };

  // The stars: a current from the root out along every branch of the three trees.
  useEffect(() => {
    const cv = canvasRef.current;
    const ctx = cv?.getContext('2d');
    if (!cv || !ctx) return;
    const still = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const n = STARS_PER_TREE * BRANCHES.length;
    const tree = new Uint8Array(n);
    const route = new Uint16Array(n);
    const at = new Float32Array(n);
    const across = new Float32Array(n);
    const pace = new Float32Array(n);
    const tw = new Float32Array(n);
    // Where each star flies when the tree comes apart: a turn off straight out, and how far.
    const flyTurn = new Float32Array(n);
    const flyFar = new Float32Array(n);
    const place = (i: number, anywhere: boolean) => {
      const b = BRANCHES[tree[i] as number] as Branch;
      const routes = trees[b].routes;
      route[i] = Math.floor(Math.random() * routes.length);
      at[i] = anywhere
        ? Math.random() * routeLength(routes[route[i] as number]!)
        : Math.random() * 0.02;
      across[i] = (Math.random() + Math.random() + Math.random()) / 1.5 - 1;
      pace[i] = 0.75 + 0.5 * Math.random();
      tw[i] = Math.random() * Math.PI * 2;
    };
    for (let i = 0; i < n; i++) {
      tree[i] = Math.floor(i / STARS_PER_TREE);
      place(i, true);
      flyTurn[i] = (Math.random() - 0.5) * 1.6;
      flyFar[i] = 0.04 + 0.3 * Math.sqrt(Math.random());
    }
    const orb = makeOrb(ORB_STARS);
    const glow = { art: 0.85, admin: 0.85, energy: 0.85 } as Record<Branch, number>;
    // The figure eases from where it stands to where the level wants it.
    const view: View = viewFor(null);
    let clock = 0;
    let last = performance.now();
    let raf = 0;

    const draw = () => {
      const now = performance.now();
      const dt = still ? 0 : Math.min(0.05, (now - last) / 1000);
      last = now;
      clock += dt;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const W = Math.round(window.innerWidth * dpr);
      const H = Math.round(window.innerHeight * dpr);
      if (cv.width !== W || cv.height !== H) {
        cv.width = W;
        cv.height = H;
      }
      const lit = litRef.current;
      const warmth = warmRef.current;
      const want = viewFor(lit, designRef.current === 2 ? GROWN_2 : GROWN);
      const ease = still ? 1 : Math.min(1, dt * 3);
      view.shiftX += (want.shiftX - view.shiftX) * ease;
      view.shiftY += (want.shiftY - view.shiftY) * ease;
      for (const b of BRANCHES) {
        view.grow[b] += (want.grow[b] - view.grow[b]) * ease;
        // Design II: a tree you use shines up to a third brighter.
        const awake = warmth ? 0.85 + 0.3 * warmth[b] : 1;
        const bright = (lit === null ? 0.85 : lit === b ? 1.1 : 0.45) * awake;
        glow[b] += (bright - glow[b]) * ease;
      }
      const apart = still ? 0 : scatter((now - switchRef.current) / 1000);
      const f = shifted({ cx: W / 2, cy: H / 2 + 12 * dpr, min: Math.min(W, H) }, view);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = `rgba(4, 4, 6, ${0.22 + 0.08 * apart})`;
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      // The heartbeat is felt, not drawn: the current surges as each beat leaves the root.
      const p = pulse(clock);
      const size = 1.1 * dpr;

      // The root: a ball of stars turning slowly, breathing with the beat, the near side brighter.
      const orbR = f.min * ORB_RADIUS * (1 + 0.05 * p.surge) * (1 + 1.5 * apart);
      drawOrb(ctx, orb, f.cx, f.cy, orbR, clock, size, 1 - 0.4 * apart, [GR, GG, GB]);

      const surge = 1 + 0.8 * p.surge;
      for (let i = 0; i < n; i++) {
        const b = BRANCHES[tree[i] as number] as Branch;
        const r = trees[b].routes[route[i] as number]!;
        const len = routeLength(r);
        at[i] += dt * 0.1 * (pace[i] as number) * surge;
        if ((at[i] as number) > len + 0.1) {
          place(i, false);
          continue;
        }
        const s = at[i] as number;
        const [x0, y0, w] = along(r, s);
        const [x1, y1] = along(r, s + STEP * 2);
        const dx = x1 - x0;
        const dy = y1 - y0;
        const dl = Math.hypot(dx, dy) || 1;
        const off = (across[i] as number) * w + Math.sin(clock * 0.8 + (tw[i] as number)) * 0.004;
        let x = x0 - (dy / dl) * off;
        let y = y0 + (dx / dl) * off;
        let a = 1;
        const past = s - len;
        if (past > 0) {
          x += (dx / dl) * past * 0.5;
          y += (dy / dl) * past * 0.5;
          a = 1 - past / 0.1;
        }
        const twinkle = 0.7 + 0.3 * Math.sin(clock * 1.7 + (tw[i] as number) * 3);
        const alpha = Math.min(1, 0.55 * glow[b] * twinkle * a * (1 - 0.2 * apart));
        if (alpha < 0.02) continue;
        let [sx, sy] = treeToScreen(b, x, y, f, view.grow[b]);
        if (apart > 0) {
          // Coming apart: each star flies out from the root, turned a little, and swirls.
          const ox = sx - f.cx;
          const oy = sy - f.cy;
          const o = Math.hypot(ox, oy) || 1;
          const turn = (flyTurn[i] as number) + apart * 0.9;
          const far = (flyFar[i] as number) * apart * f.min;
          sx += ((ox * Math.cos(turn) - oy * Math.sin(turn)) / o) * far;
          sy += ((ox * Math.sin(turn) + oy * Math.cos(turn)) / o) * far;
        }
        ctx.fillStyle = `rgba(${GR}, ${GG}, ${GB}, ${alpha})`;
        ctx.fillRect(sx - size / 2, sy - size / 2, size, size);
      }
      ctx.globalCompositeOperation = 'source-over';
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => cancelAnimationFrame(raf);
  }, [trees]);

  return (
    <div
      onKeyDown={onKeyDown}
      style={{ position: 'absolute', inset: 0, zIndex: 1, pointerEvents: 'none' }}
    >
      <canvas
        ref={canvasRef}
        aria-hidden
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      />

      <DesignTab label="Tree design" design={design} pick={pickDesign} />

      <div style={{ opacity: fading ? 0 : 1, transition: `opacity ${SWITCH_SECONDS / 2}s ease` }}>
        {limbs.map((l) => (
          <span
            key={l.key}
            aria-hidden
            style={{
              position: 'absolute',
              left: l.at[0],
              top: l.at[1],
              transform: 'translate(-50%, -50%)',
              fontSize: 10,
              letterSpacing: '0.24em',
              textTransform: 'uppercase',
              color: l.dim ? '#5a5242' : '#a8946a',
              textShadow: '0 0 8px #000, 0 0 3px #000',
              whiteSpace: 'nowrap',
            }}
          >
            {l.label}
          </span>
        ))}
        {items.map((it, i) => {
          const on = i === sel;
          if (it.orb) {
            const d = frame.min * ORB_RADIUS * 2.4;
            return (
              <button
                key={it.key}
                ref={(el) => {
                  refs.current[i] = el;
                }}
                type="button"
                onClick={it.act}
                onMouseEnter={() => setSel(i)}
                onFocus={() => setSel(i)}
                aria-label={it.label}
                style={{
                  position: 'absolute',
                  left: it.at[0],
                  top: it.at[1],
                  width: d,
                  height: d,
                  transform: 'translate(-50%, -50%)',
                  borderRadius: '50%',
                  background: 'transparent',
                  border: `1px solid ${on ? `${GOLD}33` : 'transparent'}`,
                  pointerEvents: 'auto',
                  cursor: 'pointer',
                  outline: 'none',
                }}
              />
            );
          }
          return (
            <button
              key={it.key}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="button"
              onClick={it.act}
              onMouseEnter={() => setSel(i)}
              onFocus={() => setSel(i)}
              aria-disabled={it.act ? undefined : true}
              className="grid-menu-item"
              style={{
                left: it.at[0],
                top: it.at[1],
                pointerEvents: 'auto',
                minHeight: it.small ? 30 : undefined,
                fontSize: it.small ? 9 : undefined,
                borderColor: on ? GOLD : `${GOLD}${it.dim ? '22' : it.warm ? 'aa' : '55'}`,
                boxShadow: on
                  ? `0 0 18px ${GOLD}88, inset 0 0 12px ${GOLD}33`
                  : it.warm
                    ? `0 0 12px ${GOLD}55`
                    : 'none',
                color: it.dim ? '#6d6450' : on || it.warm ? '#fff6e0' : '#d8ccb0',
                cursor: it.act ? 'pointer' : 'default',
              }}
            >
              {it.label}
            </button>
          );
        })}
      </div>
      {level.kind === 'trees' && !query && quote >= 0 ? (
        <figure
          style={{
            position: 'absolute',
            left: '50%',
            bottom: 78,
            width: 'min(640px, calc(100% - 32px))',
            margin: 0,
            transform: 'translateX(-50%)',
            textAlign: 'center',
            opacity: quoteIn && !fading ? 1 : 0,
            transition: 'opacity 0.7s ease',
          }}
        >
          <blockquote
            style={{
              margin: 0,
              fontFamily: 'Georgia, "Times New Roman", serif',
              fontStyle: 'italic',
              fontSize: 15,
              lineHeight: 1.45,
              color: '#cbb98f',
            }}
          >
            “{POWER_QUOTES[quote]?.text}”
          </blockquote>
          <figcaption
            style={{ marginTop: 6, fontSize: 10, letterSpacing: '0.24em', color: '#7d7158' }}
          >
            {POWER_QUOTES[quote]?.who.toUpperCase()}
          </figcaption>
        </figure>
      ) : null}
      <p
        aria-live="polite"
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          bottom: 44,
          margin: 0,
          textAlign: 'center',
          fontSize: 12,
          color: '#b9ab8e',
          letterSpacing: '0.04em',
        }}
      >
        {design === 2 && query ? (
          <span style={{ color: GOLD, letterSpacing: '0.16em', marginRight: 12 }}>
            {query.toUpperCase()}
            {items.length ? '' : '  · nothing by that name'}
          </span>
        ) : null}
        {current?.line ?? ''}
        {level.kind !== 'trees' || query ? (
          <button
            type="button"
            onClick={back}
            style={{
              marginLeft: 14,
              pointerEvents: 'auto',
              background: 'transparent',
              border: 'none',
              color: '#8a7d62',
              fontFamily: 'inherit',
              fontSize: 10,
              letterSpacing: '0.2em',
              cursor: 'pointer',
              minHeight: 36,
            }}
          >
            ← BACK
          </button>
        ) : null}
        {design === 2 && level.kind === 'trees' && !query ? (
          <span style={{ marginLeft: 14, fontSize: 10, letterSpacing: '0.2em', color: '#6d6450' }}>
            TYPE TO FIND A PAGE
          </span>
        ) : null}
      </p>
    </div>
  );
}
