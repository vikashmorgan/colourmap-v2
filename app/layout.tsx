import type { Metadata, Viewport } from 'next';
import {
  Caveat,
  Courier_Prime,
  Geist,
  Kalam,
  Outfit,
  Playfair_Display,
  Righteous,
} from 'next/font/google';
import './globals.css';

import { cn } from '@/lib/utils';

const geist = Geist({
  subsets: ['latin'],
  variable: '--font-sans',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  variable: '--font-serif',
  weight: ['400', '500', '600'],
});

const courier = Courier_Prime({
  subsets: ['latin'],
  variable: '--font-cowboy',
  weight: ['400', '700'],
});

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-minimal',
  weight: ['300', '400', '500'],
});

const righteous = Righteous({
  subsets: ['latin'],
  variable: '--font-groovy',
  weight: ['400'],
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-handwritten',
  weight: ['400', '500', '600'],
});

const kalam = Kalam({
  subsets: ['latin'],
  variable: '--font-sketch',
  weight: ['300', '400'],
});

export const metadata: Metadata = {
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
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(
        'font-sans',
        geist.variable,
        playfair.variable,
        courier.variable,
        outfit.variable,
        righteous.variable,
        caveat.variable,
        kalam.variable,
      )}
    >
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
