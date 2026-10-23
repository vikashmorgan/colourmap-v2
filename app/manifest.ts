import type { MetadataRoute } from 'next';

import { BRANCH_HUE } from '@/lib/branches';

/*
 * WHAT TURNS A URL INTO SOMETHING YOU OPEN AT EIGHT IN THE MORNING.
 *
 * Everything else in this app is theory until it is on a phone without browser
 * chrome around it. A tab you have to find is a website; an icon on the home
 * screen is a place you go. That is the entire difference this file makes, and
 * it is why step six of the build order in `docs/specs/colour-brain.md` matters
 * more than its size suggests.
 *
 * `display: standalone` is the load-bearing line — it drops the address bar, so
 * opening this feels like opening an app rather than resuming a browse.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Colour Brain',
    /*
     * What actually shows under the icon. Phones truncate around twelve
     * characters, and "Colour Brain" is exactly twelve.
     */
    short_name: 'Brain',
    description: 'The index of a life lived across several apps.',
    start_url: '/day',
    /*
     * The morning surface, not the root. You open this to check in, and a
     * launcher that lands you anywhere else adds a decision before the one
     * thing you came to do.
     */
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f0dfb6',
    theme_color: BRANCH_HUE.admin,
    categories: ['lifestyle', 'productivity'],
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon', sizes: '180x180', type: 'image/png' },
    ],
  };
}
