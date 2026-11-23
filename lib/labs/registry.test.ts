import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

import { findLab, LABS, labSrc } from './registry';

describe('labs registry', () => {
  it('finds a lab by slug', () => {
    expect(findLab('mandala')?.title).toBe('Mandala of Ideas');
  });

  it('returns undefined for an unknown slug', () => {
    expect(findLab('nope')).toBeUndefined();
  });

  it('points each lab at its static page', () => {
    expect(labSrc(LABS[1])).toBe('/labs/reflection-bubbles/index.html');
  });

  it('has a page with the runtime shim for every lab', () => {
    for (const lab of LABS) {
      const file = path.join(process.cwd(), 'public', labSrc(lab));
      expect(existsSync(file), file).toBe(true);
      const html = readFileSync(file, 'utf8');
      expect(html.indexOf('/labs/claude-shim.js')).toBeGreaterThan(-1);
      expect(html.indexOf('/labs/claude-shim.js')).toBeLessThan(html.indexOf('<body>'));
    }
  });

  it('keeps unique slugs', () => {
    expect(new Set(LABS.map((lab) => lab.slug)).size).toBe(LABS.length);
  });
});
