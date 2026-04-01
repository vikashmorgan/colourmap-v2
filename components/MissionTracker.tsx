'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface Mission {
  id: string;
  title: string;
  description: string | null;
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

  const active = missions.filter((m) => !m.completed);
  const done = missions.filter((m) => m.completed);

  return (
    <div className="rounded-3xl border border-border bg-card p-6 space-y-4">
      <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Missions</p>

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
          className="rounded-xl bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
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
              onUpdateDescription={(desc) => {
                setMissions((prev) =>
                  prev.map((m) => (m.id === mission.id ? { ...m, description: desc } : m)),
                );
              }}
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
                  onUpdateDescription={(desc) => {
                    setMissions((prev) =>
                      prev.map((m) => (m.id === mission.id ? { ...m, description: desc } : m)),
                    );
                  }}
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
  onUpdateDescription: (description: string | null) => void;
}

function MissionCard({
  mission,
  expanded,
  onToggleExpand,
  onToggleComplete,
  onDelete,
  onUpdateDescription,
}: MissionCardProps) {
  const [descDraft, setDescDraft] = useState(mission.description ?? '');
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleDescChange(value: string) {
    setDescDraft(value);
    onUpdateDescription(value || null);

    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => {
      fetch(`/api/missions/${mission.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: value || null }),
      });
    }, 800);
  }

  return (
    <div
      className={`rounded-2xl border border-border transition-all ${mission.completed ? 'opacity-60' : ''}`}
    >
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
        <button
          type="button"
          aria-label={`Delete "${mission.title}"`}
          className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
          onClick={onDelete}
        >
          ✕
        </button>
      </div>

      {expanded && (
        <div className="border-t border-border px-4 py-3">
          <textarea
            placeholder="Add details about this mission..."
            value={descDraft}
            onChange={(e) => handleDescChange(e.target.value)}
            className="w-full resize-none rounded-lg border-none bg-transparent text-sm placeholder:text-muted-foreground focus:outline-none"
            rows={3}
          />
        </div>
      )}
    </div>
  );
}
