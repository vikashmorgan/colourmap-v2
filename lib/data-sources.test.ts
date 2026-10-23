import { describe, expect, it } from 'vitest';

import { ALL_DOMAINS, DATA_SOURCES, dataSourcesByDomain } from './data-sources';

describe('data-sources', () => {
  it('covers every declared domain with at least one source', () => {
    for (const domain of ALL_DOMAINS) {
      expect(dataSourcesByDomain(domain).length).toBeGreaterThan(0);
    }
  });

  it('every source carries a non-empty url and blurb', () => {
    for (const source of DATA_SOURCES) {
      expect(source.url.startsWith('https://')).toBe(true);
      expect(source.blurb.length).toBeGreaterThan(20);
      expect(source.name.length).toBeGreaterThan(0);
    }
  });

  it('canonical headliners are present', () => {
    const slugs = DATA_SOURCES.map((s) => s.slug);
    expect(slugs).toContain('our-world-in-data');
    expect(slugs).toContain('gcp');
    expect(slugs).toContain('world-bank-wdi');
    expect(slugs).toContain('un-wpp');
    expect(slugs).toContain('sipri');
    expect(slugs).toContain('usgs-critical-minerals');
  });
});
