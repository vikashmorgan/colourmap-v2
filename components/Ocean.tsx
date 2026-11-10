'use client';

/*
 * Ocean, the sea's chapter (docs/specs/art-ocean.md): coral gardens grown
 * like trees, sea fans, table corals, clownfish pulsing out of their coral,
 * five kinds of shoal, a swarm of small fish, jellyfish, and a reef channel
 * swum through. The math lives in lib/ocean.ts; the shared trip player
 * draws it.
 */
import TripPlayer, { type Trip } from '@/components/TripPlayer';
import {
  camera,
  fade,
  hasShoalKinds,
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
  SHOAL_NAMES,
  STEP_COLOURS,
  setShoalKind,
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
  // Opens on each piece alone, picked by name; Journey plays them as one trip.
  pieces: {
    length: pieceLength,
    progress: pieceProgress,
    particleAt: pieceAt,
    camera: pieceCamera,
    look: pieceLook,
    // The shoal's five kinds of fish, one kind at a time.
    variants: { has: hasShoalKinds, names: SHOAL_NAMES, set: setShoalKind, label: 'Shoal' },
  },
};

export default function Ocean() {
  return <TripPlayer trip={TRIP} page="ocean" />;
}
