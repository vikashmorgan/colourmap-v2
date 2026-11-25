import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { updateSession } = vi.hoisted(() => ({
  updateSession: vi.fn(),
}));

vi.mock('@/lib/supabase/proxy', () => ({
  updateSession,
}));

import { proxy } from './proxy';

describe('proxy', () => {
  beforeEach(() => {
    updateSession.mockReset();
  });

  it('forwards the request to the Supabase session updater', async () => {
    const request = new NextRequest('http://localhost/');
    const response = NextResponse.next();

    updateSession.mockResolvedValue(response);

    expect(await proxy(request)).toBe(response);
    expect(updateSession).toHaveBeenCalledWith(request);
  });

  it('serves the game on its own site, with no session', async () => {
    const request = new NextRequest('https://colour-drive.vercel.app/anything', {
      headers: { host: 'colour-drive.vercel.app' },
    });
    const response = await proxy(request);
    expect(updateSession).not.toHaveBeenCalled();
    expect(response.headers.get('x-middleware-rewrite')).toMatch(/\/play$/);
  });

  it('lets the game page itself through on its own site', async () => {
    const request = new NextRequest('https://colour-drive.vercel.app/play', {
      headers: { host: 'colour-drive.vercel.app' },
    });
    const response = await proxy(request);
    expect(updateSession).not.toHaveBeenCalled();
    expect(response.headers.get('x-middleware-rewrite')).toBeNull();
  });
});
