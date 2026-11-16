# Drive

A racing game grown from the Speed pieces (docs/specs/geometry-field.md, Speed). Route:
`/geometry-field/drive`, listed as **Drive** after Hyper-speed in the Art pills (`ART_PILLS` in
components/GeometryField.tsx). A visitor path like the rest of `/geometry-field`; no data read.

## Why

2026-11-16, on the Salt Flat piece: "salt flat looks awesome, can you make it with the car as a
video game." Then, the same day, one world at a time: a banked Coast Road with a hover ship
("a spaceship without wheels, with purple-blue-orange fire, like speed fire"), a Design tab (fire,
two turbine boosters, a glass bubble, chrome / rust / red), a Canyon Race with obstacles, banked
curves and crests that make you fly, the Coast Road's oncoming dust in every world, weather "from
sand, to very dusty, to snowstorm", Night Rain without its white side lines, mountains on the salt's
horizon, the City's buildings, gates and arches on the wet night course, then a Chinatown track and
a Neon District track.

## Worlds (keys 1–6, or the names at the top)

1. **Salt Flat**: the piece itself, now open. Endless crazed salt at sunset, heat shimmer, the
   mirage, low violet hills, the red streak crossing the flat now and then (in front of wherever you
   look), mesas, and layered mountain ranges in haze (near ones darker, far ones pale blue-violet,
   snow on the tallest, the sunset lighting one flank, a faint mirror in the salt, almost no
   parallax). A painted line runs north; tenth-mile poles stand beside it; two gates time **a
   measured mile**. Sparse survey stakes are scattered over the flat (never in a lattice).
   The car keeps the piece's camera: 1.2 m up, level, the car's tail 5.8 m ahead.
2. **Coast Road**: the cliff-top road, wider (24 m), packed brown earth with ruts. Its curves are
   **banked** (the outer edge raised, to the angle that holds you at about 200 km/h); running down a
   bank pumps you forward. The rail on the sea side and the cliff on the other hold you in (a glance,
   never a crash); a gate every kilometre times each km. Default vehicle: the hover ship.
3. **Canyon Race**: a fixed course, the same every time, on the Salt Flat: out over the salt, into
   red-brown canyons (narrow passages, two arches), back out. Banked bends, three crests that launch
   you, dips that compress and speed you up. Obstacles: pillars, boulders, mesas, salt ridges, fallen
   rock; moving hazards: tumbleweeds and dust devils. Start, four checkpoints, finish; race time and
   best time.
4. **Night Rain**: overhead lamp rows drawing the course in three lines, a wet road with long
   reflections, rain and spray, no white lines. Towers in the City's glowing-grain look set well back,
   a Great Arch every 1.5 km, LED arrows on the bends, boost rings. Banked, with crests.
5. **Chinatown Run**: red and gold. Lantern strings overhead, narrow lanes between shophouses opening
   every 600 m onto wide avenues, Chinatown gates and temple gates, banners and hanging signs with
   letters, CITY OF DREAMS panels. Uncluttered; no flashing.
6. **Neon District**: magenta, cyan and violet. Towers, bridges overhead, three ship highways streaming
   above at different heights, LED arrows, boost rings, and a few flashing signs (this world only,
   about one sign in seven).

Why three night tracks: Night Rain stays the plain lamp course the user loved (with the City's
towers, arch and rings added back from the road); Chinatown and the Neon District are new tracks
with their own curvature, elevation and furniture from one generator (`lib/art/night-course.ts`),
rather than merged into Night Rain, so each keeps a clear mood.

## Controls

- ↑ / W accelerate; ↓ / S brake, then reverse; ← → / A D steer.
- Space boost (top speed ×1.25); Shift double boost (×1.5).
- Touch: any touch drives; hold the left or right third to steer; two fingers boost, three double.
- 1–6 worlds · R restart · Esc closes the Design panel, else back to the builder (Experiment tab).

## Driving

Pure physics in `lib/art/vehicle.ts`, stepped at 120 Hz:

- **Car**: top 92 m/s, an acceleration curve that fades toward the top, grip 14 m/s² with a
  slip angle and drift (the tyres scrub speed in a slide), rolling and air drag, body roll and pitch.
- **Hover ship**: no wheels, 0.75 m up, a little faster, looser grip, bobbing; floats and glides in
  the air (gravity ×0.38, steerable).
- **Slopes and banks**: gravity along the ground (20 m/s²); the bank pump turns the sideways speed the
  bank takes away into forward speed going downhill.
- **Steering at speed** (2026-11-16): the body never yaws much faster than the grip can swing the
  velocity after it (car ×1.25, ship ×1.45 of the grip's turn rate, plus what a bank holds), so a
  key held hard over at full speed is a drift you can hold, not a spin. Before, full steer for 3 s
  at 280 km/h spun the car to an 86° slide and 49 km/h; now it slides under 15° and keeps ~175.
- **Air**: you leave the ground when your path a few hundredths of a second ahead rises above it
  by 3 cm (crests); the ship's hover field needs 6 cm more. A take-off keeps at most 11 m/s
  upward, so every jump is one you can read and land. The road's curled-up edge (the lip) is ridden
  like a wall and never launches you. The car flies briefly, the ship glides. Landing costs up to
  12% of speed with a dust puff; the camera lifts while you are in the air. (Until 2026-11-16 the
  take-off test, judged over one 1/120 s sub-step against a fixed centimetre, never fired on a
  crest, while the lips threw the ship off the road every few hundred metres.)
- **Hits**: walls and obstacles push you out and bounce you. The speed lost and the spin go with
  how hard you hit (full at 14 m/s into it), so a glancing scrape along a barrier keeps its speed
  and swings the body back parallel to the wall; a head-on hit costs the whole share and spins.
  Dust devils only nudge. No game over, ever.
- **Off the road**: a soft slowdown (rough drag), never a stop.

## Camera and feel

Chase camera with lag; the view widens (focal 1.5 → 1.18) and a soft tremor grows with speed;
it rolls a little with the vehicle. Horizon and sun stay fixed while the ground streams. The
projection is the Speed pieces' own, so the shader backdrop and the meshes agree to the pixel.

Trails: faint tyre marks that darken in a slide (none in the wet), glowing fire ribbons from the
ship's boosters; dust, salt or spray puffs from the wheels.

**Oncoming motes**: the Coast Road piece's motes, exactly as they look there, in every world, in each
world's palette (salt white, earth, red-brown grit, cold night). Density and streak length grow
with speed and boost.

## Design panel

A small **Design** text button (bottom right) opens a quiet panel; the game holds still and the
camera turns slowly round the vehicle as a live preview. Rows:

- **Vehicle**: Car or Hover ship (per world).
- **Fire**: Purple-blue-orange (default), Blue gas, Red-orange blaze, White-hot, Green plasma, from
  the flame tool's palettes (`lib/art/flame.ts`).
- **Hull**: Chrome, Rust, Red.
- **Weather**: Clear, Light sand, Sandstorm, Dust devils, Rain, Light snow, Snowstorm. Each sets the
  motes' colour, size, density and streaks, fog, sky tint and light, gusts, and blends over 2 s.
  Weather fades the mountains. Works in every world.

Remembered per viewer in localStorage (`drive.design`), as are best times
(`drive.best.<world>.<vehicle>`), each read and written inside try/catch.

The ship: a lens hull, keel and nose; a glass bubble canopy with a seat and pilot; two side turbine
boosters (intake lip, 9-blade fan, ribbed housing, nozzle) that the fire comes out of, its length
growing with speed and boost.

## UI

Quiet: the speed in km/h at the lower left with the run's time and best under it; the world names
small at the top right; "‹ Art" at the top left; Design at the lower right; a one-line key hint that
fades after a few seconds. No counts, badges or pills.

## Light and performance

Mellow light: glows, no flashing (except a few Neon District signs). Repeating detail is scattered
(no lattice shimmer); window grains fade to their average below a pixel. Tracks are built in 120 m
chunks, two per frame at most, merged into a few meshes per chunk; stakes and highway ships are
instanced; puffs are capped at 700; building reflections are capped at 26 m deep. Pixel ratio is
capped at 1.5. Bloom: the builder's Speed setting by day, stronger at night.

## Files

- `app/(app)/geometry-field/drive/page.tsx`, `components/DriveGame.tsx` (shell, HUD, keys, panel)
- `components/drive/engine.ts` (renderer, loop, camera, races), `vehicles.ts`, `track-view.ts`,
  `salt-view.ts`
- Pure: `lib/art/drive.ts` (controls, feel, gates, trails), `vehicle.ts`, `track.ts`,
  `salt-flat-game.ts`, `night-course.ts`, `weather.ts`, `drive-design.ts`, `drive-worlds.ts`,
  `drive-shaders.ts`; `lib/art/speed-shaders.ts` shares its common head (`SPEED_COMMON`).

## Edge cases

- No WebGL: "This game needs WebGL." in place of the canvas.
- Storage blocked: the design falls back to the defaults and bests are not kept.
- `?world=coast` (any world id) opens that world.
- Focus lost: all keys and touches are released.
