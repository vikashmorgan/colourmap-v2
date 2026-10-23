/**
 * Visitor mode — the handful of paths a logged-out visitor may view without
 * signing in. Today that's the geometry visuals (a pure client-side Three.js
 * surface that reads no personal data), so people can reach the visuals fast.
 *
 * Everything NOT listed here stays behind the login wall (the app layout still
 * redirects logged-out users to /login for any non-visitor path).
 */
export const VISITOR_PATHS = ['/geometry-field'] as const;

/** True when a logged-out visitor is allowed to view this path. */
export function isVisitorPath(pathname: string | null | undefined): boolean {
  if (!pathname) return false;
  return VISITOR_PATHS.some((base) => pathname === base || pathname.startsWith(`${base}/`));
}
