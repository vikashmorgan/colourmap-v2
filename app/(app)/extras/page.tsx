'use client';

import QuickScan from '@/components/QuickScan';

export default function ExtrasPage() {
  return (
    <main className="mx-auto max-w-lg space-y-8">
      <p className="text-center text-lg font-semibold tracking-wide" style={{ color: '#5C3018' }}>
        Extra
      </p>

      <div className="rounded-3xl border border-border bg-card p-6">
        <p className="text-xs font-semibold text-center uppercase tracking-widest text-muted-foreground mb-4">
          Quick Scan
        </p>
        <QuickScan />
      </div>
    </main>
  );
}
