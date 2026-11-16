'use client';

/*
 * RIVERDUST (docs/specs/riverdust.md): a desert town's design series, seven categories of named
 * designs (flags and lamps, tents and camps, the market, buildings, cavern and rock, water and
 * the river, the race gate), drawn in glowing grains at dusk. ← → between categories, ↑ ↓
 * between designs, the way the City's Studio works. The math lives in lib/riverdust.ts and
 * lib/riverdust-designs.ts; the shared trip player draws it.
 */
import TripPlayer, { type Trip } from '@/components/TripPlayer';
import {
  camera,
  fade,
  GRAINS,
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
  setVariant,
  TOTAL,
  variantLabel,
  variantNames,
} from '@/lib/riverdust';

export const TRIP: Trip = {
  phases: PHASES,
  start: PHASE_START,
  total: TOTAL,
  stepColours: STEP_COLOURS,
  makeParticles,
  grains: GRAINS,
  particleAt,
  phaseAt,
  look,
  camera,
  fade,
  // Dusk over the desert first: violet above, warming to burnt orange at the horizon, the sand
  // dark below; then a desert night, a dust storm's glow, black.
  backgrounds: [
    { name: 'Dusk', stops: ['#100a22', '#24163a', '#4a2438', '#5e3026', '#22140e'] },
    { name: 'Desert night', stops: ['#0a0716', '#140c22', '#1a0f1c'] },
    { name: 'Dust storm', stops: ['#24160f', '#40261a', '#2c1a12'] },
    { name: 'Black', stops: ['#040207'] },
  ],
  pieces: {
    length: pieceLength,
    progress: pieceProgress,
    particleAt: pieceAt,
    camera: pieceCamera,
    look: pieceLook,
    // One pill a design; ↑ ↓ step through them, the name shown quietly beside the category's.
    variants: { has: hasVariants, names: variantNames, set: setVariant, label: variantLabel },
  },
};

export default function Riverdust() {
  return <TripPlayer trip={TRIP} page="riverdust" />;
}
