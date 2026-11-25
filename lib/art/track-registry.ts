/**
 * Drive: one place that says what each track is (docs/specs/drive-tracks.md). Pure: no three.js.
 *
 * The menus (the track ring, its map, the race intro, the results) and the HUD read a track's
 * signature colour, tagline, timing, length and highlights from here, so every screen speaks of a
 * track the same way (2026-11-21: "overall coherence, better menus and a clear improvements list
 * for each track").
 */

import { WORLDS, type WorldId } from '@/lib/art/drive-design';
import { COAST_GATE, RACE, SKY_LAP } from '@/lib/art/track';

/** How a track is timed: the measured mile and drift gates, a fixed course, every km, or laps. */
export type Timing = 'mile' | 'course' | 'km' | 'lap';

export interface TrackInfo {
  id: WorldId;
  name: string;
  /** The track's own colour (sRGB hex): its screen in the ring, its map line, its HUD accent. */
  colour: string;
  /** One line under the name. */
  tagline: string;
  timing: Timing;
  /** A timed run's length (m): the mile, the course, the lap, or the km between gates. */
  runLength: number;
  /** Whether the road goes on for ever (the plains and the km roads) or closes into a course or lap. */
  endless: boolean;
  /** 1 easy to 3 hard. */
  difficulty: 1 | 2 | 3;
  /** Whether rivals race here (only on a road). */
  rivals: boolean;
  /** Up to three things the menu names under the map. */
  highlights: string[];
  /** Day or night: the menus dim or warm to match. */
  night: boolean;
}

const MILE = 1609.344;

export const TRACKS: Record<WorldId, Omit<TrackInfo, 'id' | 'name'>> = {
  salt: {
    colour: '#ecc7b0',
    tagline: 'Endless salt at sunset',
    timing: 'mile',
    runLength: MILE,
    endless: true,
    difficulty: 1,
    rivals: false,
    highlights: ['Measured mile', 'Drift gates', 'Mirage'],
    night: false,
  },
  coast: {
    colour: '#e8a35c',
    tagline: 'Banked cliff road over the sea',
    timing: 'km',
    runLength: COAST_GATE,
    endless: true,
    difficulty: 1,
    rivals: true,
    highlights: ['Banked bends', 'Sea cliff', 'Timed kilometres'],
    night: false,
  },
  canyon: {
    colour: '#b8532e',
    tagline: 'Red rock, quarter-pipes and jumps',
    timing: 'course',
    runLength: RACE.finish - RACE.start,
    endless: false,
    difficulty: 2,
    rivals: true,
    highlights: ['Quarter-pipes', 'Two arches', 'Crests that launch you'],
    night: false,
  },
  night: {
    colour: '#6f8fc8',
    tagline: 'Lamp rows in the rain',
    timing: 'km',
    runLength: COAST_GATE,
    endless: true,
    difficulty: 2,
    rivals: true,
    highlights: ['Wet mirror road', 'Great arches', 'Boost rings'],
    night: true,
  },
  chinatown: {
    colour: '#d83a2a',
    tagline: 'Lanterns, lanes and avenues',
    timing: 'km',
    runLength: COAST_GATE,
    endless: true,
    difficulty: 2,
    rivals: true,
    highlights: ['Lantern strings', 'Temple gates', 'Opening avenues'],
    night: true,
  },
  neon: {
    colour: '#c04cf0',
    tagline: 'The City of Dreams in neon',
    timing: 'km',
    runLength: COAST_GATE,
    endless: true,
    difficulty: 3,
    rivals: true,
    highlights: ['Mood rings', 'Ship highways', 'Bridges overhead'],
    night: true,
  },
  sky: {
    colour: '#e07a4a',
    tagline: 'An endless canyon on three heights',
    timing: 'lap',
    runLength: SKY_LAP,
    endless: false,
    difficulty: 3,
    rivals: true,
    highlights: ['Three flying heights', 'Lap doors', 'Streams of light'],
    night: false,
  },
  mars: {
    colour: '#c8643a',
    tagline: 'The salt flat on Mars',
    timing: 'mile',
    runLength: MILE,
    endless: true,
    difficulty: 1,
    rivals: false,
    highlights: ['Craters', 'Phobos and Deimos', 'Quick, leaning turns'],
    night: false,
  },
  gold: {
    colour: '#e2b04a',
    tagline: 'A road of gold dots under Saturn',
    timing: 'km',
    runLength: COAST_GATE,
    endless: true,
    difficulty: 2,
    rivals: true,
    highlights: ['City of gold', 'Saturn', 'Steep banked bends'],
    night: true,
  },
  symphony: {
    colour: '#9d86ff',
    tagline: 'A road made of mathematics',
    timing: 'km',
    runLength: COAST_GATE,
    endless: true,
    difficulty: 2,
    rivals: true,
    highlights: ['Catenary bridges', 'Ring gates', 'Euclidean fire'],
    night: true,
  },
};

/** Every track, in the menu's order (the worlds' keys, 1 to 9 and 0). */
export function trackList(): TrackInfo[] {
  return WORLDS.map((w) => ({ id: w.id, name: w.name, ...TRACKS[w.id] }));
}

export function trackInfo(id: WorldId): TrackInfo {
  const w = WORLDS.find((x) => x.id === id) ?? WORLDS[0];
  return { id: w.id, name: w.name, ...TRACKS[w.id] };
}

/** "4.8 km course", "6.0 km lap", "1 mile", "timed every km". */
export function runLabel(t: TrackInfo): string {
  if (t.timing === 'mile') return '1 mile';
  if (t.timing === 'km') return 'timed every km';
  return `${(t.runLength / 1000).toFixed(1)} km ${t.timing}`;
}
