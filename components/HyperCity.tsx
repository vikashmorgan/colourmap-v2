'use client';

/*
 * Hyper-speed city (docs/specs/hyper-speed-city.md): autopilot in a straight line at mega speed
 * above neon cities generated as you go, in the far city's look. The math lives in
 * lib/hyper-city.ts; the shared trip player draws it, the city as its far layer on the GPU.
 */
import TripPlayer, { type Trip } from '@/components/TripPlayer';
import {
  HYPER_FAR,
  hyperCamera,
  look,
  makeParticles,
  PHASE_START,
  PHASES,
  phaseAt,
  pieceAt,
  pieceLength,
  pieceProgress,
  STEP_COLOURS,
  STREAK_GRAINS,
  TOTAL,
} from '@/lib/hyper-city';

const TRIP: Trip = {
  phases: PHASES,
  start: PHASE_START,
  total: TOTAL,
  stepColours: STEP_COLOURS,
  makeParticles,
  particleAt: (p, t) => pieceAt(p, 0, t),
  phaseAt,
  look,
  camera: (t) => hyperCamera(0, t),
  // The grains' fades are worked into their colours.
  fade: () => 1,
  // A computer draws the city on the GPU and the grains only streak; a phone's extra grains carry
  // a light cut of the city instead.
  grains: { small: STREAK_GRAINS + 2800, large: STREAK_GRAINS },
  farLayer: HYPER_FAR,
  backgrounds: [
    { name: 'Night', stops: ['#0a0418', '#05020d', '#020106'] },
    { name: 'Black', stops: ['#040207'] },
    { name: 'Violet', stops: ['#1c0a3a', '#0c0520', '#04020a'] },
  ],
  pieces: {
    length: pieceLength,
    progress: pieceProgress,
    particleAt: pieceAt,
    camera: hyperCamera,
    look,
  },
};

export default function HyperCity() {
  return <TripPlayer trip={TRIP} page="hyper-city" />;
}
