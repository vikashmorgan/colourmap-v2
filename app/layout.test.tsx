import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/font/google', () => ({
  Geist: () => ({
    variable: 'geist-font',
  }),
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
