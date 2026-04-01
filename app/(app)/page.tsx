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
