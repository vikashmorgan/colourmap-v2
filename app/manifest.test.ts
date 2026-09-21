import { describe, expect, it } from 'vitest';

import { BRANCH_HUE } from '@/lib/branches';
import manifest from './manifest';

describe('the home-screen manifest', () => {
  it('launches standalone, because that is the whole point', () => {
    /*
     * A tab you have to find is a website. An icon that opens without an
     * address bar is a place you go. `display` is the one field in this file
     * that carries that difference.
     */
    expect(manifest().display).toBe('standalone');
  });

  it('opens on the morning surface, not the root', () => {
    /*
     * You open this to check in. A launcher that lands anywhere else adds a
     * decision before the one thing you came to do.
     */
    expect(manifest().start_url).toBe('/day');
  });

  it('keeps the short name short enough to survive a home screen', () => {
    const short = manifest().short_name ?? '';

    expect(short.length).toBeGreaterThan(0);
    expect(short.length).toBeLessThanOrEqual(12);
  });

  it('takes its theme colour from the branch model rather than a literal', () => {
    /*
     * Imported, never retyped — so recolouring a branch recolours the chrome
     * and the two cannot drift apart.
     */
    expect(manifest().theme_color).toBe(BRANCH_HUE.admin);
  });

  it('ships an icon at both the sizes a phone asks for', () => {
    const sizes = (manifest().icons ?? []).map((icon) => icon.sizes);

    expect(sizes).toContain('512x512');
    expect(sizes).toContain('180x180');
  });
});
