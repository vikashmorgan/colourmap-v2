import type { Metadata } from 'next';

import BigBang from '@/components/BigBang';

export const metadata: Metadata = {
  title: 'The Big Bang',
  description:
    'One continuous trip of light: from an explosion to stars, light, symmetry, depth, fractals and life.',
};

export default function BigBangPage() {
  return <BigBang />;
}
