'use client';

import { useCompletion } from '@ai-sdk/react';
import { useState } from 'react';

interface CheckInAnalysisProps {
  hasEntries: boolean;
}

export default function CheckInAnalysis({ hasEntries }: CheckInAnalysisProps) {
  const [open, setOpen] = useState(false);
  const [hasRequested, setHasRequested] = useState(false);

  const { completion, isLoading, complete } = useCompletion({
    api: '/api/check-ins/analysis',
    streamProtocol: 'text',
  });

  function handleToggle() {
    if (!open && !hasRequested && hasEntries) {
      setHasRequested(true);
      complete('');
    }
    setOpen(!open);
  }

  if (!hasEntries) return null;

  return (
    <div className="border-t border-border/50 pt-3">
      <button
        type="button"
        className="flex w-full items-center gap-1.5 text-xs transition-colors hover:text-foreground"
        onClick={handleToggle}
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
        <span className="font-medium uppercase tracking-wider text-muted-foreground">Analysis</span>
      </button>

      {open && (
        <div className="mt-3 rounded-xl bg-card/50 px-4 py-3">
          {isLoading && !completion && (
            <p className="text-xs text-muted-foreground animate-pulse">Reflecting...</p>
          )}
          {completion && <p className="text-sm leading-relaxed text-foreground/80">{completion}</p>}
          {!isLoading && !completion && hasRequested && (
            <p className="text-xs text-muted-foreground">
              Add an ANTHROPIC_API_KEY to .env.local to enable analysis.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
