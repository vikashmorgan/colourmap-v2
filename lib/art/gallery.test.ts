import { describe, expect, it } from 'vitest';

import { galleryFolder, isIdeaId, isImageType, isStoredName, storedName } from './gallery';

const IDEA = '11111111-2222-4333-8444-555555555555';

describe('art gallery paths', () => {
  it('accepts only a uuid as an idea id', () => {
    expect(isIdeaId(IDEA)).toBe(true);
    expect(isIdeaId('../other-user')).toBe(false);
    expect(isIdeaId('')).toBe(false);
    expect(isIdeaId(42)).toBe(false);
  });

  it('accepts only images a browser can show', () => {
    expect(isImageType('image/jpeg')).toBe(true);
    expect(isImageType('image/webp')).toBe(true);
    expect(isImageType('application/pdf')).toBe(false);
    expect(isImageType('image/svg+xml')).toBe(false);
  });

  it('stores a cleaned name, prefixed by the time, with the real extension', () => {
    expect(storedName('Thunder Sketch #2.JPG', 'image/jpeg', 1000)).toBe(
      '1000-thunder-sketch-2.jpg',
    );
    expect(storedName('../../evil/../x.png', 'image/png', 5)).toBe('5-x.png');
    expect(storedName('.png', 'image/png', 5)).toBe('5-image.png');
    expect(storedName('photo.heic', 'image/webp', 7)).toBe('7-photo.webp');
  });

  it('only treats names it could have stored as removable', () => {
    expect(isStoredName('1000-thunder-sketch-2.jpg')).toBe(true);
    expect(isStoredName('../1000-x.jpg')).toBe(false);
    expect(isStoredName('1000-x.pdf')).toBe(false);
  });

  it('keeps every picture in the user folder, one sub-folder per idea', () => {
    expect(galleryFolder('user-1', IDEA)).toBe(`user-1/${IDEA}`);
  });
});
