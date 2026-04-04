'use client';

import { useCallback, useEffect, useState } from 'react';

interface Tracker {
  id: string;
  label: string;
  type: string;
  position: number;
}

interface Section {
  id: string;
  name: string;
  trackers: Tracker[];
}

interface CockpitSectionsProps {
  initialSections?: Section[];
  initialEntries?: Record<string, number>;
}

const PROGRAMS = [
  {
    id: 'body_reset',
    name: 'Body Reset',
    desc: 'Exercise, sleep, nutrition',
    color: '#D4605A',
    category: 'body',
    items: [
      'Morning movement',
      'Sleep by 10pm',
      'Meal prep',
      'Stretch daily',
      'No screens before bed',
    ],
  },
  {
    id: 'discipline',
    name: 'Discipline Builder',
    desc: 'Routines, focus, consistency',
    color: '#E0844A',
    category: 'action',
    items: [
      'Wake at same time',
      'Deep work 2h block',
      'Evening review',
      'One task before phone',
      'Weekly planning',
    ],
  },
  {
    id: 'fears_avoidance',
    name: 'Fears & Avoidance',
    desc: 'Map, understand, and face what you avoid',
    color: '#D45050',
    category: 'inner',
    items: [
      'What are you afraid of?',
      'What do you avoid daily?',
      'What is avoidance costing you?',
      'One small exposure this week',
      'Did you face it? How did it feel?',
      'What pattern do you notice?',
      'What would life look like without this fear?',
    ],
  },
  {
    id: 'focus_power',
    name: 'Understanding Your Focus',
    desc: 'Accept your power, own your rhythm',
    color: '#E07050',
    category: 'inner',
    items: [
      'How do you work best?',
      'What activates you?',
      'What strengths do you not fully own?',
      'Where do you hold back?',
      'What would change if you fully accepted your power?',
      'Design your ideal work block',
    ],
  },
  {
    id: 'social',
    name: 'Social Reconnect',
    desc: 'Reach out, listen, show up',
    color: '#3A8AC4',
    category: 'social',
    items: [
      'Call one friend',
      'Plan a dinner',
      'Be more vulnerable',
      'Active listening',
      'Join something new',
    ],
  },
  {
    id: 'creative',
    name: 'Creative Spark',
    desc: 'Practice, inspiration, play',
    color: '#A0D8A0',
    category: 'mind',
    items: [
      'Write 15 min',
      'Start one project',
      'Visit a museum',
      'Try a new medium',
      'Share your work',
    ],
  },
  {
    id: 'finance',
    name: 'Financial Clarity',
    desc: 'Track, save, plan ahead',
    color: '#C88820',
    category: 'action',
    items: [
      'Track spending 1 week',
      'Cancel one subscription',
      'Save 10%',
      'Budget next month',
      'Review investments',
    ],
  },
  {
    id: 'mind_calm',
    name: 'Mind Calm',
    desc: 'Meditation, journaling, detox',
    color: '#7A8A50',
    category: 'mind',
    items: [
      'Meditate 10 min',
      'Journal before bed',
      'Phone-free morning',
      'Nature walk',
      'Gratitude list',
    ],
  },
  {
    id: 'energy',
    name: 'Energy Management',
    desc: 'Rest, boundaries, recharge',
    color: '#9B6BA0',
    category: 'body',
    items: [
      'Identify peak hours',
      'Say no to one thing',
      'Nap or rest',
      'Batch low-energy tasks',
      'Protect weekends',
    ],
  },
  {
    id: 'confidence',
    name: 'Confidence Builder',
    desc: 'Self-worth, presence',
    color: '#E07050',
    category: 'inner',
    items: [
      'Say one honest thing',
      'Take up space',
      'Accept a compliment',
      'Set one boundary',
      'Do something new',
    ],
  },
  {
    id: 'communication',
    name: 'Better Communication',
    desc: 'Listen, express, connect',
    color: '#3AA8A0',
    category: 'social',
    items: [
      'Ask a deep question',
      'Listen without advising',
      'Express a need',
      'Give honest feedback',
      'Apologize when wrong',
    ],
  },
  {
    id: 'purpose',
    name: 'Purpose Finder',
    desc: 'Meaning, direction, legacy',
    color: '#5A7A8A',
    category: 'inner',
    items: [
      'Write your eulogy',
      'List 10 things that energize you',
      'Identify your values',
      'One thing for free',
      'What problem to solve',
    ],
  },
  {
    id: 'posture',
    name: 'Posture & Recovery',
    desc: 'Alignment, pain, mobility',
    color: '#D87048',
    category: 'body',
    items: [
      'Check posture 3x/day',
      'Foam roll 10 min',
      'Stand every hour',
      'Strengthen core',
      'Map pain points',
    ],
  },
];

export default function CockpitSections({ initialSections, initialEntries }: CockpitSectionsProps) {
  const [sections, setSections] = useState<Section[]>(initialSections ?? []);
  const [entries, setEntries] = useState<Record<string, number>>(initialEntries ?? {});
  const [loading, setLoading] = useState(!initialSections);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');
  const [_addCategory, _setAddCategory] = useState('all');
  const [programsOpen, setProgramsOpen] = useState(false);

  const fetchSections = useCallback(async () => {
    try {
      const res = await fetch('/api/sections');
      if (res.ok) {
        const data = await res.json();
        setSections(data.sections);
        setEntries(data.entries);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialSections) fetchSections();
  }, [fetchSections, initialSections]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName('');
      setShowAdd(false);
      fetchSections();
    }
  }

  async function handleDeleteSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/sections/${id}`, { method: 'DELETE' });
  }

  async function handleEntryChange(sectionId: string, trackerId: string, value: number) {
    setEntries((prev) => ({ ...prev, [trackerId]: value }));
    await fetch(`/api/sections/${sectionId}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId, value }),
    });
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <div key={`skeleton-${i}`} className="h-12 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (sections.length === 0 && !showAdd) {
    return (
      <button
        type="button"
        onClick={() => setShowAdd(true)}
        className="w-full rounded-2xl border border-dashed border-border py-3 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        + Add a program
      </button>
    );
  }

  return (
    <div className="rounded-3xl border border-border bg-card">
      {/* Programs header */}
      <button
        data-drag-handle
        type="button"
        onClick={() => setProgramsOpen(!programsOpen)}
        className="w-full px-4 py-3 text-[15px] font-normal tracking-[0.08em] text-center transition-colors hover:text-muted-foreground font-serif"
      >
        Programs
      </button>

      {programsOpen && (
        <div className="px-3 pb-3 space-y-2">
          {sections.map((section) => (
            <SectionCard
              key={section.id}
              section={section}
              expanded={expandedId === section.id}
              onToggle={() => setExpandedId(expandedId === section.id ? null : section.id)}
              onDelete={() => handleDeleteSection(section.id)}
              onRename={(name) => {
                setSections((prev) => prev.map((s) => (s.id === section.id ? { ...s, name } : s)));
                fetch(`/api/sections/${section.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ name }),
                });
              }}
              entries={entries}
              onEntryChange={(trackerId, value) => handleEntryChange(section.id, trackerId, value)}
              onTrackersChanged={fetchSections}
            />
          ))}

          {showAdd ? (
            <div className="rounded-xl border border-border/50 p-3 space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                  Add a program
                </p>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-1">
                {PROGRAMS.map((prog) => {
                  const exists = sections.some((s) => s.name === prog.name);
                  return (
                    <button
                      key={prog.id}
                      type="button"
                      disabled={exists}
                      onClick={async () => {
                        const res = await fetch('/api/sections', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            name: prog.name,
                            trackers: prog.items.map((label) => ({ label, type: 'check' })),
                          }),
                        });
                        if (res.ok) {
                          fetchSections();
                          setShowAdd(false);
                        }
                      }}
                      className="w-full flex items-center gap-2 py-1.5 px-2 rounded-lg text-left transition-all hover:bg-accent/50"
                      style={{ opacity: exists ? 0.35 : 1 }}
                    >
                      <div
                        className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                        style={{ background: prog.color, opacity: 0.6 }}
                      />
                      <span
                        className="text-[11px] font-medium flex-1"
                        style={{ color: prog.color }}
                      >
                        {prog.name}
                      </span>
                      {exists && <span className="text-[9px] text-muted-foreground">Added</span>}
                    </button>
                  );
                })}
              </div>
              <form onSubmit={handleAdd} className="flex gap-2 pt-2 border-t border-border/50">
                <input
                  type="text"
                  placeholder="Or type your own..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="flex-1 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none"
                />
                <button
                  type="submit"
                  disabled={!newName.trim()}
                  className="rounded-lg bg-[#5C3018] px-2.5 py-1.5 text-xs font-medium text-[#F5DEB8] hover:bg-[#4A2810] disabled:opacity-50"
                >
                  Add
                </button>
              </form>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAdd(true)}
              className="w-full py-1.5 text-[10px] text-muted-foreground/40 hover:text-muted-foreground transition-colors"
            >
              + Add program
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function SectionCard({
  section,
  expanded,
  onToggle,
  onDelete,
  onRename,
  entries,
  onEntryChange,
  onTrackersChanged,
}: {
  section: Section;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onRename: (name: string) => void;
  entries: Record<string, number>;
  onEntryChange: (trackerId: string, value: number) => void;
  onTrackersChanged: () => void;
}) {
  const [renaming, setRenaming] = useState(false);
  const [nameValue, setNameValue] = useState(section.name);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [customColor, setCustomColor] = useState<string | null>(() => {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem(`section_color_${section.id}`);
  });

  function commitRename() {
    const trimmed = nameValue.trim();
    if (trimmed && trimmed !== section.name) {
      onRename(trimmed);
    } else {
      setNameValue(section.name);
    }
    setRenaming(false);
  }

  const programColor =
    customColor || PROGRAMS.find((p) => p.name === section.name)?.color || '#C4A060';
  const SECTION_COLORS = [
    '#D4605A',
    '#E0844A',
    '#D45050',
    '#C88820',
    '#3A8AC4',
    '#A0D8A0',
    '#7A8A50',
    '#9B6BA0',
    '#5A7A8A',
    '#3AA8A0',
    '#D87048',
    '#E07050',
  ];

  return (
    <div
      className="mx-4 rounded-lg border px-3 py-2 space-y-1.5"
      style={{ borderColor: `${programColor}20`, background: `${programColor}06` }}
    >
      <div className="relative flex items-center justify-center gap-2">
        {/* Color dot */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowColorPicker(!showColorPicker);
          }}
          className="h-3 w-3 rounded-full shrink-0 transition-all hover:scale-125"
          style={{ background: programColor, opacity: 0.7 }}
        />
        {renaming ? (
          <input
            type="text"
            value={nameValue}
            onChange={(e) => setNameValue(e.target.value)}
            onBlur={commitRename}
            onKeyDown={(e) => {
              if (e.key === 'Enter') commitRename();
              if (e.key === 'Escape') {
                setNameValue(section.name);
                setRenaming(false);
              }
            }}
            className="bg-transparent text-center text-xs font-semibold uppercase tracking-[0.2em] outline-none border-b"
            style={{ borderColor: `${programColor}30`, color: programColor }}
          />
        ) : (
          <button
            type="button"
            className="text-xs font-semibold uppercase tracking-[0.2em]"
            style={{ color: programColor }}
            onClick={onToggle}
            onDoubleClick={(e) => {
              e.stopPropagation();
              setRenaming(true);
            }}
          >
            {section.name}
          </button>
        )}
      </div>

      {showColorPicker && (
        <div className="flex flex-wrap gap-1.5 justify-center py-1 animate-in fade-in duration-150">
          {SECTION_COLORS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                setCustomColor(c);
                localStorage.setItem(`section_color_${section.id}`, c);
                setShowColorPicker(false);
              }}
              className="h-4 w-4 rounded-full transition-all hover:scale-125"
              style={{
                background: c,
                opacity: c === programColor ? 1 : 0.4,
                outline: c === programColor ? `2px solid ${c}` : 'none',
                outlineOffset: 2,
              }}
            />
          ))}
        </div>
      )}

      {expanded && (
        <div className="space-y-2 pt-1">
          {section.trackers.map((tracker) => (
            <TrackerRow
              key={tracker.id}
              tracker={tracker}
              value={entries[tracker.id] ?? 0}
              onChange={(v) => onEntryChange(tracker.id, v)}
              sectionId={section.id}
              onDeleted={onTrackersChanged}
            />
          ))}
          {section.trackers.length === 0 && (
            <p className="text-xs text-muted-foreground text-center py-2">No trackers yet.</p>
          )}
          <AddTrackerInput sectionId={section.id} onAdded={onTrackersChanged} />
          <div className="pt-2 flex justify-end">
            {confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-muted-foreground">Delete this program?</span>
                <button
                  type="button"
                  onClick={onDelete}
                  className="text-[10px] font-medium text-destructive"
                >
                  Yes
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="text-[10px] text-muted-foreground"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmDelete(true)}
                className="text-[10px] text-muted-foreground/30 hover:text-destructive transition-colors"
              >
                Delete program
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface TrackerRowProps {
  tracker: Tracker;
  value: number;
  onChange: (value: number) => void;
  sectionId?: string;
  onDeleted?: () => void;
}

function TrackerRow({ tracker, value, onChange, sectionId, onDeleted }: TrackerRowProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const isQuestion =
    tracker.label.includes('?') ||
    tracker.label.startsWith('What') ||
    tracker.label.startsWith('How') ||
    tracker.label.startsWith('When') ||
    tracker.label.startsWith('Where') ||
    tracker.label.startsWith('Name') ||
    tracker.label.startsWith('Design');

  if (tracker.type === 'check') {
    return (
      <div className="py-1">
        <div className="flex items-center gap-3 group">
          <button
            type="button"
            aria-label={`Toggle ${tracker.label}`}
            className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
              value
                ? 'border-[#5C3018] bg-[#5C3018] text-[#F5DEB8] text-xs'
                : 'border-muted-foreground hover:border-primary'
            }`}
            onClick={() => onChange(value ? 0 : 1)}
          >
            {value ? '✓' : ''}
          </button>
          <button
            type="button"
            className={`text-sm text-left flex-1 ${value ? 'text-muted-foreground line-through' : ''}`}
            onClick={() => isQuestion && setNoteOpen(!noteOpen)}
          >
            {tracker.label}
          </button>
          {sectionId && onDeleted && (
            <button
              type="button"
              onClick={async () => {
                await fetch(`/api/sections/${sectionId}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ deleteTrackerId: tracker.id }),
                });
                onDeleted();
              }}
              className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:text-destructive"
            >
              ✕
            </button>
          )}
        </div>
        {isQuestion && noteOpen && (
          <div className="ml-8 mt-1.5 animate-in fade-in duration-150">
            <textarea
              placeholder="Write here..."
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              className="w-full resize-none rounded-lg border border-border/50 bg-background/60 px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none"
              rows={2}
              style={{ minHeight: 36 }}
            />
          </div>
        )}
      </div>
    );
  }

  if (tracker.type === 'scale') {
    return (
      <div className="flex items-center gap-3 py-1">
        <span className="text-sm flex-1">{tracker.label}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Rate ${tracker.label} ${n} of 5`}
              className={`h-4 w-4 rounded-full transition-colors ${
                n <= value ? 'bg-[#5C3018]' : 'bg-muted'
              }`}
              onClick={() => onChange(n === value ? 0 : n)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (tracker.type === 'counter') {
    return (
      <div className="flex items-center gap-3 py-1">
        <span className="text-sm flex-1">{tracker.label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Decrease ${tracker.label}`}
            className="h-6 w-6 rounded-full border border-border text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => onChange(Math.max(0, value - 1))}
          >
            −
          </button>
          <span className="text-sm font-medium w-6 text-center">{value}</span>
          <button
            type="button"
            aria-label={`Increase ${tracker.label}`}
            className="h-6 w-6 rounded-full border border-border text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => onChange(value + 1)}
          >
            +
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function AddTrackerInput({ sectionId, onAdded }: { sectionId: string; onAdded: () => void }) {
  const [value, setValue] = useState('');
  const [adding, setAdding] = useState(false);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!value.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/sections/${sectionId}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ label: value.trim(), type: 'check' }),
      });
      if (res.ok) {
        setValue('');
        onAdded();
      }
    } finally {
      setAdding(false);
    }
  }

  return (
    <form onSubmit={handleAdd} className="flex gap-2 pt-1">
      <input
        type="text"
        placeholder="+ Add an item..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="flex-1 rounded-lg border border-border/50 bg-transparent px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none"
      />
      {value.trim() && (
        <button type="submit" disabled={adding} className="text-xs font-medium text-[#5C3018] px-2">
          Add
        </button>
      )}
    </form>
  );
}
