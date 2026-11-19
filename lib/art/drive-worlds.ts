/**
 * Drive: what each world is made of (docs/specs/drive-game.md). Pure: no three.js.
 *
 * Salt Flat is open (no track: drive anywhere); the others run along a track (lib/art/track.ts).
 * The night worlds share one backdrop and one furnisher (lib/art/night-course.ts), each in its own
 * theme.
 */

import type { WorldId } from '@/lib/art/drive-design';
import type { NightTheme } from '@/lib/art/night-course';
import { START, SUN_AZ } from '@/lib/art/salt-flat-game';
import {
  CANYON,
  CHINATOWN,
  COAST,
  COAST_SEA,
  NEON_TRACK,
  NIGHT,
  RACE,
  SKY,
  SKY_LAP,
  type TrackDef,
} from '@/lib/art/track';

export type Rgb = [number, number, number];
export type RaceKind = 'mile' | 'canyon' | 'km' | 'lap';

export interface WorldCfg {
  id: WorldId;
  track: TrackDef | null;
  theme: NightTheme | null;
  /** The backdrop's world (lib/art/drive-shaders.ts WORLD_SHADER). */
  backdrop: 'salt' | 'coast' | 'canyon' | 'night' | 'mars';
  /** The low sun's azimuth (counter-clockwise from east). */
  sunAz: number;
  /** The plane under everything: its height. */
  planeY: number;
  /** Where you start: on the track at s (and across at u), or on the flat. */
  startS: number;
  race: RaceKind;
  /** Dust and spray colour (linear). */
  dust: Rgb;
  /** Wet: the road mirrors and spray rises instead of dust. */
  wet: boolean;
}

const lin = (r: number, g: number, b: number): Rgb => [r ** 2.2, g ** 2.2, b ** 2.2];

export const WORLD_CFG: Record<WorldId, WorldCfg> = {
  salt: {
    id: 'salt',
    track: null,
    theme: null,
    backdrop: 'salt',
    sunAz: SUN_AZ,
    planeY: 0,
    startS: 0,
    race: 'mile',
    dust: lin(0.98, 0.9, 0.86),
    wet: false,
  },
  // The Salt Flat's open plain and its course, on Mars: rust regolith, a butterscotch dusk.
  mars: {
    id: 'mars',
    track: null,
    theme: null,
    backdrop: 'mars',
    sunAz: SUN_AZ,
    planeY: 0,
    startS: 0,
    race: 'mile',
    dust: lin(0.86, 0.46, 0.28),
    wet: false,
  },
  coast: {
    id: 'coast',
    track: COAST,
    theme: null,
    backdrop: 'coast',
    // Over the sea, ahead and to the left of the way the road first runs (the piece's sun at x -0.55).
    sunAz: COAST.startH + 0.4,
    planeY: COAST_SEA,
    startS: 40,
    race: 'km',
    dust: lin(0.62, 0.45, 0.3),
    wet: false,
  },
  canyon: {
    id: 'canyon',
    track: CANYON,
    theme: null,
    backdrop: 'canyon',
    sunAz: CANYON.startH - 0.35,
    planeY: 0,
    startS: RACE.start - 90,
    race: 'canyon',
    dust: lin(0.82, 0.6, 0.5),
    wet: false,
  },
  night: {
    id: 'night',
    track: NIGHT,
    theme: 'rain',
    backdrop: 'night',
    sunAz: 0,
    planeY: 0,
    startS: 40,
    race: 'km',
    dust: lin(0.55, 0.58, 0.66),
    wet: true,
  },
  chinatown: {
    id: 'chinatown',
    track: CHINATOWN,
    theme: 'chinatown',
    backdrop: 'night',
    sunAz: 0,
    planeY: 0,
    startS: 40,
    race: 'km',
    dust: lin(0.6, 0.5, 0.5),
    wet: true,
  },
  neon: {
    id: 'neon',
    track: NEON_TRACK,
    theme: 'neon',
    backdrop: 'night',
    sunAz: 0,
    planeY: 0,
    startS: 40,
    race: 'km',
    dust: lin(0.6, 0.55, 0.75),
    wet: true,
  },
  sky: {
    id: 'sky',
    track: SKY,
    theme: null,
    backdrop: 'canyon',
    sunAz: SKY.startH - 0.3,
    planeY: -400,
    // Just short of the first lap door, so the first lap starts at once.
    startS: SKY_LAP - 300,
    race: 'lap',
    dust: lin(0.8, 0.55, 0.45),
    wet: false,
  },
};

export const SALT_START = START;
