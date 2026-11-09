'use client';

/*
 * The Big Bang: one continuous trip of light. Brought into Colour Brain's Art
 * from the standalone Geometry Builder (app/big-bang there), as its third tab. The math lives in lib/bigbang.ts;
 * the shared trip player (components/TripPlayer.tsx) draws it, as it draws the
 * Journey that follows (lib/journey.ts).
 */
import TripPlayer, { type Trip } from '@/components/TripPlayer';
import {
  look,
  makeParticles,
  PHASE_START,
  PHASES,
  particleAt,
  phaseAt,
  TOTAL,
} from '@/lib/bigbang';

/* One representative colour per step, for the step bar. */
const STEP_COLOURS = [
  '#ffd9a0',
  '#9fb6ff',
  '#ffc35a',
  '#fff1b8',
  '#d9a85c',
  '#e0b070',
  '#e8b860',
  '#7fd6ff',
  '#f2c15a',
  '#ff9fb0',
  '#c99a55',
  '#c6a5ff',
  '#6fe0b4',
  '#d8e070',
  '#5fa8ff',
  '#9ec4ff',
];

const TRIP: Trip = {
  phases: PHASES,
  start: PHASE_START,
  total: TOTAL,
  stepColours: STEP_COLOURS,
  makeParticles,
  particleAt,
  phaseAt,
  look,
};

export default function BigBang() {
  return <TripPlayer trip={TRIP} page="big-bang" />;
}
