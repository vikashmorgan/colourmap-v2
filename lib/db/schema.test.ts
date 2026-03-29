import { getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { checkIns, lifeScans } from './schema';

describe('schema', () => {
  it('defines the check-in and life-scan tables with the expected columns', () => {
    expect(getTableName(checkIns)).toBe('check_ins');
    expect(getTableName(lifeScans)).toBe('life_scans');
    expect(checkIns).toHaveProperty('sliderValue');
    expect(checkIns).toHaveProperty('note');
    expect(lifeScans).toHaveProperty('body');
    expect(lifeScans).toHaveProperty('relationships');
    expect(lifeScans).toHaveProperty('purpose');
  });
});
