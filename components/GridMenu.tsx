'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useRef, useState } from 'react';

import { type Design, DesignTab, parseDesign } from '@/components/DesignTab';
import { LifeTree } from '@/components/LifeTree';
import { StarWheel } from '@/components/StarWheel';
import {
  GOLD,
  type GridNode,
  HUBS,
  type Hub,
  isMenuKey,
  isOnline,
  lastSeen,
  MENU_MODE_KEY,
  MENU_MODES,
  type MenuMode,
  openNode,
  parseMenuMode,
  readVisits,
  step,
  type Visits,
  wheelPoint,
} from '@/lib/grid';

/*
 * THE QUICK MENU — the Grid's hubs from any page (2026-10-25).
 *
 * Martin: "i cant access the new menu cyberpunk network radial wheel. or
 * cyberpunk matrix terminal (but without typing more like a menu)". The Grid
 * page sat behind the title popup, so this puts a way in on every page: a
 * small GRID button in the header's empty left slot, or the G key.
 *
 * Three looks for the same menu, switched at the top and remembered:
 *
 *   TREE      (2026-10-30, the first look) the life tree: you at the root,
 *             a pulse leaving it, Art, Admin and Energy growing out of it as
 *             trees of stars (components/LifeTree.tsx, lib/life-tree.ts)
 *   WHEEL     (design I, 2026-10-30, components/StarWheel.tsx: the same
 *             wheel in the tree's stars -- a ball of stars at the centre,
 *             currents along each spoke, a ring of stars round it all;
 *             design II is the wheel as it was:)
 *             the eight hubs in a ring, like a game's weapon wheel. Pick one
 *             and its pages take the ring; the centre goes back.
 *   TERMINAL  a green phosphor screen: hubs in one column, the chosen hub's
 *             pages in the next, with their state. Nothing is typed.
 *
 * Arrows move, Enter opens, Esc goes back and then closes. The centre of the
 * wheel and the terminal's last line open the full Grid map.
 */

const WHEEL_DESIGN_KEY = 'cb-wheel-design';

const MONO = 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';
const PHOSPHOR = '#5dff9a';

function isTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || el.isContentEditable;
}

export default function GridMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<MenuMode>('tree');
  // The wheel's two designs: I the star wheel, II the wheel as it was (2026-10-30).
  const [wheelDesign, setWheelDesign] = useState<Design>(1);
  // Switched look since opening: the new one's stars stream in rather than stand ready.
  const [switched, setSwitched] = useState(false);
  const [hub, setHub] = useState<Hub | null>(null);
  const [sel, setSel] = useState(0);
  const [visits, setVisits] = useState<Visits>({});
  const [now, setNow] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);
  const opener = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    try {
      setMode(parseMenuMode(window.localStorage.getItem(MENU_MODE_KEY)));
      setWheelDesign(parseDesign(window.localStorage.getItem(WHEEL_DESIGN_KEY)));
    } catch {
      // Storage blocked: the tree it is.
    }
  }, []);

  const show = useCallback(() => {
    setVisits(readVisits());
    setNow(Date.now());
    setHub(null);
    setSel(0);
    setSwitched(false);
    setOpen(true);
  }, []);

  const close = useCallback(() => {
    setOpen(false);
    opener.current?.focus();
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (open) return;
      if (isMenuKey(e, isTyping())) {
        e.preventDefault();
        show();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, show]);

  const items: (Hub | GridNode)[] = hub ? hub.nodes : HUBS;

  // Keep focus on the selection, so Enter and screen readers follow it.
  // biome-ignore lint/correctness/useExhaustiveDependencies: hub and mode change which elements are on screen
  useEffect(() => {
    if (open) itemRefs.current[sel]?.focus({ preventScroll: true });
  }, [open, sel, hub, mode]);

  const pickMode = (m: MenuMode) => {
    if (m !== mode) setSwitched(true);
    setMode(m);
    try {
      window.localStorage.setItem(MENU_MODE_KEY, m);
    } catch {
      // Not remembered; still switched.
    }
  };

  const enterHub = (h: Hub) => {
    setHub(h);
    setSel(0);
  };

  const back = () => {
    if (!hub) return close();
    setSel(Math.max(0, HUBS.indexOf(hub)));
    setHub(null);
  };

  const go = (node: GridNode) => {
    setOpen(false);
    openNode(node, router.push);
  };

  const activate = (i: number) => {
    const it = items[i];
    if (!it) return;
    if (hub) go(it as GridNode);
    else enterHub(it as Hub);
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    // The tree moves through its own leaves (components/LifeTree.tsx).
    if (mode === 'tree') return;
    const n = items.length;
    const ring = mode === 'wheel';
    if (e.key === 'Escape' || e.key === 'Backspace') {
      e.preventDefault();
      back();
    } else if (e.key === (ring ? 'ArrowRight' : 'ArrowDown') || (ring && e.key === 'ArrowDown')) {
      e.preventDefault();
      setSel((i) => step(i, n, 1));
    } else if (e.key === (ring ? 'ArrowLeft' : 'ArrowUp') || (ring && e.key === 'ArrowUp')) {
      e.preventDefault();
      setSel((i) => step(i, n, -1));
    } else if (!ring && e.key === 'ArrowRight' && !hub) {
      e.preventDefault();
      activate(sel);
    } else if (!ring && e.key === 'ArrowLeft' && hub) {
      e.preventDefault();
      back();
    }
  };

  const setRef = (i: number) => (el: HTMLElement | null) => {
    itemRefs.current[i] = el;
  };

  return (
    <>
      <button
        ref={opener}
        type="button"
        onClick={show}
        aria-label="Open the network menu (G)"
        title="Network menu · G"
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 7,
          minHeight: 36,
          padding: '0 10px',
          borderRadius: 999,
          border: `1px solid ${GOLD}66`,
          background: 'rgba(5,5,6,0.55)',
          color: GOLD,
          fontFamily: MONO,
          fontSize: 11,
          letterSpacing: '0.22em',
          cursor: 'pointer',
        }}
      >
        <NetIcon />
        GRID
      </button>

      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Network menu"
          onKeyDown={onKeyDown}
          className="grid-menu"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9990,
            display: 'grid',
            placeItems: 'center',
            background: mode === 'terminal' ? 'rgba(1,6,3,0.94)' : 'rgba(4,4,6,0.86)',
            backdropFilter: 'blur(6px)',
            fontFamily: MONO,
          }}
        >
          <style>{MENU_CSS}</style>
          <button
            type="button"
            aria-label="Close the network menu"
            onClick={close}
            className="grid-menu-scrim"
          />

          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 8,
              zIndex: 2,
            }}
          >
            {MENU_MODES.map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={mode === m}
                onClick={() => pickMode(m)}
                style={{
                  minHeight: 36,
                  padding: '0 14px',
                  borderRadius: 999,
                  border: `1px solid ${mode === m ? GOLD : '#4a4234'}`,
                  background: mode === m ? `${GOLD}22` : 'transparent',
                  color: mode === m ? GOLD : '#8a7d62',
                  fontFamily: MONO,
                  fontSize: 11,
                  letterSpacing: '0.2em',
                  cursor: 'pointer',
                }}
              >
                {m.toUpperCase()}
              </button>
            ))}
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              style={{
                minHeight: 36,
                minWidth: 36,
                borderRadius: 999,
                border: '1px solid #4a4234',
                background: 'transparent',
                color: '#8a7d62',
                cursor: 'pointer',
              }}
            >
              ×
            </button>
          </div>

          {mode === 'wheel' ? (
            <DesignTab
              label="Wheel design"
              design={wheelDesign}
              pick={(d) => {
                setWheelDesign(d);
                setSwitched(true);
                try {
                  window.localStorage.setItem(WHEEL_DESIGN_KEY, String(d));
                } catch {
                  // Not remembered; still switched.
                }
              }}
            />
          ) : null}

          {mode === 'tree' ? (
            <LifeTree go={go} close={close} arrive={switched} />
          ) : mode === 'wheel' && wheelDesign === 1 ? (
            <StarWheel
              hub={hub}
              items={items}
              sel={sel}
              setSel={setSel}
              setRef={setRef}
              activate={activate}
              back={back}
              close={close}
              arrive={switched}
            />
          ) : mode === 'wheel' ? (
            <Wheel
              hub={hub}
              items={items}
              sel={sel}
              setSel={setSel}
              setRef={setRef}
              activate={activate}
              back={back}
              close={close}
            />
          ) : (
            <Terminal
              hub={hub}
              sel={sel}
              setSel={setSel}
              setRef={setRef}
              activate={activate}
              back={back}
              close={close}
              enterHub={enterHub}
              visits={visits}
              now={now}
            />
          )}

          <p
            style={{
              position: 'absolute',
              bottom: 18,
              margin: 0,
              fontSize: 10,
              letterSpacing: '0.2em',
              color: '#6d6450',
              zIndex: 2,
            }}
          >
            ARROWS · ENTER · ESC
          </p>
        </div>
      )}
    </>
  );
}

type PaneProps = {
  hub: Hub | null;
  sel: number;
  setSel: (i: number) => void;
  setRef: (i: number) => (el: HTMLElement | null) => void;
  activate: (i: number) => void;
  back: () => void;
  close: () => void;
};

function Wheel({
  hub,
  items,
  sel,
  setSel,
  setRef,
  activate,
  back,
  close,
}: PaneProps & { items: (Hub | GridNode)[] }) {
  const size = 'min(88vw, 78vh, 600px)';
  const accent = hub?.accent ?? GOLD;
  const current = items[sel];
  const hint = hub ? (current as GridNode | undefined)?.line : (current as Hub | undefined)?.line;
  return (
    <div
      className="grid-menu-in"
      style={{ position: 'relative', width: size, height: size, zIndex: 1 }}
    >
      <svg
        aria-hidden
        viewBox="-100 -100 200 200"
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
      >
        <circle r={96} fill="none" stroke={`${accent}33`} strokeWidth={0.4} />
        <circle r={30} fill="rgba(5,5,6,0.9)" stroke={`${GOLD}88`} strokeWidth={0.6} />
        {items.map((it, i) => {
          const p = wheelPoint(i, items.length, 74);
          const on = i === sel;
          return (
            <line
              key={'href' in it ? it.href : it.id}
              x1={0}
              y1={0}
              x2={p.x}
              y2={p.y}
              stroke={on ? accent : `${accent}22`}
              strokeWidth={on ? 0.8 : 0.4}
            />
          );
        })}
      </svg>

      <div
        style={{
          position: 'absolute',
          left: '50%',
          top: '50%',
          transform: 'translate(-50%, -50%)',
          width: '28%',
          textAlign: 'center',
        }}
      >
        {hub ? (
          <button
            type="button"
            onClick={back}
            className="grid-menu-centre"
            style={{ color: hub.accent }}
          >
            <span style={{ fontSize: 12, letterSpacing: '0.2em' }}>{hub.label.toUpperCase()}</span>
            <span
              style={{
                display: 'block',
                fontSize: 9,
                letterSpacing: '0.2em',
                color: '#8a7d62',
                marginTop: 4,
              }}
            >
              ← BACK
            </span>
          </button>
        ) : (
          <Link href="/grid" onClick={close} className="grid-menu-centre" style={{ color: GOLD }}>
            <span style={{ fontSize: 12, letterSpacing: '0.25em' }}>GRID</span>
            <span
              style={{
                display: 'block',
                fontSize: 9,
                letterSpacing: '0.2em',
                color: '#8a7d62',
                marginTop: 4,
              }}
            >
              FULL MAP ↗
            </span>
          </Link>
        )}
      </div>

      {items.map((it, i) => {
        const p = wheelPoint(i, items.length, 37);
        const on = i === sel;
        const isNode = 'href' in it;
        const colour = isNode ? (hub as Hub).accent : (it as Hub).accent;
        return (
          <button
            key={isNode ? it.href : it.id}
            ref={setRef(i)}
            type="button"
            onClick={() => activate(i)}
            onMouseEnter={() => setSel(i)}
            onFocus={() => setSel(i)}
            aria-label={
              isNode ? `${it.label}${it.external ? ' (separate app)' : ''}` : `${it.label} hub`
            }
            className="grid-menu-item"
            style={{
              left: `${50 + p.x}%`,
              top: `${50 + p.y}%`,
              borderColor: on ? colour : `${colour}55`,
              boxShadow: on ? `0 0 18px ${colour}88, inset 0 0 12px ${colour}33` : 'none',
              color: on ? '#fff6e0' : '#d8ccb0',
            }}
          >
            <span
              aria-hidden
              style={{
                width: 8,
                height: 8,
                borderRadius: isNode && it.external ? 1 : '50%',
                transform: isNode && it.external ? 'rotate(45deg)' : undefined,
                background: colour,
                boxShadow: `0 0 8px ${colour}`,
                flexShrink: 0,
              }}
            />
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
          bottom: '-12%',
          margin: 0,
          textAlign: 'center',
          fontSize: 12,
          color: '#b9ab8e',
          letterSpacing: '0.04em',
        }}
      >
        {hint}
      </p>
    </div>
  );
}

function Terminal({
  hub,
  sel,
  setSel,
  setRef,
  activate,
  back,
  close,
  enterHub,
  visits,
  now,
}: PaneProps & { enterHub: (h: Hub) => void; visits: Visits; now: number }) {
  const hubIndex = hub ? HUBS.indexOf(hub) : sel;
  const shown = HUBS[hubIndex] ?? HUBS[0];
  return (
    <div
      className="grid-menu-in grid-term"
      style={{
        position: 'relative',
        zIndex: 1,
        width: 'min(92vw, 860px)',
        maxHeight: '78vh',
        overflow: 'auto',
        border: `1px solid ${PHOSPHOR}44`,
        borderRadius: 6,
        background: 'rgba(0,10,4,0.85)',
        boxShadow: `0 0 40px ${PHOSPHOR}1a, inset 0 0 60px ${PHOSPHOR}0d`,
        color: PHOSPHOR,
        padding: '16px 18px 18px',
      }}
    >
      <p
        className="grid-term-boot"
        style={{
          margin: '0 0 12px',
          fontSize: 11,
          letterSpacing: '0.12em',
          color: `${PHOSPHOR}aa`,
        }}
      >
        &gt; COLOUR_BRAIN://NETWORK — LINK ESTABLISHED
        <span className="grid-term-caret">█</span>
      </p>
      <div className="grid-term-cols">
        <ul aria-label="Hubs" style={{ listStyle: 'none', margin: 0, padding: 0 }}>
          {HUBS.map((h, i) => {
            const active = hub ? h === hub : i === sel;
            return (
              <li key={h.id}>
                <button
                  ref={hub ? undefined : setRef(i)}
                  type="button"
                  onClick={() => (hub === h ? back() : enterHub(h))}
                  onMouseEnter={() => !hub && setSel(i)}
                  onFocus={() => !hub && setSel(i)}
                  aria-label={`${h.label} hub`}
                  className="grid-term-row"
                  data-on={active || undefined}
                >
                  <span aria-hidden>{active ? '>' : ' '}</span> {h.label.toUpperCase()}
                </button>
              </li>
            );
          })}
        </ul>
        <ul
          aria-label={`${shown?.label} pages`}
          style={{ listStyle: 'none', margin: 0, padding: 0, opacity: hub ? 1 : 0.55 }}
        >
          {shown?.nodes.map((n, i) => {
            const on = hub && i === sel;
            const state = n.external ? 'EXT' : isOnline(visits, n.href, now) ? 'ON ' : 'IDL';
            return (
              <li key={n.href}>
                <button
                  ref={hub ? setRef(i) : undefined}
                  type="button"
                  tabIndex={hub ? 0 : -1}
                  onClick={() => (hub ? activate(i) : shown && enterHub(shown))}
                  onMouseEnter={() => hub && setSel(i)}
                  onFocus={() => hub && setSel(i)}
                  aria-label={`${n.label}${n.external ? ' (separate app)' : ''}`}
                  className="grid-term-row"
                  data-on={on || undefined}
                >
                  <span aria-hidden>{on ? '>' : ' '}</span> [{state}]{' '}
                  {n.label.toLowerCase().replace(/ /g, '_')}
                  <span className="grid-term-line"> · {n.line}</span>
                  {!n.external && (
                    <span className="grid-term-seen"> · {lastSeen(visits, n.href, now)}</span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <p style={{ margin: '14px 0 0', fontSize: 11, letterSpacing: '0.1em' }}>
        <Link href="/grid" onClick={close} style={{ color: GOLD, textDecoration: 'none' }}>
          &gt; OPEN FULL MAP ↗
        </Link>
      </p>
    </div>
  );
}

function NetIcon() {
  return (
    <svg
      aria-hidden
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.1}
    >
      <circle cx={7} cy={7} r={1.8} />
      <circle cx={7} cy={1.6} r={1.1} />
      <circle cx={12} cy={9.8} r={1.1} />
      <circle cx={2} cy={9.8} r={1.1} />
      <path d="M7 5.2V2.7M8.6 7.9l2.4 1.4M5.4 7.9 3 9.3" />
    </svg>
  );
}

const MENU_CSS = `
.grid-menu-scrim { position: absolute; inset: 0; background: transparent; border: none; cursor: default; }
.grid-menu-in { animation: grid-menu-in 160ms ease-out; }
.grid-menu-centre { display: block; width: 100%; background: transparent; border: none; cursor: pointer; text-decoration: none; font-family: inherit; min-height: 44px; }
.grid-menu-item { position: absolute; transform: translate(-50%, -50%); display: inline-flex; align-items: center; gap: 7px; min-height: 40px; padding: 0 12px; border-radius: 999px; border: 1px solid; background: rgba(5,5,6,0.88); font-family: inherit; font-size: 11px; letter-spacing: 0.14em; text-transform: uppercase; white-space: nowrap; cursor: pointer; transition: box-shadow 120ms, color 120ms; }
.grid-menu-item:focus-visible { outline: 1px solid ${GOLD}; outline-offset: 3px; }
.grid-term-cols { display: grid; grid-template-columns: minmax(130px, 200px) 1fr; gap: 18px; }
.grid-term-row { display: block; width: 100%; text-align: left; background: transparent; border: none; color: inherit; font-family: inherit; font-size: 13px; letter-spacing: 0.06em; padding: 7px 8px; min-height: 36px; cursor: pointer; white-space: pre; overflow: hidden; text-overflow: ellipsis; }
.grid-term-row[data-on] { background: ${PHOSPHOR}22; color: #d8ffe6; text-shadow: 0 0 8px ${PHOSPHOR}; }
.grid-term-row:focus-visible { outline: 1px dashed ${PHOSPHOR}; }
.grid-term-line, .grid-term-seen { color: ${PHOSPHOR}88; }
.grid-term { background-image: repeating-linear-gradient(0deg, rgba(93,255,154,0.04) 0 1px, transparent 1px 3px) !important; }
.grid-term-caret { animation: grid-term-blink 1s steps(1) infinite; margin-left: 4px; }
@media (max-width: 640px) {
  .grid-term-cols { grid-template-columns: 1fr; }
  .grid-term-line { display: none; }
  .grid-menu-item { font-size: 10px; padding: 0 9px; letter-spacing: 0.08em; }
}
@media (prefers-reduced-motion: reduce) {
  .grid-menu-in, .grid-term-caret { animation: none; }
}
@keyframes grid-menu-in { from { opacity: 0; transform: scale(0.94); } to { opacity: 1; transform: scale(1); } }
@keyframes grid-term-blink { 50% { opacity: 0; } }
`;
