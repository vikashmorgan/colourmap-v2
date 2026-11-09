'use client';

/*
 * The Journey, after the Big Bang (docs/specs/art-journey.md): from a warm sea
 * to bacteria, veins, cells, a school of fish, a tree, its pulses, its roots
 * and a seed, with words on nature, organisation, technology, the sacred and
 * now. The math lives in lib/journey.ts; the shared trip player draws it.
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
} from '@/lib/journey';

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

export default function Journey() {
  return <TripPlayer trip={TRIP} page="journey" />;
}
