'use client';

/*
 * The Pandas city: the city map engine (components/city-map/CityMap.tsx) fed
 * with the Pandas class. This file holds only what is Pandas: which cards are
 * lit (the marks of /pandas, read only) and what the sheets say. The data
 * comes from lib/pandas-city.ts. Spec: docs/specs/pandas-city.md.
 */

import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';

import CityMap, { type Lit } from '@/components/city-map/CityMap';
import {
  codeBox,
  Glyph,
  INK_SOFT,
  Inline,
  LINE,
  MONO,
  pill,
  rowButton,
  sheetHeading,
  sheetLink,
} from '@/components/city-map/ui';
import type { Panel } from '@/lib/city-map';
import { cardHref, type Lesson, lessonHref, markKey, pandasMap } from '@/lib/pandas-city';

type Marks = Record<string, string>;
const MARKS_URL = '/api/coding/marks';

/** The marks of /pandas: this device's copy, then the account's. Read only; nothing breaks without them. */
function useMarks(): Marks {
  const [marks, setMarks] = useState<Marks>({});
  useEffect(() => {
    let local: Marks = {};
    try {
      local = JSON.parse(localStorage.getItem('pandas-marks') || '{}') || {};
    } catch {
      local = {};
    }
    setMarks(local);
    let alive = true;
    fetch(MARKS_URL)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!alive || !data?.marks) return;
        const mine = Object.fromEntries(
          Object.entries(data.marks as Marks).filter(([k]) => k.startsWith('pandas|')),
        );
        setMarks({ ...local, ...mine });
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, []);
  return marks;
}

export default function PandasCity({ lessons }: { lessons: Lesson[] }) {
  const data = useMemo(() => pandasMap(lessons), [lessons]);
  const marks = useMarks();
  const litOf = useCallback(
    (n: number, id: string): Lit => {
      const m = marks[markKey(n, id)];
      return m === 'got' ? 'full' : m ? 'half' : undefined;
    },
    [marks],
  );

  const renderPanel = (p: Panel, open: (p: Panel) => void): ReactNode => {
    const l = lessons.find((x) => x.n === p.n);
    if (!l) return null;
    if (p.kind === 'city')
      return (
        <>
          <p style={{ margin: 0, color: INK_SOFT }}>{l.lede}</p>
          <h3 style={sheetHeading}>
            <Glyph kind="star" size={16} /> To remember
          </h3>
          <ul style={{ margin: 0, paddingLeft: 20, display: 'grid', gap: 8 }}>
            {l.remember.map((r) => (
              <li key={r}>
                <Inline text={r} />
              </li>
            ))}
          </ul>
          <h3 style={sheetHeading}>
            <Glyph kind="octagon" size={16} /> The parts, clockwise from the gate
          </h3>
          <div>
            {l.groups.map((g, i) => (
              <button
                key={g.name}
                type="button"
                style={rowButton}
                onClick={() => open({ kind: 'district', n: l.n, district: i })}
              >
                <b style={{ minWidth: 20 }}>{i + 1}</b>
                <span>{g.name}</span>
                <span style={{ marginLeft: 'auto', color: INK_SOFT }}>{g.cards.length} ›</span>
              </button>
            ))}
            <button type="button" style={rowButton} onClick={() => open({ kind: 'spots', n: l.n })}>
              <Glyph kind="hexagon" size={16} />
              <span>Practice</span>
              <span style={{ marginLeft: 'auto', color: INK_SOFT }}>{l.practice.length} ›</span>
            </button>
            <button type="button" style={rowButton} onClick={() => open({ kind: 'shelf', n: l.n })}>
              <Glyph kind="shelf" size={16} />
              <span>Cheat sheet</span>
              <span style={{ marginLeft: 'auto', color: INK_SOFT }}>{l.library.length} ›</span>
            </button>
          </div>
          <a href={lessonHref(l.n)} style={sheetLink}>
            Open Lesson {l.n} ›
          </a>
        </>
      );
    if (p.kind === 'district') {
      const g = l.groups[p.district];
      if (!g) return null;
      return (
        <>
          <p style={{ margin: 0, color: INK_SOFT }}>
            Part {p.district + 1} of {l.groups.length}, clockwise from the gate
          </p>
          <div>
            {g.cards.map((card) => (
              <button
                key={card.id}
                type="button"
                style={rowButton}
                onClick={() =>
                  open({ kind: 'building', n: l.n, district: p.district, building: card.id })
                }
              >
                <Glyph kind={litOf(l.n, card.id) === 'full' ? 'lit' : 'square'} size={16} />
                <span>
                  <b>{card.name}</b>
                  <br />
                  <span style={{ color: INK_SOFT, fontSize: 14 }}>
                    <Inline text={card.line} />
                  </span>
                </span>
              </button>
            ))}
          </div>
        </>
      );
    }
    if (p.kind === 'building' || p.kind === 'more') {
      const card = l.groups[p.district]?.cards.find((c) => c.id === p.building);
      if (!card) return null;
      const deep = p.kind === 'more';
      const lines = card.code?.split('\n') ?? [];
      return (
        <>
          {/* The card: its first paragraph. More: the whole explanation and all the code. */}
          {card.what
            .split(/\n\s*\n/)
            .slice(0, deep ? undefined : 1)
            .map((para) => (
              <p key={para} style={{ margin: 0 }}>
                <Inline text={para} />
              </p>
            ))}
          {lines.length > 0 && (
            <pre style={codeBox}>
              {deep || lines.length <= 3 ? card.code : `${lines.slice(0, 3).join('\n')}\n…`}
            </pre>
          )}
          {card.watch && (
            <p style={{ margin: 0, display: 'flex', gap: 8, alignItems: 'baseline' }}>
              <Glyph kind="triangle" size={14} />
              <span>
                <b>Watch out.</b> <Inline text={card.watch} />
              </span>
            </p>
          )}
          <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', alignItems: 'center' }}>
            {!deep && (
              <button
                type="button"
                style={pill}
                onClick={() =>
                  open({ kind: 'more', n: l.n, district: p.district, building: card.id })
                }
              >
                More
              </button>
            )}
            <a href={cardHref(l.n, card.id)} style={sheetLink}>
              Open in lesson ›
            </a>
          </div>
        </>
      );
    }
    if (p.kind === 'spots')
      return (
        <div>
          {l.practice.map((x, i) => (
            <a key={x.id} href={cardHref(l.n, `ex-${x.id}`)} style={rowButton}>
              <Glyph kind="hexagon" size={16} />
              <span>
                Exercise {i + 1} · {x.title}
              </span>
              <span style={{ marginLeft: 'auto' }}>›</span>
            </a>
          ))}
        </div>
      );
    return (
      <div>
        {l.library.map((r) => (
          <div
            key={r.name}
            style={{ borderTop: `1px solid ${LINE}`, padding: '12px 0', display: 'grid', gap: 4 }}
          >
            <b style={{ font: `600 14px ${MONO}` }}>{r.name}</b>
            <span style={{ fontSize: 15 }}>{r.meaning}</span>
            {r.example && (
              <code style={{ font: `13px ${MONO}`, color: INK_SOFT, whiteSpace: 'pre-wrap' }}>
                {r.example}
              </code>
            )}
          </div>
        ))}
      </div>
    );
  };

  return (
    <CityMap
      data={data}
      back={{ href: '/pandas', label: 'Pandas' }}
      litOf={litOf}
      renderPanel={renderPanel}
    />
  );
}
