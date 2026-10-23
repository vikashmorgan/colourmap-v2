'use client';

import { useEffect, useRef, useState } from 'react';

import {
  addSection,
  BAR_OPTIONS,
  isSectionName,
  MAX_NAME,
  MAX_SECTIONS,
  moveSection,
  playheadBar,
  positionAt,
  QUICK_NAMES,
  removeSection,
  renameSection,
  type SectionSnapshot,
  type SongPosition,
  type SongSection,
  setSectionBars,
  setSectionSnapshot,
  totalBars,
} from '@/lib/chill/sections';
import { barAt, getTransport, onTransport } from '@/lib/chill/transport';
import { readableInk } from '@/lib/pad-palettes';

/*
 * SONG SECTIONS — the arrangement strip under SONG in the Chill Machine.
 * Blocks are sized by their bars, a playhead runs over them on the transport
 * clock, and the selected block opens an inline editor below the strip.
 * The host owns the list (and storage), the snapshot contents and what
 * happens when a section starts. Spec: docs/specs/chill-machine-public.md.
 */

const INK = '#5C3018';
const BROWN = '#7A5438';
const MUTED = '#8A6A4A';
const OCHRE = '#C4A060';
const PAPER = '#FBF6EC';
/** Minimum width of one bar on the strip, so long songs scroll on phones. */
const BAR_PX = 10;

const serif = { fontFamily: 'var(--font-serif)' } as const;

function colourAt(palette: readonly string[], i: number): string {
  return palette.length ? palette[i % palette.length] : OCHRE;
}

function samePosition(a: SongPosition | null, b: SongPosition | null): boolean {
  if (!a || !b) return a === b;
  return (
    a.index === b.index &&
    a.section === b.section &&
    a.barInSection === b.barInSection &&
    a.songBar === b.songBar &&
    a.ended === b.ended &&
    a.totalBars === b.totalBars
  );
}

/**
 * Live song position while the transport plays (null when stopped). Runs one
 * requestAnimationFrame loop; `onFrame` gets the fractional playhead bar each
 * frame so the caller can move the line without re-rendering.
 */
function useSongPosition(
  sections: readonly SongSection[],
  loopSectionId: string | null,
  now: () => number,
  onFrame?: (bar: number) => void,
): SongPosition | null {
  const [playing, setPlaying] = useState(() => getTransport().playing);
  const [pos, setPos] = useState<SongPosition | null>(null);
  const latest = useRef({ sections, loopSectionId, now, onFrame });
  latest.current = { sections, loopSectionId, now, onFrame };

  useEffect(() => onTransport((s) => setPlaying(s.playing)), []);

  useEffect(() => {
    if (!playing) {
      setPos(null);
      return;
    }
    let raf = 0;
    const tick = () => {
      const { sections: list, loopSectionId: loop, now: clock, onFrame: frame } = latest.current;
      const bar = barAt(clock());
      const next = positionAt(list, bar, loop);
      setPos((prev) => (samePosition(prev, next) ? prev : next));
      frame?.(playheadBar(list, bar, loop).bar);
      raf = requestAnimationFrame(tick);
    };
    tick();
    return () => cancelAnimationFrame(raf);
  }, [playing]);

  return pos;
}

/** `DROP · bar 5/16` for the top bar; nothing while the transport is stopped. */
export function ChillSongPosition({
  sections,
  loopSectionId,
  now,
}: {
  sections: readonly SongSection[];
  loopSectionId: string | null;
  now: () => number;
}) {
  const pos = useSongPosition(sections, loopSectionId, now);
  if (!pos) return null;
  return (
    <span
      className="uppercase tracking-[0.12em]"
      style={{ ...serif, fontSize: 13, fontWeight: 700, color: BROWN }}
    >
      {pos.section.name.toUpperCase()} · bar {pos.barInSection}/{pos.section.bars}
    </span>
  );
}

type Props = {
  sections: readonly SongSection[];
  onChange: (next: SongSection[]) => void;
  /** Section colours by index (wraps). */
  palette: readonly string[];
  loopSectionId: string | null;
  onLoopChange: (id: string | null) => void;
  getSnapshot: () => SectionSnapshot;
  /** Called once each time the playhead enters a different section. */
  onEnterSection?: (section: SongSection, index: number) => void;
  /** AudioContext time getter; may return 0 when there's no audio. */
  now: () => number;
};

export default function ChillSongSections({
  sections,
  onChange,
  palette,
  loopSectionId,
  onLoopChange,
  getSnapshot,
  onEnterSection,
  now,
}: Props) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const lineRef = useRef<HTMLDivElement>(null);
  const total = totalBars(sections);

  const pos = useSongPosition(sections, loopSectionId, now, (bar) => {
    if (lineRef.current) lineRef.current.style.left = `${total ? (bar / total) * 100 : 0}%`;
  });

  // Fire onEnterSection once per section change while playing.
  const entered = useRef<number | null>(null);
  const enterRef = useRef(onEnterSection);
  enterRef.current = onEnterSection;
  const posIndex = pos?.index ?? null;
  const posSection = pos?.section ?? null;
  useEffect(() => {
    if (posIndex === null || !posSection) {
      entered.current = null;
      return;
    }
    if (entered.current === posIndex) return;
    entered.current = posIndex;
    enterRef.current?.(posSection, posIndex);
  }, [posIndex, posSection]);

  const selectedIndex = sections.findIndex((s) => s.id === selectedId);
  const selected = selectedIndex === -1 ? null : sections[selectedIndex];

  const select = (s: SongSection) => {
    if (s.id === selectedId) {
      setSelectedId(null);
      return;
    }
    setSelectedId(s.id);
    setDraft(s.name);
  };

  const add = () => {
    const next = addSection(sections, null);
    if (next.length === sections.length) return;
    const created = next[next.length - 1];
    onChange(next);
    setSelectedId(created.id);
    setDraft(created.name);
  };

  const remove = (s: SongSection, index: number) => {
    const next = removeSection(sections, s.id);
    if (next.length === sections.length) return;
    onChange(next);
    if (loopSectionId === s.id) onLoopChange(null);
    const neighbour = next[Math.min(index, next.length - 1)];
    setSelectedId(neighbour.id);
    setDraft(neighbour.name);
  };

  const rename = (s: SongSection, name: string) => {
    setDraft(name);
    if (isSectionName(name)) onChange(renameSection(sections, s.id, name));
  };

  const chip = (active: boolean) =>
    ({
      ...serif,
      fontSize: 13,
      fontWeight: 600,
      color: active ? INK : MUTED,
      background: active ? `${OCHRE}26` : 'transparent',
      border: `1px solid ${active ? `${OCHRE}80` : `${OCHRE}30`}`,
    }) as const;

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto pb-1">
        <div
          className="relative flex items-stretch gap-1"
          style={{ minWidth: total * BAR_PX + sections.length * 4 + 44 }}
        >
          <div className="relative flex flex-1 items-stretch gap-1">
            {sections.map((s, i) => {
              const colour = colourAt(palette, i);
              const current = pos?.index === i;
              const isSelected = s.id === selectedId;
              return (
                <button
                  key={s.id}
                  type="button"
                  aria-pressed={isSelected}
                  aria-current={current ? 'step' : undefined}
                  aria-label={`${s.name}, ${s.bars} bars${s.snapshot ? ', snapshot' : ''}${
                    loopSectionId === s.id ? ', looping' : ''
                  }`}
                  onClick={() => select(s)}
                  className="relative cursor-pointer rounded-lg px-2 py-2 text-left transition-all"
                  style={{
                    flex: `${s.bars} 0 0`,
                    minWidth: 0,
                    background: current ? colour : `${colour}26`,
                    border: `1px solid ${isSelected ? BROWN : `${colour}60`}`,
                    boxShadow: current ? `0 0 12px ${colour}80` : 'none',
                  }}
                >
                  <span
                    className="block truncate"
                    style={{
                      ...serif,
                      fontSize: 13,
                      fontWeight: 700,
                      color: current ? readableInk(colour, colour) : readableInk(colour, PAPER),
                    }}
                  >
                    {s.name}
                  </span>
                  <span
                    className="block"
                    style={{ ...serif, fontSize: 12, color: current ? INK : MUTED }}
                  >
                    {s.bars}
                    {loopSectionId === s.id ? ' ↻' : ''}
                  </span>
                  {s.snapshot && (
                    <span
                      data-testid="snapshot-dot"
                      aria-hidden
                      className="absolute rounded-full"
                      style={{ top: 4, right: 4, width: 6, height: 6, background: BROWN }}
                    />
                  )}
                </button>
              );
            })}
            {pos && (
              <div
                ref={lineRef}
                data-testid="playhead"
                aria-hidden
                className="pointer-events-none absolute top-0 bottom-0"
                style={{ left: 0, width: 2, marginLeft: -1, background: INK, borderRadius: 1 }}
              />
            )}
          </div>
          <button
            type="button"
            onClick={add}
            disabled={sections.length >= MAX_SECTIONS}
            className="shrink-0 cursor-pointer rounded-lg px-2 disabled:cursor-default disabled:opacity-40"
            style={{ ...chip(false), width: 40 }}
            aria-label="Add section"
            title="Add section"
          >
            +
          </button>
        </div>
      </div>

      {selected && (
        <div
          className="animate-in fade-in duration-150 space-y-3 rounded-[14px] px-4 py-3"
          style={{ border: `1px solid ${OCHRE}30`, background: `${OCHRE}08` }}
        >
          <div className="flex flex-wrap items-center gap-2">
            <input
              aria-label="Section name"
              value={draft}
              maxLength={MAX_NAME}
              onChange={(e) => rename(selected, e.target.value)}
              onBlur={() => setDraft(selected.name)}
              className="min-w-0 flex-1 rounded-lg px-2 py-1 outline-none"
              style={{
                ...serif,
                fontSize: 16,
                color: INK,
                background: PAPER,
                border: `1px solid ${OCHRE}50`,
              }}
            />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_NAMES.map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => rename(selected, n)}
                className="cursor-pointer rounded-full px-3 py-1"
                style={chip(selected.name === n)}
              >
                {n}
              </button>
            ))}
          </div>
          <fieldset className="m-0 flex items-center gap-1.5 border-0 p-0" aria-label="Length">
            <span style={{ ...serif, fontSize: 13, fontWeight: 600, color: BROWN }}>bars</span>
            {BAR_OPTIONS.map((b) => (
              <button
                key={b}
                type="button"
                aria-pressed={selected.bars === b}
                onClick={() => onChange(setSectionBars(sections, selected.id, b))}
                className="cursor-pointer rounded-full px-3 py-1"
                style={chip(selected.bars === b)}
              >
                {b}
              </button>
            ))}
          </fieldset>
          <div className="flex flex-wrap gap-1.5">
            <button
              type="button"
              onClick={() => onChange(setSectionSnapshot(sections, selected.id, getSnapshot()))}
              className="cursor-pointer rounded-full px-3 py-1"
              style={chip(false)}
            >
              Take snapshot
            </button>
            {selected.snapshot && (
              <button
                type="button"
                onClick={() => onChange(setSectionSnapshot(sections, selected.id, null))}
                className="cursor-pointer rounded-full px-3 py-1"
                style={chip(false)}
              >
                Clear snapshot
              </button>
            )}
            <button
              type="button"
              aria-pressed={loopSectionId === selected.id}
              onClick={() => onLoopChange(loopSectionId === selected.id ? null : selected.id)}
              className="cursor-pointer rounded-full px-3 py-1"
              style={chip(loopSectionId === selected.id)}
            >
              Loop this section
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              aria-label="Move left"
              disabled={selectedIndex === 0}
              onClick={() => onChange(moveSection(sections, selectedIndex, selectedIndex - 1))}
              className="cursor-pointer rounded-full px-3 py-1 disabled:cursor-default disabled:opacity-40"
              style={chip(false)}
            >
              ←
            </button>
            <button
              type="button"
              aria-label="Move right"
              disabled={selectedIndex === sections.length - 1}
              onClick={() => onChange(moveSection(sections, selectedIndex, selectedIndex + 1))}
              className="cursor-pointer rounded-full px-3 py-1 disabled:cursor-default disabled:opacity-40"
              style={chip(false)}
            >
              →
            </button>
            <button
              type="button"
              disabled={sections.length <= 1}
              onClick={() => remove(selected, selectedIndex)}
              className="ml-auto cursor-pointer rounded-full px-3 py-1 disabled:cursor-default disabled:opacity-40"
              style={chip(false)}
            >
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
