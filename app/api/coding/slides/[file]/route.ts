import { NextResponse } from 'next/server';

import { isSlideFile, SLIDES_BUCKET, slidePath } from '@/lib/coding/slides';
import { createClient } from '@/lib/supabase/server';

/*
 * Open one of the user's own slide decks.
 *
 * Answers with a redirect to a short-lived signed URL. The page links here as
 * /api/coding/slides/Session3.pdf#page=19; the browser carries the #page part
 * across the redirect, so the PDF viewer opens on that slide.
 *
 * The answers are small HTML pages rather than JSON because this is opened in
 * a browser tab, where a person reads the message.
 */
const SIGNED_URL_SECONDS = 60 * 60;

function page(status: number, message: string) {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>Slides</title><body style="font-family:system-ui;max-width:40rem;margin:4rem auto;padding:0 1rem;line-height:1.5"><p>${message}</p><p><a href="/coding#lessons">Back to the study page</a></p></body>`,
    { status, headers: { 'Content-Type': 'text/html; charset=utf-8' } },
  );
}

export async function GET(_request: Request, context: { params: Promise<{ file: string }> }) {
  const { file } = await context.params;
  if (!isSlideFile(file)) return page(404, 'There is no slide deck with that name.');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return page(401, 'Sign in to open your slides.');

  const { data, error } = await supabase.storage
    .from(SLIDES_BUCKET)
    .createSignedUrl(slidePath(user.id, file), SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) {
    return page(
      404,
      `${file} is not uploaded yet. On the study page, open Lessons and use <b>Upload slides</b> once; after that every slide link opens straight on its page.`,
    );
  }
  return NextResponse.redirect(data.signedUrl, 302);
}
