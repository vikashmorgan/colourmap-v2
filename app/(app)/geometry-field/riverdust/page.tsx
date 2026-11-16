import type { Metadata } from 'next';

import Riverdust from '@/components/Riverdust';

export const metadata: Metadata = {
  title: 'Riverdust',
  description:
    'A desert town in glowing grains at dusk, seven categories of designs: prayer flags, banners, lanterns and lamp tunnels; nomad tents and camps; a souk under burgundy cloths; mud-brick houses and towers; a cavern and rock; the river, its bridge and oasis; and the race gate with its grandstands.',
};

export default function RiverdustPage() {
  return <Riverdust />;
}
