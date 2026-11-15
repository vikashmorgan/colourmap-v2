import type { Metadata } from 'next';

import HyperCity from '@/components/HyperCity';

export const metadata: Metadata = {
  title: 'Hyper-speed city',
  description:
    'Autopilot in a straight line at mega speed above neon cities generated as you go: a long avenue of light to its vanishing point, towers repeating to the horizon, speed streaks, the palette drifting slowly round the colour wheel.',
};

export default function HyperCityPage() {
  return <HyperCity />;
}
