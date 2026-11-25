import type { Metadata } from 'next';

import DriveGame from '@/components/DriveGame';

/** The drive game on its own, full screen, no app around it (lib/drive-site.ts). */
export const metadata: Metadata = {
  title: 'Colour Drive',
  description:
    'A racing game: a hover ship or a car across sunset salt flats, banked coast roads, canyons, Chinatown at night with Undertown under its street, the Neon District and Mars.',
};

export default function PlayPage() {
  return <DriveGame />;
}
