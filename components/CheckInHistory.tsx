'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';

import CheckInAnalysis from '@/components/CheckInAnalysis';
import { getEmotionalWord } from '@/lib/emotional-vocabulary';

interface HistoryEntry {
  id: string;
  sliderValue: number;
  note: string | null;
  tags: string[] | null;
  missionId: string | null;
  emotionName: string | null;
  emotionColor: string | null;
  createdAt: string;
}

interface MissionSummary {
  id: string;
  title: string;
}

const FGAC_COLORS: Record<string, string> = {
  Fear: '#D45050',
  Gratitude: '#7AAA58',
  Avoidance: '#E0844A',
  Confusion: '#9B6BA0',
};

function getDotColor(value: number): string {
  if (value <= 25) return 'hsl(220 15% 55%)';
  if (value <= 62) return 'hsl(40 15% 55%)';
  return 'hsl(25 70% 55%)';
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByDate(entries: HistoryEntry[]): Map<string, HistoryEntry[]> {
  const groups = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const key = new Date(entry.createdAt).toLocaleDateString();
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }
  return groups;
}

function getEntryEmotionColor(entry: HistoryEntry): string {
  return entry.emotionColor || getDotColor(entry.sliderValue);
}

function getEntryEmotionWord(entry: HistoryEntry): string {
  return entry.emotionName || getEmotionalWord(entry.sliderValue);
}

interface FgacChip {
  label: string;
  color: string;
  text: string;
}

function parseFgac(note: string): { chips: FgacChip[]; cleanNote: string } {
  const chips: FgacChip[] = [];
  let cleanNote = note;
  for (const [label, color] of Object.entries(FGAC_COLORS)) {
    const regex = new RegExp(`\\[${label}\\]\\s*([^\\[]*?)(?=\\[|$)`, 'gi');
    let match = regex.exec(cleanNote);
    while (match) {
      const text = match[1].trim();
      if (text) chips.push({ label, color, text });
      cleanNote = cleanNote.replace(match[0], '');
      match = regex.exec(cleanNote);
    }
  }
  cleanNote = cleanNote
    .split('\n')
    .filter((l) => l.trim())
    .join('\n')
    .trim();
  return { chips, cleanNote };
}

function getDominantEmotion(entries: HistoryEntry[]): string {
  const counts = new Map<string, number>();
  for (const e of entries) {
    const word = getEntryEmotionWord(e);
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  let best = '';
  let bestCount = 0;
  for (const [word, count] of counts) {
    if (count > bestCount) {
      best = word;
      bestCount = count;
    }
  }
  return best;
}

function entryHasContent(entry: HistoryEntry): boolean {
  if (!entry.note) return false;
  const { chips, cleanNote } = parseFgac(entry.note);
  return chips.length > 0 || cleanNote.length > 0;
}

interface ClusteredRow {
  type: 'single';
  entry: HistoryEntry;
}

interface ClusteredGroup {
  type: 'cluster';
  emotionWord: string;
  entries: HistoryEntry[];
}

type TimelineRow = ClusteredRow | ClusteredGroup;

function clusterEntries(entries: HistoryEntry[]): TimelineRow[] {
  const rows: TimelineRow[] = [];
  let i = 0;
  while (i < entries.length) {
    const current = entries[i];
    const currentWord = getEntryEmotionWord(current);
    if (entryHasContent(current)) {
      rows.push({ type: 'single', entry: current });
      i++;
      continue;
    }
    // Look ahead for consecutive same-emotion entries without content
    let j = i + 1;
    while (j < entries.length) {
      const next = entries[j];
      if (getEntryEmotionWord(next) !== currentWord || entryHasContent(next)) break;
      j++;
    }
    const count = j - i;
    if (count >= 2) {
      rows.push({ type: 'cluster', emotionWord: currentWord, entries: entries.slice(i, j) });
    } else {
      rows.push({ type: 'single', entry: current });
    }
    i = j;
  }
  return rows;
}

// --- Sparkline SVG ---
function DaySparkline({ entries }: { entries: HistoryEntry[] }) {
  if (entries.length === 0) return null;
  const width = 300;
  const height = 32;
  const padding = 8;

  const points = entries.map((e, i) => ({
    x:
      entries.length === 1
        ? width / 2
        : padding + (i / (entries.length - 1)) * (width - padding * 2),
    y: height - padding - (e.sliderValue / 100) * (height - padding * 2),
    color: getDotColor(e.sliderValue),
    value: e.sliderValue,
  }));

  const avgValue = entries.reduce((s, e) => s + e.sliderValue, 0) / entries.length;
  const avgColor = getDotColor(avgValue);

  // Build quadratic bezier path
  let linePath = '';
  let fillPath = '';
  if (points.length === 1) {
    linePath = `M ${points[0].x} ${points[0].y} L ${points[0].x} ${points[0].y}`;
    fillPath = `M ${points[0].x} ${height} L ${points[0].x} ${points[0].y} L ${points[0].x} ${height} Z`;
  } else {
    linePath = `M ${points[0].x} ${points[0].y}`;
    fillPath = `M ${points[0].x} ${height} L ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      const prev = points[i - 1];
      const curr = points[i];
      const cpx = (prev.x + curr.x) / 2;
      linePath += ` Q ${cpx} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2} Q ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
      fillPath += ` Q ${cpx} ${prev.y} ${cpx} ${(prev.y + curr.y) / 2} Q ${cpx} ${curr.y} ${curr.x} ${curr.y}`;
    }
    const lastPt = points[points.length - 1];
    fillPath += ` L ${lastPt.x} ${height} Z`;
  }

  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className="w-full"
      style={{ height: 32 }}
      role="img"
      aria-label="Day sparkline showing slider values over time"
    >
      <path d={fillPath} fill={avgColor} opacity={0.08} />
      <path d={linePath} fill="none" stroke={avgColor} strokeWidth={1.5} opacity={0.4} />
      {points.map((p, i) => (
        <circle key={entries[i].id} cx={p.x} cy={p.y} r={5} fill={p.color} />
      ))}
    </svg>
  );
}

// --- Pulse parsing (existing logic, extracted) ---
function parsePulses(note: string) {
  const pulseColors = ['#D08040', '#C88C48', '#C49850', '#C4A048', '#A8AC58', '#90B060', '#80B868'];
  const pulseCategories: Record<string, readonly string[]> = {
    body: ['Disconnected', 'Drained', 'Tired', 'OK', 'Good', 'Strong', 'Powerful'],
    attitude: ['Wet sock', 'Low', 'Heavy', 'Neutral', 'Solid', 'Strong', 'Unshakable'],
    structure: ['Chaotic', 'Scattered', 'Messy', 'OK', 'Tidy', 'Organised', 'Laser sharp'],
  };
  const pulses: { cat: string; idx: number }[] = [];
  let cleanNote = note;
  for (const [cat, levels] of Object.entries(pulseCategories)) {
    const regex = new RegExp(`\\[${cat}:\\s*([^\\]]+)\\]`, 'i');
    const match = cleanNote.match(regex);
    if (match) {
      const level = match[1].trim();
      const idx = levels.findIndex((l) => l.toLowerCase() === level.toLowerCase());
      if (idx >= 0) pulses.push({ cat, idx });
      cleanNote = cleanNote.replace(match[0], '').trim();
    }
  }
  cleanNote = cleanNote
    .split('\n')
    .filter((l) => l.trim())
    .join('\n');
  return { pulses, pulseColors, cleanNote };
}

// --- Editable Timeline Entry ---
function EditableTimelineEntry({
  entry,
  missionMap,
  onUpdate,
  onDelete,
  isLast,
}: {
  entry: HistoryEntry;
  missionMap: Map<string, string>;
  onUpdate: (e: HistoryEntry) => void;
  onDelete: (id: string) => void;
  isLast: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [noteExpanded, setNoteExpanded] = useState(false);
  const [note, setNote] = useState(entry.note || '');
  const [sliderValue, setSliderValue] = useState(entry.sliderValue);
  const [saving, setSaving] = useState(false);

  const emotionColor = getEntryEmotionColor(entry);
  const emotionWord = editing ? getEmotionalWord(sliderValue) : getEntryEmotionWord(entry);

  async function handleSave() {
    setSaving(true);
    try {
      const res = await fetch(`/api/check-ins/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sliderValue, note: note.trim() || null }),
      });
      if (res.ok) {
        const updated = await res.json();
        onUpdate({ ...entry, ...updated });
        setEditing(false);
      }
    } finally {
      setSaving(false);
    }
  }

  // Parse note content
  const noteContent = useMemo(() => {
    if (!entry.note) return null;
    const { chips, cleanNote: afterFgac } = parseFgac(entry.note);
    const { pulses, pulseColors, cleanNote } = parsePulses(afterFgac);
    return { chips, pulses, pulseColors, cleanNote };
  }, [entry.note]);

  return (
    <div className="flex gap-0">
      {/* Time column */}
      <div className="w-12 shrink-0 pt-0.5">
        <span className="text-[10px] text-muted-foreground">{formatTime(entry.createdAt)}</span>
      </div>

      {/* Dot + connector */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 20 }}>
        <button
          type="button"
          className="h-[10px] w-[10px] rounded-full shrink-0 cursor-pointer mt-1 p-0 border-0"
          style={{ backgroundColor: emotionColor }}
          onClick={() => setEditing(!editing)}
          aria-label="Toggle edit"
        />
        {!isLast && (
          <div
            className="w-px flex-1 min-h-[16px]"
            style={{ backgroundColor: `${emotionColor}40` }}
          />
        )}
      </div>

      {/* Content block */}
      <div
        className="flex-1 min-w-0 pb-3 pl-3"
        style={{
          borderLeft: `3px solid ${emotionColor}66`,
          background: `linear-gradient(to right, ${emotionColor}14, transparent)`,
        }}
      >
        <div className="py-1 px-2">
          <button
            type="button"
            className="text-sm font-medium cursor-pointer bg-transparent border-0 p-0 text-left"
            style={{ color: emotionColor }}
            onClick={() => setEditing(!editing)}
          >
            {emotionWord}
          </button>

          {!editing && (
            <div className="space-y-1 mt-1">
              {entry.missionId && missionMap.get(entry.missionId) && (
                <p className="text-xs text-[#5C3018]">{missionMap.get(entry.missionId)}</p>
              )}

              {/* FGAC chips */}
              {noteContent && noteContent.chips.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {noteContent.chips.map((chip) => (
                    <span
                      key={`${chip.label}-${chip.text}`}
                      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5"
                      style={{ backgroundColor: `${chip.color}18` }}
                    >
                      <span className="text-[10px] font-semibold" style={{ color: chip.color }}>
                        {chip.label}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{chip.text}</span>
                    </span>
                  ))}
                </div>
              )}

              {/* Pulses */}
              {noteContent && noteContent.pulses.length > 0 && (
                <div className="flex items-center gap-3">
                  {noteContent.pulses.map((p) => (
                    <div key={p.cat} className="flex items-center gap-1">
                      <span className="text-[9px] text-muted-foreground/40 uppercase">
                        {p.cat[0]}
                      </span>
                      <div className="flex gap-[2px]">
                        {noteContent.pulseColors.map((c) => {
                          const cIdx = noteContent.pulseColors.indexOf(c);
                          return (
                            <div
                              key={`${p.cat}-${c}`}
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: 1,
                                background: c,
                                opacity:
                                  cIdx === p.idx ? 1 : Math.abs(cIdx - p.idx) === 1 ? 0.4 : 0.1,
                              }}
                            />
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Note text with line-clamp */}
              {noteContent?.cleanNote && (
                <button
                  type="button"
                  onClick={() => setNoteExpanded(!noteExpanded)}
                  className="text-left w-full"
                >
                  <p
                    className={`text-sm text-muted-foreground ${noteExpanded ? '' : 'line-clamp-2'}`}
                  >
                    {noteContent.cleanNote}
                  </p>
                </button>
              )}

              {/* Tags */}
              {entry.tags && entry.tags.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {entry.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Edit form */}
          {editing && (
            <div className="space-y-3 pt-1 animate-in fade-in duration-150">
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                  <span>Heavy</span>
                  <span>Light</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={sliderValue}
                  onChange={(e) => setSliderValue(Number(e.target.value))}
                  className="w-full accent-[#5C3018]"
                />
              </div>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="What's on your mind?"
                className="w-full min-h-[50px] rounded-xl border border-border bg-background/60 p-2.5 text-sm resize-none outline-none"
              />
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    onDelete(entry.id);
                    fetch(`/api/check-ins/${entry.id}`, { method: 'DELETE' });
                  }}
                  className="text-[10px] text-muted-foreground hover:text-destructive transition-colors"
                >
                  Delete
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(false);
                      setNote(entry.note || '');
                      setSliderValue(entry.sliderValue);
                    }}
                    className="text-[10px] text-muted-foreground"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="text-[10px] font-medium text-[#5C3018]"
                  >
                    {saving ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// --- Clustered row ---
function ClusteredTimelineRow({
  row,
  missionMap,
  onUpdate,
  onDelete,
  isLast,
}: {
  row: ClusteredGroup;
  missionMap: Map<string, string>;
  onUpdate: (e: HistoryEntry) => void;
  onDelete: (id: string) => void;
  isLast: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const emotionColor = getEntryEmotionColor(row.entries[0]);

  if (expanded) {
    return (
      <div>
        <button
          type="button"
          onClick={() => setExpanded(false)}
          className="mb-1 ml-12 pl-[23px] text-[10px] text-muted-foreground hover:text-foreground transition-colors"
        >
          Collapse {row.emotionWord} x{row.entries.length}
        </button>
        {row.entries.map((entry, i) => (
          <EditableTimelineEntry
            key={entry.id}
            entry={entry}
            missionMap={missionMap}
            onUpdate={onUpdate}
            onDelete={onDelete}
            isLast={isLast && i === row.entries.length - 1}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-0">
      {/* Time column - stacked timestamps */}
      <div className="w-12 shrink-0 pt-0.5 flex flex-col">
        {row.entries.map((e) => (
          <span key={e.id} className="text-[10px] text-muted-foreground leading-tight">
            {formatTime(e.createdAt)}
          </span>
        ))}
      </div>

      {/* Dot + connector */}
      <div className="flex flex-col items-center shrink-0" style={{ width: 20 }}>
        <div
          className="h-[10px] w-[10px] rounded-full shrink-0 mt-1"
          style={{ backgroundColor: emotionColor }}
        />
        {!isLast && (
          <div
            className="w-px flex-1 min-h-[16px]"
            style={{ backgroundColor: `${emotionColor}40` }}
          />
        )}
      </div>

      {/* Content */}
      <div
        className="flex-1 min-w-0 pb-3 pl-3"
        style={{
          borderLeft: `3px solid ${emotionColor}66`,
          background: `linear-gradient(to right, ${emotionColor}14, transparent)`,
        }}
      >
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="flex items-center gap-2 py-1 px-2 cursor-pointer"
        >
          <span className="text-sm font-medium" style={{ color: emotionColor }}>
            {row.emotionWord}
          </span>
          <span
            className="text-[10px] font-semibold rounded-full px-1.5 py-0.5"
            style={{ backgroundColor: `${emotionColor}20`, color: emotionColor }}
          >
            x{row.entries.length}
          </span>
        </button>
      </div>
    </div>
  );
}

// --- Date group ---
function DateGroup({
  dayEntries,
  missionMap,
  onUpdate,
  onDelete,
}: {
  dayEntries: HistoryEntry[];
  missionMap: Map<string, string>;
  onUpdate: (e: HistoryEntry) => void;
  onDelete: (id: string) => void;
}) {
  const rows = useMemo(() => clusterEntries(dayEntries), [dayEntries]);
  const dominant = useMemo(() => getDominantEmotion(dayEntries), [dayEntries]);

  return (
    <div>
      {/* Date header */}
      <p className="text-xs font-medium text-muted-foreground mb-1">
        {formatDate(dayEntries[0].createdAt)} — {dayEntries.length} check-in
        {dayEntries.length !== 1 ? 's' : ''}, mostly {dominant}
      </p>

      {/* Sparkline */}
      <div className="mb-2">
        <DaySparkline entries={dayEntries} />
      </div>

      {/* Timeline rows */}
      <div>
        {rows.map((row, idx) => {
          const isLast = idx === rows.length - 1;
          if (row.type === 'cluster') {
            return (
              <ClusteredTimelineRow
                key={row.entries[0].id}
                row={row}
                missionMap={missionMap}
                onUpdate={onUpdate}
                onDelete={onDelete}
                isLast={isLast}
              />
            );
          }
          return (
            <EditableTimelineEntry
              key={row.entry.id}
              entry={row.entry}
              missionMap={missionMap}
              onUpdate={onUpdate}
              onDelete={onDelete}
              isLast={isLast}
            />
          );
        })}
      </div>
    </div>
  );
}

interface CheckInHistoryProps {
  refreshKey: number;
  missions?: MissionSummary[];
}

export default function CheckInHistory({ refreshKey, missions = [] }: CheckInHistoryProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const missionMap = new Map(missions.map((m) => [m.id, m.title]));

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/check-ins');
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshKey;
    fetchHistory();
  }, [fetchHistory, refreshKey]);

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading history"
        className="flex items-center justify-center gap-3 py-4"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={`skeleton-${i}`}
            className="h-3 w-3 rounded-full animate-pulse"
            style={{ background: '#C4A060', opacity: 0.3 }}
          />
        ))}
      </div>
    );
  }

  if (entries.length === 0) return null;

  const grouped = groupByDate(entries);

  return (
    <div className="space-y-2">
      <button
        data-drag-handle
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card/80 px-4 py-3 transition-colors hover:bg-card"
      >
        <p className="text-[13px] font-normal tracking-[0.08em] text-muted-foreground font-serif">
          Recent Reflections
        </p>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="space-y-6 pt-2">
          {[...grouped.entries()].map(([dateKey, dayEntries]) => (
            <DateGroup
              key={dateKey}
              dayEntries={dayEntries}
              missionMap={missionMap}
              onUpdate={(updated) =>
                setEntries((prev) => prev.map((e) => (e.id === updated.id ? updated : e)))
              }
              onDelete={(id) => setEntries((prev) => prev.filter((e) => e.id !== id))}
            />
          ))}

          <CheckInAnalysis hasEntries={entries.length > 0} />
        </div>
      )}
    </div>
  );
}
