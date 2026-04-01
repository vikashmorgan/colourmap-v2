'use client';

import { useCallback, useEffect, useState } from 'react';

interface Tracker {
  id: string;
  label: string;
  type: string;
  position: number;
}

interface Section {
  id: string;
  name: string;
  trackers: Tracker[];
}

interface CockpitSectionsProps {
  initialSections?: Section[];
  initialEntries?: Record<string, number>;
}

export default function CockpitSections({ initialSections, initialEntries }: CockpitSectionsProps) {
  const [sections, setSections] = useState<Section[]>(initialSections ?? []);
  const [entries, setEntries] = useState<Record<string, number>>(initialEntries ?? {});
  const [loading, setLoading] = useState(!initialSections);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState('');

  const fetchSections = useCallback(async () => {
    try {
      const res = await fetch('/api/sections');
      if (res.ok) {
        const data = await res.json();
        setSections(data.sections);
        setEntries(data.entries);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!initialSections) fetchSections();
  }, [fetchSections, initialSections]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newName.trim()) return;
    const res = await fetch('/api/sections', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim() }),
    });
    if (res.ok) {
      setNewName('');
      setShowAdd(false);
      fetchSections();
    }
  }

  async function handleDeleteSection(id: string) {
    setSections((prev) => prev.filter((s) => s.id !== id));
    await fetch(`/api/sections/${id}`, { method: 'DELETE' });
  }

  async function handleEntryChange(sectionId: string, trackerId: string, value: number) {
    setEntries((prev) => ({ ...prev, [trackerId]: value }));
    await fetch(`/api/sections/${sectionId}/entries`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trackerId, value }),
    });
  }

  if (loading) {
    return (
      <div className="space-y-2">
        {[0, 1].map((i) => (
          <div key={`skeleton-${i}`} className="h-12 rounded-2xl bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (sections.length === 0 && !showAdd) {
    return (
      <button
        type="button"
        onClick={() => setShowAdd(true)}
        className="w-full rounded-2xl border border-dashed border-border py-3 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        + Add a cockpit section
      </button>
    );
  }

  return (
    <div className="space-y-4">
      {sections.map((section) => (
        <div key={section.id} className="rounded-3xl border border-border bg-card p-4 space-y-2">
          <div className="relative flex items-center justify-center">
            <button
              type="button"
              className="text-sm font-semibold uppercase tracking-[0.24em]"
              onClick={() => setExpandedId(expandedId === section.id ? null : section.id)}
            >
              {section.name}
            </button>
            <button
              type="button"
              aria-label={`Delete ${section.name}`}
              className="absolute right-0 text-xs text-muted-foreground transition-colors hover:text-destructive"
              onClick={() => handleDeleteSection(section.id)}
            >
              ✕
            </button>
          </div>

          {expandedId === section.id && (
            <div className="space-y-2 pt-1">
              {section.trackers.map((tracker) => (
                <TrackerRow
                  key={tracker.id}
                  tracker={tracker}
                  value={entries[tracker.id] ?? 0}
                  onChange={(v) => handleEntryChange(section.id, tracker.id, v)}
                />
              ))}
              {section.trackers.length === 0 && (
                <p className="text-xs text-muted-foreground text-center py-2">No trackers yet.</p>
              )}
            </div>
          )}
        </div>
      ))}

      {showAdd ? (
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            type="text"
            placeholder="Section name..."
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="flex-1 rounded-xl border border-border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
            // biome-ignore lint/a11y/noAutofocus: intentional
            autoFocus
          />
          <button
            type="submit"
            disabled={!newName.trim()}
            className="rounded-xl bg-[#5C3018] px-3 py-2 text-sm font-medium text-[#F5DEB8] transition-colors hover:bg-[#4A2810] disabled:opacity-50"
          >
            Add
          </button>
          <button
            type="button"
            onClick={() => setShowAdd(false)}
            className="text-xs text-muted-foreground"
          >
            ✕
          </button>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowAdd(true)}
          className="w-full rounded-2xl border border-dashed border-border py-2 text-xs text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
        >
          + Add section
        </button>
      )}
    </div>
  );
}

interface TrackerRowProps {
  tracker: Tracker;
  value: number;
  onChange: (value: number) => void;
}

function TrackerRow({ tracker, value, onChange }: TrackerRowProps) {
  if (tracker.type === 'check') {
    return (
      <div className="flex items-center gap-3 py-1">
        <button
          type="button"
          aria-label={`Toggle ${tracker.label}`}
          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 transition-colors ${
            value
              ? 'border-[#5C3018] bg-[#5C3018] text-[#F5DEB8] text-xs'
              : 'border-muted-foreground hover:border-primary'
          }`}
          onClick={() => onChange(value ? 0 : 1)}
        >
          {value ? '✓' : ''}
        </button>
        <span className={`text-sm ${value ? 'text-muted-foreground line-through' : ''}`}>
          {tracker.label}
        </span>
      </div>
    );
  }

  if (tracker.type === 'scale') {
    return (
      <div className="flex items-center gap-3 py-1">
        <span className="text-sm flex-1">{tracker.label}</span>
        <div className="flex gap-1">
          {[1, 2, 3, 4, 5].map((n) => (
            <button
              key={n}
              type="button"
              aria-label={`Rate ${tracker.label} ${n} of 5`}
              className={`h-4 w-4 rounded-full transition-colors ${
                n <= value ? 'bg-[#5C3018]' : 'bg-muted'
              }`}
              onClick={() => onChange(n === value ? 0 : n)}
            />
          ))}
        </div>
      </div>
    );
  }

  if (tracker.type === 'counter') {
    return (
      <div className="flex items-center gap-3 py-1">
        <span className="text-sm flex-1">{tracker.label}</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label={`Decrease ${tracker.label}`}
            className="h-6 w-6 rounded-full border border-border text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => onChange(Math.max(0, value - 1))}
          >
            −
          </button>
          <span className="text-sm font-medium w-6 text-center">{value}</span>
          <button
            type="button"
            aria-label={`Increase ${tracker.label}`}
            className="h-6 w-6 rounded-full border border-border text-xs text-muted-foreground transition-colors hover:text-foreground"
            onClick={() => onChange(value + 1)}
          >
            +
          </button>
        </div>
      </div>
    );
  }

  return null;
}
