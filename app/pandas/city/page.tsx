import { readFile } from 'node:fs/promises';
import path from 'node:path';

import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import PandasCity from '@/components/PandasCity';
import { parsePandasCourse } from '@/lib/pandas-city';
import { createClient } from '@/lib/supabase/server';

/*
 * /pandas/city — the Pandas class as a map seen from above: eight lesson
 * cities on a golden ring, every part in its own place and shape, so the
 * lessons are remembered by where they stand. The lessons are read from the
 * class page itself (content/pandas/index.html), so a new one appears on its
 * own. Signed-in only, like /pandas. Spec: docs/specs/pandas-city.md.
 */

const PAGE_PATH = path.join(process.cwd(), 'content', 'pandas', 'index.html');

export const metadata: Metadata = {
  title: 'Pandas city',
  description:
    'The Pandas lessons as cities seen from above: every part has its place and its shape.',
  robots: { index: false, follow: false },
};

export default async function PandasCityPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/pandas/city');

  const lessons = parsePandasCourse(await readFile(PAGE_PATH, 'utf8'));
  return <PandasCity lessons={lessons} />;
}
