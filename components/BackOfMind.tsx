'use client';

import { useCallback, useEffect, useState } from 'react';

interface BacklogItem {
  id: string;
  title: string;
  done: boolean;
  createdAt: string;
}

export default function BackOfMind() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTitle, setNewTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [showAddInput, setShowAddInput] = useState(false);

  const fetchItems = useCallback(async () => {
    try {
      const res = await fetch('/api/backlog');
      if (res.ok) {
        setItems(await res.json());
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newTitle.trim() || adding) return;
    setAdding(true);
    try {
      const res = await fetch('/api/backlog', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle.trim() }),
      });
      if (res.ok) {
        const item = await res.json();
        setItems((prev) => [item, ...prev]);
        setNewTitle('');
        setShowAddInput(false);
      }
    } finally {
      setAdding(false);
    }
  }

  async function handleToggle(id: string, done: boolean) {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, done } : item)));
    await fetch(`/api/backlog/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ done }),
    });
  }

  async function handleDelete(id: string) {
    setItems((prev) => prev.filter((item) => item.id !== id));
    await fetch(`/api/backlog/${id}`, { method: 'DELETE' });
  }

  const pending = items.filter((i) => !i.done);
  const done = items.filter((i) => i.done);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <button
          type="button"
          aria-label="Add item"
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
            placeholder="What's lingering?"
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
          {[0, 1].map((i) => (
            <div key={`skeleton-${i}`} className="h-8 rounded-lg bg-muted animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="space-y-1">
          {pending.length === 0 && done.length === 0 && (
            <p className="text-sm text-muted-foreground py-2 text-center">Mind is clear.</p>
          )}

          {pending.map((item) => (
            <div key={item.id} className="flex items-center gap-2 py-1.5">
              <button
                type="button"
                aria-label={`Mark "${item.title}" as done`}
                className="h-4 w-4 shrink-0 rounded border border-muted-foreground transition-colors hover:border-primary"
                onClick={() => handleToggle(item.id, true)}
              />
              <span className="flex-1 text-sm">{item.title}</span>
              <button
                type="button"
                aria-label={`Remove "${item.title}"`}
                className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive opacity-0 group-hover:opacity-100"
                onClick={() => handleDelete(item.id)}
              >
                ✕
              </button>
            </div>
          ))}

          {done.length > 0 && (
            <div className="pt-2 space-y-1">
              <p className="text-xs text-muted-foreground">Cleared ({done.length})</p>
              {done.map((item) => (
                <div key={item.id} className="flex items-center gap-2 py-1 opacity-50">
                  <button
                    type="button"
                    aria-label={`Undo "${item.title}"`}
                    className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-primary bg-primary text-primary-foreground text-xs"
                    onClick={() => handleToggle(item.id, false)}
                  >
                    ✓
                  </button>
                  <span className="flex-1 text-sm line-through">{item.title}</span>
                  <button
                    type="button"
                    aria-label={`Remove "${item.title}"`}
                    className="shrink-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
                    onClick={() => handleDelete(item.id)}
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
