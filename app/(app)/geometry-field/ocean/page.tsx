import type { Metadata } from 'next';

import Ocean from '@/components/Ocean';

export const metadata: Metadata = {
  title: 'Ocean',
  description:
    'The sea in eight pieces: coral gardens, sea fans, table corals, clownfish pulsing out of their coral, five kinds of shoal, a swarm of small fish, jellyfish, and a reef channel swum through.',
};

export default function OceanPage() {
  return <Ocean />;
}
