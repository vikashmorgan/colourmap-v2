import type { Metadata } from 'next';

import DriveWindow from '@/components/drive/DriveWindow';

export const metadata: Metadata = {
  title: 'Drive · autopilot',
  description: 'Drive on autopilot, touring its worlds: the view in the Grid’s porthole.',
  robots: { index: false },
};

export default function DriveWindowPage() {
  return <DriveWindow />;
}
