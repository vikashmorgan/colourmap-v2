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
      {/* Collapsed header */}
      <div className="flex items-center gap-3 px-4 py-3">
        <button
          type="button"
          aria-label={
            mission.completed
              ? `Mark "${mission.title}" as incomplete`
              : `Mark "${mission.title}" as complete`
          }
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
            mission.completed
              ? 'border-primary bg-primary text-primary-foreground text-xs'
              : 'border-muted-foreground hover:border-primary'
          }`}
          onClick={onToggleComplete}
        >
          {mission.completed && '✓'}
        </button>

        <button
          type="button"
          className="flex flex-1 items-center gap-2 text-left min-w-0"
          onClick={onToggleExpand}
        >
          <div className="min-w-0 flex-1">
            <p className={`text-sm truncate ${mission.completed ? 'line-through' : 'font-medium'}`}>
              {mission.title}
            </p>
            {!expanded && preview && (
              <p className="text-xs text-muted-foreground truncate">{preview}</p>
            )}
          </div>
        </button>

        <button
          type="button"
          aria-label={`Delete "${mission.title}"`}
          className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
          onClick={onDelete}
        >
          ✕
        </button>
      </div>

      {/* Expanded body — all fields collapsible */}
      {expanded && (
        <div className="border-t border-border px-4 pb-3 pt-2">
          <CollapsibleField
            label="Objective"
            value={mission.nextStep ?? ''}
            placeholder="Define the target"
            open={openField === 'nextStep'}
            onToggle={() => setOpenField(openField === 'nextStep' ? null : 'nextStep')}
            onChange={(v) => handleChange('nextStep', v)}
          />
          <CollapsibleField
            label="Challenge"
            value={mission.blocking ?? ''}
            placeholder="What's making this hard?"
            open={openField === 'blocking'}
            onToggle={() => setOpenField(openField === 'blocking' ? null : 'blocking')}
            onChange={(v) => handleChange('blocking', v)}
            accent={hasBlocker}
          />
          <CollapsibleField
            label="Notes"
            value={mission.description ?? ''}
            placeholder="Background, links..."
            open={openField === 'description'}
            onToggle={() => setOpenField(openField === 'description' ? null : 'description')}
            onChange={(v) => handleChange('description', v)}
            multiline
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

  return (
    <div className="border-t border-border/50 py-2">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-xs transition-colors hover:text-foreground"
        onClick={onToggle}
      >
        <svg
          aria-hidden="true"
          className={`h-3 w-3 shrink-0 transition-transform ${open ? 'rotate-90' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        <span
          className={`font-medium uppercase tracking-wider ${
            accent && hasValue ? 'text-[#D4605A]' : 'text-muted-foreground'
          }`}
        >
          {label}
        </span>
        {hasValue && !open && (
          <span className="ml-auto truncate text-muted-foreground font-normal normal-case tracking-normal">
            {value.trim().slice(0, 40)}
            {value.trim().length > 40 ? '...' : ''}
          </span>
        )}
      </button>
      {open &&
        (multiline ? (
          <textarea
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-2 w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            rows={3}
          />
        ) : (
          <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        ))}
    </div>
  );
}
