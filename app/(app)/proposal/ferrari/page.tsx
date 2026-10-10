import type { Metadata } from 'next';

import FerrariPitch from '@/components/FerrariPitch';

export const metadata: Metadata = { title: 'Ferrari pitch' };

export default function FerrariPitchPage() {
  return <FerrariPitch />;
}
