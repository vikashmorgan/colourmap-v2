import type { Metadata } from 'next';

import Ocean from '@/components/Ocean';

export const metadata: Metadata = {
  title: 'Ocean',
  description:
    'The sea in five pieces: corals growing like trees, a shoal, a swarm of small fish, jellyfish, and a reef channel swum through.',
};

export default function OceanPage() {
  return <Ocean />;
}
