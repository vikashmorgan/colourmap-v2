import type { Metadata } from 'next';
import { Geist, Playfair_Display, Courier_Prime, Outfit, Righteous, Caveat, Kalam } from 'next/font/google';
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
  title: 'Colourmap',
  description:
    'A personal cockpit that turns self-reflection into a visual map of your life balance.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable, playfair.variable, courier.variable, outfit.variable, righteous.variable, caveat.variable, kalam.variable)}>
      <body className="min-h-screen bg-background text-foreground antialiased">{children}</body>
    </html>
  );
}
