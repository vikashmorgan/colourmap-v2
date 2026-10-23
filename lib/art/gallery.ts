/*
 * The picture gallery of an idea in the Art ideas notebook.
 *
 * Pictures live in the private bucket `art-gallery` (migration 0026), at
 * {userId}/{ideaId}/{timestamp}-{name}.{ext}. Every path is built here, from a
 * checked idea id and a cleaned file name, so a request can never choose a
 * path outside the user's own folder.
 */
export const GALLERY_BUCKET = 'art-gallery';

/** 10 MB, the bucket's own limit. A phone photo is usually 2 to 5 MB. */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024;

export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'] as const;

const EXTENSION: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STORED_NAME = /^\d+-[a-z0-9-]{1,40}\.(jpg|png|webp|gif)$/;

/** An idea is a notebook entry, so its id is a uuid. */
export function isIdeaId(value: unknown): value is string {
  return typeof value === 'string' && UUID.test(value);
}

export function isImageType(type: unknown): type is (typeof IMAGE_TYPES)[number] {
  return typeof type === 'string' && (IMAGE_TYPES as readonly string[]).includes(type);
}

/** A name this module could have stored: the only names that may be removed. */
export function isStoredName(name: unknown): name is string {
  return typeof name === 'string' && STORED_NAME.test(name);
}

/**
 * The stored name of an upload: the time (so the gallery sorts in the order
 * pictures were added), then a cleaned stem of the original name, then the
 * extension of its real type.
 */
export function storedName(original: string, type: (typeof IMAGE_TYPES)[number], now = Date.now()) {
  const base = original.split(/[\\/]/).pop() ?? '';
  const stem =
    base
      .replace(/\.[^.]*$/, '')
      .toLowerCase()
      .normalize('NFKD')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'image';
  return `${now}-${stem}.${EXTENSION[type]}`;
}

export function galleryFolder(userId: string, ideaId: string) {
  return `${userId}/${ideaId}`;
}
