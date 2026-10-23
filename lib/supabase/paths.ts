export function getSafeRedirectPath(next: string | null) {
  if (!next || !next.startsWith('/')) {
    return '/';
  }

  if (next.startsWith('//')) {
    return '/';
  }

  // Browsers and the WHATWG URL parser treat `\` like `/`, so `/\evil.com`
  // would resolve to another host. Control characters (tabs, newlines) are
  // stripped by the parser and can smuggle the same trick.
  // biome-ignore lint/suspicious/noControlCharactersInRegex: rejecting control characters is the point
  if (/[\\\u0000-\u001f\u007f]/.test(next)) {
    return '/';
  }

  return next;
}
