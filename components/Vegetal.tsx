'use client';

/*
 * Vegetal, the plant world's chapter (docs/specs/art-vegetal.md): cell, roots
 * from one base, the tree flat and in 3D, fungi, a leaf, a flower on the
 * golden angle, fruit and seed, a road through an avenue, a forest along a
 * river, the full tree in gold, trees in the water, a flower blooming, and Bird Sim. The math lives in
 * lib/vegetal.ts; the shared trip player draws it.
 */
import TripPlayer, { type Trip } from '@/components/TripPlayer';
import {
  camera,
  fade,
  hasBird,
  hasSap,
  hasSwitch,
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
  setBird,
  setSap,
  setSwitch,
  setVariant,
  switchLabel,
  TOTAL,
  variantLabel,
  variantNames,
  wordsShown,
} from '@/lib/vegetal';

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
  // Opens on each piece alone, straight up; Journey plays them as one trip.
  pieces: {
    length: pieceLength,
    progress: pieceProgress,
    particleAt: pieceAt,
    camera: pieceCamera,
    look: pieceLook,
    flow: { has: hasSap, set: setSap },
    variants: { has: hasVariants, names: variantNames, set: setVariant, label: variantLabel },
    toggle: { has: hasSwitch, label: switchLabel, set: setSwitch },
    // Bird Sim: you fly your own bird with the cursor and the keys; on foot Space is the Dot Walker's
    // jump, not pause. Esc lets go: the bird weaves, the walker strolls, until you take over again.
    game: { has: hasBird, set: setBird, claims: [' '] },
  },
};

export default function Vegetal() {
  return <TripPlayer trip={TRIP} page="vegetal" />;
}
