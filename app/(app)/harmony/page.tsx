'use client';

import dynamic from 'next/dynamic';

const HarmonyMachine = dynamic(() => import('@/components/HarmonyMachine'), {
  ssr: false,
  loading: () => (
    <main
      style={{
        minHeight: 'calc(100svh - 64px)',
        background: '#04050b',
        color: 'rgba(232,194,122,0.8)',
        fontFamily: 'var(--font-serif)',
        padding: 24,
      }}
    >
      Loading the planet…
    </main>
  ),
});

export default function HarmonyPage() {
  return <HarmonyMachine />;
}
