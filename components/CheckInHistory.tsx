'use client';

import { useCallback, useEffect, useState } from 'react';

import { getEmotionalWord } from '@/lib/emotional-vocabulary';

interface HistoryEntry {
  id: string;
  sliderValue: number;
  note: string | null;
  createdAt: string;
}

function getDotColor(value: number): string {
  if (value <= 25) return 'hsl(220 15% 55%)';
  if (value <= 62) return 'hsl(40 15% 55%)';
  return 'hsl(25 70% 55%)';
}

function getRelativeTime(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diffMs = now - then;
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays === 1) return 'yesterday';
  return `${diffDays} days ago`;
}

interface CheckInHistoryProps {
  refreshKey: number;
}

export default function CheckInHistory({ refreshKey }: CheckInHistoryProps) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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
    // refreshKey triggers refetch after new check-in
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

  const dots = [...entries].reverse();

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-3 py-4">
        {dots.length > 1 && (
          <div
            className="absolute h-px bg-border"
            style={{ width: `${(dots.length - 1) * 28}px` }}
          />
        )}
        {dots.map((entry) => (
          <button
            key={entry.id}
            type="button"
            aria-label={`Check-in: ${getEmotionalWord(entry.sliderValue)}`}
            className="relative h-3.5 w-3.5 rounded-full transition-transform hover:scale-125 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            style={{ backgroundColor: getDotColor(entry.sliderValue) }}
            onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
          />
        ))}
      </div>
      {expandedId &&
        (() => {
          const entry = entries.find((e) => e.id === expandedId);
          if (!entry) return null;
          return (
            <div className="rounded-2xl border border-border bg-card/80 px-4 py-3 text-center text-sm space-y-1">
              <p className="font-medium">{getEmotionalWord(entry.sliderValue)}</p>
              {entry.note && (
                <p className="text-muted-foreground">
                  {entry.note.length > 100 ? `${entry.note.slice(0, 100)}…` : entry.note}
                </p>
              )}
              <p className="text-xs text-muted-foreground">{getRelativeTime(entry.createdAt)}</p>
            </div>
          );
        })()}
    </div>
  );
}
