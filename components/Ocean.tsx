'use client';

/*
 * Ocean, the sea's chapter (docs/specs/art-ocean.md): a coral garden grown
 * like trees, a shoal, a swarm of small fish, jellyfish, and a reef channel
 * swum through. The math lives in lib/ocean.ts; the shared trip player
 * draws it.
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
};

export default function Ocean() {
  return <TripPlayer trip={TRIP} page="ocean" />;
}
