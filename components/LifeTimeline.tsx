'use client';

import { useEffect, useRef, useState } from 'react';

interface LifeEvent {
  id: string;
  year: number;
  title: string;
  note: string;
  color: string;
  category: string;
}

const EVENT_COLORS = [
  { id: 'great', color: '#7AAA58', label: 'Great' },
  { id: 'good', color: '#C88820', label: 'Good' },
  { id: 'neutral', color: '#C4A060', label: 'Neutral' },
  { id: 'tough', color: '#E0844A', label: 'Tough' },
  { id: 'dark', color: '#D45050', label: 'Dark' },
];

const EVENT_CATEGORIES = [
  { id: 'life', label: 'Life', color: '#9B6BA0' },
  { id: 'work', label: 'Work', color: '#C88820' },
  { id: 'love', label: 'Love', color: '#D4605A' },
  { id: 'creative', label: 'Creative', color: '#3A8AC4' },
  { id: 'health', label: 'Health', color: '#7AAA58' },
  { id: 'travel', label: 'Travel', color: '#3AA8A0' },
  { id: 'loss', label: 'Loss', color: '#5A7A8A' },
  { id: 'growth', label: 'Growth', color: '#E0844A' },
];

const STORAGE_KEY = 'colourmap:life-timeline';

function loadEvents(): LifeEvent[] {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return JSON.parse(saved);
  } catch {
    /* */
  }
  return [];
}

export default function LifeTimeline() {
  const [events, setEvents] = useState<LifeEvent[]>([]);
  const [orientation, setOrientation] = useState<'vertical' | 'horizontal'>('horizontal');
  const [addingYear, setAddingYear] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newNote, setNewNote] = useState('');
  const [newColor, setNewColor] = useState('good');
  const [newCategory, setNewCategory] = useState('life');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [birthYear, setBirthYear] = useState(1995);
  const [showSettings, setShowSettings] = useState(false);
  const dragId = useRef<string | null>(null);
  const [dropYear, setDropYear] = useState<number | null>(null);
  const [yearWidth, setYearWidth] = useState(56);
  const [showAllYears, setShowAllYears] = useState(false);

  useEffect(() => {
    setEvents(loadEvents());
    const savedBirth = localStorage.getItem('colourmap:birth-year');
    if (savedBirth) setBirthYear(Number.parseInt(savedBirth, 10));
  }, []);

  function save(updated: LifeEvent[]) {
    setEvents(updated);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  }

  function addEvent() {
    if (!newTitle.trim() || addingYear === null) return;
    const colorObj = EVENT_COLORS.find((c) => c.id === newColor) || EVENT_COLORS[1];
    const event: LifeEvent = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      year: addingYear,
      title: newTitle.trim(),
      note: newNote.trim(),
      color: colorObj.color,
      category: newCategory,
    };
    save([...events, event].sort((a, b) => a.year - b.year));
    setNewTitle('');
    setNewNote('');
    setNewColor('good');
    setAddingYear(null);
    setExpandedId(event.id);
  }

  function deleteEvent(id: string) {
    save(events.filter((e) => e.id !== id));
    if (expandedId === id) setExpandedId(null);
  }

  function handleDropOnYear(year: number) {
    if (!dragId.current) return;
    const updated = events
      .map((e) => (e.id === dragId.current ? { ...e, year } : e))
      .sort((a, b) => a.year - b.year);
    save(updated);
    dragId.current = null;
    setDropYear(null);
  }

  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - birthYear + 1 }, (_, i) => birthYear + i);

  const eventsByYear = new Map<number, LifeEvent[]>();
  for (const e of events) {
    const list = eventsByYear.get(e.year) || [];
    list.push(e);
    eventsByYear.set(e.year, list);
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground/50 uppercase tracking-widest">Life Map</p>
        <div className="flex items-center gap-3">
          {/* Quick add — always visible */}
          <button
            type="button"
            onClick={() => setAddingYear(addingYear !== null ? null : currentYear)}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
            style={{
              color: addingYear !== null ? '#5C3018' : '#C4A06080',
              background: addingYear !== null ? '#5C301810' : 'transparent',
              border: '1px solid #C4A06015',
            }}
          >
            {addingYear !== null ? 'close' : '+ add memory'}
          </button>
          <button
            type="button"
            onClick={() => setShowSettings(!showSettings)}
            className="text-[11px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
          >
            {showSettings ? 'done' : 'years'}
          </button>
          <div className="flex gap-0.5 rounded-lg overflow-hidden border border-border/30">
            {(['vertical', 'horizontal'] as const).map((o) => (
              <button
                key={o}
                type="button"
                onClick={() => setOrientation(o)}
                className="text-[11px] px-3 py-1 transition-all"
                style={{
                  background: orientation === o ? '#C4A06020' : 'transparent',
                  color: orientation === o ? '#5C3018' : '#5C301830',
                }}
              >
                {o === 'vertical' ? 'V' : 'H'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Settings — birth year */}
      {showSettings && (
        <div className="flex items-center gap-4 px-3 py-3 rounded-xl border border-border/30 animate-in fade-in duration-150">
          <span className="text-xs text-muted-foreground/50">Born in</span>
          <input
            type="number"
            value={birthYear}
            min={1920}
            max={currentYear}
            onChange={(e) => {
              const v = Number.parseInt(e.target.value, 10);
              if (v >= 1920 && v <= currentYear) {
                setBirthYear(v);
                localStorage.setItem('colourmap:birth-year', String(v));
              }
            }}
            className="w-20 rounded-lg border border-border/30 bg-transparent px-3 py-1.5 text-sm text-center outline-none"
          />
          <span className="text-xs text-muted-foreground/30">{currentYear - birthYear} years</span>
        </div>
      )}

      {/* === VERTICAL MODE === */}
      {orientation === 'vertical' && (
        <div className="space-y-0">
          {[...years]
            .reverse()
            .filter(
              (year) =>
                showAllYears || year === currentYear || (eventsByYear.get(year) || []).length > 0,
            )
            .map((year) => {
              const yearEvents = eventsByYear.get(year) || [];
              const isAdding = addingYear === year;
              const isCurrent = year === currentYear;
              const age = year - birthYear;
              const hasEvents = yearEvents.length > 0;

              return (
                <div
                  key={year}
                  className={`flex gap-4 group/year ${dropYear === year ? 'bg-[#C4A06010]' : ''}`}
                  onDragOver={(e) => {
                    e.preventDefault();
                    setDropYear(year);
                  }}
                  onDrop={() => handleDropOnYear(year)}
                >
                  {/* Year label + timeline spine */}
                  <div className="flex flex-col items-center w-14 shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span
                        className="text-sm font-medium tabular-nums"
                        style={{
                          color: isCurrent ? '#D4605A' : hasEvents ? '#5C301880' : '#5C301820',
                        }}
                      >
                        {year}
                      </span>
                      <span className="text-[10px] text-muted-foreground/25">{age}</span>
                    </div>
                    <div
                      className="flex-1 w-px min-h-[20px]"
                      style={{ background: hasEvents ? '#C4A06030' : '#C4A06008' }}
                    />
                  </div>

                  {/* Content area */}
                  <div className="flex-1 pb-2 min-h-[36px] flex items-start gap-2 flex-wrap pt-0.5">
                    {/* Event pills */}
                    {yearEvents.map((event) => {
                      const isExpanded = expandedId === event.id;
                      const catObj = EVENT_CATEGORIES.find((c) => c.id === event.category);

                      if (isExpanded) {
                        return (
                          <div
                            key={event.id}
                            className="w-full rounded-2xl border p-4 space-y-3 animate-in fade-in duration-150"
                            style={{
                              borderColor: `${event.color}30`,
                              background: `${event.color}06`,
                            }}
                          >
                            <div className="flex items-start justify-between">
                              <div className="flex items-center gap-2.5">
                                <div
                                  className="h-4 w-4 rounded-full"
                                  style={{ background: event.color, opacity: 0.8 }}
                                />
                                <span
                                  className="text-base font-semibold font-serif"
                                  style={{ color: event.color }}
                                >
                                  {event.title}
                                </span>
                              </div>
                              <button
                                type="button"
                                onClick={() => setExpandedId(null)}
                                className="text-xs text-muted-foreground/30 hover:text-muted-foreground px-1"
                              >
                                x
                              </button>
                            </div>
                            {catObj && (
                              <span
                                className="inline-block text-[10px] px-2.5 py-1 rounded-full"
                                style={{
                                  background: `${catObj.color}15`,
                                  color: catObj.color,
                                  border: `1px solid ${catObj.color}20`,
                                }}
                              >
                                {catObj.label}
                              </span>
                            )}
                            {event.note && (
                              <p className="text-sm text-muted-foreground leading-relaxed">
                                {event.note}
                              </p>
                            )}
                            <div className="flex justify-end pt-2">
                              <button
                                type="button"
                                onClick={() => deleteEvent(event.id)}
                                className="text-[10px] text-muted-foreground/25 hover:text-destructive transition-colors"
                              >
                                delete
                              </button>
                            </div>
                          </div>
                        );
                      }

                      return (
                        <button
                          key={event.id}
                          type="button"
                          onClick={() => setExpandedId(event.id)}
                          draggable
                          onDragStart={() => {
                            dragId.current = event.id;
                          }}
                          onDragEnd={() => {
                            dragId.current = null;
                            setDropYear(null);
                          }}
                          className="flex items-center gap-2 px-3 py-1.5 rounded-xl transition-all hover:scale-[1.02] cursor-grab active:cursor-grabbing"
                          style={{
                            background: `${event.color}10`,
                            border: `1px solid ${event.color}20`,
                          }}
                        >
                          <div
                            className="h-3 w-3 rounded-full shrink-0"
                            style={{ background: event.color, opacity: 0.8 }}
                          />
                          <span
                            className="text-xs font-medium"
                            style={{ color: `${event.color}cc` }}
                          >
                            {event.title}
                          </span>
                        </button>
                      );
                    })}

                    {/* Add button */}
                    {!isAdding && (
                      <button
                        type="button"
                        onClick={() => setAddingYear(year)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] transition-all ${hasEvents ? 'opacity-0 group-hover/year:opacity-100' : 'opacity-30 hover:opacity-60'}`}
                        style={{ color: '#C4A06080', border: '1px dashed #C4A06025' }}
                      >
                        + add
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          {!showAllYears && years.length > 5 && (
            <button
              type="button"
              onClick={() => setShowAllYears(true)}
              className="w-full text-[10px] text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors py-2 text-center"
            >
              Show all {years.length} years
            </button>
          )}
          {showAllYears && (
            <button
              type="button"
              onClick={() => setShowAllYears(false)}
              className="w-full text-[10px] text-muted-foreground/30 hover:text-muted-foreground/50 transition-colors py-2 text-center"
            >
              Show less
            </button>
          )}
        </div>
      )}

      {/* === HORIZONTAL MODE === */}
      {orientation === 'horizontal' && (
        <div className="space-y-2">
          {/* Zoom controls */}
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setYearWidth(Math.max(24, yearWidth - 12))}
              className="h-5 w-5 flex items-center justify-center rounded text-xs text-muted-foreground/40 hover:text-muted-foreground border border-border/30"
            >
              -
            </button>
            <span className="text-[9px] text-muted-foreground/30">
              {yearWidth < 40 ? 'compact' : yearWidth > 64 ? 'wide' : 'normal'}
            </span>
            <button
              type="button"
              onClick={() => setYearWidth(Math.min(100, yearWidth + 12))}
              className="h-5 w-5 flex items-center justify-center rounded text-xs text-muted-foreground/40 hover:text-muted-foreground border border-border/30"
            >
              +
            </button>
          </div>
          <div className="overflow-x-auto pb-3 scrollbar-none">
            <div
              className="flex items-end"
              style={{ minWidth: Math.max(years.length * yearWidth, 400) }}
            >
              {years.map((year) => {
                const yearEvents = eventsByYear.get(year) || [];
                const isAdding = addingYear === year;
                const isCurrent = year === currentYear;
                const hasEvents = yearEvents.length > 0;

                return (
                  <div
                    key={year}
                    className="flex flex-col items-center group/col"
                    style={{ width: yearWidth }}
                  >
                    {/* Color dots stacked — simple */}
                    <div className="flex flex-col-reverse items-center gap-1 mb-1.5 min-h-[12px]">
                      {yearEvents.map((event) => {
                        const isExpanded = expandedId === event.id;
                        return (
                          <div key={event.id} className="relative">
                            <button
                              type="button"
                              onClick={() => setExpandedId(isExpanded ? null : event.id)}
                              className="h-4 w-4 rounded-full transition-all hover:scale-150"
                              style={{ background: event.color, opacity: 0.8 }}
                              title={event.title}
                            />
                            {isExpanded && (
                              <div
                                className="absolute bottom-7 left-1/2 -translate-x-1/2 z-50 w-56 rounded-2xl border border-border bg-card shadow-lg p-4 space-y-2 animate-in fade-in duration-150"
                                style={{ borderColor: `${event.color}30` }}
                              >
                                <div className="flex items-start justify-between">
                                  <div className="flex items-center gap-2">
                                    <div
                                      className="h-3 w-3 rounded-full"
                                      style={{ background: event.color }}
                                    />
                                    <span
                                      className="text-sm font-semibold font-serif"
                                      style={{ color: event.color }}
                                    >
                                      {event.title}
                                    </span>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setExpandedId(null);
                                    }}
                                    className="text-xs text-muted-foreground/30 hover:text-muted-foreground px-1"
                                  >
                                    x
                                  </button>
                                </div>
                                {event.note && (
                                  <p className="text-xs text-muted-foreground leading-relaxed">
                                    {event.note}
                                  </p>
                                )}
                                <div className="flex justify-between">
                                  <span className="text-[10px] text-muted-foreground/30">
                                    {event.year}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => deleteEvent(event.id)}
                                    className="text-[10px] text-muted-foreground/25 hover:text-destructive"
                                  >
                                    delete
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                    {/* Year label */}
                    <div
                      className="w-px h-2"
                      style={{
                        background: isCurrent ? '#D4605A40' : hasEvents ? '#C4A06025' : '#C4A06008',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setAddingYear(isAdding ? null : year)}
                      className="text-[9px] mt-0.5 tabular-nums"
                      style={{
                        color: isCurrent ? '#D4605A' : hasEvents ? '#5C301860' : '#5C301815',
                        fontWeight: isCurrent || hasEvents ? 600 : 400,
                      }}
                    >
                      {year % 5 === 0 || isCurrent || hasEvents ? year : ''}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* === ADD EVENT FORM === */}
      {addingYear !== null && (
        <div className="rounded-xl border border-border/40 p-4 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <p className="text-sm font-serif" style={{ color: '#5C3018' }}>
              {addingYear}{' '}
              <span className="text-[10px] text-muted-foreground/40 ml-1">
                age {addingYear - birthYear}
              </span>
            </p>
            <button
              type="button"
              onClick={() => {
                setAddingYear(null);
                setNewTitle('');
                setNewNote('');
              }}
              className="text-xs text-muted-foreground/30 hover:text-muted-foreground transition-colors"
            >
              close
            </button>
          </div>

          <input
            type="text"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTitle.trim()) addEvent();
            }}
            placeholder="What happened?"
            className="w-full rounded-lg border border-border/20 bg-background/40 px-3 py-2 text-sm outline-none placeholder:text-muted-foreground/30"
          />

          <textarea
            value={newNote}
            onChange={(e) => setNewNote(e.target.value)}
            placeholder="Notes, memories, details..."
            rows={2}
            className="w-full rounded-lg border border-border/20 bg-background/40 px-3 py-2 text-sm resize-none outline-none placeholder:text-muted-foreground/30"
          />

          {/* Color + Category in one row */}
          <div className="flex items-center gap-4">
            <div className="flex gap-2">
              {EVENT_COLORS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setNewColor(c.id)}
                  className="h-6 w-6 rounded-full transition-all hover:scale-110"
                  style={{
                    background: c.color,
                    opacity: newColor === c.id ? 1 : 0.25,
                    outline: newColor === c.id ? `2px solid ${c.color}` : 'none',
                    outlineOffset: 2,
                  }}
                  title={c.label}
                />
              ))}
            </div>
            <div className="w-px h-4 bg-border/30" />
            <div className="flex gap-1.5 overflow-x-auto scrollbar-none">
              {EVENT_CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setNewCategory(c.id)}
                  className="px-2.5 py-1 rounded-full text-[10px] font-medium whitespace-nowrap shrink-0 transition-all"
                  style={{
                    background: newCategory === c.id ? `${c.color}18` : 'transparent',
                    color: newCategory === c.id ? c.color : `${c.color}40`,
                    border: `1px solid ${newCategory === c.id ? `${c.color}30` : `${c.color}10`}`,
                  }}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {/* Add button */}
          <button
            type="button"
            onClick={addEvent}
            disabled={!newTitle.trim()}
            className="w-full py-2 rounded-xl text-sm font-medium transition-all disabled:opacity-20"
            style={{ color: '#5C3018', background: '#5C301808', border: '1px solid #5C301815' }}
          >
            Add to {addingYear}
          </button>
        </div>
      )}
    </div>
  );
}
