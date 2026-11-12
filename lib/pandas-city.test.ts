import { readFileSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  cardHref,
  firstSentence,
  LESSON_COUNT,
  lessonHref,
  lessonSlots,
  markKey,
  pandasMap,
  parsePandasCourse,
} from './pandas-city';

const html = readFileSync(path.join(process.cwd(), 'content', 'pandas', 'index.html'), 'utf8');
const lessons = parsePandasCourse(html);

describe('parsePandasCourse, on the real class page', () => {
  it('finds the three lessons in order, with their titles', () => {
    expect(lessons.map((l) => l.n)).toEqual([1, 2, 3]);
    expect(lessons.map((l) => l.short)).toEqual([
      'DataFrames & loading',
      'Selecting, filtering & slicing',
      'Data quality',
    ]);
    expect(lessons[2].title).toBe('Data quality assessment');
    expect(lessons[2].lede).toMatch(/^Before cleaning anything/);
  });

  it('reads every group and card: 14, 17 and 19 cards; Session 3 has 6 groups', () => {
    expect(lessons.map((l) => l.groups.flatMap((g) => g.cards).length)).toEqual([14, 17, 19]);
    expect(lessons[2].groups.map((g) => g.name)).toEqual([
      'Assess before you clean',
      'Missing values',
      'Inconsistencies',
      'Duplicates',
      'Accuracy',
      'The quality report',
    ]);
  });

  it('keeps card ids unique within each lesson, and every card named with a short line', () => {
    for (const l of lessons) {
      const cards = l.groups.flatMap((g) => g.cards);
      expect(new Set(cards.map((c) => c.id)).size).toBe(cards.length);
      for (const c of cards) {
        expect(c.id).toMatch(/^[a-z0-9-]+$/);
        expect(c.name.length).toBeGreaterThan(3);
        expect(c.line.length).toBeGreaterThan(10);
        expect(c.line.length).toBeLessThanOrEqual(200);
        expect(c.size).toBeGreaterThan(0);
      }
    }
  });

  it('reads a card whole: explanation, code (escapes undone) and watch-out', () => {
    const nan = lessons[2].groups[1].cards[0];
    expect(nan.id).toBe('nan');
    expect(nan.name).toBe('NaN marks an empty cell, and behaves differently');
    expect(nan.line).toBe('Put None in a column and pandas stores NaN, Not a Number.');
    expect(nan.what).toContain('\n\nPandas skip NaN');
    expect(nan.code?.split('\n')[0]).toBe('s = pd.Series([10, None, 30])');
    expect(nan.watch).toMatch(/Never test x == np.nan/);
  });

  it('reads the exercises, the lines to remember and each lesson’s cheat-sheet entries', () => {
    expect(lessons.map((l) => l.practice.map((x) => x.id))).toEqual([
      ['l1-e1', 'l1-e2', 'l1-e3'],
      ['l2-e1', 'l2-e2', 'l2-e3'],
      ['l3-e1', 'l3-e2', 'l3-e3'],
    ]);
    expect(lessons[0].practice[0].title).toBe('Predict the loads');
    for (const l of lessons) expect(l.remember.length).toBeGreaterThanOrEqual(3);
    expect(lessons[2].remember[0]).toBe('Assess before you clean: today no line changes df.');
    expect(lessons[0].library.find((r) => r.name === 'read_csv')).toMatchObject({
      card: 'four-loads',
    });
    for (const l of lessons) expect(l.library.length).toBeGreaterThan(0);
  });

  it('gives nothing for a page without the course', () => {
    expect(parsePandasCourse('<html></html>')).toEqual([]);
  });
});

describe('the eight places', () => {
  it('has 8 slots, lessons 1 to 3 filled and 5 to come', () => {
    const slots = lessonSlots(lessons);
    expect(LESSON_COUNT).toBe(8);
    expect(slots.map((s) => s.n)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
    expect(slots.filter((s) => s.lesson).length).toBe(3);
    expect(slots.filter((s) => !s.lesson).length).toBe(5);
  });
});

describe('pandasMap, the adapter for the engine', () => {
  const data = pandasMap(lessons);

  it('turns lessons into cities, groups into districts, cards into buildings', () => {
    expect(data.slots).toHaveLength(8);
    expect(data.slots.slice(3).every((s) => s === null)).toBe(true);
    const third = data.slots[2];
    expect(third?.districts).toHaveLength(6);
    expect(third?.districts.flatMap((d) => d.buildings)).toHaveLength(19);
    expect(third?.districts[1].buildings[0]).toMatchObject({ id: 'nan', tag: '3.5', flag: true });
    expect(third?.spots.map((s) => s.name)).toEqual([
      'Missing, counted',
      'Spellings and duplicates',
      'Ranges and the report',
    ]);
    expect(third?.core).toEqual(lessons[2].remember);
    expect(data.words.city).toBe('Lesson');
    expect(data.centre.name).toBe('DataFrame');
  });

  it('numbers the cards like the class page does', () => {
    const tags = data.slots[0]?.districts.flatMap((d) => d.buildings.map((b) => b.tag));
    expect(tags?.[0]).toBe('1.1');
    expect(tags?.at(-1)).toBe('1.14');
  });
});

describe('links and keys into /pandas', () => {
  it('points at the class page’s own anchors and mark keys', () => {
    expect(cardHref(3, 'nan')).toBe('/pandas#c-3-nan');
    expect(cardHref(3, 'ex-l3-e1')).toBe('/pandas#c-3-ex-l3-e1');
    expect(lessonHref(2)).toBe('/pandas#s-2');
    expect(markKey(3, 'nan')).toBe('pandas|s3|nan');
    // The class page has the anchors and the key format these rely on.
    expect(html).toContain('const cardKey = (s, id) => `pandas|s$' + '{s}|$' + '{id}`;');
    expect(html).toContain('function followHash()');
    expect(html).toContain('href="/pandas/city"');
  });

  it('cuts the first sentence at a capital letter, and keeps it short', () => {
    expect(firstSentence('One thing. Two things.\n\nMore.')).toBe('One thing.');
    expect(firstSentence('df.loc picks rows. Then more.')).toBe('df.loc picks rows.');
    expect(firstSentence('x'.repeat(300))).toHaveLength(198);
  });
});
