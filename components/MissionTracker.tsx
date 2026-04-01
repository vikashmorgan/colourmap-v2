'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Mission {
  id: string;
  title: string;
  description: string | null;
  blocking: string | null;
  nextStep: string | null;
  completed: boolean;
  createdAt: string;
}

function getStatusColor(mission: Mission): string {
  if (mission.completed) return 'bg-primary/40';
  if (mission.blocking?.trim()) return 'bg-[#D4605A]';
  if (mission.nextStep?.trim()) return 'bg-[#5BB848]';
  return 'bg-muted-foreground/40';
}

function getPreview(mission: Mission): string | null {
  if (mission.blocking?.trim()) return mission.blocking.trim();
  if (mission.nextStep?.trim()) return mission.nextStep.trim();
  return null;
}

export default function MissionTracker() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
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
        setExpandedId(mission.id);
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
  }

  function handleFieldUpdate(id: string, field: string, value: string | null) {
    setMissions((prev) => prev.map((m) => (m.id === id ? { ...m, [field]: value } : m)));
  }

  const active = missions.filter((m) => !m.completed);
  const done = missions.filter((m) => m.completed);

  return (
    <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
      <p className="text-sm font-semibold uppercase tracking-[0.24em] text-center">
        Current Mission
      </p>

      <form onSubmit={handleAdd} className="flex gap-2">
        <input
          type="text"
          placeholder="Add a mission..."
          value={newTitle}
          onChange={(e) => setNewTitle(e.target.value)}
          className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        <button
          type="submit"
          disabled={!newTitle.trim() || adding}
          className="rounded-xl bg-[#5C3018] px-3 py-2 text-sm font-medium text-[#F5DEB8] transition-colors hover:bg-[#4A2810] disabled:opacity-50"
        >
          {adding ? '...' : 'Add'}
        </button>
      </form>

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
}

function MissionCard({
  mission,
  expanded,
  onToggleExpand,
  onToggleComplete,
  onDelete,
  onFieldUpdate,
}: MissionCardProps) {
  const saveTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());
  const [showContext, setShowContext] = useState(false);

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
          <div
            className={`h-2.5 w-2.5 shrink-0 rounded-full ${getStatusColor(mission)}`}
            aria-hidden="true"
          />
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

      {/* Expanded body */}
      {expanded && (
        <div className="border-t border-border px-4 pb-4 pt-3 space-y-3">
          {/* Objective */}
          <div className="space-y-1.5">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Objective
            </p>
            <div className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
              <span className="text-muted-foreground" aria-hidden="true">
                →
              </span>
              <input
                type="text"
                placeholder="What does done look like?"
                value={mission.nextStep ?? ''}
                onChange={(e) => handleChange('nextStep', e.target.value)}
                className="flex-1 bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* Challenge */}
          <div className="space-y-1.5">
            <p
              className={`text-xs font-medium uppercase tracking-wider ${
                hasBlocker ? 'text-[#D4605A]' : 'text-muted-foreground'
              }`}
            >
              Challenge
            </p>
            <div
              className={`rounded-xl border px-3 py-2 ${
                hasBlocker ? 'border-[#D4605A]/30 bg-[#D4605A]/5' : 'border-border'
              }`}
            >
              <input
                type="text"
                placeholder="What's making this hard?"
                value={mission.blocking ?? ''}
                onChange={(e) => handleChange('blocking', e.target.value)}
                className="w-full bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
              />
            </div>
          </div>

          {/* More context — collapsible */}
          <div>
            <button
              type="button"
              className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              onClick={() => setShowContext(!showContext)}
            >
              <svg
                aria-hidden="true"
                className={`h-3 w-3 transition-transform ${showContext ? 'rotate-90' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
              More context
              {mission.description?.trim() && !showContext && (
                <span className="ml-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/50" />
              )}
            </button>
            {showContext && (
              <textarea
                placeholder="Background, notes, links..."
                value={mission.description ?? ''}
                onChange={(e) => handleChange('description', e.target.value)}
                className="mt-2 w-full resize-none rounded-xl border border-border bg-transparent px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                rows={3}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
