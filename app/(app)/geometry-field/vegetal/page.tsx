import type { Metadata } from 'next';

import Vegetal from '@/components/Vegetal';

export const metadata: Metadata = {
  title: 'Vegetal',
  description:
    'The plant world in eleven pieces: a cell, roots from one base, a tree flat and in 3D, veins, fungi, a leaf, a flower, its fruit and seed, and a road through a forest.',
};

export default function VegetalPage() {
  return <Vegetal />;
}
