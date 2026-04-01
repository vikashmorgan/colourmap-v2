import { getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { checkIns, lifeScans, missions } from './schema';

describe('schema', () => {
  it('defines the check-in, missions, and life-scan tables with the expected columns', () => {
    expect(getTableName(checkIns)).toBe('check_ins');
    expect(getTableName(lifeScans)).toBe('life_scans');
    expect(getTableName(missions)).toBe('missions');
    expect(checkIns).toHaveProperty('sliderValue');
    expect(checkIns).toHaveProperty('note');
    expect(checkIns).toHaveProperty('tags');
    expect(missions).toHaveProperty('title');
    expect(missions).toHaveProperty('description');
    expect(missions).toHaveProperty('completed');
    expect(lifeScans).toHaveProperty('body');
    expect(lifeScans).toHaveProperty('relationships');
    expect(lifeScans).toHaveProperty('purpose');
  });
});
