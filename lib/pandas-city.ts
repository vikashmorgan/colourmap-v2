/*
 * The Pandas city: the class at /pandas drawn as a map seen from above, a
 * memory palace where every part of every lesson has its own place and shape.
 * Asked for 2026-11-12: "turn the panda lessons (from school) into a city I
 * can navigate in and see the different blocks and lessons in different parts
 * of the city so I learn to orient myself", then "aim is to use geometry to
 * help memorise the lessons because they all have a placement". Spec:
 * docs/specs/pandas-city.md.
 *
 * The Pandas side only; the map itself is the generic engine in
 * lib/city-map.ts. Two pieces, both pure:
 *  1. parsePandasCourse reads the lessons out of content/pandas/index.html, so
 *     nothing is copied by hand and a new lesson appears on its own.
 *  2. pandasMap turns them into the engine's data: lessons → cities, card
 *     groups → districts, cards → buildings, exercises → spots, cheat-sheet
 *     entries → the shelf, "In one breath" → the core lines.
 */

import type { MapData } from '@/lib/city-map';

/* ── 1. The course, read from the class page ──────────────────────────────── */

export const LESSON_COUNT = 8;

export type CityCard = {
  id: string;
  name: string;
  /** The first sentence of the card's explanation. */
  line: string;
  /** The whole explanation, paragraphs separated by blank lines. */
  what: string;
  /** The card's code, or null when it has none. */
  code: string | null;
  /** The card's "Watch out" line, or null. */
  watch: string | null;
  /** How much the card holds (its text and code, in characters). */
  size: number;
};
export type CityGroup = { name: string; cards: CityCard[] };
export type CityExercise = { id: string; title: string };
export type CityRef = { name: string; meaning: string; example: string; card: string | null };
export type Lesson = {
  n: number;
  short: string;
  title: string;
  lede: string;
  groups: CityGroup[];
  practice: CityExercise[];
  /** "In one breath": the lines to remember. */
  remember: string[];
  /** This lesson's cheat-sheet entries. */
  library: CityRef[];
};
export type Slot = { n: number; lesson: Lesson | null };

type Range = { start: number; end: number };

const isSpace = (c: string) => c === ' ' || c === '\n' || c === '\r' || c === '\t';

/** Skip blanks and comments. */
function skipSpace(src: string, i: number): number {
  let j = i;
  for (;;) {
    while (j < src.length && isSpace(src[j])) j++;
    if (src.startsWith('//', j)) {
      const nl = src.indexOf('\n', j);
      j = nl < 0 ? src.length : nl + 1;
    } else if (src.startsWith('/*', j)) {
      const close = src.indexOf('*/', j + 2);
      j = close < 0 ? src.length : close + 2;
    } else return j;
  }
}

const ESCAPES: Record<string, string> = {
  n: '\n',
  t: '\t',
  r: '\r',
  b: '\b',
  f: '\f',
  v: '\v',
  '0': '\0',
};

/** One escape after a backslash at i: the character it stands for and where it ends. */
function readEscape(src: string, i: number): [string, number] {
  const c = src[i + 1];
  if (c === 'u') {
    if (src[i + 2] === '{') {
      const close = src.indexOf('}', i + 3);
      return [String.fromCodePoint(Number.parseInt(src.slice(i + 3, close), 16)), close + 1];
    }
    return [String.fromCharCode(Number.parseInt(src.slice(i + 2, i + 6), 16)), i + 6];
  }
  if (c === 'x') return [String.fromCharCode(Number.parseInt(src.slice(i + 2, i + 4), 16)), i + 4];
  if (c === '\n') return ['', i + 2];
  return [ESCAPES[c] ?? c, i + 2];
}

/** A '…' or "…" string starting at i. */
function readQuoted(src: string, i: number): { value: string; end: number } {
  const q = src[i];
  let j = i + 1;
  let value = '';
  while (j < src.length && src[j] !== q) {
    if (src[j] === '\\') {
      const [ch, next] = readEscape(src, j);
      value += ch;
      j = next;
    } else value += src[j++];
  }
  return { value, end: j + 1 };
}

/** A `…` template starting at i; ${…} parts are kept as written. */
function readTemplate(src: string, i: number): { value: string; end: number } {
  let j = i + 1;
  let value = '';
  while (j < src.length && src[j] !== '`') {
    if (src[j] === '\\') {
      const [ch, next] = readEscape(src, j);
      value += ch;
      j = next;
    } else if (src.startsWith('${', j)) {
      let k = j + 2;
      for (;;) {
        k = skipValue(src, k);
        if (src[k] === '}' || k >= src.length) break;
        k++;
      }
      value += src.slice(j, k + 1);
      j = k + 1;
    } else value += src[j++];
  }
  return { value, end: j + 1 };
}

/** The end of one expression: the next , } ] or ) outside brackets, strings and templates. */
function skipValue(src: string, i: number): number {
  let depth = 0;
  let j = i;
  while (j < src.length) {
    const c = src[j];
    if (c === "'" || c === '"') j = readQuoted(src, j).end;
    else if (c === '`') j = readTemplate(src, j).end;
    else if (src.startsWith('//', j) || src.startsWith('/*', j)) j = skipSpace(src, j);
    else if (c === '(' || c === '[' || c === '{') {
      depth++;
      j++;
    } else if (c === ')' || c === ']' || c === '}') {
      if (depth === 0) return j;
      depth--;
      j++;
    } else if (c === ',' && depth === 0) return j;
    else j++;
  }
  return j;
}

/** The value of a plain literal (a string, a template, a number), or null for anything else. */
function literal(src: string, r: Range): string | number | null {
  const text = src.slice(r.start, r.end).trim();
  const c = text[0];
  if (c === "'" || c === '"') {
    const s = readQuoted(text, 0);
    return s.end === text.length ? s.value : null;
  }
  if (c === '`') {
    const s = readTemplate(text, 0);
    return s.end === text.length ? s.value : null;
  }
  return /^-?\d+(\.\d+)?$/.test(text) ? Number(text) : null;
}

/** The top-level fields of the object literal starting at i, each as a range of source. */
function readObject(src: string, i: number): Record<string, Range> {
  const fields: Record<string, Range> = {};
  let j = i + 1;
  for (;;) {
    j = skipSpace(src, j);
    if (j >= src.length || src[j] === '}') return fields;
    let key: string;
    if (src[j] === "'" || src[j] === '"') {
      const q = readQuoted(src, j);
      key = q.value;
      j = q.end;
    } else {
      const m = /^[A-Za-z_$][\w$]*/.exec(src.slice(j, j + 80));
      key = m ? m[0] : '';
      j += key.length;
    }
    j = skipSpace(src, j);
    if (src[j] === ':') {
      const start = skipSpace(src, j + 1);
      const end = skipValue(src, start);
      if (key) fields[key] = { start, end };
      j = end;
    } else if (!key) {
      // A spread or something unexpected: step over it.
      j = skipValue(src, j);
    }
    j = skipSpace(src, j);
    if (src[j] === ',') j++;
  }
}

/** The elements of the array literal starting at i. */
function readArray(src: string, i: number): Range[] {
  const items: Range[] = [];
  let j = i + 1;
  for (;;) {
    j = skipSpace(src, j);
    if (j >= src.length || src[j] === ']') return items;
    const end = skipValue(src, j);
    items.push({ start: j, end });
    j = skipSpace(src, end);
    if (src[j] === ',') j++;
  }
}

const str = (src: string, r?: Range): string => {
  if (!r) return '';
  const v = literal(src, r);
  return typeof v === 'string' ? v : '';
};
const num = (src: string, r?: Range): number => {
  if (!r) return 0;
  const v = literal(src, r);
  return typeof v === 'number' ? v : 0;
};
const arrayAt = (src: string, r?: Range): Range[] =>
  r && src[r.start] === '[' ? readArray(src, r.start) : [];

/** Where `const NAME = [` begins its array, or -1. */
function arrayStart(src: string, name: string): number {
  const at = src.indexOf(`const ${name} = [`);
  return at < 0 ? -1 : src.indexOf('[', at);
}

/** The first sentence of the first paragraph, kept short. */
export function firstSentence(text: string): string {
  const para = text.split(/\n\s*\n/)[0].trim();
  const sentence = para.split(/(?<=[.!?])\s+(?=[A-Z"“])/)[0];
  return sentence.length > 200 ? `${sentence.slice(0, 197).trimEnd()}…` : sentence;
}

/**
 * The lessons of the Pandas class page, read from its source: each lesson's
 * groups and cards (id, name, explanation, code, watch-out), its exercises, its
 * lines to remember and its cheat-sheet entries. Only names and short text: the
 * substance stays on /pandas.
 */
export function parsePandasCourse(html: string): Lesson[] {
  const at = arrayStart(html, 'SESSIONS');
  if (at < 0) return [];

  const library = new Map<number, CityRef[]>();
  const refAt = arrayStart(html, 'REF');
  if (refAt >= 0) {
    for (const g of readArray(html, refAt)) {
      const group = readObject(html, g.start);
      for (const item of arrayAt(html, group.items)) {
        const [name, meaning, example, n, card] = readArray(html, item.start).map((r) =>
          literal(html, r),
        );
        if (typeof name !== 'string' || typeof n !== 'number') continue;
        const list = library.get(n) ?? [];
        list.push({
          name,
          meaning: typeof meaning === 'string' ? meaning : '',
          example: typeof example === 'string' ? example : '',
          card: typeof card === 'string' ? card : null,
        });
        library.set(n, list);
      }
    }
  }

  return readArray(html, at).map((s) => {
    const f = readObject(html, s.start);
    const n = num(html, f.n);
    const groups = arrayAt(html, f.groups).map((g) => {
      const gf = readObject(html, g.start);
      const cards = arrayAt(html, gf.cards).map((c) => {
        const cf = readObject(html, c.start);
        const what = str(html, cf.what);
        const code = str(html, cf.f) || null;
        return {
          id: str(html, cf.id),
          name: str(html, cf.name),
          line: firstSentence(what),
          what,
          code,
          watch: str(html, cf.watch) || null,
          size: what.length + (code?.length ?? 0),
        };
      });
      return { name: str(html, gf.name), cards };
    });
    const practice = arrayAt(html, f.practice).map((x) => {
      const xf = readObject(html, x.start);
      return { id: str(html, xf.id), title: str(html, xf.title) };
    });
    const remember = arrayAt(html, f.recap)
      .map((r) => literal(html, r))
      .filter((v): v is string => typeof v === 'string');
    return {
      n,
      short: str(html, f.short),
      title: str(html, f.title),
      lede: str(html, f.lede),
      groups,
      practice,
      remember,
      library: library.get(n) ?? [],
    };
  });
}

/** The eight places of the course, in order; lessons not given yet are empty plots. */
export function lessonSlots(lessons: Lesson[]): Slot[] {
  return Array.from({ length: LESSON_COUNT }, (_, i) => ({
    n: i + 1,
    lesson: lessons.find((l) => l.n === i + 1) ?? null,
  }));
}

/** Where a card (or an exercise, `ex-<id>`) opens on the class page. */
export const cardHref = (n: number, id: string) => `/pandas#c-${n}-${id}`;
/** Where a lesson opens on the class page. */
export const lessonHref = (n: number) => `/pandas#s-${n}`;
/** The key a card's mark is stored under on /pandas. */
export const markKey = (n: number, id: string) => `pandas|s${n}|${id}`;

/* ── 2. The adapter: the course as data for the city map engine ──────────── */

/** The Pandas course as a city map: one city per lesson on a ring of eight. */
export function pandasMap(lessons: Lesson[]): MapData {
  return {
    id: 'pandas',
    title: 'Pandas',
    centre: {
      name: 'DataFrame',
      blurb: 'Where all roads meet: every lesson loads, selects, checks or changes a DataFrame.',
    },
    words: {
      city: 'Lesson',
      district: 'part',
      building: 'card',
      spots: 'Practice',
      shelf: 'Cheat sheet',
      core: 'To remember',
    },
    slots: lessonSlots(lessons).map(({ n, lesson }) => {
      if (!lesson) return null;
      let k = 0;
      return {
        id: `s${n}`,
        title: lesson.title,
        short: lesson.short,
        core: lesson.remember,
        districts: lesson.groups.map((g, gi) => ({
          id: `g${gi + 1}`,
          name: g.name,
          buildings: g.cards.map((c) => ({
            id: c.id,
            name: c.name,
            tag: `${n}.${++k}`,
            weight: c.size,
            flag: Boolean(c.watch),
          })),
        })),
        spots: lesson.practice.map((x) => ({ id: x.id, name: x.title })),
        shelf: lesson.library.length,
      };
    }),
  };
}
