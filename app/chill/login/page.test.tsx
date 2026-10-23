import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getChillUser, redirect } = vi.hoisted(() => ({
  getChillUser: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock('@/lib/chill/current-user', () => ({ getChillUser }));
vi.mock('next/navigation', () => ({ redirect }));

import ChillLoginPage from './page';

describe('Chill login page', () => {
  beforeEach(() => {
    getChillUser.mockReset();
    redirect.mockReset();
  });

  it('shows the email form with the no-password copy', async () => {
    getChillUser.mockResolvedValue(null);
    const html = renderToStaticMarkup(await ChillLoginPage({}));
    expect(html).toContain('Sign in with email');
    expect(html).toContain('No password, nothing to remember');
    expect(html).toContain('Send me a link');
    expect(html).not.toContain('role="alert"');
  });

  it('explains a failed link', async () => {
    getChillUser.mockResolvedValue(null);
    const html = renderToStaticMarkup(
      await ChillLoginPage({ searchParams: Promise.resolve({ error: 'link_failed' }) }),
    );
    expect(html).toContain('That link didn’t work');
  });

  it('sends a signed-in user back to /chill', async () => {
    getChillUser.mockResolvedValue({ id: 'u1', email: 'a@b.co' });
    redirect.mockImplementation(() => {
      throw new Error('NEXT_REDIRECT');
    });
    await expect(ChillLoginPage({})).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith('/chill');
  });
});
