'use client';

import type { SectionSuggestion } from '@/lib/life-scan-config';

interface ScanSuggestionsProps {
  suggestions: SectionSuggestion[];
  onAccept: (suggestion: SectionSuggestion) => void;
  onDismiss: (index: number) => void;
  accepted: Set<number>;
}

export default function ScanSuggestions({
  suggestions,
  onAccept,
  onDismiss,
  accepted,
}: ScanSuggestionsProps) {
  if (suggestions.length === 0) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm font-semibold uppercase tracking-[0.24em]">You're balanced</p>
        <p className="text-sm text-muted-foreground">
          No areas scored low enough to suggest new sections. Keep doing what you're doing.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center space-y-2">
        <p className="text-sm font-semibold uppercase tracking-[0.24em]">Your program</p>
        <p className="text-xs text-muted-foreground">
          Based on your scan, here are suggested sections for your cockpit.
        </p>
      </div>

      {suggestions.map((s, i) => (
        <div
          key={s.name}
          className={`rounded-2xl border px-4 py-4 space-y-3 ${
            accepted.has(i) ? 'border-[#5BB848]/30 bg-[#5BB848]/5' : 'border-border'
          }`}
        >
          <p className="text-sm font-semibold">{s.name}</p>
          <div className="space-y-1">
            {s.trackers.map((t) => (
              <div key={t.label} className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>
                  {t.type === 'check' && '✓'}
                  {t.type === 'scale' && '●●●○○'}
                  {t.type === 'counter' && '#'}
                </span>
                <span>{t.label}</span>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            {accepted.has(i) ? (
              <p className="text-xs text-[#5BB848] font-medium">Added to cockpit</p>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => onAccept(s)}
                  className="rounded-xl bg-[#5C3018] px-3 py-1.5 text-xs font-medium text-[#F5DEB8] transition-colors hover:bg-[#4A2810]"
                >
                  Add to cockpit
                </button>
                <button
                  type="button"
                  onClick={() => onDismiss(i)}
                  className="rounded-xl px-3 py-1.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  Skip
                </button>
              </>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
