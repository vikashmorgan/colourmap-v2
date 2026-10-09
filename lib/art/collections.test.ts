import { describe, expect, it } from 'vitest';

import {
  COLLECTION_NAMES,
  COLLECTIONS,
  collectionBySlug,
  driveThumbnail,
  driveView,
} from './collections';

describe('art collections', () => {
  it('has the AI Sculptures Flow collection with all its pictures', () => {
    const flow = collectionBySlug('flow');
    expect(flow?.title).toBe('AI Sculptures · Flow');
    expect(flow?.route).toBe('/art/flow');
    expect(flow?.images).toHaveLength(22);
    expect(new Set(flow?.images.map((i) => i.id)).size).toBe(22);
  });

  it('says what Flow is for: AI images to 3D, printed by extrusion, delivered without handwork', () => {
    const flow = collectionBySlug('flow');
    expect(flow?.aim?.join(' ')).toMatch(/3D videos and 3D assets/);
    expect(flow?.aim?.join(' ')).toMatch(/without having to build anything by hand/);
    expect(flow?.steps?.[0]).toBe('AI images');
    expect(flow?.steps).toContain('Delivered to clients');
    // the final mission: a gallery of the pieces, in different materials, to walk through
    expect(flow?.steps?.at(-1)).toBe('3D gallery to walk through');
    expect(flow?.aim?.join(' ')).toMatch(/different materials/);
  });

  it('names each collection on the tree by its title', () => {
    for (const c of COLLECTIONS) expect(COLLECTION_NAMES[c.route]).toBe(c.title);
  });

  it('builds Drive thumbnail and view links, and refuses anything that is not a file id', () => {
    expect(driveThumbnail('1pyXI_wti4YT907ep1MJKJAGutuOHa9Ft', 600)).toBe(
      'https://drive.google.com/thumbnail?id=1pyXI_wti4YT907ep1MJKJAGutuOHa9Ft&sz=w600',
    );
    expect(driveView('1pyXI_wti4YT907ep1MJKJAGutuOHa9Ft')).toContain(
      '/file/d/1pyXI_wti4YT907ep1MJKJAGutuOHa9Ft/',
    );
    expect(() => driveThumbnail('../x')).toThrow();
    expect(collectionBySlug('nope')).toBeUndefined();
  });
});
