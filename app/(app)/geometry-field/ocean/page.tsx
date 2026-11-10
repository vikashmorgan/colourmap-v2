import type { Metadata } from 'next';

import Ocean from '@/components/Ocean';

export const metadata: Metadata = {
  title: 'Ocean',
  description:
    'The sea in eight pieces: coral gardens, sea fans, table corals, clownfish hiding from a hunter in their coral, eleven kinds of shoal led by your cursor, ten swarms of small fish, five kinds of jellyfish, and a reef channel swum through.',
};

export default function OceanPage() {
  return <Ocean />;
}
