import type { Metadata } from 'next';

import LightBodies from '@/components/LightBodies';

export const metadata: Metadata = { title: 'Light Bodies' };

export default function LightBodiesPage() {
  return <LightBodies />;
}
