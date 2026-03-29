import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import AppLayout from './layout';

describe('AppLayout', () => {
  it('renders the product shell navigation and children', () => {
    const html = renderToStaticMarkup(
      AppLayout({
        children: <div>Child section</div>,
      }),
    );

    expect(html).toContain('Product scaffold');
    expect(html).toContain('Cockpit');
    expect(html).toContain('Login');
    expect(html).toContain('Child section');
  });
});
