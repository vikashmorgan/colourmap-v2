import type { Metadata } from 'next';

import TheGrid from '@/components/TheGrid';

export const metadata: Metadata = { title: 'The Grid' };

export default function GridPage() {
  return <TheGrid />;
}
