'use client';

import CockpitSections from '@/components/CockpitSection';

export default function ProgramsPage() {
  return (
    <main className="mx-auto max-w-lg space-y-6">
      <p className="text-center text-lg font-semibold tracking-wide" style={{ color: '#5C3018' }}>
        Programs
      </p>
      <CockpitSections />
    </main>
  );
}
