import type { Metadata } from 'next';

import DriveGame from '@/components/DriveGame';

export const metadata: Metadata = {
  title: 'Drive',
  description:
    'A racing game grown from the Speed pieces: the red car or a hover ship on the endless Salt Flat at sunset, a banked Coast Road, a Canyon Race with jumps and obstacles, and three wet night tracks (Night Rain, Chinatown Run, Neon District) mirrored in the road.',
};

export default function DrivePage() {
  return <DriveGame />;
}
