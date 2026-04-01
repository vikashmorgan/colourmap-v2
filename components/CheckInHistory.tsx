'use client';

import { useCallback, useEffect, useState } from 'react';

import { getEmotionalWord } from '@/lib/emotional-vocabulary';

interface HistoryEntry {
  id: string;
  sliderValue: number;
  note: string | null;
  tags: string[] | null;
  createdAt: string;
}

function getDotColor(value: number): string {
  if (value <= 25) return 'hsl(220 15% 55%)';
  if (value <= 62) return 'hsl(40 15% 55%)';
  return 'hsl(25 70% 55%)';
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getDate() === now.getDate() &&
    date.getMonth() === now.getMonth() &&
    date.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    date.getDate() === yesterday.getDate() &&
    date.getMonth() === yesterday.getMonth() &&
    date.getFullYear() === yesterday.getFullYear();

  if (isToday) return 'Today';
  if (isYesterday) return 'Yesterday';
  return date.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });
}

function groupByDate(entries: HistoryEntry[]): Map<string, HistoryEntry[]> {
  const groups = new Map<string, HistoryEntry[]>();
  for (const entry of entries) {
    const key = new Date(entry.createdAt).toLocaleDateString();
    const group = groups.get(key) ?? [];
    group.push(entry);
    groups.set(key, group);
  }
  return groups;
}

interface CheckInHistoryProps {
  refreshKey: number;
}

export default function CheckInHistory({ refreshKey }: CheckInHistoryProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const fetchHistory = useCallback(async () => {
    try {
      const res = await fetch('/api/check-ins');
      if (res.ok) {
        const data = await res.json();
        setEntries(data);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshKey;
    fetchHistory();
  }, [fetchHistory, refreshKey]);

  if (loading) {
    return (
      <div
        role="status"
        aria-label="Loading history"
        className="flex items-center justify-center gap-3 py-4"
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={`skeleton-${i}`} className="h-3 w-3 rounded-full bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (entries.length === 0) return null;

  const grouped = groupByDate(entries);

  return (
    <div className="space-y-2">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-center gap-3 rounded-2xl border border-border bg-card/80 px-4 py-3 transition-colors hover:bg-card"
      >
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">
          Recent reflections
        </p>
        <span className="text-xs text-muted-foreground">({entries.length})</span>
        <svg
          aria-hidden="true"
          className={`h-4 w-4 shrink-0 text-muted-foreground transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="space-y-4 pt-2">
          {[...grouped.entries()].map(([dateKey, dayEntries]) => (
            <div key={dateKey} className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                {formatDate(dayEntries[0].createdAt)}
              </p>
              <div className="space-y-2">
                {dayEntries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 rounded-2xl border border-border bg-card/80 px-4 py-3"
                  >
                    <div
                      className="mt-1 h-3 w-3 shrink-0 rounded-full"
                      style={{ backgroundColor: getDotColor(entry.sliderValue) }}
                    />
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">{getEmotionalWord(entry.sliderValue)}</p>
                        <p className="shrink-0 text-xs text-muted-foreground">
                          {formatTime(entry.createdAt)}
                        </p>
                      </div>
                      {entry.note && <p className="text-sm text-muted-foreground">{entry.note}</p>}
                      {entry.tags && entry.tags.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {entry.tags.map((tag) => (
                            <span
                              key={tag}
                              className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
