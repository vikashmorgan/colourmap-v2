import type { Metadata } from 'next';

import Vegetal from '@/components/Vegetal';

export const metadata: Metadata = {
  title: 'Vegetal',
  description:
    'The plant world in eight pieces: a cell, roots from one base, a tree flat and in 3D, fungi, a leaf, a flower and its fruit and seed.',
};

export default function VegetalPage() {
  return <Vegetal />;
}
