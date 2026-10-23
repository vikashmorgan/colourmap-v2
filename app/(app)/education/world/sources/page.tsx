'use client';

import { useRouter } from 'next/navigation';

import DataSourcesGarden from '@/components/DataSourcesGarden';

export default function DataSourcesGardenPage() {
  const router = useRouter();
  return <DataSourcesGarden onSwitchToSelf={() => router.push('/education')} />;
}
