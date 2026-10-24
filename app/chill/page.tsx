import { redirect } from 'next/navigation';

import { CHILL_URL } from '@/lib/chill/url';

/** The Chill Machine moved to its own app (2026-10-24); /chill sends people there. */
export default function ChillPage() {
  redirect(CHILL_URL);
}
