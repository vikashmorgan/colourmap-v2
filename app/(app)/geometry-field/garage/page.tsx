import type { Metadata } from 'next';

import Garage from '@/components/Garage';

export const metadata: Metadata = {
  title: 'Garage',
  description:
    'A dark space garage with a raised turntable: build your car or hover ship (hull in chrome, gold or your own colour, fire, flames, speedometer, driving mode), turn it round, then take it out to Drive.',
};

export default function GaragePage() {
  return <Garage />;
}
