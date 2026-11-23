import type { Metadata } from 'next';

import CollectiveBrain from '@/components/collective/CollectiveBrain';

export const metadata: Metadata = {
  title: { absolute: 'Collective Brain' },
  description:
    'Map how a small group combines: strengths, places, moments and intentions, with Claude.',
};

export default function CollectivePage() {
  return <CollectiveBrain />;
}
