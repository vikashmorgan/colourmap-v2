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
});
