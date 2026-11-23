'use client';

/**
 * The design space's controls (docs/specs/drive-tracks.md, "Design space"), over the track as the
 * autopilot drives it: what is showing, a map of every cell (right = category, up = variation),
 * the picks to build. Arrows move, Space picks, Esc goes back to the tracks; swipe on a phone.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { CATEGORIES, move, type Pos, pickKey, safePicks, safePos } from '@/lib/art/design-space';
import { driveSound } from '@/lib/audio/drive-sound';

const GOLD = '#f0b54a';
const quiet = 'rgba(255,240,215,';
const serif = 'var(--font-serif), Georgia, serif';
const mono = 'ui-monospace, SFMono-Regular, Menlo, monospace';
export const POS_KEY = 'drive-design-space-pos';
export const PICKS_KEY = 'drive-design-space-picks';

function read(key: string): unknown {
  try {
    const v = window.localStorage.getItem(key);
    return v ? JSON.parse(v) : null;
  } catch {
    return null;
  }
}
function write(key: string, v: unknown) {
  try {
    window.localStorage.setItem(key, JSON.stringify(v));
  } catch {
    // Storage blocked: the space still works, it just forgets.
  }
}

export interface DesignHudProps {
  trackName: string;
  /** The cell to show changed (and once on opening). */
  onShow: (p: Pos) => void;
  onClose: () => void;
}

export default function DesignHud({ trackName, onShow, onClose }: DesignHudProps) {
  const [pos, setPos] = useState<Pos>(() => safePos(read(POS_KEY)));
  const [picks, setPicks] = useState<string[]>(() => safePicks(read(PICKS_KEY)));
  const [list, setList] = useState(false);
  const [copied, setCopied] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);

  useEffect(() => {
    onShow(pos);
    write(POS_KEY, [pos.cat, pos.v]);
  }, [pos, onShow]);

  const go = useCallback((dc: number, dv: number) => {
    driveSound.tick();
    setPos((p) => move(p, dc, dv));
  }, []);
  const togglePick = useCallback(() => {
    driveSound.swell();
    setPicks((ps) => {
      const k = pickKey(pos);
      const next = ps.includes(k) ? ps.filter((x) => x !== k) : [...ps, k];
      write(PICKS_KEY, next);
      return next;
    });
  }, [pos]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      const m: Record<string, [number, number]> = {
        ArrowRight: [1, 0],
        ArrowLeft: [-1, 0],
        ArrowUp: [0, 1],
        ArrowDown: [0, -1],
      };
      if (m[e.key]) {
        e.preventDefault();
        go(...m[e.key]);
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePick();
      } else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', down);
    return () => window.removeEventListener('keydown', down);
  }, [go, togglePick, onClose]);

  const touch = useRef<[number, number] | null>(null);
  const cat = CATEGORIES[pos.cat];
  const v = cat.vars[pos.v];
  const n = CATEGORIES.length;
  const rows = Math.max(...CATEGORIES.map((c) => c.vars.length));
  const picked = picks.includes(pickKey(pos));

  const copy = () => {
    const txt = picks.join('\n') || '(no picks)';
    navigator.clipboard?.writeText(txt).then(
      () => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1400);
      },
      () => {
        const el = listRef.current;
        if (!el) return;
        const r = document.createRange();
        r.selectNodeContents(el);
        const sel = window.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(r);
      },
    );
  };

  const key = {
    fontFamily: mono,
    fontSize: 12,
    color: `${quiet}0.9)`,
    background: 'transparent',
    border: `1px solid ${GOLD}55`,
    borderRadius: 6,
    padding: '6px 10px',
    cursor: 'pointer',
  } as const;
  const panel = {
    background: 'rgba(10,8,12,0.66)',
    border: `1px solid ${GOLD}40`,
    borderRadius: 10,
    padding: 12,
    backdropFilter: 'blur(6px)',
    pointerEvents: 'auto',
  } as const;

  return (
    <div
      data-testid="design-space"
      style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}
      onTouchStart={(e) => {
        const t = e.touches[0];
        touch.current = [t.clientX, t.clientY];
      }}
      onTouchEnd={(e) => {
        const s = touch.current;
        touch.current = null;
        if (!s) return;
        const t = e.changedTouches[0];
        const dx = t.clientX - s[0];
        const dy = t.clientY - s[1];
        if (Math.max(Math.abs(dx), Math.abs(dy)) < 40) return;
        if (Math.abs(dx) > Math.abs(dy)) go(dx < 0 ? 1 : -1, 0);
        else go(0, dy < 0 ? 1 : -1);
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 18,
          left: 'max(16px, 4vw)',
          maxWidth: 'min(460px, 90vw)',
          display: 'grid',
          gap: 6,
        }}
      >
        <div
          style={{
            fontFamily: mono,
            fontSize: 10,
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            color: `${quiet}0.55)`,
          }}
        >
          {trackName} · design space
        </div>
        <div
          style={{
            fontFamily: serif,
            fontSize: 'clamp(22px, 3.2vw, 32px)',
            color: GOLD,
            letterSpacing: '0.04em',
          }}
        >
          {cat.name}
        </div>
        <div style={{ fontFamily: serif, fontSize: 18, color: `${quiet}0.92)` }}>
          {v.name}
          <span style={{ fontFamily: mono, fontSize: 11, color: `${quiet}0.45)`, marginLeft: 10 }}>
            {pos.v + 1} / {cat.vars.length}
          </span>
        </div>
        <div style={{ fontSize: 13.5, lineHeight: 1.45, color: `${quiet}0.6)` }}>{v.note}</div>
        <div
          style={{
            fontFamily: mono,
            fontSize: 11,
            color: `${quiet}0.45)`,
            display: 'flex',
            gap: 14,
          }}
        >
          <span>← {CATEGORIES[(pos.cat - 1 + n) % n].name}</span>
          <span style={{ color: `${quiet}0.8)` }}>{CATEGORIES[(pos.cat + 1) % n].name} →</span>
        </div>
      </div>

      {list && (
        <div
          style={{
            ...panel,
            position: 'absolute',
            left: 'max(16px, 4vw)',
            bottom: 18,
            width: 'min(320px, 90vw)',
            display: 'grid',
            gap: 8,
          }}
        >
          <div
            style={{
              fontFamily: mono,
              fontSize: 10,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              color: `${quiet}0.55)`,
            }}
          >
            Your picks
          </div>
          {picks.length ? (
            <ul
              ref={listRef}
              style={{
                margin: 0,
                paddingLeft: 16,
                fontSize: 13,
                lineHeight: 1.6,
                color: `${quiet}0.9)`,
                maxHeight: '30vh',
                overflow: 'auto',
              }}
            >
              {picks.map((p) => (
                <li key={p}>{p}</li>
              ))}
            </ul>
          ) : (
            <div style={{ fontSize: 13, color: `${quiet}0.55)` }}>
              Nothing picked yet. Press Space or ☆ on a design you want on the track.
            </div>
          )}
          <div style={{ display: 'flex', gap: 6 }}>
            <button type="button" style={key} onClick={copy}>
              {copied ? 'Copied' : 'Copy list'}
            </button>
            <button type="button" style={key} onClick={() => setList(false)}>
              Close
            </button>
          </div>
        </div>
      )}

      <div
        style={{
          ...panel,
          position: 'absolute',
          right: 'max(16px, 4vw)',
          bottom: 18,
          display: 'grid',
          gap: 10,
        }}
      >
        <div
          style={{
            fontFamily: mono,
            fontSize: 10,
            color: `${quiet}0.5)`,
            display: 'flex',
            justifyContent: 'space-between',
            gap: 12,
          }}
        >
          <span>↑ variation</span>
          <span>category →</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${n}, auto)`, gap: 4 }}>
          {Array.from({ length: rows }, (_, ri) => rows - 1 - ri).flatMap((r) =>
            CATEGORIES.map((c, ci) => {
              if (r >= c.vars.length) return <span key={`${ci}-${r}`} />;
              const on = ci === pos.cat && r === pos.v;
              const pk = picks.includes(pickKey({ cat: ci, v: r }));
              const label = pickKey({ cat: ci, v: r });
              return (
                <button
                  key={`${ci}-${r}`}
                  type="button"
                  title={label}
                  aria-label={label}
                  aria-pressed={on}
                  onClick={() => setPos({ cat: ci, v: r })}
                  style={{
                    width: 18,
                    height: 14,
                    padding: 0,
                    borderRadius: 3,
                    cursor: 'pointer',
                    border: `1px solid ${on ? GOLD : `${GOLD}55`}`,
                    background: on ? GOLD : 'transparent',
                    boxShadow: pk ? `inset 0 0 0 3px ${on ? '#0a080c' : `${quiet}0.85)`}` : 'none',
                  }}
                />
              );
            }),
          )}
        </div>
        <div style={{ display: 'flex', gap: 6 }}>
          <button
            type="button"
            style={key}
            aria-label="Previous category"
            onClick={() => go(-1, 0)}
          >
            ←
          </button>
          <button type="button" style={key} aria-label="Next variation" onClick={() => go(0, 1)}>
            ↑
          </button>
          <button
            type="button"
            style={key}
            aria-label="Previous variation"
            onClick={() => go(0, -1)}
          >
            ↓
          </button>
          <button type="button" style={key} aria-label="Next category" onClick={() => go(1, 0)}>
            →
          </button>
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            type="button"
            style={{
              ...key,
              color: picked ? GOLD : key.color,
              borderColor: picked ? GOLD : `${GOLD}55`,
            }}
            onClick={togglePick}
          >
            {picked ? '★ Picked' : '☆ Pick'}
          </button>
          <button type="button" style={key} onClick={() => setList((l) => !l)}>
            {picks.length ? `Picks (${picks.length})` : 'Picks'}
          </button>
          <button type="button" style={key} onClick={onClose}>
            Tracks
          </button>
        </div>
        <div style={{ fontFamily: mono, fontSize: 10, color: `${quiet}0.35)` }}>
          arrows move · space picks · esc tracks
        </div>
      </div>
    </div>
  );
}
