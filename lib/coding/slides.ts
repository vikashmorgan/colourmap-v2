/*
 * The course slides a user may upload for the /coding page.
 *
 * Only these names are accepted, so a request can never choose an arbitrary
 * path in storage: the path is always {userId}/{one of these}.
 */
export const SLIDES_BUCKET = 'coding-slides';

export const SLIDE_FILES = [
  'Session1.pdf',
  'Session2.pdf',
  'session2Extra.pdf',
  'Session3.pdf',
  'session3Extra.pdf',
  'Session4.pdf',
  'Session6.pdf',
  'Session7.pdf',
] as const;

export type SlideFile = (typeof SLIDE_FILES)[number];

/** 20 MB, the bucket's own limit; the largest slide deck is under 2 MB. */
export const MAX_SLIDE_BYTES = 20 * 1024 * 1024;

export function isSlideFile(name: unknown): name is SlideFile {
  return typeof name === 'string' && (SLIDE_FILES as readonly string[]).includes(name);
}

export function slidePath(userId: string, file: SlideFile) {
  return `${userId}/${file}`;
}
