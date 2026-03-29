import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import LoginPage from './page';

describe('LoginPage', () => {
  it('renders the auth placeholder copy', () => {
    const html = renderToStaticMarkup(<LoginPage />);

    expect(html).toContain('Login placeholder');
    expect(html).toContain('Supabase SSR wiring is in place.');
  });
});
