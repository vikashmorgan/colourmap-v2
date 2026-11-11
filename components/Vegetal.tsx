'use client';

/*
 * Vegetal, the plant world's chapter (docs/specs/art-vegetal.md): cell, roots
 * from one base, the tree flat and in 3D, fungi, a leaf, a flower on the
 * golden angle, fruit and seed, a road through an avenue, a forest along a
 * river, the full tree in gold, trees in the water and a flower blooming. The math lives in
 * lib/vegetal.ts; the shared trip player draws it.
 */
import TripPlayer, { type Trip } from '@/components/TripPlayer';
import {
  camera,
  fade,
  hasGold,
  hasSap,
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
  setGold,
  setSap,
  setVariant,
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
    toggle: { has: hasGold, label: 'Gold', set: setGold },
  },
};

export default function Vegetal() {
  return <TripPlayer trip={TRIP} page="vegetal" />;
}
