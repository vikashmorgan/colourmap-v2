import { getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import { backlog, checkIns, lifeScans, missions } from './schema';

describe('schema', () => {
  it('defines all tables with the expected columns', () => {
    expect(getTableName(checkIns)).toBe('check_ins');
    expect(getTableName(lifeScans)).toBe('life_scans');
    expect(getTableName(missions)).toBe('missions');
    expect(getTableName(backlog)).toBe('backlog');
    expect(checkIns).toHaveProperty('sliderValue');
    expect(checkIns).toHaveProperty('note');
    expect(checkIns).toHaveProperty('tags');
    expect(missions).toHaveProperty('title');
    expect(missions).toHaveProperty('description');
    expect(missions).toHaveProperty('blocking');
    expect(missions).toHaveProperty('nextStep');
    expect(missions).toHaveProperty('completed');
    expect(lifeScans).toHaveProperty('body');
    expect(lifeScans).toHaveProperty('relationships');
    expect(lifeScans).toHaveProperty('purpose');
  });
});
