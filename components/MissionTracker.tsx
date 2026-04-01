'use client';

import { useCallback, useEffect, useState } from 'react';

interface Mission {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
}

export default function MissionTracker() {
  const [missions, setMissions] = useState<Mission[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);

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
            <div
              key={mission.id}
              className="flex items-center gap-3 rounded-xl border border-border px-3 py-2.5"
            >
              <button
                type="button"
                aria-label={`Mark "${mission.title}" as complete`}
                className="h-5 w-5 shrink-0 rounded-full border-2 border-muted-foreground transition-colors hover:border-primary"
                onClick={() => handleToggle(mission.id, true)}
              />
              <span className="flex-1 text-sm">{mission.title}</span>
              <button
                type="button"
                aria-label={`Delete "${mission.title}"`}
                className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
                onClick={() => handleDelete(mission.id)}
              >
                ✕
              </button>
            </div>
          ))}

          {done.length > 0 && (
            <div className="space-y-2 pt-2">
              <p className="text-xs text-muted-foreground">Done ({done.length})</p>
              {done.map((mission) => (
                <div
                  key={mission.id}
                  className="flex items-center gap-3 rounded-xl border border-border/50 px-3 py-2.5 opacity-60"
                >
                  <button
                    type="button"
                    aria-label={`Mark "${mission.title}" as incomplete`}
                    className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground text-xs"
                    onClick={() => handleToggle(mission.id, false)}
                  >
                    ✓
                  </button>
                  <span className="flex-1 text-sm line-through">{mission.title}</span>
                  <button
                    type="button"
                    aria-label={`Delete "${mission.title}"`}
                    className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
                    onClick={() => handleDelete(mission.id)}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
