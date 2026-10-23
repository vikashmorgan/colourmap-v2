'use client';

import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';

const GeopoliticsSpace = dynamic(() => import('@/components/GeopoliticsSpace'), {
  ssr: false,
  loading: () => (
    <main
      style={{
        minHeight: 'calc(100svh - 120px)',
        background: 'radial-gradient(circle at 50% 50%, rgba(30,20,12,1), rgba(10,6,3,1))',
        color: 'rgba(240,216,152,0.74)',
        fontFamily: 'var(--font-serif)',
        padding: 'clamp(10px, 2vw, 22px) clamp(12px, 4vw, 28px)',
      }}
    >
      Loading space…
    </main>
  ),
});

export default function GeopoliticsSpacePage() {
  const router = useRouter();
  return (
    <GeopoliticsSpace
      onSwitchToSelf={() => router.push('/education')}
      onOpenPage={(slug) => router.push(`/education/world?page=${slug}`)}
    />
  );
}
