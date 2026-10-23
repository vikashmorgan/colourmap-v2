import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getChillUser } = vi.hoisted(() => ({ getChillUser: vi.fn() }));

vi.mock('@/lib/chill/current-user', () => ({ getChillUser }));

import ChillLayout, { metadata } from './layout';

describe('Chill layout', () => {
  beforeEach(() => {
    getChillUser.mockReset();
  });

  it('is titled Chill Machine', () => {
    expect(metadata.title).toEqual({ absolute: 'Chill Machine' });
  });

  it('offers guests a sign-in link and no cockpit nav', async () => {
    getChillUser.mockResolvedValue(null);
    const html = renderToStaticMarkup(await ChillLayout({ children: <p>Machine</p> }));
    expect(html).toContain('Chill Machine');
    expect(html).toContain('href="/chill/login"');
    expect(html).toContain('Sign in');
    expect(html).not.toContain('Sign out');
    expect(html).toContain('Machine');
  });

  it('shows the signed-in email and a sign-out back to /chill', async () => {
    getChillUser.mockResolvedValue({ id: 'u1', email: 'guest@example.com' });
    const html = renderToStaticMarkup(await ChillLayout({ children: <p>Machine</p> }));
    expect(html).toContain('guest@example.com');
    expect(html).toContain('action="/logout"');
    expect(html).toContain('name="next" value="/chill"');
    expect(html).toContain('Sign out');
  });
});
