export function getSafeRedirectPath(next: string | null) {
  if (!next || !next.startsWith('/')) {
    return '/';
  }

  if (next.startsWith('//')) {
    return '/';
  }

  return next;
}
