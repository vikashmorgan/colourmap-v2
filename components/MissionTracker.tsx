'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { getEmotionalWord } from '@/lib/emotional-vocabulary';

// ============================================================
// TYPES
// ============================================================

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

// ============================================================
// MISSION COLORS — stored in localStorage
// ============================================================

const MISSION_COLORS = [
  '#C4A060',
  '#9B6BA0',
  '#3A8AC4',
  '#E0844A',
  '#7A8A50',
  '#D4605A',
  '#C88820',
  '#3AA8A0',
];

function getMissionColor(id: string): string {
  try {
    return localStorage.getItem(`mission_color_${id}`) || '#C4A060';
  } catch {
    return '#C4A060';
  }
}

function setMissionColor(id: string, color: string) {
  localStorage.setItem(`mission_color_${id}`, color);
}

// ============================================================
// HELPERS
// ============================================================

function formatShortDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  if (
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear()
  ) {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

function getDotColor(value: number): string {
  if (value <= 25) return 'hsl(220 15% 55%)';
  if (value <= 62) return 'hsl(40 15% 55%)';
  return 'hsl(25 70% 55%)';
}

function daysSince(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24));
}

// ============================================================
// MAIN COMPONENT
// ============================================================

interface MissionTrackerProps {
  onMissionsChange?: () => void;
  refreshKey?: number;
}

export default function MissionTracker({ onMissionsChange, refreshKey = 0 }: MissionTrackerProps) {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showDone, setShowDone] = useState(false);

  const fetchMissions = useCallback(async () => {
    try {
      const res = await fetch('/api/missions');
      if (res.ok) setMissions(await res.json());
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

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={`skeleton-${i}`} className="h-16 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Add mission — always visible input */}
      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          placeholder="New mission..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="flex-1 rounded-xl border px-3 py-2.5 text-sm outline-none placeholder:text-muted-foreground/30"
          style={{ borderColor: '#C4A06015', background: '#C4A06003' }}
        />
        {newTitle.trim() && (
          <button
            type="submit"
            disabled={adding}
            className="rounded-xl px-4 py-2.5 text-sm font-medium transition-all"
            style={{ color: '#5C3018', background: '#5C301810' }}
          >
            {adding ? '...' : 'Add'}
          </button>
        )}
      </form>

      {/* Active missions */}
      {active.length === 0 && done.length === 0 && (
        <p className="text-sm text-muted-foreground/40 text-center py-8">
          No missions yet. What are you working toward?
        </p>
      )}

      <div className="space-y-2">
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
      </div>

      {/* Done missions — collapsible */}
      {done.length > 0 && (
        <div className="pt-2">
          <button
            type="button"
            onClick={() => setShowDone(!showDone)}
            className="text-xs text-muted-foreground/40 hover:text-muted-foreground/60 transition-colors"
          >
            Completed ({done.length}) {showDone ? '−' : '+'}
          </button>
          {showDone && (
            <div className="space-y-1.5 pt-2 animate-in fade-in duration-150">
              {done.map((mission) => {
                const color = getMissionColor(mission.id);
                return (
                  <div
                    key={mission.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-xl"
                    style={{ background: `${color}06` }}
                  >
                    <button
                      type="button"
                      onClick={() => handleToggle(mission.id, false)}
                      className="h-4 w-4 rounded-full border-2 flex items-center justify-center text-[8px] shrink-0"
                      style={{ borderColor: color, color, background: `${color}20` }}
                    >
                      done
                    </button>
                    <span className="text-sm line-through text-muted-foreground/50 flex-1">
                      {mission.title}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDelete(mission.id)}
                      className="text-[10px] text-muted-foreground/20 hover:text-destructive transition-colors"
                    >
                      x
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MISSION CARD
// ============================================================

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
  const [color, setColor] = useState('#C4A060');
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    setColor(getMissionColor(mission.id));
  }, [mission.id]);

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

  const objectives = (mission.nextStep || '').split('\n').filter((s) => s.trim());
  const hasBlocker = Boolean(mission.blocking?.trim());
  const days = daysSince(mission.createdAt);

  // ---- COLLAPSED ----
  if (!expanded) {
    return (
      <button
        type="button"
        onClick={onToggleExpand}
        className="w-full rounded-2xl border px-4 py-3 text-left transition-all hover:shadow-sm"
        style={{ borderColor: `${color}20`, borderLeft: `4px solid ${color}50` }}
      >
        <div className="flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{mission.title}</p>
            <div className="flex items-center gap-3 mt-1">
              {objectives.length > 0 && (
                <span className="text-[10px] text-muted-foreground/40">
                  {objectives.length} objective{objectives.length > 1 ? 's' : ''}
                </span>
              )}
              {hasBlocker && (
                <span
                  className="text-[10px] px-1.5 py-0.5 rounded"
                  style={{ color: '#D4605A', background: '#D4605A10' }}
                >
                  blocked
                </span>
              )}
              <span className="text-[10px] text-muted-foreground/25">
                {days === 0 ? 'today' : days === 1 ? 'yesterday' : `${days}d ago`}
              </span>
            </div>
          </div>
        </div>
      </button>
    );
  }

  // ---- EXPANDED ----
  return (
    <div
      className="rounded-2xl border overflow-hidden transition-all"
      style={{ borderColor: `${color}30`, borderLeft: `4px solid ${color}` }}
    >
      {/* Header */}
      <div className="px-4 pt-4 pb-2">
        <div className="flex items-start gap-3">
          {/* Color dot + picker */}
          <div className="relative mt-1">
            <button
              type="button"
              onClick={() => setShowColorPicker(!showColorPicker)}
              className="h-4 w-4 rounded-full transition-all hover:scale-125 shrink-0"
              style={{ background: color }}
            />
            {showColorPicker && (
              <div className="absolute top-6 left-0 z-50 flex gap-1.5 p-2 rounded-lg border border-border bg-card shadow-lg animate-in fade-in duration-100">
                {MISSION_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => {
                      setColor(c);
                      setMissionColor(mission.id, c);
                      setShowColorPicker(false);
                    }}
                    className="h-4 w-4 rounded-full transition-all hover:scale-125"
                    style={{ background: c, opacity: color === c ? 1 : 0.35 }}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Editable title */}
          <input
            type="text"
            value={mission.title}
            onChange={(e) => {
              onFieldUpdate('title', e.target.value);
              save('title', e.target.value);
            }}
            className="flex-1 text-base font-medium bg-transparent outline-none font-serif"
            style={{ color }}
          />

          <button
            type="button"
            onClick={onToggleExpand}
            className="text-xs text-muted-foreground/30 hover:text-muted-foreground shrink-0 mt-1"
          >
            x
          </button>
        </div>

        <p className="text-[10px] text-muted-foreground/30 mt-1 pl-7">
          Started{' '}
          {new Date(mission.createdAt).toLocaleDateString([], {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
          })}
          {days > 0 ? ` · ${days} days` : ''}
        </p>
      </div>

      {/* Objectives */}
      <div className="px-4 py-3 border-t" style={{ borderColor: `${color}10` }}>
        <p
          className="text-[10px] font-medium uppercase tracking-wider mb-2"
          style={{ color: `${color}80` }}
        >
          Objectives {objectives.length > 0 && `(${objectives.length})`}
        </p>
        <div className="space-y-1.5">
          {objectives.map((obj, i) => (
            <div key={i} className="flex items-start gap-2 group">
              <div
                className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0"
                style={{ background: color, opacity: 0.4 }}
              />
              <span className="text-sm flex-1 leading-relaxed">{obj}</span>
              <button
                type="button"
                onClick={() => {
                  const lines = objectives.slice();
                  lines.splice(i, 1);
                  handleChange('nextStep', lines.join('\n'));
                }}
                className="text-[10px] text-muted-foreground/0 group-hover:text-muted-foreground/40 hover:!text-destructive transition-all shrink-0"
              >
                x
              </button>
            </div>
          ))}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.target as HTMLFormElement).elements.namedItem(
                'newObj',
              ) as HTMLInputElement;
              if (!input.value.trim()) return;
              const current = (mission.nextStep || '').trim();
              handleChange(
                'nextStep',
                current ? `${current}\n${input.value.trim()}` : input.value.trim(),
              );
              input.value = '';
            }}
            className="flex gap-2"
          >
            <input
              name="newObj"
              type="text"
              placeholder="Add objective..."
              className="flex-1 rounded-lg border bg-transparent px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground/25"
              style={{ borderColor: `${color}12` }}
            />
          </form>
        </div>
      </div>

      {/* Challenge */}
      <div className="px-4 py-3 border-t" style={{ borderColor: `${color}10` }}>
        <p
          className="text-[10px] font-medium uppercase tracking-wider mb-2"
          style={{ color: hasBlocker ? '#D4605A80' : `${color}40` }}
        >
          Challenge
        </p>
        <textarea
          value={mission.blocking || ''}
          onChange={(e) => handleChange('blocking', e.target.value)}
          placeholder="What's making this hard?"
          rows={1}
          className="w-full rounded-lg border bg-transparent px-2.5 py-1.5 text-sm resize-none outline-none placeholder:text-muted-foreground/25"
          style={{
            borderColor: hasBlocker ? '#D4605A20' : `${color}10`,
            background: hasBlocker ? '#D4605A04' : 'transparent',
          }}
          onInput={(e) => {
            const t = e.target as HTMLTextAreaElement;
            t.style.height = 'auto';
            t.style.height = `${t.scrollHeight}px`;
          }}
        />
      </div>

      {/* Categories */}
      <MissionCategories
        value={mission.description || ''}
        onChange={(v) => handleChange('description', v)}
        color={color}
      />

      {/* Check-ins */}
      <div className="px-4 py-3 border-t" style={{ borderColor: `${color}10` }}>
        <button
          type="button"
          onClick={() => setOpenField(openField === 'checkins' ? null : 'checkins')}
          className="text-[10px] font-medium uppercase tracking-wider transition-colors"
          style={{ color: `${color}40` }}
        >
          Check-ins {linkedCheckIns.length > 0 && `(${linkedCheckIns.length})`}{' '}
          {openField === 'checkins' ? '−' : '+'}
        </button>
        {openField === 'checkins' && (
          <div className="mt-2 space-y-1 animate-in fade-in duration-150">
            {linkedCheckIns.length === 0 && (
              <p className="text-xs text-muted-foreground/30">No check-ins linked yet</p>
            )}
            {linkedCheckIns.map((ci) => (
              <div key={ci.id} className="flex items-center gap-2 py-1">
                <div
                  className="h-2 w-2 shrink-0 rounded-full"
                  style={{ backgroundColor: getDotColor(ci.sliderValue) }}
                />
                <span className="text-xs font-medium">{getEmotionalWord(ci.sliderValue)}</span>
                {ci.note && (
                  <span className="text-xs text-muted-foreground/40 truncate flex-1">
                    — {ci.note.slice(0, 40)}
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground/25 shrink-0">
                  {formatShortDate(ci.createdAt)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Actions */}
      <div
        className="px-4 py-3 border-t flex items-center justify-between"
        style={{ borderColor: `${color}10` }}
      >
        <button
          type="button"
          onClick={onDelete}
          className="text-[10px] text-muted-foreground/25 hover:text-destructive transition-colors"
        >
          Delete
        </button>
        <button
          type="button"
          onClick={onToggleComplete}
          className="text-xs font-medium px-3 py-1 rounded-lg transition-all"
          style={{ color, background: `${color}10` }}
        >
          Complete
        </button>
      </div>
    </div>
  );
}

// ============================================================
// MISSION CATEGORIES
// ============================================================

const CATEGORY_COLORS = [
  '#C4A060',
  '#9B6BA0',
  '#3A8AC4',
  '#E0844A',
  '#7A8A50',
  '#D4605A',
  '#3AA8A0',
  '#C88820',
];

interface ParsedCategory {
  name: string;
  color: string;
  items: string[];
}

function parseCategories(raw: string): ParsedCategory[] {
  if (!raw.trim()) return [];
  const cats: ParsedCategory[] = [];
  for (const section of raw.split('|||CAT:')) {
    if (!section.trim()) continue;
    const nl = section.indexOf('\n');
    if (nl === -1) {
      const [name, color] = section.split('|||COLOR:');
      cats.push({
        name: (name || '').trim(),
        color: (color || CATEGORY_COLORS[cats.length % CATEGORY_COLORS.length]).trim(),
        items: [],
      });
    } else {
      const [name, color] = section.slice(0, nl).split('|||COLOR:');
      cats.push({
        name: (name || '').trim(),
        color: (color || CATEGORY_COLORS[cats.length % CATEGORY_COLORS.length]).trim(),
        items: section
          .slice(nl + 1)
          .split('\n')
          .filter((l) => l.trim()),
      });
    }
  }
  return cats;
}

function serializeCategories(cats: ParsedCategory[]): string {
  return cats.map((c) => `|||CAT:${c.name}|||COLOR:${c.color}\n${c.items.join('\n')}`).join('\n');
}

function MissionCategories({
  value,
  onChange,
  color,
}: {
  value: string;
  onChange: (v: string) => void;
  color: string;
}) {
  const [categories, setCategories] = useState<ParsedCategory[]>([]);
  const [addingCat, setAddingCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);
  const [expandedCat, setExpandedCat] = useState<string | null>(null);

  useEffect(() => {
    setCategories(parseCategories(value));
  }, [value]);

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

  return (
    <div className="px-4 py-3 border-t" style={{ borderColor: `${color}10` }}>
      <div className="flex items-center gap-2 mb-2">
        <p
          className="text-[10px] font-medium uppercase tracking-wider"
          style={{ color: `${color}60` }}
        >
          Categories {categories.length > 0 && `(${categories.length})`}
        </p>
        <button
          type="button"
          onClick={() => setAddingCat(!addingCat)}
          className="flex h-3.5 w-3.5 items-center justify-center rotate-45 rounded-[1.5px] transition-all hover:scale-110"
          style={{ background: addingCat ? color : `${color}25` }}
        >
          <span
            className="-rotate-45 text-[7px] font-bold"
            style={{ color: addingCat ? '#fff' : color }}
          >
            +
          </span>
        </button>
      </div>

      {/* Category pills */}
      {categories.length > 0 && (
        <div className="flex gap-1.5 flex-wrap mb-2">
          {categories.map((cat) => (
            <button
              key={cat.name}
              type="button"
              onClick={() => setExpandedCat(expandedCat === cat.name ? null : cat.name)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
              style={{
                background: expandedCat === cat.name ? `${cat.color}18` : `${cat.color}08`,
                color: expandedCat === cat.name ? cat.color : `${cat.color}70`,
                border: `1px solid ${expandedCat === cat.name ? `${cat.color}35` : `${cat.color}12`}`,
              }}
            >
              <div
                className="h-2 w-2 rounded-full"
                style={{ background: cat.color, opacity: expandedCat === cat.name ? 0.8 : 0.4 }}
              />
              {cat.name}
              <span className="text-[9px] opacity-50">{cat.items.length}</span>
            </button>
          ))}
        </div>
      )}

      {/* Add category form */}
      {addingCat && (
        <div className="flex items-center gap-2 mb-2 animate-in fade-in duration-150">
          <input
            type="text"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addCategory();
            }}
            placeholder="Category name..."
            className="flex-1 rounded-lg border border-border/30 bg-transparent px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground/25"
            autoFocus
          />
          <div className="flex gap-1">
            {CATEGORY_COLORS.slice(0, 6).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewCatColor(c)}
                className="h-3.5 w-3.5 rounded-full transition-all hover:scale-125"
                style={{ background: c, opacity: newCatColor === c ? 1 : 0.25 }}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={addCategory}
            disabled={!newCatName.trim()}
            className="text-[10px] font-medium disabled:opacity-30"
            style={{ color: newCatColor }}
          >
            Add
          </button>
        </div>
      )}

      {/* Expanded category */}
      {expandedCat &&
        (() => {
          const catIdx = categories.findIndex((c) => c.name === expandedCat);
          if (catIdx === -1) return null;
          const cat = categories[catIdx];
          return (
            <div
              className="rounded-xl border p-3 space-y-2 animate-in fade-in duration-150"
              style={{ borderColor: `${cat.color}20`, background: `${cat.color}04` }}
            >
              {cat.items.map((item, i) => (
                <div key={i} className="flex items-start gap-2 group">
                  <div
                    className="h-1.5 w-1.5 rounded-full mt-1.5 shrink-0"
                    style={{ background: cat.color, opacity: 0.5 }}
                  />
                  <span className="text-xs flex-1 leading-relaxed">{item.replace(/^- /, '')}</span>
                  <button
                    type="button"
                    onClick={() => {
                      const updated = [...categories];
                      updated[catIdx] = {
                        ...updated[catIdx],
                        items: updated[catIdx].items.filter((_, j) => j !== i),
                      };
                      save(updated);
                    }}
                    className="text-[9px] text-muted-foreground/0 group-hover:text-muted-foreground/40 hover:!text-destructive transition-all shrink-0"
                  >
                    x
                  </button>
                </div>
              ))}
              {cat.items.length === 0 && (
                <p className="text-[10px] text-muted-foreground/25">No items yet</p>
              )}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const input = (e.target as HTMLFormElement).elements.namedItem(
                    'newItem',
                  ) as HTMLInputElement;
                  if (!input.value.trim()) return;
                  const updated = [...categories];
                  updated[catIdx] = {
                    ...updated[catIdx],
                    items: [...updated[catIdx].items, `- ${input.value.trim()}`],
                  };
                  save(updated);
                  input.value = '';
                }}
                className="flex gap-2"
              >
                <input
                  name="newItem"
                  type="text"
                  placeholder="Add item..."
                  className="flex-1 rounded-lg border bg-transparent px-2.5 py-1.5 text-xs outline-none placeholder:text-muted-foreground/25"
                  style={{ borderColor: `${cat.color}12` }}
                />
              </form>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    save(categories.filter((_, i) => i !== catIdx));
                    setExpandedCat(null);
                  }}
                  className="text-[9px] text-muted-foreground/20 hover:text-destructive transition-colors"
                >
                  delete category
                </button>
              </div>
            </div>
          );
        })()}
    </div>
  );
}
