'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getEmotionalWord } from '@/lib/emotional-vocabulary';

interface Mission {
  id: string;
  title: string;
  description: string | null;
  blocking: string | null;
  nextStep: string | null;
  completed: boolean;
  createdAt: string;
}

interface LinkedCheckIn {
  id: string;
  sliderValue: number;
  note: string | null;
  createdAt: string;
}

function getPreview(mission: Mission): string | null {
  if (mission.blocking?.trim()) return mission.blocking.trim();
  if (mission.nextStep?.trim()) return mission.nextStep.trim();
  return null;
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return formatTime(dateStr);
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getDotColor(value: number): string {
  if (value <= 25) return 'hsl(220 15% 55%)';
  if (value <= 62) return 'hsl(40 15% 55%)';
  return 'hsl(25 70% 55%)';
}

interface MissionTrackerProps {
  onMissionsChange?: () => void;
  refreshKey?: number;
}

export default function MissionTracker({ onMissionsChange, refreshKey = 0 }: MissionTrackerProps) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchMissions = useCallback(async () => {
    try {
      const res = await fetch('/api/missions');
      if (res.ok) {
        setMissions(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch('/api/missions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        const mission = await res.json();
        setMissions((prev) => [mission, ...prev]);
        setNewTitle('');
        setShowAddInput(false);
        setExpandedId(mission.id);
        onMissionsChange?.();
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(id: string, completed: boolean) {
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, completed } : m)));
    await fetch(`/api/missions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ completed }),
    });
  }

  async function handleDelete(id: string) {
    setMissions((prev) => prev.filter((m) => m.id !== id));
    if (expandedId === id) setExpandedId(null);
    await fetch(`/api/missions/${id}`, { method: 'DELETE' });
    onMissionsChange?.();
  }

  function handleFieldUpdate(id: string, field: string, value: string | null) {
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  }

  const active = missions.filter((m) => !m.completed);
  const done = missions.filter((m) => m.completed);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          aria-label="Add mission"
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
          onClick={() => setShowAddInput(!showAddInput)}
        >
          <svg
            aria-hidden="true"
            className={`h-4 w-4 transition-transform ${showAddInput ? 'rotate-45' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 5v14m-7-7h14" />
          </svg>
        </button>
      </div>

      {showAddInput && (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            placeholder="What's the mission?"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            // biome-ignore lint/a11y/noAutofocus: intentional focus on reveal
            autoFocus
          />
          <button
            type="submit"
            disabled={!newTitle.trim() || adding}
            className="rounded-xl bg-[#5C3018] px-3 py-2 text-sm font-medium text-[#F5DEB8] transition-colors hover:bg-[#4A2810] disabled:opacity-50"
          >
            {adding ? '...' : 'Add'}
          </button>
        </form>
      )}

      {loading ? (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <div key={`skeleton-${i}`} className="h-12 rounded-2xl bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-3">
          {active.length === 0 && done.length === 0 && (
            <p className="text-sm text-muted-foreground py-4 text-center">
              No missions yet. What are you working toward?
            </p>
          )}

          {active.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              expanded={expandedId === mission.id}
              onToggleExpand={() => setExpandedId(expandedId === mission.id ? null : mission.id)}
              onToggleComplete={() => handleToggle(mission.id, true)}
              onDelete={() => handleDelete(mission.id)}
              onFieldUpdate={(field, value) => handleFieldUpdate(mission.id, field, value)}
              refreshKey={refreshKey}
            />
          ))}

          {done.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground">Done ({done.length})</p>
              {done.map((mission) => (
                <MissionCard
                  key={mission.id}
                  mission={mission}
                  expanded={expandedId === mission.id}
                  onToggleExpand={() =>
                    setExpandedId(expandedId === mission.id ? null : mission.id)
                  }
                  onToggleComplete={() => handleToggle(mission.id, false)}
                  onDelete={() => handleDelete(mission.id)}
                  onFieldUpdate={(field, value) => handleFieldUpdate(mission.id, field, value)}
                  refreshKey={refreshKey}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface MissionCardProps {
  mission: Mission;
  expanded: boolean;
  onToggleExpand: () => void;
  onToggleComplete: () => void;
  onDelete: () => void;
  onFieldUpdate: (field: string, value: string | null) => void;
  refreshKey: number;
}

function MissionCard({
  mission,
  expanded,
  onToggleExpand,
  onToggleComplete,
  onDelete,
  onFieldUpdate,
  refreshKey,
}: MissionCardProps) {
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [openField, setOpenField] = useState<string | null>(null);
  const [linkedCheckIns, setLinkedCheckIns] = useState<LinkedCheckIn[]>([]);
  const lastLoadKey = useRef(-1);

  useEffect(() => {
    if (openField === 'checkins' && lastLoadKey.current !== refreshKey) {
      lastLoadKey.current = refreshKey;
      fetch(`/api/missions/${mission.id}/check-ins`)
        .then((res) => (res.ok ? res.json() : []))
        .then(setLinkedCheckIns);
    }
  }, [openField, refreshKey, mission.id]);

  function save(field: string, value: string) {
    const existing = saveTimers.current.get(field);
    if (existing) clearTimeout(existing);

    saveTimers.current.set(
      field,
      setTimeout(() => {
        fetch(`/api/missions/${mission.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ [field]: value || null }),
        });
      }, 800),
    );
  }

  function handleChange(field: 'description' | 'blocking' | 'nextStep', value: string) {
    onFieldUpdate(field, value || null);
    save(field, value);
  }

  const preview = getPreview(mission);
  const hasBlocker = Boolean(mission.blocking?.trim());

  return (
    <div
      className={`rounded-2xl border transition-all ${
        mission.completed
          ? 'border-border/50 opacity-60'
          : hasBlocker
            ? 'border-[#D4605A]/30'
            : 'border-border'
      }`}
    >
      {/* Header — click to expand/collapse */}
      {!expanded && (
        <button
          type="button"
          className="flex w-full items-center gap-3 px-4 py-3 text-left"
          onClick={onToggleExpand}
        >
          <div className="min-w-0 flex-1">
            <p className={`text-sm truncate ${mission.completed ? 'line-through text-muted-foreground' : 'font-medium'}`}>
              {mission.title}
            </p>
          </div>
          <span className="text-xs text-muted-foreground">{mission.completed ? '✓' : '›'}</span>
        </button>
      )}

      {/* Expanded body */}
      {expanded && (
        <div className="px-4 pb-3 pt-2">
          {/* Editable title — click to collapse */}
          <div className="py-2 flex items-center gap-2">
            <input
              type="text"
              value={mission.title}
              onChange={(e) => {
                onFieldUpdate('title', e.target.value);
                save('title', e.target.value);
              }}
              className="flex-1 text-sm font-medium bg-transparent outline-none focus:ring-0 p-0"
              style={{ borderBottom: '1px dashed hsl(var(--border))' }}
              onFocus={(e) => { e.target.style.borderBottom = '1px solid hsl(var(--border))'; }}
              onBlur={(e) => { e.target.style.borderBottom = '1px solid transparent'; }}
            />
            <button type="button" onClick={onToggleExpand}
              className="text-xs text-muted-foreground/40 hover:text-muted-foreground transition-colors shrink-0">▴</button>
          </div>
          {/* Objectives — multiple, stacked */}
          <div className="border-t border-border/50 py-2">
            <button
              type="button"
              className="flex w-full items-center gap-1.5 text-xs transition-colors hover:text-foreground"
              onClick={() => setOpenField(openField === 'objectives' ? null : 'objectives')}
            >
              <svg aria-hidden="true" className={`h-3 w-3 shrink-0 transition-transform ${openField === 'objectives' ? 'rotate-90' : ''}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium uppercase tracking-wider text-foreground">Objectives</span>
              {(() => {
                const objs = (mission.nextStep || '').split('\n').filter(s => s.trim());
                return objs.length > 0 && openField !== 'objectives' ? (
                  <span className="ml-auto text-muted-foreground font-normal normal-case tracking-normal">{objs.length}</span>
                ) : null;
              })()}
            </button>
            {openField === 'objectives' && (
              <div className="mt-2 space-y-1.5">
                {(mission.nextStep || '').split('\n').filter(s => s.trim()).map((obj, i) => (
                  <div key={i} className="flex items-center gap-2 py-1 group">
                    <div className="w-1.5 h-1.5 rounded-full bg-[#5C3018] opacity-30 flex-shrink-0" />
                    <span className="text-sm flex-1">{obj}</span>
                    <button type="button" onClick={() => {
                      const lines = (mission.nextStep || '').split('\n').filter(s => s.trim());
                      lines.splice(i, 1);
                      handleChange('nextStep', lines.join('\n'));
                    }} className="text-[10px] text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity">✕</button>
                  </div>
                ))}
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const input = (e.target as HTMLFormElement).elements.namedItem('newObj') as HTMLInputElement;
                  if (!input.value.trim()) return;
                  const current = (mission.nextStep || '').trim();
                  handleChange('nextStep', current ? current + '\n' + input.value.trim() : input.value.trim());
                  input.value = '';
                }} className="flex gap-2 pt-1">
                  <input
                    name="newObj"
                    type="text"
                    placeholder="Add an objective..."
                    className="flex-1 rounded-lg border border-border bg-transparent px-2.5 py-1.5 text-xs placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                  <button type="submit" className="text-xs font-medium text-[#5C3018] px-2">Add</button>
                </form>
              </div>
            )}
          </div>
          <CollapsibleField
            label="Challenge"
            value={mission.blocking ?? ''}
            placeholder="What's making this hard?"
            open={openField === 'blocking'}
            onToggle={() => setOpenField(openField === 'blocking' ? null : 'blocking')}
            onChange={(v) => handleChange('blocking', v)}
            accent={hasBlocker}
          />
          {/* Categories — structured workspace */}
          <MissionCategories
            value={mission.description ?? ''}
            onChange={(v) => handleChange('description', v)}
            open={openField === 'description'}
            onToggle={() => setOpenField(openField === 'description' ? null : 'description')}
          />

          {/* Linked check-ins */}
          <div className="border-t border-border/50 py-2">
            <button
              type="button"
              className="flex w-full items-center gap-1.5 text-xs transition-colors hover:text-foreground"
              onClick={() => setOpenField(openField === 'checkins' ? null : 'checkins')}
            >
              <svg
                aria-hidden="true"
                className={`h-3 w-3 shrink-0 transition-transform ${openField === 'checkins' ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              <span className="font-medium uppercase tracking-wider text-muted-foreground">
                Check-ins
              </span>
              {linkedCheckIns.length > 0 && openField !== 'checkins' && (
                <span className="ml-auto text-muted-foreground font-normal normal-case tracking-normal">
                  {linkedCheckIns.length}
                </span>
              )}
            </button>
            {openField === 'checkins' && (
              <div className="mt-2 space-y-1.5">
                {linkedCheckIns.length === 0 && (
                  <p className="text-xs text-muted-foreground py-1">
                    No check-ins linked yet. Tag this mission when you check in.
                  </p>
                )}
                {linkedCheckIns.map((ci) => (
                  <div key={ci.id} className="flex items-center gap-2 py-1">
                    <div
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: getDotColor(ci.sliderValue) }}
                    />
                    <span className="text-xs font-medium">{getEmotionalWord(ci.sliderValue)}</span>
                    {ci.note && (
                      <span className="text-xs text-muted-foreground truncate">— {ci.note}</span>
                    )}
                    <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                      {formatShortDate(ci.createdAt)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Actions — complete + delete */}
          <div className="flex items-center justify-between pt-3 border-t border-border/50">
            <button type="button" onClick={onDelete}
              className="text-xs text-muted-foreground/40 hover:text-destructive transition-colors">
              ✕ Delete
            </button>
            <button type="button" onClick={onToggleComplete}
              className="text-xs font-medium transition-colors" style={{ color: '#5C3018' }}>
              {mission.completed ? 'Reopen' : '✓ Complete'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

interface CollapsibleFieldProps {
  label: string;
  value: string;
  placeholder: string;
  open: boolean;
  onToggle: () => void;
  onChange: (value: string) => void;
  accent?: boolean;
  multiline?: boolean;
}

function CollapsibleField({
  label,
  value,
  placeholder,
  open,
  onToggle,
  onChange,
  accent,
  multiline,
}: CollapsibleFieldProps) {
  const hasValue = value.trim().length > 0;
  const [showSaved, setShowSaved] = useState(false);
  const savedTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleChange(newValue: string) {
    onChange(newValue);
    if (savedTimer.current) clearTimeout(savedTimer.current);
    setShowSaved(false);
    savedTimer.current = setTimeout(() => {
      if (newValue.trim()) {
        setShowSaved(true);
        setTimeout(() => setShowSaved(false), 2000);
      }
    }, 900);
  }

  return (
    <div className="pt-2">
      <button
        type="button"
        className={`w-full rounded-xl px-3.5 py-2.5 text-left transition-all ${
          open ? 'bg-accent/30' : 'hover:bg-accent/20'
        }`}
        style={accent && hasValue ? { background: '#D4605A10', border: '1px solid #D4605A20' } : undefined}
        onClick={onToggle}
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-xs font-semibold uppercase tracking-wider ${
              accent && hasValue ? 'text-[#D4605A]' : hasValue ? 'text-foreground' : 'text-muted-foreground/60'
            }`}
          >
            {label}
          </span>
          {hasValue && !open && (
            <span className="text-xs text-muted-foreground font-normal normal-case tracking-normal truncate flex-1">
              — {value.trim().slice(0, 40)}
              {value.trim().length > 40 ? '...' : ''}
            </span>
          )}
        </div>
      </button>
      {open && (
        <div className="mt-2 px-1 relative">
          <textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => {
              handleChange(e.target.value);
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            onFocus={(e) => {
              e.target.style.height = 'auto';
              e.target.style.height = e.target.scrollHeight + 'px';
            }}
            className="w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            rows={2}
            style={{ minHeight: 48, overflow: 'hidden' }}
          />
          {showSaved && (
            <span className="absolute right-3 top-3 text-[10px] font-medium animate-in fade-in duration-200" style={{ color: '#C4A060' }}>
              saved
            </span>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MISSION CATEGORIES — structured workspace within a mission
// ============================================================

const CATEGORY_COLORS = ['#C4A060', '#9B6BA0', '#3A8AC4', '#E0844A', '#7A8A50', '#D4605A', '#3AA8A0', '#C88820'];

interface ParsedCategory {
  name: string;
  color: string;
  items: string[];
}

function parseCategories(raw: string): ParsedCategory[] {
  if (!raw.trim()) return [];
  const cats: ParsedCategory[] = [];
  const sections = raw.split('|||CAT:');
  for (const section of sections) {
    if (!section.trim()) continue;
    const newlineIdx = section.indexOf('\n');
    if (newlineIdx === -1) {
      const [name, color] = section.split('|||COLOR:');
      cats.push({ name: (name || '').trim(), color: (color || CATEGORY_COLORS[cats.length % CATEGORY_COLORS.length]).trim(), items: [] });
    } else {
      const header = section.slice(0, newlineIdx);
      const [name, color] = header.split('|||COLOR:');
      const items = section.slice(newlineIdx + 1).split('\n').filter((l) => l.trim());
      cats.push({ name: (name || '').trim(), color: (color || CATEGORY_COLORS[cats.length % CATEGORY_COLORS.length]).trim(), items });
    }
  }
  return cats;
}

function serializeCategories(cats: ParsedCategory[]): string {
  return cats.map((c) => `|||CAT:${c.name}|||COLOR:${c.color}\n${c.items.join('\n')}`).join('\n');
}

function MissionCategories({ value, onChange, open, onToggle }: {
  value: string; onChange: (v: string) => void; open: boolean; onToggle: () => void;
}) {
  const [categories, setCategories] = useState<ParsedCategory[]>([]);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  useEffect(() => { setCategories(parseCategories(value)); }, [value]);

  function save(updated: ParsedCategory[]) {
    setCategories(updated);
    onChange(serializeCategories(updated));
  }

  function addCategory() {
    if (!newCatName.trim()) return;
    save([...categories, { name: newCatName.trim(), color: newCatColor, items: [] }]);
    setNewCatName('');
    setAddingCat(false);
    setExpandedCat(newCatName.trim());
  }

  function addItem(catIdx: number, text: string) {
    const updated = [...categories];
    updated[catIdx] = { ...updated[catIdx], items: [...updated[catIdx].items, `- ${text}`] };
    save(updated);
  }

  function removeItem(catIdx: number, itemIdx: number) {
    const updated = [...categories];
    updated[catIdx] = { ...updated[catIdx], items: updated[catIdx].items.filter((_, i) => i !== itemIdx) };
    save(updated);
  }

  const catCount = categories.length;
  const itemCount = categories.reduce((s, c) => s + c.items.length, 0);

  return (
    <div className="border-t border-border/50 py-2">
      <button type="button" onClick={onToggle}
        className="flex w-full items-center gap-1.5 text-xs transition-colors hover:text-foreground">
        <svg aria-hidden="true" className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span className="font-medium uppercase tracking-wider text-foreground">Categories</span>
        {catCount > 0 && !open && (
          <span className="ml-auto text-muted-foreground font-normal normal-case tracking-normal">
            {catCount} cat, {itemCount} items
          </span>
        )}
      </button>

      {open && (
        <div className="mt-3 space-y-2">
          {/* Category pills */}
          <div className="flex gap-1.5 flex-wrap">
            {categories.map((cat) => (
              <button key={cat.name} type="button"
                onClick={() => setExpandedCat(expandedCat === cat.name ? null : cat.name)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                style={{
                  background: expandedCat === cat.name ? `${cat.color}18` : `${cat.color}08`,
                  color: expandedCat === cat.name ? cat.color : `${cat.color}70`,
                  border: `1px solid ${expandedCat === cat.name ? `${cat.color}35` : `${cat.color}12`}`,
                }}>
                <div className="h-2 w-2 rounded-full" style={{ background: cat.color, opacity: expandedCat === cat.name ? 0.8 : 0.4 }} />
                {cat.name}
                <span className="text-[9px] opacity-50">{cat.items.length}</span>
              </button>
            ))}
            <button type="button" onClick={() => setAddingCat(!addingCat)}
              className="flex h-4 w-4 items-center justify-center rotate-45 rounded-[1.5px] self-center transition-all hover:scale-110"
              style={{ background: addingCat ? '#C4A060' : '#C4A06030' }}>
              <span className="-rotate-45 text-[7px] font-bold" style={{ color: addingCat ? '#fff' : '#C4A060' }}>+</span>
            </button>
          </div>

          {/* Add category form */}
          {addingCat && (
            <div className="flex items-center gap-2 animate-in fade-in duration-150">
              <input type="text" value={newCatName} onChange={(e) => setNewCatName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') addCategory(); }}
                placeholder="Category name..."
                className="flex-1 rounded-lg border border-border/30 bg-transparent px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground/30"
                autoFocus />
              <div className="flex gap-1">
                {CATEGORY_COLORS.slice(0, 6).map((c) => (
                  <button key={c} type="button" onClick={() => setNewCatColor(c)}
                    className="h-3.5 w-3.5 rounded-full transition-all hover:scale-125"
                    style={{ background: c, opacity: newCatColor === c ? 1 : 0.25 }} />
                ))}
              </div>
              <button type="button" onClick={addCategory} disabled={!newCatName.trim()}
                className="text-[10px] font-medium disabled:opacity-30" style={{ color: newCatColor }}>Add</button>
            </div>
          )}

          {/* Expanded category */}
          {expandedCat && (() => {
            const catIdx = categories.findIndex((c) => c.name === expandedCat);
            if (catIdx === -1) return null;
            const cat = categories[catIdx];
            return (
              <div className="rounded-xl border p-3 space-y-2 animate-in fade-in duration-150"
                style={{ borderColor: `${cat.color}25`, background: `${cat.color}04` }}>
                {cat.items.map((item, i) => (
                  <div key={i} className="flex items-start gap-2 group">
                    <div className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0" style={{ background: cat.color, opacity: 0.5 }} />
                    <span className="text-xs flex-1 leading-relaxed">{item.replace(/^- /, '')}</span>
                    <button type="button" onClick={() => removeItem(catIdx, i)}
                      className="text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/40 hover:!text-destructive transition-all shrink-0">x</button>
                  </div>
                ))}
                {cat.items.length === 0 && <p className="text-[10px] text-muted-foreground/30">No items yet</p>}
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const input = (e.target as HTMLFormElement).elements.namedItem('newItem') as HTMLInputElement;
                  if (!input.value.trim()) return;
                  addItem(catIdx, input.value.trim());
                  input.value = '';
                }} className="flex gap-2">
                  <input name="newItem" type="text" placeholder="Add item..."
                    className="flex-1 rounded-lg border bg-transparent px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground/30"
                    style={{ borderColor: `${cat.color}15` }} />
                  <button type="submit" className="text-[10px] font-medium" style={{ color: cat.color }}>Add</button>
                </form>
                <div className="flex justify-end pt-1">
                  <button type="button" onClick={() => { save(categories.filter((_, i) => i !== catIdx)); setExpandedCat(null); }}
                    className="text-[9px] text-muted-foreground/25 hover:text-destructive transition-colors">delete category</button>
                </div>
              </div>
            );
          })()}
        </div>
      )}
    </div>
  );
}
