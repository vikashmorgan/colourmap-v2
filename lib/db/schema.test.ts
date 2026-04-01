import { getTableName } from 'drizzle-orm';
import { describe, expect, it } from 'vitest';

import {
  backlog,
  checkIns,
  cockpitSections,
  dailyTrackerEntries,
  lifeScans,
  missions,
  scanReflections,
  sectionTrackers,
} from './schema';

describe('schema', () => {
  it('defines all tables with the expected columns', () => {
    expect(getTableName(checkIns)).toBe('check_ins');
    expect(getTableName(missions)).toBe('missions');
    expect(getTableName(backlog)).toBe('backlog');
    expect(getTableName(lifeScans)).toBe('life_scans');
    expect(getTableName(scanReflections)).toBe('scan_reflections');
    expect(getTableName(cockpitSections)).toBe('cockpit_sections');
    expect(getTableName(sectionTrackers)).toBe('section_trackers');
    expect(getTableName(dailyTrackerEntries)).toBe('daily_tracker_entries');

    expect(checkIns).toHaveProperty('sliderValue');
    expect(checkIns).toHaveProperty('missionId');
    expect(missions).toHaveProperty('title');
    expect(missions).toHaveProperty('blocking');
    expect(missions).toHaveProperty('nextStep');
    expect(lifeScans).toHaveProperty('door');
    expect(lifeScans).toHaveProperty('sliders');
    expect(scanReflections).toHaveProperty('question');
    expect(cockpitSections).toHaveProperty('name');
    expect(sectionTrackers).toHaveProperty('label');
    expect(sectionTrackers).toHaveProperty('type');
    expect(dailyTrackerEntries).toHaveProperty('value');
  });
});
