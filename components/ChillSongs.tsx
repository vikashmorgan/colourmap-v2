'use client';

import { useEffect, useRef, useState } from 'react';

import { createClient } from '@/lib/supabase/client';

/*
 * SONGS — the Chill Machine piano, inside Music, with its song library kept
 * in the user's account.
 *
 * The piano is its own app (chill-machine, chillmachine.vercel.app) and stays
 * usable on its own, keeping songs in that browser. Here it runs in a frame
 * opened with ?store=brain&parent=<this origin>, and asks this page by
 * postMessage to load and save its library (segments and songs, as notes).
 * This page keeps it in user_prefs under one key, so no new table is needed.
 *
 * Only messages from the piano's own origin and from this frame are answered,
 * and replies go to that origin only.
 */

export const CHILL_URL = process.env.NEXT_PUBLIC_CHILL_URL ?? 'https://chillmachine.vercel.app';
export const LIBRARY_KEY = 'chill:library';

type Msg = { type?: unknown; id?: unknown; library?: unknown };

async function loadLibrary(): Promise<unknown> {
  const { data, error } = await createClient()
    .from('user_prefs')
    .select('value')
    .eq('key', LIBRARY_KEY)
    .maybeSingle();
  if (error) throw error;
  return data?.value ?? null;
}

async function saveLibrary(library: unknown): Promise<void> {
  const { error } = await createClient()
    .from('user_prefs')
    .upsert(
      { key: LIBRARY_KEY, value: library, updated_at: new Date().toISOString() },
      { onConflict: 'user_id,key' },
    );
  if (error) throw error;
}

export default function ChillSongs() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const chillOrigin = new URL(CHILL_URL).origin;

  useEffect(() => {
    const url = new URL(CHILL_URL);
    url.searchParams.set('mode', 'piano');
    url.searchParams.set('store', 'brain');
    url.searchParams.set('parent', window.location.origin);
    setSrc(url.toString());
  }, []);

  useEffect(() => {
    const reply = (message: Record<string, unknown>) =>
      frame.current?.contentWindow?.postMessage(message, chillOrigin);

    const on = async (e: MessageEvent) => {
      if (e.origin !== chillOrigin || e.source !== frame.current?.contentWindow) return;
      const data = (e.data ?? {}) as Msg;
      if (typeof data.id !== 'string') return;
      if (data.type === 'chill:load') {
        try {
          reply({ type: 'chill:library', id: data.id, library: await loadLibrary() });
        } catch {
          // Never answer an empty library on failure: the piano would save over the real one.
          reply({ type: 'chill:library', id: data.id, error: true });
        }
      } else if (data.type === 'chill:save') {
        try {
          await saveLibrary(data.library);
          reply({ type: 'chill:saved', id: data.id, ok: true });
        } catch {
          reply({ type: 'chill:saved', id: data.id, ok: false });
        }
      }
    };
    window.addEventListener('message', on);
    return () => window.removeEventListener('message', on);
  }, [chillOrigin]);

  return (
    <div className="flex flex-col gap-2">
      <p className="text-center text-xs" style={{ color: '#A0907A' }}>
        Record a loop, save it as a segment, and chain segments into a song. Kept in your account.{' '}
        <a href={CHILL_URL} target="_blank" rel="noreferrer" style={{ color: '#C4A060' }}>
          Open the piano on its own ↗
        </a>
      </p>
      {src && (
        <iframe
          ref={frame}
          src={src}
          title="Chill Machine piano and songs"
          allow="autoplay; midi"
          className="w-full rounded-2xl"
          style={{ height: '85vh', border: '1px solid #C4A06033', background: '#16120E' }}
        />
      )}
    </div>
  );
}
