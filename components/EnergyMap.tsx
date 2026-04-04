'use client';

import { useEffect, useRef, useState } from 'react';

interface CheckIn {
  id: string;
  sliderValue: number;
  emotionColor: string | null;
  emotionName: string | null;
  createdAt: string;
}

function _getDotColor(value: number): string {
  if (value <= 25) return 'hsl(220 15% 55%)';
  if (value <= 62) return 'hsl(40 15% 55%)';
  return 'hsl(25 70% 55%)';
}

interface EnergyEntry {
  time: string;
  duration: number;
  activity: string;
  energy: number;
  tag: 'good' | 'drop' | null;
  note: string;
  color?: string;
  category?: string;
}

const _ENERGY_COLORS = [
  '#D08040',
  '#C88C48',
  '#C49850',
  '#C4A048',
  '#A8AC58',
  '#90B060',
  '#80B868',
];
const _ENERGY_LABELS = ['Empty', 'Low', 'Tired', 'OK', 'Good', 'High', 'Peak'];
const ACTIVITY_COLORS: Record<string, string> = {
  'Morning walk': '#80B868',
  Yoga: '#90B0D0',
  'Focus zone': '#C88820',
  'Music zone': '#9B6BA0',
  Stretch: '#7AAA58',
  Nap: '#A8C8E0',
  Meal: '#E0844A',
  'Energy down': '#D08040',
  'Energy up': '#80B868',
};
const PRESETS = Object.keys(ACTIVITY_COLORS);
const COLOR_PALETTE = [
  '#80B868',
  '#7AAA58',
  '#90B0D0',
  '#A8C8E0',
  '#C88820',
  '#E0844A',
  '#D4605A',
  '#9B6BA0',
  '#D08040',
  '#C4A060',
  '#5A7A8A',
  '#3AA8A0',
];
const CATEGORY_COLORS: Record<string, string> = {
  Movement: '#80B868',
  Focus: '#C88820',
  Creative: '#9B6BA0',
  Rest: '#A8C8E0',
  Social: '#3A8AC4',
  Fuel: '#E0844A',
  Routine: '#C4A060',
};
const CATEGORIES = ['Movement', 'Focus', 'Creative', 'Rest', 'Social', 'Fuel', 'Routine'];
const HOURS = [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22];

function nowTime(): string {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function todayKey(): string {
  return `energy_map_${new Date().toISOString().split('T')[0]}`;
}

function _timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function getActivityColor(activity: string, customColor?: string, category?: string): string {
  return (
    customColor || ACTIVITY_COLORS[activity] || (category && CATEGORY_COLORS[category]) || '#C4A060'
  );
}

export default function EnergyMap() {
  const [viewMode, setViewMode] = useState<'list' | 'energy'>('list');
  const [entries, setEntries] = useState<EnergyEntry[]>([]);
  const [adding, setAdding] = useState(false);
  const [time, setTime] = useState(nowTime());
  const [duration, setDuration] = useState(1);
  const [activity, setActivity] = useState('');
  const [energy, setEnergy] = useState(3);
  const [tag, setTag] = useState<'good' | 'drop' | null>(null);
  const [entryNote, setEntryNote] = useState('');
  const [foods, setFoods] = useState<string[]>([]);
  const [newFood, setNewFood] = useState('');
  const [_foodsOpen, _setFoodsOpen] = useState(false);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [paintStart, setPaintStart] = useState<number | null>(null);
  const [paintEnd, setPaintEnd] = useState<number | null>(null);
  const isPainting = useRef(false);

  const [checkIns, setCheckIns] = useState<CheckIn[]>([]);

  const key = todayKey();
  const foodsKey = 'energy_foods_avoid';

  useEffect(() => {
    fetch('/api/check-ins')
      .then((r) => (r.ok ? r.json() : []))
      .then((data: CheckIn[]) => {
        const today = new Date().toISOString().split('T')[0];
        setCheckIns(data.filter((ci) => ci.createdAt.startsWith(today)));
      })
      .catch(() => {
        /* silent */
      });
  }, []);

  const checkInsByHour = new Map<number, CheckIn[]>();
  for (const ci of checkIns) {
    const h = new Date(ci.createdAt).getHours();
    const list = checkInsByHour.get(h) || [];
    list.push(ci);
    checkInsByHour.set(h, list);
  }

  useEffect(() => {
    fetch('/api/life-scan-answers')
      .then((r) => (r.ok ? r.json() : { answers: {} }))
      .then((d) => {
        try {
          setEntries(JSON.parse(d.answers?.[key] || '[]'));
        } catch {
          /* */
        }
        try {
          setFoods(JSON.parse(d.answers?.[foodsKey] || '[]'));
        } catch {
          /* */
        }
      })
      .catch(() => {
        /* silent */
      });
  }, [key]);

  function save(updated: EnergyEntry[]) {
    setEntries(updated);
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      fetch('/api/life-scan-answers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers: { [key]: JSON.stringify(updated) } }),
      });
    }, 300);
  }

  function addEntry() {
    if (!activity.trim()) return;
    const entry: EnergyEntry = {
      time,
      duration,
      activity: activity.trim(),
      energy,
      tag,
      note: entryNote.trim(),
    };
    const updated = [...entries, entry].sort((a, b) => a.time.localeCompare(b.time));
    save(updated);
    setActivity('');
    setEntryNote('');
    setEnergy(3);
    setTag(null);
    setDuration(1);
    setTime(nowTime());
    setAdding(false);
  }

  function removeEntry(idx: number) {
    save(entries.filter((_, i) => i !== idx));
  }

  function saveFoods(updated: string[]) {
    setFoods(updated);
    fetch('/api/life-scan-answers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answers: { [foodsKey]: JSON.stringify(updated) } }),
    });
  }

  function _addFood() {
    if (!newFood.trim() || foods.includes(newFood.trim())) return;
    saveFoods([...foods, newFood.trim()]);
    setNewFood('');
  }

  // Map entries by hour — an entry can span multiple hours
  const entriesByHour = new Map<
    number,
    { entry: EnergyEntry; idx: number; isStart: boolean; isEnd: boolean }[]
  >();
  for (let i = 0; i < entries.length; i++) {
    const e = entries[i];
    const startH = parseInt(e.time.split(':')[0], 10);
    const dur = e.duration || 1;
    for (let d = 0; d < dur; d++) {
      const h = startH + d;
      const list = entriesByHour.get(h) || [];
      list.push({ entry: e, idx: i, isStart: d === 0, isEnd: d === dur - 1 });
      entriesByHour.set(h, list);
    }
  }

  const currentHour = new Date().getHours();
  const [showAllHours, setShowAllHours] = useState(false);
  const [dragIdx, setDragIdx] = useState<number | null>(null);
  const [dropHour, setDropHour] = useState<number | null>(null);
  const [_resizingIdx, setResizingIdx] = useState<number | null>(null);
  const [selectedIdx, setSelectedIdx] = useState<number | null>(null);
  const resizeStartY = useRef<number>(0);
  const resizeStartDur = useRef<number>(1);
  const ROW_HEIGHT = 30;

  function handleResizeStart(idx: number, clientY: number) {
    setResizingIdx(idx);
    resizeStartY.current = clientY;
    resizeStartDur.current = entries[idx].duration || 1;

    function onMove(e: MouseEvent | TouchEvent) {
      const y = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const delta = Math.round((y - resizeStartY.current) / ROW_HEIGHT);
      const newDur = Math.max(1, resizeStartDur.current + delta);
      setEntries((prev) => {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], duration: newDur };
        return updated;
      });
    }

    function onEnd() {
      setResizingIdx(null);
      // Save final state
      setEntries((prev) => {
        save(prev);
        return prev;
      });
      document.removeEventListener('mousemove', onMove);
      document.removeEventListener('mouseup', onEnd);
      document.removeEventListener('touchmove', onMove);
      document.removeEventListener('touchend', onEnd);
    }

    document.addEventListener('mousemove', onMove);
    document.addEventListener('mouseup', onEnd);
    document.addEventListener('touchmove', onMove, { passive: false });
    document.addEventListener('touchend', onEnd);
  }

  function handleDropOnHour(h: number) {
    if (dragIdx === null) return;
    const updated = [...entries];
    const entry = { ...updated[dragIdx] };
    // Keep same minutes, change hour
    const mins = entry.time.split(':')[1] || '00';
    entry.time = `${String(h).padStart(2, '0')}:${mins}`;
    updated[dragIdx] = entry;
    updated.sort((a, b) => a.time.localeCompare(b.time));
    save(updated);
    setDragIdx(null);
    setDropHour(null);
  }

  function handlePaintStart(h: number) {
    isPainting.current = true;
    setPaintStart(h);
    setPaintEnd(h);
  }

  function handlePaintMove(h: number) {
    if (!isPainting.current || paintStart === null) return;
    setPaintEnd(h);
  }

  function handlePaintEnd() {
    if (!isPainting.current || paintStart === null || paintEnd === null) {
      isPainting.current = false;
      setPaintStart(null);
      setPaintEnd(null);
      return;
    }
    isPainting.current = false;
    const startH = Math.min(paintStart, paintEnd);
    const endH = Math.max(paintStart, paintEnd);
    const newDuration = endH - startH + 1;
    setTime(`${String(startH).padStart(2, '0')}:00`);
    setDuration(newDuration);
    setAdding(true);
    setPaintStart(null);
    setPaintEnd(null);
  }

  const paintMin = paintStart !== null && paintEnd !== null ? Math.min(paintStart, paintEnd) : null;
  const paintMax = paintStart !== null && paintEnd !== null ? Math.max(paintStart, paintEnd) : null;

  useEffect(() => {
    function onGlobalMouseUp() {
      if (isPainting.current) handlePaintEnd();
    }
    document.addEventListener('mouseup', onGlobalMouseUp);
    return () => document.removeEventListener('mouseup', onGlobalMouseUp);
  });

  // Build energy strip data
  const energyStrip = HOURS.map((h) => {
    const hourItems = entriesByHour.get(h) || [];
    const startItems = hourItems.filter((i) => i.isStart);
    if (startItems.length > 0) {
      const e = startItems[0].entry;
      return {
        hour: h,
        activity: e.activity,
        color: getActivityColor(e.activity, e.color, e.category),
        filled: true,
      };
    }
    const contItems = hourItems.filter((i) => !i.isStart);
    if (contItems.length > 0) {
      const e = contItems[0].entry;
      return {
        hour: h,
        activity: e.activity,
        color: getActivityColor(e.activity, e.color, e.category),
        filled: true,
      };
    }
    return { hour: h, activity: '', color: '#C4A06010', filled: false };
  }).filter(
    (h) =>
      h.hour <=
      Math.max(
        currentHour + 2,
        entries.reduce(
          (max, e) => Math.max(max, parseInt(e.time.split(':')[0], 10) + (e.duration || 1) - 1),
          0,
        ) + 1,
      ),
  );

  return (
    <div className="space-y-2">
      {/* View toggle */}
      <div className="flex justify-end gap-1">
        <button
          type="button"
          onClick={() => setViewMode('list')}
          className="text-[9px] px-2 py-0.5 rounded-full transition-all"
          style={{
            background: viewMode === 'list' ? '#C4A06020' : 'transparent',
            color: viewMode === 'list' ? '#5C3018' : '#5C301840',
          }}
        >
          List
        </button>
        <button
          type="button"
          onClick={() => setViewMode('energy')}
          className="text-[9px] px-2 py-0.5 rounded-full transition-all"
          style={{
            background: viewMode === 'energy' ? '#C4A06020' : 'transparent',
            color: viewMode === 'energy' ? '#5C3018' : '#5C301840',
          }}
        >
          Energy
        </button>
      </div>

      {/* Add — input */}
      <div className="flex gap-2 items-center">
        <input
          type="text"
          value={activity}
          onChange={(e) => setActivity(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && activity.trim()) addEntry();
          }}
          onFocus={() => setAdding(true)}
          placeholder={`${nowTime()}  What are you doing?`}
          className="flex-1 rounded-lg border border-border bg-background/60 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/40"
        />
        {adding && (
          <input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            className="bg-transparent text-[11px] text-muted-foreground outline-none w-14 text-right"
          />
        )}
        {activity.trim() && (
          <button
            type="button"
            onClick={addEntry}
            className="text-xs font-medium shrink-0"
            style={{ color: '#5C3018' }}
          >
            Add
          </button>
        )}
      </div>

      {/* Presets + category — show when focused */}
      {adding && !activity.trim() && (
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => setActivity(preset)}
              className="rounded-full px-2.5 py-1 text-[10px] whitespace-nowrap transition-all shrink-0"
              style={{
                color: `${getActivityColor(preset)}90`,
                border: `1px solid ${getActivityColor(preset)}20`,
              }}
            >
              {preset}
            </button>
          ))}
        </div>
      )}
      {adding && activity.trim() && (
        <div className="flex gap-1 overflow-x-auto scrollbar-none">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => {
                // Set category on add — store temporarily
                const _updated = [...entries];
                // Just visual hint for now
              }}
              className="rounded-full px-2.5 py-0.5 text-[9px] font-medium whitespace-nowrap shrink-0 transition-all"
              style={{
                color: CATEGORY_COLORS[cat],
                background: `${CATEGORY_COLORS[cat]}10`,
                border: `1px solid ${CATEGORY_COLORS[cat]}30`,
              }}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {/* Energy strip view */}
      {viewMode === 'energy' &&
        (() => {
          // Build mountain data — each hour gets stacked layers of activities
          const _mountainHeight = 80;
          const layerHeight = 16;
          const hours = energyStrip;
          const width = hours.length;

          // Get unique activities in order of first appearance
          const activityOrder: string[] = [];
          const activityColors: Record<string, string> = {};
          for (const e of entries) {
            if (!activityOrder.includes(e.activity)) {
              activityOrder.push(e.activity);
              activityColors[e.activity] = getActivityColor(e.activity, e.color, e.category);
            }
          }

          // For each hour, determine which activities are active
          const hourLayers: { activity: string; color: string }[][] = hours.map((seg) => {
            if (!seg.filled) return [];
            const hourItems = entriesByHour.get(seg.hour) || [];
            const layers: { activity: string; color: string }[] = [];
            for (const item of hourItems) {
              const act = item.entry.activity;
              const color = getActivityColor(act, item.entry.color, item.entry.category);
              if (!layers.some((l) => l.activity === act)) {
                layers.push({ activity: act, color });
              }
            }
            return layers;
          });

          // Max layers for scaling
          const maxLayers = Math.max(1, ...hourLayers.map((l) => l.length));
          const svgHeight = maxLayers * layerHeight + 8;

          // Build SVG paths — one path per activity layer, using smooth curves
          const paths: { activity: string; color: string; d: string }[] = [];
          for (let layerIdx = 0; layerIdx < maxLayers; layerIdx++) {
            // For each hour, get the color at this layer level
            const segments: { x: number; color: string; active: boolean }[] = hours.map((_, hi) => {
              const layers = hourLayers[hi];
              if (layerIdx < layers.length) {
                return { x: hi, color: layers[layerIdx].color, active: true };
              }
              return { x: hi, color: '#C4A06008', active: false };
            });

            // Group consecutive active segments by same color
            let i = 0;
            while (i < segments.length) {
              if (!segments[i].active) {
                i++;
                continue;
              }
              const color = segments[i].color;
              const startX = i;
              while (i < segments.length && segments[i].active && segments[i].color === color) i++;
              const endX = i - 1;

              const yBottom = svgHeight;
              const yTop = svgHeight - (layerIdx + 1) * layerHeight;

              // Smooth mountain shape
              const x1 = (startX / width) * 100;
              const x2 = ((endX + 1) / width) * 100;
              const xMid = (x1 + x2) / 2;
              const peakY = yTop - 4; // slight peak

              paths.push({
                activity: '',
                color,
                d: `M ${x1} ${yBottom} Q ${x1} ${yTop} ${xMid} ${peakY} Q ${x2} ${yTop} ${x2} ${yBottom} Z`,
              });
            }
          }

          return (
            <div className="space-y-2">
              {/* Mountain SVG */}
              <svg
                viewBox={`0 0 100 ${svgHeight}`}
                className="w-full"
                style={{ height: svgHeight }}
                preserveAspectRatio="none"
              >
                {paths.map((p, i) => (
                  <path key={i} d={p.d} fill={p.color} opacity={0.55} />
                ))}
                {/* Current hour marker */}
                {(() => {
                  const cidx = hours.findIndex((h) => h.hour === currentHour);
                  if (cidx < 0) return null;
                  const cx = ((cidx + 0.5) / width) * 100;
                  return (
                    <line
                      x1={cx}
                      y1={0}
                      x2={cx}
                      y2={svgHeight}
                      stroke="#D4605A"
                      strokeWidth={0.3}
                      opacity={0.5}
                    />
                  );
                })()}
              </svg>
              {/* Hour labels */}
              <div className="flex">
                {hours.map((seg) => (
                  <div key={seg.hour} className="flex-1 text-center">
                    <span
                      className="text-[8px]"
                      style={{ color: seg.hour === currentHour ? '#D4605A' : '#5C301825' }}
                    >
                      {seg.hour}
                    </span>
                  </div>
                ))}
              </div>
              {/* Legend */}
              <div className="flex flex-wrap gap-2 pt-1">
                {activityOrder.map((name) => (
                  <div key={name} className="flex items-center gap-1">
                    <div
                      className="h-2 w-2 rounded-sm"
                      style={{ background: activityColors[name], opacity: 0.6 }}
                    />
                    <span className="text-[9px] text-muted-foreground/50">{name}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

      {/* Full day list view */}
      {viewMode === 'list' &&
        (() => {
          const lastEntryHour = entries.reduce((max, e) => {
            const h = parseInt(e.time.split(':')[0], 10) + (e.duration || 1) - 1;
            return Math.max(max, h);
          }, 0);
          const cutoff = Math.max(currentHour + 2, lastEntryHour + 1);
          const visibleHours = showAllHours ? HOURS : HOURS.filter((h) => h <= cutoff);
          const hiddenCount = HOURS.length - visibleHours.length;
          return (
            <>
              <div className="flex">
                {/* Time labels — left */}
                <div className="w-8 shrink-0">
                  {visibleHours.map((h) => {
                    const isCurrent = h === currentHour;
                    const hasEntries = (entriesByHour.get(h) || []).length > 0;
                    return (
                      <div
                        key={h}
                        className="flex items-start justify-end pr-2"
                        style={{ minHeight: hasEntries ? 30 : 20 }}
                      >
                        <span
                          className={`text-[10px] pt-1 ${isCurrent ? 'font-bold' : 'font-medium'}`}
                          style={{ color: isCurrent ? '#D4605A' : '#5C301835' }}
                        >
                          {h}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Entries column */}
                <div className="flex-1 border-l" style={{ borderColor: '#C4A06010' }}>
                  {visibleHours.map((h) => {
                    const hourEntries = entriesByHour.get(h) || [];
                    const isCurrent = h === currentHour;
                    const isDropTarget = dropHour === h && dragIdx !== null;
                    const isEmpty = hourEntries.length === 0;
                    const isPaintTarget =
                      paintMin !== null && paintMax !== null && h >= paintMin && h <= paintMax;
                    const hasContinuation = hourEntries.some(
                      (item) => !item.isEnd && (item.isStart || !item.isEnd),
                    );
                    const isContinuation = hourEntries.some((item) => !item.isStart);
                    return (
                      <div
                        key={h}
                        className={`transition-colors select-none relative ${hasContinuation || isContinuation ? '' : 'border-b'} ${isDropTarget ? 'bg-[#C4A06010]' : ''} ${isPaintTarget ? 'bg-[#C4A06018]' : ''}`}
                        style={{
                          minHeight: isEmpty ? 20 : 30,
                          borderColor: isPaintTarget ? '#C4A06020' : '#C4A06006',
                          opacity: h > currentHour + 2 ? 0.2 : 1,
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          setDropHour(h);
                        }}
                        onDrop={() => handleDropOnHour(h)}
                        onMouseDown={(e) => {
                          if (isEmpty && e.button === 0) {
                            e.preventDefault();
                            handlePaintStart(h);
                          }
                        }}
                        onMouseEnter={() => handlePaintMove(h)}
                        onMouseUp={() => {
                          if (isPainting.current) {
                            handlePaintEnd();
                          }
                        }}
                        onClick={() => {
                          if (isEmpty && !adding && !isPainting.current && paintStart === null) {
                            setActivity('');
                            setTime(`${String(h).padStart(2, '0')}:00`);
                            setDuration(1);
                            setAdding(true);
                          }
                        }}
                      >
                        {isCurrent && (
                          <div
                            className="absolute top-0 left-0 right-0 h-px"
                            style={{ background: '#D4605A40' }}
                          />
                        )}
                        <div
                          className={`flex flex-wrap gap-1 py-0.5 ${isEmpty ? 'min-h-[20px]' : 'min-h-[30px]'}`}
                        >
                          {hourEntries.map((item, ei) => {
                            const { entry: e, idx: globalIdx, isStart, isEnd } = item;
                            const color = getActivityColor(e.activity, e.color, e.category);
                            const isDragging = dragIdx === globalIdx;
                            const isSelected = selectedIdx === globalIdx;
                            const dur = e.duration || 1;

                            if (!isStart) {
                              return (
                                <div
                                  key={ei}
                                  className={`flex-1 min-h-[28px] ${isEnd ? 'rounded-b-lg' : ''}`}
                                  style={{
                                    background: `${color}10`,
                                    borderTop: 'none',
                                  }}
                                />
                              );
                            }

                            return (
                              <div
                                key={ei}
                                draggable
                                onDragStart={() => setDragIdx(globalIdx)}
                                onDragEnd={() => {
                                  setDragIdx(null);
                                  setDropHour(null);
                                }}
                                className={`flex-1 group cursor-grab active:cursor-grabbing ${isDragging ? 'opacity-30' : ''}`}
                              >
                                <div
                                  className={`overflow-hidden transition-all ${isSelected ? 'ring-1' : ''} ${dur > 1 ? 'rounded-t-lg' : 'rounded-lg'}`}
                                  style={{
                                    background: `${color}15`,
                                    outline: isSelected ? `1px solid ${color}40` : 'none',
                                  }}
                                  onClick={(ev) => {
                                    ev.stopPropagation();
                                    setSelectedIdx(isSelected ? null : globalIdx);
                                  }}
                                >
                                  <div className="px-3 pt-1.5 pb-1">
                                    <div className="flex items-center justify-between">
                                      {isSelected ? (
                                        <input
                                          type="text"
                                          value={e.activity}
                                          onChange={(ev) => {
                                            const updated = [...entries];
                                            updated[globalIdx] = {
                                              ...updated[globalIdx],
                                              activity: ev.target.value,
                                            };
                                            setEntries(updated);
                                          }}
                                          onBlur={() => save(entries)}
                                          onKeyDown={(ev) => {
                                            if (ev.key === 'Enter')
                                              (ev.target as HTMLInputElement).blur();
                                          }}
                                          onClick={(ev) => ev.stopPropagation()}
                                          className="text-[11px] font-semibold bg-transparent outline-none border-b flex-1"
                                          style={{ color, borderColor: `${color}30` }}
                                        />
                                      ) : (
                                        <span
                                          className="text-[11px] font-semibold"
                                          style={{ color }}
                                        >
                                          {e.activity}
                                        </span>
                                      )}
                                      {isSelected && (
                                        <button
                                          type="button"
                                          onClick={(ev) => {
                                            ev.stopPropagation();
                                            setSelectedIdx(null);
                                          }}
                                          className="text-[10px] text-muted-foreground/40 hover:text-muted-foreground ml-2 shrink-0"
                                        >
                                          ✕
                                        </button>
                                      )}
                                      <div className="flex items-center gap-1.5">
                                        {e.category && (
                                          <span className="text-[8px] text-muted-foreground/40">
                                            {e.category}
                                          </span>
                                        )}
                                        {e.tag === 'good' && (
                                          <span className="text-[9px]" style={{ color: '#80B868' }}>
                                            ✦
                                          </span>
                                        )}
                                        {e.tag === 'drop' && (
                                          <span className="text-[9px]" style={{ color: '#D08040' }}>
                                            ▾
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    {isSelected ? (
                                      <input
                                        type="text"
                                        value={e.note}
                                        onChange={(ev) => {
                                          const updated = [...entries];
                                          updated[globalIdx] = {
                                            ...updated[globalIdx],
                                            note: ev.target.value,
                                          };
                                          setEntries(updated);
                                        }}
                                        onBlur={() => save(entries)}
                                        onKeyDown={(ev) => {
                                          if (ev.key === 'Enter')
                                            (ev.target as HTMLInputElement).blur();
                                        }}
                                        onClick={(ev) => ev.stopPropagation()}
                                        placeholder="Add a note..."
                                        className="text-[9px] text-muted-foreground/60 italic mt-0.5 bg-transparent outline-none w-full placeholder:text-muted-foreground/25"
                                      />
                                    ) : (
                                      e.note && (
                                        <p className="text-[9px] text-muted-foreground/40 italic mt-0.5">
                                          {e.note}
                                        </p>
                                      )
                                    )}
                                  </div>

                                  {/* Edit panel — shows when selected */}
                                  {isSelected && (
                                    <div
                                      className="px-3 pb-2 space-y-2 animate-in fade-in duration-150"
                                      onClick={(ev) => ev.stopPropagation()}
                                    >
                                      {/* Color picker */}
                                      <div className="flex items-center gap-1.5">
                                        {COLOR_PALETTE.map((c) => (
                                          <button
                                            key={c}
                                            type="button"
                                            onClick={() => {
                                              const updated = [...entries];
                                              updated[globalIdx] = {
                                                ...updated[globalIdx],
                                                color: c,
                                              };
                                              save(updated);
                                            }}
                                            className="transition-transform hover:scale-125"
                                            style={{
                                              width: 14,
                                              height: 14,
                                              borderRadius: 3,
                                              background: c,
                                              opacity: e.color === c ? 1 : 0.4,
                                              outline: e.color === c ? `2px solid ${c}` : 'none',
                                              outlineOffset: 1,
                                            }}
                                          />
                                        ))}
                                      </div>

                                      {/* Category */}
                                      <div className="flex flex-wrap gap-1">
                                        {CATEGORIES.map((cat) => (
                                          <button
                                            key={cat}
                                            type="button"
                                            onClick={() => {
                                              const updated = [...entries];
                                              updated[globalIdx] = {
                                                ...updated[globalIdx],
                                                category: e.category === cat ? undefined : cat,
                                              };
                                              save(updated);
                                            }}
                                            className="rounded-full px-2.5 py-0.5 text-[9px] font-medium transition-all"
                                            style={{
                                              background:
                                                e.category === cat
                                                  ? `${CATEGORY_COLORS[cat]}20`
                                                  : `${CATEGORY_COLORS[cat]}06`,
                                              color:
                                                e.category === cat
                                                  ? CATEGORY_COLORS[cat]
                                                  : `${CATEGORY_COLORS[cat]}70`,
                                              border: `1px solid ${e.category === cat ? `${CATEGORY_COLORS[cat]}35` : `${CATEGORY_COLORS[cat]}15`}`,
                                            }}
                                          >
                                            {cat}
                                          </button>
                                        ))}
                                      </div>

                                      {/* Tags + delete */}
                                      <div className="flex items-center justify-between">
                                        <div className="flex gap-1.5">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [...entries];
                                              updated[globalIdx] = {
                                                ...updated[globalIdx],
                                                tag: e.tag === 'good' ? null : 'good',
                                              };
                                              save(updated);
                                            }}
                                            className="rounded-full px-2 py-0.5 text-[9px]"
                                            style={{
                                              color: e.tag === 'good' ? '#80B868' : '#80B86850',
                                              background:
                                                e.tag === 'good' ? '#80B86815' : 'transparent',
                                            }}
                                          >
                                            ✦ works
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const updated = [...entries];
                                              updated[globalIdx] = {
                                                ...updated[globalIdx],
                                                tag: e.tag === 'drop' ? null : 'drop',
                                              };
                                              save(updated);
                                            }}
                                            className="rounded-full px-2 py-0.5 text-[9px]"
                                            style={{
                                              color: e.tag === 'drop' ? '#D08040' : '#D0804050',
                                              background:
                                                e.tag === 'drop' ? '#D0804015' : 'transparent',
                                            }}
                                          >
                                            ▾ drops
                                          </button>
                                        </div>
                                        <button
                                          type="button"
                                          onClick={() => {
                                            removeEntry(globalIdx);
                                            setSelectedIdx(null);
                                          }}
                                          className="text-[9px] text-muted-foreground/40 hover:text-destructive transition-colors"
                                        >
                                          delete
                                        </button>
                                      </div>
                                    </div>
                                  )}

                                  {/* Drag resize handle */}
                                  <div
                                    className="h-2 cursor-ns-resize flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                    style={{ background: `${color}08` }}
                                    onMouseDown={(ev) => {
                                      ev.stopPropagation();
                                      ev.preventDefault();
                                      handleResizeStart(globalIdx, ev.clientY);
                                    }}
                                    onTouchStart={(ev) => {
                                      ev.stopPropagation();
                                      handleResizeStart(globalIdx, ev.touches[0].clientY);
                                    }}
                                  >
                                    <div className="flex gap-[3px]">
                                      <div
                                        className="h-[4px] w-[4px] rounded-full"
                                        style={{ background: '#E0844A', opacity: 0.4 }}
                                      />
                                      <div
                                        className="h-[4px] w-[4px] rounded-full"
                                        style={{ background: '#E0844A', opacity: 0.4 }}
                                      />
                                      <div
                                        className="h-[4px] w-[4px] rounded-full"
                                        style={{ background: '#E0844A', opacity: 0.4 }}
                                      />
                                    </div>
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
              {hiddenCount > 0 && (
                <button
                  type="button"
                  onClick={() => setShowAllHours(!showAllHours)}
                  className="w-full text-[10px] text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors py-1 text-center"
                >
                  {showAllHours ? 'Show less' : `${hiddenCount} more hours`}
                </button>
              )}
            </>
          );
        })()}
    </div>
  );
}
