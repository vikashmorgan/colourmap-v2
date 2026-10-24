import { redirect } from 'next/navigation';

import { CHILL_URL } from '@/lib/chill/url';

/** Chill Machine accounts now sign in inside the Chill Machine app itself. */
export default function ChillLoginPage() {
  redirect(CHILL_URL);
}
