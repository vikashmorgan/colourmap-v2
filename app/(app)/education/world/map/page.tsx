'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const GeopoliticsLeafletMap = dynamic(() => import('@/components/GeopoliticsLeafletMap'), {
  ssr: false,
  loading: () => (
    <main
      style={{
        minHeight: 'calc(100svh - 120px)',
        background: 'linear-gradient(180deg, rgba(236,220,188,0.78), rgba(206,184,145,0.34))',
        width: 'calc(100% + 48px)',
        marginInline: '-24px',
        padding: 'clamp(10px, 2vw, 22px) clamp(12px, 4vw, 28px)',
        color: 'rgba(40,32,22,0.7)',
        fontFamily: 'var(--font-serif)',
      }}
    >
      Loading map…
    </main>
  ),
});

export default function GeopoliticsMapPage() {
  const router = useRouter();
  return (
    <GeopoliticsLeafletMap
      onSwitchToSelf={() => router.push('/education')}
      onOpenPage={(slug) => router.push(`/education/world?page=${slug}`)}
    />
  );
}
