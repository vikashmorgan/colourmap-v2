/**
 * The drive game as a website of its own (docs/specs/drive-menus.md, "The standalone site"): on the
 * game's own domain every page is the game at /play, with no accounts and no login. Asset and
 * framework paths pass through untouched.
 */

/** The game's own hosts; DRIVE_HOSTS (comma-separated) can add more. */
export const DRIVE_HOSTS = ['colour-drive.vercel.app'];

/** The page that is the whole site on those hosts. */
export const DRIVE_PAGE = '/play';

export function driveHosts(extra = process.env.DRIVE_HOSTS ?? ''): string[] {
  return [
    ...DRIVE_HOSTS,
    ...extra
      .split(',')
      .map((h) => h.trim().toLowerCase())
      .filter(Boolean),
  ];
}

/** Whether a request's host is the game's own site. */
export function isDriveHost(host: string | null | undefined, hosts = driveHosts()): boolean {
  if (!host) return false;
  return hosts.includes(host.toLowerCase().split(':')[0]);
}

/** Where a path on the game's site goes: the game for any page, untouched for files and _next. */
export function drivePath(pathname: string): string | null {
  if (pathname.startsWith('/_next/')) return null;
  if (/\.[a-z0-9]+$/i.test(pathname)) return null;
  return pathname === DRIVE_PAGE ? null : DRIVE_PAGE;
}
