'use client';

/*
 * City, the third chapter after Vegetal and Ocean (docs/specs/art-city.md).
 * It opens on the golden city: a round plan grown from φ and lit ring by ring
 * from its heart, the city rising from that map, the open sphere of light at
 * its heart, five temples, five factories and five golden glass domes. Then
 * five night cities seen from above, and the neon city: towers growing up
 * from a grid of blocks, ships in layered sky lanes, neon, a Chinatown street
 * of glowing signs under red lanterns, sky bridges and landing platforms, an
 * endless street-canyon, and Ship, where you pilot a small ship through the
 * city with the keys. The math lives in lib/city.ts, lib/golden-city.ts and
 * lib/city-plans.ts; the shared trip player draws it.
 */
import { useEffect } from 'react';
import CityCockpit from '@/components/CityCockpit';
import CityDreamsMap from '@/components/CityDreamsMap';
import TripPlayer, { type Trip } from '@/components/TripPlayer';
import {
  boostLeft,
  camera,
  depthOfField,
  fade,
  gauges,
  hasGame,
  hasPalettes,
  hasVariants,
  look,
  makeParticles,
  PHASE_START,
  PHASES,
  paletteNames,
  particleAt,
  phaseAt,
  pieceAt,
  pieceBackground,
  pieceCamera,
  pieceLength,
  pieceLook,
  pieceProgress,
  SHIP_KEYS,
  STEP_COLOURS,
  setFly,
  setPalette,
  setVariant,
  TOTAL,
  tally,
  variantLabel,
  variantNames,
  wordsShown,
} from '@/lib/city';
import {
  DISPLAY_NAMES,
  displayIndex,
  displayNow,
  loadCockpit,
  setDisplay,
  setView,
  VIEW_NAMES,
  viewIndex,
} from '@/lib/city-cockpit';
import { setCityQuality } from '@/lib/city-game';
import { loadShip, SHIP_NAMES, setShip, shipIndex } from '@/lib/city-ships';

const TRIP: Trip = {
  phases: PHASES,
  start: PHASE_START,
  total: TOTAL,
  stepColours: STEP_COLOURS,
  makeParticles,
  // More grains than the other worlds: the towers and the far districts fill in (2026-11-14); on a
  // computer more again, for the longer view (2026-11-14: "make much more visibility for computer").
  grains: { small: 6500, large: 15000 },
  particleAt,
  phaseAt,
  look,
  camera,
  fade,
  wordsShown,
  // A deep blue-violet dawn first, warm low down, so the golden city's gold stands out; then the
  // violet night, black, a deeper night and a dusk.
  backgrounds: [
    { name: 'Dawn', stops: ['#080a24', '#141638', '#2a2240', '#3d2a3a'] },
    { name: 'Violet night', stops: ['#1c1036', '#0e0822', '#05030c'] },
    { name: 'Black', stops: ['#040207'] },
    { name: 'Deep night', stops: ['#0c0a2a', '#060418', '#020108'] },
    { name: 'Dusk', stops: ['#3a1640', '#1a0b2c', '#070410'] },
  ],
  // Opens on each piece alone, picked by name; Journey plays them as one trip.
  pieces: {
    length: pieceLength,
    progress: pieceProgress,
    particleAt: pieceAt,
    camera: pieceCamera,
    look: pieceLook,
    // Atlantis's own water behind it.
    background: pieceBackground,
    // Pills under a piece: eleven plans, eight Nova Cores, temples, factories and domes from the
    // single building to the quarter, five cities from above.
    variants: { has: hasVariants, names: variantNames, set: setVariant, label: variantLabel },
    // Colour presets for the golden pieces (Gold, Rose gold, …) and the factories (Rust, Steel …).
    palettes: { has: hasPalettes, names: paletteNames, set: setPalette },
    // Ship: you fly with the keys; Space boosts as long as you hold it, the bar never draining
    // (2026-11-14; with W, on up into the stratosphere). L slows to a drift and looks down; Enter
    // starts a race at its start. Two dials read your height and speed; the count beside the bar
    // says the race's words, or a district's name as you come into it.
    game: {
      has: hasGame,
      set: setFly,
      claims: SHIP_KEYS,
      // No quotes or sentences while you fly: they only take space (2026-11-14).
      wordless: true,
      meter: { label: 'Boost', value: boostLeft },
      tally,
      gauges,
      // The ship in focus, the far city softening, more under the boost (2026-11-13).
      focus: depthOfField,
      // Four ships of our own, each with its own instruments (or any style, or none) and its
      // canopy from the pilot's seat (V); M opens the map (2026-11-12), and a tap on a quarter in
      // it flies there (2026-11-14), as [ and ] hop to the quarter before or after.
      display: displayNow,
      options: [
        { label: 'Ship', names: SHIP_NAMES, get: shipIndex, set: setShip },
        { label: 'Displays', names: DISPLAY_NAMES, get: displayIndex, set: setDisplay },
        { label: 'View', names: VIEW_NAMES, get: viewIndex, set: setView },
      ],
      overlay: () => <CityCockpit />,
      sheet: {
        key: 'm',
        label: 'Map',
        render: (close, fly) => <CityDreamsMap onClose={close} onFly={fly} />,
      },
    },
  },
};

export default function City() {
  // The ship, displays and view last chosen on this device.
  useEffect(() => {
    loadShip();
    loadCockpit();
    // A computer sees further than a phone, by the trip player's own rule for its grains.
    setCityQuality(window.innerWidth < 700 ? 'small' : 'large');
  }, []);
  return <TripPlayer trip={TRIP} page="city" />;
}
