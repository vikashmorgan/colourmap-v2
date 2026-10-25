import type { Metadata } from 'next';

import LiquidButterflies from '@/components/LiquidButterflies';

export const metadata: Metadata = { title: 'Liquid Butterflies' };

export default function LiquidButterfliesPage() {
  return <LiquidButterflies />;
}
