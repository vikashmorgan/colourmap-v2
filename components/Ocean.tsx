'use client';

/*
 * Ocean, the sea's chapter (docs/specs/art-ocean.md): coral gardens grown
 * like trees, sea fans, table corals, clownfish hiding from a hunter in their
 * coral, six kinds of shoal led by the cursor, ten swarms of small fish, five
 * kinds of jellyfish, a reef channel swum through, and Shark Sim, where you
 * are the hammerhead in three seas, with a coral tunnel, whales and
 * passing hammerhead schools. The math lives in lib/ocean.ts; the
 * shared trip player draws it.
 */
import TripPlayer, { type Trip } from '@/components/TripPlayer';
import {
  boostLeft,
  CORAL_MODES,
  camera,
  fade,
  hasCoralModes,
  hasGame,
  hasLight,
  hasPointer,
  hasSeas,
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
  SEA_NAMES,
  STEP_COLOURS,
  setCoralMode,
  setLight,
  setPointer,
  setSeaOf,
  setSwim,
  setVariant,
  TOTAL,
  variantLabel,
  variantNames,
  wordsShown,
} from '@/lib/ocean';

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
  // Black, or deep blues darkening downward for a feeling of depth (2026-11-11: "check black as one
  // preset for background but also do some deep blue backgrounds, with feeling of depth").
  backgrounds: [
    { name: 'Black', stops: ['#040207'] },
    { name: 'Deep blue', stops: ['#0c2c4e', '#061a33', '#020a18'] },
    { name: 'Abyss', stops: ['#06182f', '#030c1c', '#010409'] },
    { name: 'Twilight', stops: ['#163f6a', '#0a2446', '#031022'] },
  ],
  // Opens on each piece alone, picked by name; Journey plays them as one trip.
  pieces: {
    length: pieceLength,
    progress: pieceProgress,
    particleAt: pieceAt,
    camera: pieceCamera,
    look: pieceLook,
    // The shoal's kinds of fish, the small fish's ten swarms, the five jellyfish, one at a time.
    variants: { has: hasVariants, names: variantNames, set: setVariant, label: variantLabel },
    // In the shoal the cursor is a small yellow fish the others follow; a click hands back to the loop.
    pointer: { has: hasPointer, set: setPointer },
    // Shark Sim: you steer your own fish with the cursor and the keys; Space boosts while the bar lasts.
    game: {
      has: hasGame,
      set: setSwim,
      claims: [' '],
      meter: { label: 'Boost', value: boostLeft },
    },
    // Light: caustics on the sand and waves of light on the surface above.
    toggle: { has: hasLight, label: 'Light', set: setLight },
    // Shark Sim's three seas: the coral forest, open water, the deep.
    scenes: { has: hasSeas, names: SEA_NAMES, set: setSeaOf, label: 'Sea' },
    // Every coral natural, warm or gold, on each piece with corals.
    cycle: { has: hasCoralModes, names: CORAL_MODES, label: 'Coral colours', set: setCoralMode },
  },
};

export default function Ocean() {
  return <TripPlayer trip={TRIP} page="ocean" />;
}
