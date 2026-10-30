'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

import {
  BRANCH_BLURBS,
  BRANCH_LABELS,
  BRANCHES,
  type Branch,
  CENTRE_ROUTES,
  type Grouping,
  groupingsIn,
} from '@/lib/branches';
import { GOLD, type GridNode, HUBS, step } from '@/lib/grid';
import {
  buildLifeTrees,
  crownPoint,
  type Frame,
  GROWN,
  pulse,
  ROOT_RADIUS,
  rootPoint,
  routeLabel,
  shifted,
  tipLeaves,
  treeToScreen,
  type View,
  viewFor,
} from '@/lib/life-tree';
import { along, routeLength, STEP } from '@/lib/star-tree';

/*
 * THE TREE LOOK OF THE G MENU (lib/life-tree.ts): you at the centre, a pulse
 * leaving the root, and three trees of stars growing out of it -- Art,
 * Admin, Energy. All in gold for now.
 *
 * Four places to stand, one at a time, Esc stepping back out:
 *
 *   trees     the three names beyond their crowns, and YOU at the root
 *   branch    that tree evolves -- grows, takes the middle, the other two
 *             shrink back -- and its areas hang from its branch tips
 *   area      an area with several pages: its pages hang from the tips
 *   root      the pages about how you are, round the centre
 *
 * An area with no page yet is shown, dim, and does nothing: the tree says
 * honestly where nothing has been built (lib/branches.ts, "Life admin has no
 * surfaces at all").
 */

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
  at: [number, number];
  act?: () => void;
};

const [GR, GG, GB] = [196, 160, 96];
// Enough that each crown reads full and branchy at a glance (2026-10-30).
const STARS_PER_TREE = 1500;

const ALL_NODES: GridNode[] = HUBS.flatMap((h) => h.nodes);
const nodeFor = (href: string): GridNode =>
  ALL_NODES.find((n) => n.href === href) ?? { href, label: routeLabel(href), line: '' };

type Props = {
  go: (node: GridNode) => void;
  close: () => void;
};

export function LifeTree({ go, close }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [frame, setFrame] = useState<Frame>({ cx: 0, cy: 0, min: 0 });
  const [level, setLevel] = useState<Level>({ kind: 'trees' });
  const [sel, setSel] = useState(0);
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  // The tree stood in, if any. At the top none is: all three stay full.
  const litRef = useRef<Branch | null>(null);
  const trees = useMemo(() => buildLifeTrees(), []);

  useEffect(() => {
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

  const items: Item[] = useMemo(() => {
    if (frame.min === 0) return [];
    if (level.kind === 'trees') {
      return [
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
          line: 'How you are: today, the notebook, the road',
          at: [frame.cx, frame.cy] as [number, number],
          act: () => {
            setLevel({ kind: 'root' });
            setSel(0);
          },
        },
      ];
    }
    if (level.kind === 'branch') {
      const areas = groupingsIn(level.branch);
      const tips = tipLeaves(trees[level.branch], areas.length);
      const grown = shifted(frame, viewFor(level.branch));
      return areas.map((g, i) => ({
        key: g.label,
        label: g.label,
        line: g.routes.length ? undefined : 'Nothing built here yet',
        dim: g.routes.length === 0,
        at: treeToScreen(level.branch, ...(tips[i] as [number, number]), grown, GROWN),
        act: g.routes.length
          ? () => {
              if (g.routes.length === 1) go(nodeFor(g.routes[0] as string));
              else {
                setLevel({ kind: 'area', branch: level.branch, area: g });
                setSel(0);
              }
            }
          : undefined,
      }));
    }
    if (level.kind === 'area') {
      const { routes } = level.area;
      const tips = tipLeaves(trees[level.branch], routes.length);
      const grown = shifted(frame, viewFor(level.branch));
      return routes.map((href, i) => {
        const node = nodeFor(href);
        return {
          key: href,
          label: node.label,
          line: node.line,
          at: treeToScreen(level.branch, ...(tips[i] as [number, number]), grown, GROWN),
          act: () => go(node),
        };
      });
    }
    return CENTRE_ROUTES.map((href, i) => {
      const node = nodeFor(href);
      return {
        key: href,
        label: node.label,
        line: node.line,
        at: rootPoint(i, CENTRE_ROUTES.length, frame),
        act: () => go(node),
      };
    });
  }, [level, frame, go, trees]);

  // Every name on screen, clear of the look switcher above and the line below.
  const W = frame.cx * 2;
  const H = (frame.cy - 12) * 2;
  for (const it of items) {
    it.at = [Math.min(W - 70, Math.max(70, it.at[0])), Math.min(H - 110, Math.max(80, it.at[1]))];
  }

  const current = items[sel];
  litRef.current = level.kind === 'branch' || level.kind === 'area' ? level.branch : null;

  const back = () => {
    if (level.kind === 'trees') return close();
    if (level.kind === 'area') {
      setLevel({ kind: 'branch', branch: level.branch });
      setSel(Math.max(0, groupingsIn(level.branch).indexOf(level.area)));
      return;
    }
    setSel(level.kind === 'root' ? 3 : BRANCHES.indexOf(level.branch));
    setLevel({ kind: 'trees' });
  };

  // biome-ignore lint/correctness/useExhaustiveDependencies: the level changes which buttons are on screen
  useEffect(() => {
    refs.current[sel]?.focus({ preventScroll: true });
  }, [sel, level]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    const n = items.length;
    if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      e.stopPropagation();
      back();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      e.stopPropagation();
      setSel((i) => step(i, n, 1));
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      e.stopPropagation();
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
    }
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
      const want = viewFor(lit);
      const ease = still ? 1 : Math.min(1, dt * 3);
      view.shiftX += (want.shiftX - view.shiftX) * ease;
      view.shiftY += (want.shiftY - view.shiftY) * ease;
      for (const b of BRANCHES) {
        view.grow[b] += (want.grow[b] - view.grow[b]) * ease;
        const bright = lit === null ? 0.85 : lit === b ? 1.1 : 0.45;
        glow[b] += (bright - glow[b]) * ease;
      }
      const f = shifted({ cx: W / 2, cy: H / 2 + 12 * dpr, min: Math.min(W, H) }, view);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = 'rgba(4, 4, 6, 0.22)';
      ctx.fillRect(0, 0, W, H);
      ctx.globalCompositeOperation = 'lighter';

      // The pulse: rings leaving the root, and the root's own breath.
      const p = pulse(clock);
      if (!still) {
        ctx.strokeStyle = `rgba(${GR}, ${GG}, ${GB}, ${p.alpha * 0.5})`;
        ctx.lineWidth = 1.2 * dpr;
        ctx.beginPath();
        ctx.arc(f.cx, f.cy, p.radius * f.min, 0, Math.PI * 2);
        ctx.stroke();
      }
      const breath = 0.55 + 0.45 * p.surge;
      const g = ctx.createRadialGradient(f.cx, f.cy, 0, f.cx, f.cy, f.min * ROOT_RADIUS * 2.4);
      g.addColorStop(0, `rgba(${GR}, ${GG}, ${GB}, ${0.35 * breath})`);
      g.addColorStop(1, `rgba(${GR}, ${GG}, ${GB}, 0)`);
      ctx.fillStyle = g;
      ctx.fillRect(f.cx - f.min * 0.1, f.cy - f.min * 0.1, f.min * 0.2, f.min * 0.2);

      const size = 1.1 * dpr;
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
        const alpha = Math.min(1, 0.55 * glow[b] * twinkle * a);
        if (alpha < 0.02) continue;
        const [sx, sy] = treeToScreen(b, x, y, f, view.grow[b]);
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
      {items.map((it, i) => {
        const on = i === sel;
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
              borderColor: on ? GOLD : `${GOLD}${it.dim ? '22' : '55'}`,
              boxShadow: on ? `0 0 18px ${GOLD}88, inset 0 0 12px ${GOLD}33` : 'none',
              color: it.dim ? '#6d6450' : on ? '#fff6e0' : '#d8ccb0',
              cursor: it.act ? 'pointer' : 'default',
            }}
          >
            {it.label}
          </button>
        );
      })}
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
        {current?.line ?? ''}
        {level.kind !== 'trees' ? (
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
      </p>
    </div>
  );
}
