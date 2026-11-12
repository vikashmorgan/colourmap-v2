import type { Metadata } from 'next';

import City from '@/components/City';

export const metadata: Metadata = {
  title: 'City',
  description:
    'A future neon city in seven pieces: towers growing from a grid of blocks, ships in layered sky lanes, neon, a Chinatown street of glowing signs and lanterns, sky bridges and docks, an endless street-canyon, and Ship, where you fly through it yourself.',
};

export default function CityPage() {
  return <City />;
}
