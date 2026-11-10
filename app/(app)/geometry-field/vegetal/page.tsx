import type { Metadata } from 'next';

import Vegetal from '@/components/Vegetal';

export const metadata: Metadata = {
  title: 'Vegetal',
  description:
    'The plant world in thirteen pieces: a cell, roots from one base, a tree flat and in 3D, veins, fungi, a leaf, a flower, its fruit and seed, a road through an avenue, a forest along a river, the full tree in gold, and a tree in the water.',
};

export default function VegetalPage() {
  return <Vegetal />;
}
