# The Symphony: a track made of mathematics

**Status:** Active (1 of 4 built: the road, the bridges, the ring gates, the pillars, the fire rows)
**Date:** 2026-11-24
**Route:** `/drive` (a new world in the track ring, and a place in the one connected world)

## Purpose

A track whose geometry and light come from mathematics: sinusoids, Fibonacci, the golden ratio, circles within circles, a deep tunnel and sudden rainbows. Asked for on 2026-11-24:

> "use maths and math beauty to create a unique symphony track that uses sinusoidals and fibonaccis etc to create beautiful bridges and irregular mathematical golden magic and beauty. and sudden rainbows etc... and circle in circle and deep super tunnel"

Then: "no music stuff for now and ripples like space ripples". The track has no sound mapping for now; the name stays.

It belongs to the one connected world (the user's vision, 2026-11-24: "it is all the same world… racetracks that keep on expanding… the more u know the more u discover"), so it is reached from another place as well as from the ring.

## The road

- **A line that never repeats.** The centre line is a sum of sinusoids whose frequencies stand in irrational ratios (1, φ, √2, and so on). It never closes into a pattern, but it always feels rhythmic. Heading, height and bank each come from their own sum, and the bank follows the curvature so the tilt always matches the turn.
- **The torus knot.** One section winds round an invisible torus as a (p, q) knot, so it passes over and under itself. Every crossing becomes a bridge.
- **The golden spiral climb.** A ramp that tightens by the golden ratio each quarter turn as it rises, like a nautilus shell.
- Every slope stays driveable and every change is smooth, never a sudden bump. Bank angles stay within the drive engine's limits.

## The structures

- **Catenary bridges.** The main cables hang in a cosh curve, the shape a real cable takes. Hangers are spaced at Fibonacci intervals (1, 1, 2, 3, 5, 8…), so the rhythm quickens toward the towers. Tower heights and spans keep the golden ratio.
- **Golden-angle pillars.** Around a hub, pillars and lamps are placed at 137.5°, the angle sunflower seeds grow at. The spiral arms leave no gaps.
- **Euclidean fire rows.** Burners fire in Euclidean rhythms (5 in 8, 7 in 12, and so on), so the rows groove instead of ticking.

## Circle in circle

- **Ring gates.** Rings turn inside rings at golden-ratio speeds, like a gyroscope you drive through. Their gaps line up only for a moment, so you have to time your pass.
- **Wheels on wheels.** In one section the road traces an epicycloid, a circle rolling on a circle, drawn out as flower-like loops.

## The deep super tunnel

- **The gyroid.** A minimal surface splits space into two endless, interwoven tunnel networks. Driving in feels like an organic cave without end. It is the track's climax.
- **Linked rings.** Another tunnel is made of circles in which every ring is linked with every other ring, as in the Hopf fibration. Each ring is a gate.

## Space ripples

Ripples in space itself, like gravitational waves. Rings spread out from a point and pass over the scene, and as each one passes, the road, the sky and the light bend gently with it. The deck's height and the camera's view swell and settle. They are seen and felt but never throw the car. Some come from the ring gates as you pass through, some from far away on their own.

## Sudden rainbows

After a stretch of rain, with the sun behind you, a rainbow appears at its real angle: 42° from the point opposite the sun. It slides as you turn. Now and then a fainter second bow stands above it with its colours reversed. Rainbows are rare, so they stay magical.

## The look

Gold over deep violet. Rainbow colour comes only at the climaxes. Repeated rows recede into the distance, sightlines stay clear, and the lap is shaped like a piece of music: a calm opening, a build, the gyroid climax, then a release.

## Where it is in the world

- **The ring:** the second screen, after the Golden Track (key 2; the Salt Flat moved to 0).
- **The way in from the world (planned):** from the Golden Track's STAY WILD portal at the end of
  each lap. Drive through the dome on its centre line while boosting and the road beyond turns
  violet and carries on as the Symphony's opening straight. Nothing signposts it: you find it.
  This needs the engine to change world mid-drive and tell the menus, so it waits for its own
  change; for now the Symphony is reached from the ring.

## What is built

`lib/art/symphony.ts` (pure, tested in `lib/art/symphony.test.ts`) lays out the whole lap; the
road is `SYMPHONY` in `lib/art/track.ts`.

### The lap (16 km), in movements

| km | Movement |
|---|---|
| 0 – 1.7 | The opening: the grid dead straight and level, then a calm line between two irrational waves of light; the first sunflower of pillars on the right at 0.9 |
| 1.7 – 4.6 | The bridges: up a viaduct to 26 m, three catenary bridges of 233, 377 and 610 m (2.38, 2.70, 3.22), the golden helix of lamps all along the top, down again |
| 4.6 – 6.4 | The ring gates: six, 233 m apart (4.8 to 5.97); the second sunflower on the left at 5.3 |
| 6.4 – 7.8 | The fire rows: 5 in 8 against 3 in 8 (6.55), 7 in 12 against 5 in 12 (6.99), 5 in 13 against 8 in 13 (7.42) |
| 7.8 – 9.8 | The build: the road at its liveliest, three epicycloids standing beside it (8.2, 8.9, 9.5; the torus knot comes here) |
| 9.8 – 11 | The rise (the golden spiral climb comes here) |
| 11 – 13 | The climax (the gyroid tunnel comes here) |
| 13 – 14.3 | The linked rings come here |
| 14.3 – 16 | The release: the line eases off between the waves again, the third sunflower on the left at 15.1, straight home |

### The road

- **Heading:** a sum of four sinusoids with frequencies 1, φ, √2 and φ² over a 1.7 km base
  (amplitudes 0.42, 0.24, 0.2, 0.08 rad). The waves run on absolute distance, so no lap is the
  same road as another. Tested: no 1.5 km stretch matches any shift of itself from 200 m to 3.5
  km, nor the same place a lap or two on.
- **Height:** a sum of three, frequencies 1, √3 and φ² over 1.9 km (6, 3.5 and 1.8 m).
- **The shape of the piece:** an envelope over the lap scales both (smootherstep between keys, so
  its slope and curve ease too). It is nil over the grid: every lap's start is dead straight and
  level. Calm in the opening (0.45 of the waves), long arcs over the bridges (0.4), building to
  all of them from 7.8 to 13 km, easing off home.
- **Limits** (tested over three laps): no bend tighter than 180 m (the tightest about 210 m);
  the heading never past 60° off the lap's way, so the road never comes back across itself;
  grades under 9 % (the viaduct's ramps); at 92 m/s a crest asks under a quarter of gravity.
- **Bank:** follows the curvature (`bankFor`, design speed 60 m/s, up to 0.6 rad), so the tilt
  always matches the turn; the limit bites on the sharpest few per cent only, and flat out the
  roll comes on at under 0.5 rad/s.
- Half-width 16 m, a lip, barriers, a curled wall up a bank's high side (as the Golden Track).
- **The autopilot** drives a whole lap flat out without leaving the road (tested); rivals race it.

### The bridges

- **The viaduct:** the road climbs 26 m over 600 m (smootherstep), runs level for 1.7 km and comes
  down again. Over 8 m up it is a bridge: no ground beside it, a dark slab under the deck, piers
  every 55 m (none under a suspended span).
- **Three catenary bridges:** spans 233, 377 and 610 m (consecutive Fibonacci numbers, each φ
  times the last), 89 and 144 m apart. Each tower stands from the plain to span / φ³ over the
  deck (55, 89 and 144 m), crossbeams at its top and its two golden sections.
- **The cables** hang in a true catenary, y = a (cosh(x / a) − 1), from tower top to tower top,
  down to 3 m over the deck at midspan (a found by bisection; tested against y'' = √(1 + y'²) / a).
- **The hangers** stand at Fibonacci intervals (1, 1, 2, 3, 5, 8 … units) from each tower to the
  middle, so the rhythm quickens toward the towers; the unit is chosen so the last interval ends
  at midspan.

### The golden angle

- **Sunflowers of pillars:** 233 (or 144) pillars round a hub 150 to 170 m off the road, the n-th
  at radius c √n and n × 137.5° round. Tallest at the hub (55 to 70 m), a spire of light at its
  middle. The Fibonacci-numbered seeds are violet, the rest gold, so the spiral arms show. None
  stand within 8 m of the road.
- **The golden helix:** along the viaduct's top, a lamp every 9 m, each 137.5° further round the
  road (radius half-width + 5 m), every fifth violet: a spiral of light you drive through.

### Waves and wheels

- **Irrational waves:** in the opening and the release, a line of light either side of the road
  (gold on the left, violet on the right), 6 m out, its height a sum of sinusoids in ratios 1, φ,
  √2 with each side's own phases: it never repeats.
- **Wheels on wheels:** three epicycloids in the build, each a circle of radius 26 / 5 m rolling
  round one of 26 m, drawn out as five petals of gold light standing beside the road, the two
  circles faint in violet.

### Euclidean fire

Burners down both edges every 5 or 6 m. Each row fires a Euclidean rhythm E(k, n) on the left and
another on the right: k onsets spread as evenly as they go over n steps (`euclid`, Bresenham's
form; E(3, 8) is the tresillo). Every step has a stub; the onsets carry a burner (gold fire on the
left, blue gas on the right) that fires as you come within 22 m, the rests a violet light. At
speed the rhythm in space becomes one in time: the rows groove instead of ticking.

### Ring gates

- **Three rings inside one another,** radius 30, 30 / φ and 30 / φ² m, round one middle 11.5 m
  over the crown, so the inner ring's foot is on the road. Gold, violet, pale gold.
- **They turn about the road** at 0.7, 0.7 φ and 0.7 φ² rad/s, the middle one the other way, each
  gate starting at its own golden turn so no two open together. Each ring has a gap of 2 rad.
- **The gaps line up only for a moment:** within 1.25 rad of one another (the three still share an
  opening of about 43°). Open about an eighth of the time, for about three quarters of a second,
  about every five seconds, never more than seven apart (tested over ten minutes).
- **The rings brighten** as their gaps close in, and a light gathers where they meet.
- **Through a gate while it is open,** within the inner ring, you get the boost rings' surge.

### The look

- **Sky:** a violet dusk, rose low down, near black overhead; a low gold sun behind you at the
  start, a long gold band along the horizon under it; a few gold-white stars high up.
- **Plain:** deep violet glass with the dusk and the sun lying in it. The road is a violet-black
  asphalt, wet, with gold edge lines and violet dashes.
- The weathers keep the sky dark, as on the Golden Track.
- **Dressing:** the bridges, sunflowers, fire rows, helix, waves and epicycloids are the design
  space's new **Maths** category (`components/drive/design-space.ts`), worn by default on the Symphony and placeable on
  any track (spread evenly where the road is plain). The ring gates turn in
  `components/drive/symphony-view.ts`.

## Later

- The rest of the generators (the never-repeating line, the ring gates, the gyroid) join the Design space's Maths category (the bridges, sunflowers, Euclidean fire, golden helix, waves and epicycloids are there already).
- Music driven by the track (pitch from height, harmony from curvature, tempo from speed) is set aside for now at the user's request.

## Build order

1. The never-repeating road with curvature-matched bank, the catenary bridges and the golden ring gates.
2. Space ripples and the rainbows.
3. The torus-knot section and the golden spiral climb.
4. The gyroid tunnel climax, then the linked-ring tunnel.
