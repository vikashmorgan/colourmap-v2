import type { Metadata } from 'next';

import City from '@/components/City';

export const metadata: Metadata = {
  title: 'City',
  description:
    'A golden city grown from φ, then a future neon city, in fourteen pieces: the golden plan lit ring by ring, the city rising from its map, its open heart of light, five temples, five factories, five golden glass domes, five night cities seen from above, towers growing from a grid of blocks, ships in layered sky lanes, neon, a Chinatown street of glowing signs and lanterns, sky bridges and docks, an endless street-canyon, and Ship, where you fly through it yourself.',
};

export default function CityPage() {
  return <City />;
}
