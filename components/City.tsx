'use client';

/*
 * City, the third chapter after Vegetal and Ocean (docs/specs/art-city.md).
 * It opens on the golden city: a round plan grown from φ and lit ring by ring
 * from its heart, the city rising from that map, the open sphere of light at
 * its heart, five temples, five factories and five golden glass domes. Then
 * five night cities seen from above, and the neon city: towers growing up
 * from a grid of blocks, ships in layered sky lanes, neon, a Chinatown street
 * of glowing signs under red lanterns, sky bridges and landing platforms, an
 * endless street-canyon, and Ship, where you pilot a small ship through the
 * city with the keys. The math lives in lib/city.ts, lib/golden-city.ts and
 * lib/city-plans.ts; the shared trip player draws it.
 */
import TripPlayer, { type Trip } from '@/components/TripPlayer';
import {
  boostLeft,
  camera,
  fade,
  gauges,
  hasGame,
  hasVariants,
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
  SHIP_KEYS,
  STEP_COLOURS,
  setFly,
  setVariant,
  TOTAL,
  tally,
  variantLabel,
  variantNames,
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
  // A deep blue-violet dawn first, warm low down, so the golden city's gold stands out; then the
  // violet night, black, a deeper night and a dusk.
  backgrounds: [
    { name: 'Dawn', stops: ['#080a24', '#141638', '#2a2240', '#3d2a3a'] },
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
    // Pills under a piece: five temples, five factories, five domes, five cities from above.
    variants: { has: hasVariants, names: variantNames, set: setVariant, label: variantLabel },
    // Ship: you fly with the keys; Space boosts while the bar lasts, and it fills again as you
    // cruise (with W, on up into the stratosphere). L slows to a drift and looks down; Enter
    // starts a race at its start. Two dials read your height and speed; the count beside the bar
    // says the race's words, or a district's name as you come into it.
    game: {
      has: hasGame,
      set: setFly,
      claims: SHIP_KEYS,
      meter: { label: 'Boost', value: boostLeft },
      tally,
      gauges,
    },
  },
};

export default function City() {
  return <TripPlayer trip={TRIP} page="city" />;
}
