import { isAuthSessionMissingError } from '@supabase/supabase-js';
import { cache } from 'react';

import { createClient } from '@/lib/supabase/server';

/**
 * The signed-in user for the public /chill pages, or null for a guest.
 * Cached per request so the layout and the page share one auth lookup.
 */
export const getChillUser = cache(async (): Promise<{ id: string; email: string } | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase.auth
    .getUser()
    .catch((err: unknown) => ({ data: { user: null }, error: err }));

  if (error && !isAuthSessionMissingError(error)) {
    throw error;
  }

  const user = data.user;
  return user ? { id: user.id, email: user.email ?? '' } : null;
});
