import type { Metadata } from 'next';

import Journey from '@/components/Journey';

export const metadata: Metadata = {
  title: 'Journey',
  description:
    'After the Big Bang: one trip of light from a warm sea to bacteria, cells, a school of fish, a tree, its pulses, its roots and a seed.',
};

export default function JourneyPage() {
  return <Journey />;
}
