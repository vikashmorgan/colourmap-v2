import fs from 'node:fs';
const f = 'app/layout.tsx';
let s = fs.readFileSync(f, 'utf8');

const old = `export const metadata: Metadata = {
  title: 'Colourmap',
  description:
    'A personal cockpit that turns self-reflection into a visual map of your life balance.',
};`;

const neu = `export const metadata: Metadata = {
  title: 'Colour Brain',
  description: 'The index of a life lived across several apps.',
  /*
   * What makes an added-to-home-screen launch feel like an app rather than a
   * browser tab that lost its address bar. Without appleWebApp, iOS opens the
   * PWA inside Safari chrome and the whole point of step six is gone.
   */
  appleWebApp: {
    capable: true,
    title: 'Brain',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  themeColor: '#c4a060',
  /*
   * viewportFit covers the notch so the page paints edge to edge in standalone
   * mode. Zoom stays enabled on purpose — disabling it is an accessibility
   * failure, and a launcher is not a reason to take pinch-zoom away from
   * someone who needs it.
   */
  viewportFit: 'cover',
};`;

if (!s.includes(old)) {
  console.error('METADATA ANCHOR MISS');
  process.exit(1);
}
s = s.replace(old, neu);
s = s.replace("import type { Metadata } from 'next';", "import type { Metadata, Viewport } from 'next';");
fs.writeFileSync(f, s);
console.log('layout metadata updated');
