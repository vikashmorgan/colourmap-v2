'use client';

/*
 * Vegetal, the plant world's chapter (docs/specs/art-vegetal.md): cell, roots
 * from one base, the tree flat and in 3D, fungi, a leaf, a flower on the
 * golden angle, fruit and seed. The math lives in lib/vegetal.ts; the shared
 * trip player draws it.
 */
import TripPlayer, { type Trip } from '@/components/TripPlayer';
import {
  camera,
  fade,
  look,
  makeParticles,
  PHASE_START,
  PHASES,
  particleAt,
  phaseAt,
  STEP_COLOURS,
  TOTAL,
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
};

export default function Vegetal() {
  return <TripPlayer trip={TRIP} page="vegetal" />;
}
