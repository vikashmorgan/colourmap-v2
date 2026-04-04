'use client';

import { useState } from 'react';

import MissionTracker from '@/components/MissionTracker';

export default function MissionsPage() {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <main className="mx-auto max-w-2xl">
      <p
        className="text-[15px] font-normal tracking-[0.08em] font-serif mb-6"
        style={{ color: '#5C3018' }}
      >
        Missions
      </p>
      <MissionTracker
        onMissionsChange={() => setRefreshKey((k) => k + 1)}
        refreshKey={refreshKey}
      />
    </main>
  );
}
