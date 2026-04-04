import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Geist: () => ({ variable: 'geist-font' }),
  Playfair_Display: () => ({ variable: 'playfair-font' }),
  Courier_Prime: () => ({ variable: 'courier-font' }),
  Outfit: () => ({ variable: 'outfit-font' }),
  Righteous: () => ({ variable: 'righteous-font' }),
  Caveat: () => ({ variable: 'caveat-font' }),
  Kalam: () => ({ variable: 'kalam-font' }),
}));

vi.mock('@/lib/utils', () => ({
  cn: (...args: string[]) => args.filter(Boolean).join(' '),
}));

import RootLayout from './layout';

describe('RootLayout', () => {
  it('renders the shell classes and children', () => {
    const html = renderToStaticMarkup(
      RootLayout({
        children: <span>Child content</span>,
      }),
    );

    expect(html).toContain('geist-font');
    expect(html).toContain('min-h-screen');
    expect(html).toContain('Child content');
  });
});
