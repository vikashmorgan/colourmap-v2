import type { Metadata } from 'next';

import Ocean from '@/components/Ocean';

export const metadata: Metadata = {
  title: 'Ocean',
  description:
    'The sea in nine pieces: coral gardens, sea fans, table corals, clownfish hiding from a hunter in their coral, eleven kinds of shoal led by your cursor, ten swarms of small fish, five kinds of jellyfish, a reef channel swum through, and Shark Sim, where you are the hammerhead in three seas.',
};

export default function OceanPage() {
  return <Ocean />;
}
