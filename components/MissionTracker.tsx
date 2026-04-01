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
            <div key={`skeleton-${i}`} className="h-10 rounded-xl bg-muted animate-pulse" />
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

  function handleChange(field: 'description' | 'blocking' | 'nextStep', value: string) {
    onFieldUpdate(field, value || null);

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

  const hasBlocker = mission.blocking && mission.blocking.trim().length > 0;
  const hasNextStep = mission.nextStep && mission.nextStep.trim().length > 0;

  return (
    <div
      className={`rounded-2xl border transition-all ${
        mission.completed
          ? 'border-border/50 opacity-60'
          : hasBlocker
            ? 'border-destructive/30'
            : 'border-border'
      }`}
    >
      {/* Header row */}
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
          className={`flex-1 text-left text-sm ${mission.completed ? 'line-through' : 'font-medium'}`}
          onClick={onToggleExpand}
        >
          {mission.title}
        </button>
        {!expanded && hasBlocker && (
          <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
            blocked
          </span>
        )}
        {!expanded && hasNextStep && !hasBlocker && (
          <span className="shrink-0 rounded-full bg-accent px-2 py-0.5 text-xs text-accent-foreground">
            next step
          </span>
        )}
        <button
          type="button"
          aria-label={`Delete "${mission.title}"`}
          className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
          onClick={onDelete}
        >
          ✕
        </button>
      </div>

      {/* Expanded card body */}
      {expanded && (
        <div className="border-t border-border space-y-0">
          {/* Objective */}
          <MissionField
            label="Objective"
            placeholder="What are you trying to achieve?"
            value={mission.description ?? ''}
            onChange={(v) => handleChange('description', v)}
          />

          {/* Blocking */}
          <MissionField
            label="Blocking"
            placeholder="What's in the way right now?"
            value={mission.blocking ?? ''}
            onChange={(v) => handleChange('blocking', v)}
            accent={hasBlocker ? 'destructive' : undefined}
          />

          {/* Next step */}
          <MissionField
            label="Next step"
            placeholder="The smallest thing that moves this forward"
            value={mission.nextStep ?? ''}
            onChange={(v) => handleChange('nextStep', v)}
          />
        </div>
      )}
    </div>
  );
}

interface MissionFieldProps {
  label: string;
  placeholder: string;
  value: string;
  onChange: (value: string) => void;
  accent?: 'destructive';
}

function MissionField({ label, placeholder, value, onChange, accent }: MissionFieldProps) {
  return (
    <div className="border-t border-border/50 px-4 py-3 space-y-1">
      <p
        className={`text-xs font-medium uppercase tracking-wider ${
          accent === 'destructive' && value ? 'text-destructive' : 'text-muted-foreground'
        }`}
      >
        {label}
      </p>
      <textarea
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full resize-none rounded-lg border-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
        rows={2}
      />
    </div>
  );
}
