'use client';

import { useRouter, useSearchParams } from 'next/navigation';

import GeopoliticsWorld from '@/components/GeopoliticsWorld';

export default function GeopoliticsWorldPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialPageSlug = searchParams?.get('page') ?? null;

  return (
    <GeopoliticsWorld
      onSwitchToSelf={() => router.push('/education')}
      onOpenIntel={() => router.push('/education/world/intel')}
      onOpenMap={() => router.push('/education/world/map')}
      onOpenGraph={() => router.push('/education/world/graph')}
      onOpenSources={() => router.push('/education/world/sources')}
      onOpenSpace={() => router.push('/education/world/space')}
      initialPageSlug={initialPageSlug}
    />
  );
}
