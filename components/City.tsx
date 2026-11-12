'use client';

/*
 * City, the third chapter after Vegetal and Ocean (docs/specs/art-city.md):
 * neon towers growing up from a grid of blocks, ships streaming in layered
 * sky lanes, bands and signs drifting slowly through their colours, a
 * Chinatown street of glowing Chinese and Japanese signs under red lanterns,
 * sky bridges and landing platforms, an endless street-canyon flown down the
 * middle, and Ship, where you pilot a small ship through the city with the
 * keys. The math lives in lib/city.ts; the shared trip player draws it.
 */
import TripPlayer, { type Trip } from '@/components/TripPlayer';
import {
  boostLeft,
  camera,
  fade,
  gauges,
  hasGame,
  look,
  makeParticles,
  PHASE_START,
  PHASES,
  particleAt,
  phaseAt,
  pieceAt,
  pieceCamera,
  pieceLength,
  pieceLook,
  pieceProgress,
  STEP_COLOURS,
  setFly,
  TOTAL,
  wordsShown,
} from '@/lib/city';

const TRIP: Trip = {
  phases: PHASES,
  start: PHASE_START,
  total: TOTAL,
  stepColours: STEP_COLOURS,
  makeParticles,
  particleAt,
  phaseAt,
  look,
  camera,
  fade,
  wordsShown,
  // A violet night first, darkening downward; then black, a deeper night and a dusk.
  backgrounds: [
    { name: 'Violet night', stops: ['#1c1036', '#0e0822', '#05030c'] },
    { name: 'Black', stops: ['#040207'] },
    { name: 'Deep night', stops: ['#0c0a2a', '#060418', '#020108'] },
    { name: 'Dusk', stops: ['#3a1640', '#1a0b2c', '#070410'] },
  ],
  // Opens on each piece alone, picked by name; Journey plays them as one trip.
  pieces: {
    length: pieceLength,
    progress: pieceProgress,
    particleAt: pieceAt,
    camera: pieceCamera,
    look: pieceLook,
    // Ship: you fly with the keys; Space boosts while the bar lasts, and it fills again as you
    // cruise. Two dials read your height and speed.
    game: {
      has: hasGame,
      set: setFly,
      claims: [' '],
      meter: { label: 'Boost', value: boostLeft },
      gauges,
    },
  },
};

export default function City() {
  return <TripPlayer trip={TRIP} page="city" />;
}
