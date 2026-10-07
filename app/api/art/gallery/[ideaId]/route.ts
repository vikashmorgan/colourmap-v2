import { NextResponse } from 'next/server';

import { jsonError, withAuthenticatedUser } from '@/lib/api/route-helpers';
import {
  GALLERY_BUCKET,
  galleryFolder,
  isIdeaId,
  isImageType,
  isStoredName,
  MAX_IMAGE_BYTES,
  storedName,
} from '@/lib/art/gallery';
import { createClient } from '@/lib/supabase/server';

/*
 * The pictures of one idea in the Art ideas notebook.
 *
 *   GET     → { images: [{ name, url }] }, oldest first, url signed for an hour
 *   POST    multipart, field "file": add one picture
 *   DELETE  ?name=<stored name>: remove one picture
 *
 * Every path is {userId}/{ideaId}/..., and storage policies confine each user
 * to their own folder as well.
 */
type Params = { params: Promise<{ ideaId: string }> };

const SIGNED_FOR_SECONDS = 60 * 60;

export async function GET(_request: Request, { params }: Params) {
  return withAuthenticatedUser(async (user) => {
    const { ideaId } = await params;
    if (!isIdeaId(ideaId)) return jsonError('unknown idea', 400);
    const folder = galleryFolder(user.id, ideaId);
    const supabase = await createClient();
    const bucket = supabase.storage.from(GALLERY_BUCKET);
    const { data, error } = await bucket.list(folder, { sortBy: { column: 'name', order: 'asc' } });
    if (error) return jsonError(error.message, 502);
    const names = (data ?? []).map((o) => o.name).filter(isStoredName);
    if (names.length === 0) return NextResponse.json({ images: [] });
    const signed = await bucket.createSignedUrls(
      names.map((n) => `${folder}/${n}`),
      SIGNED_FOR_SECONDS,
    );
    if (signed.error) return jsonError(signed.error.message, 502);
    const images = names.map((name, i) => ({ name, url: signed.data?.[i]?.signedUrl ?? '' }));
    return NextResponse.json({ images: images.filter((x) => x.url) });
  });
}

export async function POST(request: Request, { params }: Params) {
  return withAuthenticatedUser(async (user) => {
    const { ideaId } = await params;
    if (!isIdeaId(ideaId)) return jsonError('unknown idea', 400);
    let form: FormData;
    try {
      form = await request.formData();
    } catch {
      return jsonError('expected a form upload', 400);
    }
    const file = form.get('file');
    if (!(file instanceof File)) return jsonError('file required', 400);
    if (!isImageType(file.type))
      return jsonError('file must be a JPEG, PNG, WebP or GIF image', 400);
    if (file.size > MAX_IMAGE_BYTES) return jsonError('image is larger than 10 MB', 413);

    const name = storedName(file.name, file.type);
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from(GALLERY_BUCKET)
      .upload(`${galleryFolder(user.id, ideaId)}/${name}`, file, { contentType: file.type });
    if (error) return jsonError(error.message, 502);
    return NextResponse.json({ name }, { status: 201 });
  });
}

export async function DELETE(request: Request, { params }: Params) {
  return withAuthenticatedUser(async (user) => {
    const { ideaId } = await params;
    if (!isIdeaId(ideaId)) return jsonError('unknown idea', 400);
    const name = new URL(request.url).searchParams.get('name');
    if (!isStoredName(name)) return jsonError('unknown picture', 400);
    const supabase = await createClient();
    const { error } = await supabase.storage
      .from(GALLERY_BUCKET)
      .remove([`${galleryFolder(user.id, ideaId)}/${name}`]);
    if (error) return jsonError(error.message, 502);
    return NextResponse.json({ ok: true });
  });
}
