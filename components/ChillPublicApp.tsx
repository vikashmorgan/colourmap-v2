'use client';

import BinauralTuner from '@/components/BinauralTuner';
import { ChillAccountProvider, type ChillUser } from '@/components/ChillAccountContext';

/*
 * The public Chill Machine at /chill. Guests and signed-in email accounts both
 * land here; the account (or null) is shared through ChillAccountContext so
 * the recorder and saved-mixes panel can offer cloud saves when signed in.
 */
export default function ChillPublicApp({ user }: { user: ChillUser | null }) {
  return (
    <ChillAccountProvider user={user}>
      <BinauralTuner />
    </ChillAccountProvider>
  );
}
