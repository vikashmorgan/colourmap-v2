'use client';

/*
 * The canopy you see from the pilot's seat (V; docs/specs/art-city.md, "Ships, cockpits and the
 * map"): the frame and the dashboard's edge of the ship you fly, drawn as a light overlay at the
 * edges of the picture, the middle left clear. The world leans with the bank behind it (the trip
 * player rolls the camera); the canopy stays put, as it would around you.
 */

import { CANOPIES, camView } from '@/lib/city-cockpit';
import { currentShip } from '@/lib/city-ships';

export default function CityCockpit() {
  if (camView() !== 'cockpit') return null;
  const ship = currentShip();
  const c = CANOPIES[ship.id];
  return (
    <svg
      className={`cd-canopy cd-canopy-${ship.id}`}
      viewBox="0 0 1000 600"
      // A round porthole stays round: fitted inside the screen, its frame filling the rest.
      preserveAspectRatio={c.round ? 'xMidYMid meet' : 'none'}
      aria-hidden="true"
    >
      <path className="cd-canopy-frame" d={c.frame} fillRule="evenodd" />
      <path className="cd-canopy-glass" d={c.glass} />
      <path className="cd-canopy-dash" d={c.dash} />
    </svg>
  );
}
