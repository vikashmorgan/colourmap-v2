'use client';

/*
 * Ocean, the sea's chapter (docs/specs/art-ocean.md): coral gardens grown
 * like trees, sea fans, table corals, clownfish hiding from a hunter in their
 * coral, six kinds of shoal led by the cursor, ten swarms of small fish, five
 * kinds of jellyfish, a reef channel swum through, and Swim, where you are the fish. The math lives in lib/ocean.ts; the shared trip player
 * draws it.
 */
import TripPlayer, { type Trip } from '@/components/TripPlayer';
import {
  camera,
  fade,
  hasGame,
  hasPointer,
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
  STEP_COLOURS,
  setPointer,
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
    // Swim: you steer your own fish with the cursor and the keys.
    game: { has: hasGame, set: setSwim },
  },
};

export default function Ocean() {
  return <TripPlayer trip={TRIP} page="ocean" />;
}
