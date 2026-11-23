import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { notFound } = vi.hoisted(() => ({
  notFound: vi.fn(() => {
    throw new Error('NEXT_NOT_FOUND');
  }),
}));
vi.mock('next/navigation', () => ({ notFound }));

import LabPage, { generateMetadata, generateStaticParams } from './page';

const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe('Lab page', () => {
  it('frames the prototype full screen', async () => {
    render(await LabPage(params('tool-city')));
    expect(screen.getByTitle('Tool City').getAttribute('src')).toBe('/labs/tool-city/index.html');
  });

  it('is a 404 for an unknown lab', async () => {
    await expect(LabPage(params('nope'))).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('prebuilds one page per lab', () => {
    expect(generateStaticParams()).toContainEqual({ slug: 'mandala' });
  });

  it('names the page after the lab', async () => {
    expect(await generateMetadata(params('mandala'))).toMatchObject({
      title: { absolute: 'Mandala of Ideas' },
    });
    expect(await generateMetadata(params('nope'))).toEqual({});
  });
});
