import { createServerClient } from '@supabase/ssr';
import type { SupabaseClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';

import { getRequiredEnv } from '@/lib/env';

const DEV_USER = {
  id: '00000000-0000-0000-0000-000000000000',
  email: 'dev@localhost',
  aud: 'authenticated',
  role: 'authenticated',
  created_at: new Date().toISOString(),
};

function createDevClient(): SupabaseClient {
  return {
    auth: {
      getUser: async () => ({ data: { user: DEV_USER }, error: null }),
      signOut: async () => ({ error: null }),
    },
  } as unknown as SupabaseClient;
}

export async function createClient() {
  if (process.env.DEV_BYPASS_AUTH === 'true') {
    return createDevClient();
  }

  const cookieStore = await cookies();

  return createServerClient(
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL'),
    getRequiredEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // Server Components cannot write response cookies; proxy refresh handles that path.
          }
        },
      },
    },
  );
}
