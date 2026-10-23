import { NextResponse } from 'next/server';

import { jsonError, withAuthenticatedUser } from '@/lib/api/route-helpers';
import {
  isSlideFile,
  MAX_SLIDE_BYTES,
  SLIDE_FILES,
  SLIDES_BUCKET,
  slideContentType,
  slidePath,
} from '@/lib/coding/slides';
import { createClient } from '@/lib/supabase/server';

/*
 * The signed-in user's own copies of the course slides.
 *
 *   GET   → { uploaded: ["Session1.pdf", ...] }
 *   POST  multipart, field "file": upload or replace one slide deck (or the
 *         SQL class's business case, SQLBusinessCase.sql, stored as text)
 *
 * One file per request keeps each upload under the hosting body limit.
 * Storage policies also confine every object to the user's own folder.
 */

export async function GET() {
  return withAuthenticatedUser(async (user) => {
    const supabase = await createClient();
    const { data, error } = await supabase.storage.from(SLIDES_BUCKET).list(user.id);
    if (error) return jsonError(error.message, 502);
    const uploaded = (data ?? []).map((o) => o.name).filter(isSlideFile);
    return NextResponse.json({ uploaded, expected: SLIDE_FILES });
  });
}

export async function POST(request: Request) {
  return withAuthenticatedUser(async (user) => {
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError('expected a form upload', 400);
    }
    const file = form.get('file');
    if (!(file instanceof File)) return jsonError('file required', 400);
    if (!isSlideFile(file.name)) {
      return jsonError(`file must be named one of: ${SLIDE_FILES.join(', ')}`, 400);
    }
    const contentType = slideContentType(file.name);
    // A .sql file arrives with whatever type the browser guesses (often none);
    // only the PDFs are checked, and each is stored with its own type.
    if (contentType === 'application/pdf' && file.type && file.type !== 'application/pdf') {
      return jsonError('file must be a PDF', 400);
    }
    if (file.size > MAX_SLIDE_BYTES) return jsonError('file is too large', 413);

    const supabase = await createClient();
    const { error } = await supabase.storage
      .from(SLIDES_BUCKET)
      .upload(slidePath(user.id, file.name), file, {
        upsert: true,
        contentType,
      });
    if (error) return jsonError(error.message, 502);
    return NextResponse.json({ uploaded: file.name }, { status: 201 });
  });
}
