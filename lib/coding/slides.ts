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
  'Session8.pdf',
  // Second course: session 1 (recursion) and session 2 (binary search and trees),
  // shown as Recursion 1 and Recursion 2.
  'Recursion1.pdf',
  'Recursion2.pdf',
  // Second course, session 4 (algorithmic complexity), shown as Recursion 4.
  'Recursion4.pdf',
  // The SQL class (/sql): its five session decks, and the business case the
  // page shows as its own tab. The case is plain text (a .sql file).
  'SQL1.pdf',
  'SQL2.pdf',
  'SQL3.pdf',
  'SQL4.pdf',
  'SQL5.pdf',
  'SQLBusinessCase.sql',
] as const;

export type SlideFile = (typeof SLIDE_FILES)[number];

/** 20 MB, the bucket's own limit; the largest slide deck is under 2 MB. */
export const MAX_SLIDE_BYTES = 20 * 1024 * 1024;

export function isSlideFile(name: unknown): name is SlideFile {
  return typeof name === 'string' && (SLIDE_FILES as readonly string[]).includes(name);
}

/** What a file is stored as: the decks are PDFs, the SQL business case is text. */
export function slideContentType(file: SlideFile) {
  return file.endsWith('.sql') ? 'text/plain' : 'application/pdf';
}

export function slidePath(userId: string, file: SlideFile) {
  return `${userId}/${file}`;
}
