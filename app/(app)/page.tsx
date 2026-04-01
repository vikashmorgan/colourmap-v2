'use client';

import { useState } from 'react';

import BackOfMind from '@/components/BackOfMind';
import CheckInForm from '@/components/CheckInForm';
import CheckInHistory from '@/components/CheckInHistory';
import MissionTracker from '@/components/MissionTracker';

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
            Check in, track your missions, and see how you're moving.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <CheckInForm onCheckInComplete={() => setRefreshKey((k) => k + 1)} />
          <CheckInHistory refreshKey={refreshKey} />
        </div>
        <div className="space-y-4">
          <MissionTracker />
          <BackOfMind />
        </div>
      </section>
    </main>
  );
}
