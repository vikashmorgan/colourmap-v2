'use client';

import { useCallback, useEffect, useState } from 'react';

import BackOfMind from '@/components/BackOfMind';
import CheckInForm from '@/components/CheckInForm';
import CheckInHistory from '@/components/CheckInHistory';
import CockpitSections from '@/components/CockpitSection';
import CollapsibleCard from '@/components/CollapsibleCard';
import MissionTracker from '@/components/MissionTracker';

interface MissionSummary {
  id: string;
  title: string;
}

export default function CockpitPage() {
  const [refreshKey, setRefreshKey] = useState(0);
  const [missions, setMissions] = useState<MissionSummary[]>([]);

  const fetchMissions = useCallback(async () => {
    try {
      const res = await fetch('/api/missions');
      if (res.ok) {
        const data = await res.json();
        setMissions(
          data
            .filter((m: { completed: boolean }) => !m.completed)
            .map((m: { id: string; title: string }) => ({ id: m.id, title: m.title })),
        );
      }
    } catch {
      // silent
    }
  }, []);

  useEffect(() => {
    fetchMissions();
  }, [fetchMissions]);

  return (
    <main className="space-y-10">
      <section className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <CollapsibleCard title="Check In" defaultOpen>
            <CheckInForm
              missions={missions}
              onCheckInComplete={() => setRefreshKey((k) => k + 1)}
            />
          </CollapsibleCard>
          <CheckInHistory refreshKey={refreshKey} missions={missions} />
        </div>
        <div className="space-y-4">
          <CollapsibleCard title="Current Mission" defaultOpen>
            <MissionTracker onMissionsChange={fetchMissions} refreshKey={refreshKey} />
          </CollapsibleCard>
          <CollapsibleCard title="Back of my mind">
            <BackOfMind />
          </CollapsibleCard>
          <CockpitSections />
        </div>
      </section>
    </main>
  );
}
