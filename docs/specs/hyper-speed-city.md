# Hyper-speed city

An Art design: autopilot in a straight line at mega speed above neon cities generated as you go,
in the look of the City's far layer. Route: `/geometry-field/hyper-city`.

## Why

The City of Dreams had a far city on its horizon (docs/specs/art-city.md, "The far city"): one
tile of the plan as a still GPU point cloud, repeated round the eye. The user loved it ("a big
psychedelic futuristic neon feel") but it felt like a different game, so it was taken off the City
(PR #476). They asked to "add it to the designs ... could be good for a game where you travel much
faster through cities in that kind of design, that are more quickly generated and just give an
impression of mega speed above the city", then: "do a procedural straight line travelling through
a hyper-speed city in the design, in autopilot, straight line."

## Where it lives

- A trip piece like the Big Bang, Journey, Vegetal, Ocean and City: `app/(app)/geometry-field/hyper-city/page.tsx`,
  `components/HyperCity.tsx`, the math in `lib/hyper-city.ts`, drawn by `components/TripPlayer.tsx`.
- Listed as **Hyper-speed**, right after City, in the Art pills of the Geometry Field panel
  (`ART_PILLS` in components/GeometryField.tsx) and the trip player's Design menu (`ART_LINKS`).
- A visitor path like the rest of `/geometry-field` (lib/auth/visitor.ts); no data read.

## The flight

- **Autopilot, straight line.** The eye flies down the middle of an open avenue (x = 0) at a
  constant height of 118, a little above most roofs, at a constant **450 units a second**, looking
  300 ahead and 30 down, so the avenue runs to a vanishing point in the middle of the screen.
  No steering; the viewer may still drag to look round and it eases home.
- **Field push.** The view opens from 55° to 74° over the first three seconds, then holds.
- **Speed streaks.** 2,400 grains are motes of dust in the air, each drawn as a six-point line
  18 long behind it, passing at the flight speed, clear of the eye's own line, coming in from 1,200
  ahead and gone just before the eye.

## The cities

- **One tile, built once** (`hyperCity(seed)`): 320 across, 2,880 along, cut into eight strips of
  360. Each strip is its own city from its own seed (`hyperStrip`), with its own pair of neon
  colours from magenta, cyan, violet, lime, orange, electric blue and gold.
- **A strip**: the avenue's two bright edge lines and a dashed centre line (the lines that run to
  the vanishing point); a dim line across at every cross street; blocks of 45 each side in three
  columns, each a tower (taller near the avenue, so it reads as a canyon; one in about 17 a giant
  with a spire) or now and then an open glow. A tower is its roof rim, its four edges dimming to the
  street, one or two neon bands round it, warm window rows on the faces toward the avenue on the
  tall ones. Nothing stands in the avenue above the street.
- About **44,000 points**, built in under 20 ms. The default seed is 7.
- **Repetition receding.** The GPU draws the tile's strips in copies round the eye out to 2,200
  (`tileCopies`), placed again every 12 flown; the same far layer path as the City's far city.
  About 160 strip copies, under 900,000 points, half of them behind and culled.

## Colour

- The far layer's look: additive points, a bluish haze and dimming with distance.
- **Drifts, never flashes** (the mellow rule): the whole palette turns round the colour wheel
  once every 54,000 flown (two minutes), under a degree a frame; each repetition of the tile is
  turned besides by a fixed amount (up to 0.9 radians) picked from its place, so the cities keep
  changing as you go. The streaks turn with the palette.

## Light

- Mostly GPU: per frame the JavaScript is the 2,400 streak grains and a few uniforms.
- **On a phone** (under 700 wide) there is no far layer; 2,800 more grains carry a light cut of the
  city instead: points of the tile's first two strips, repeated every 720 ahead of the eye, three
  copies across.

## Trip player changes

- `FarLayer.everyStep`: shown on every step, not only a game step.
- `FarLayer.hue` and `FarLayer.rowHue`: the palette's turn now, and each tile repetition's extra
  turn, applied in the far layer's shader.
- `pieces.camera` may return `fov` (degrees); 55 without it.

## Tests

- `lib/hyper-city.test.ts`: deterministic per seed, different across seeds, each strip its own
  city, built once; every point within the tile and its strip's span; the avenue open; the
  autopilot a straight line at a constant high speed; the field push; the hue drift under a degree
  a frame; copies receding past 1,500; streaks clear of the eye; the phone's city ahead of it.
- `components/HyperCity.test.tsx`: the trip hands the far layer on every step, grains, fov; listed
  after City in the trip player menu.
- `app/(app)/geometry-field/hyper-city/page.test.tsx`: the page renders under its title.
- `components/GeometryField.presets.test.ts`: the Art pills include Hyper-speed after City.
- `components/TripPlayer.test.tsx`: a far layer with `everyStep` is built on a non-game step and
  its hue asked for.
