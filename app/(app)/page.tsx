'use client';

import { useState } from 'react';

import CheckInForm from '@/components/CheckInForm';
import CheckInHistory from '@/components/CheckInHistory';

export default function CockpitPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="space-y-10">
      <section className="space-y-4">
        <p className="text-xs uppercase tracking-[0.24em] text-muted-foreground">Cockpit</p>
        <div className="space-y-3">
          <h1 className="text-4xl font-semibold tracking-tight">
            Your life balance will land here.
          </h1>
          <p className="max-w-2xl text-sm leading-6 text-muted-foreground">
            This placeholder marks the authenticated product surface. Future work can replace it
            with the radar chart, current emotional state, and live Supabase-backed data flow from
            the V1 specs.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <CheckInForm onCheckInComplete={() => setRefreshKey((k) => k + 1)} />
          <CheckInHistory refreshKey={refreshKey} />
        </div>
        <div className="rounded-3xl border border-dashed border-border bg-card/50 p-6">
          <h2 className="text-lg font-medium">Life scan radar</h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Placeholder state until the stepped life scan and cockpit visualization land.
          </p>
        </div>
      </section>
    </main>
  );
}
