# Mars World

How Mars (world 8 of Drive, docs/specs/drive-game.md) grows from an open plain with a chase into a
whole world to race through and explore. The Drive spec keeps the world's first layer (dunes, the
Red Bastard, stations, pipelines, kickers and decks, attacks, arches, atomic plants, lighthouse);
this spec is the plan for what comes next and the source of truth for each part as it ships.

## The asks (verbatim)

- "make more big crashed space stations on the ground and other artefacts and factories so world
  is less empty."
- "much more big ass factories with shapes like the ones in city's factory designs. and big ass
  nuclear towns. and more stuff. and a superboost for the desert parts. that u can take by flying
  through portals. and it allows u to super speed"
- "make sure u can ride, shred or play with factory elements as jumps or loops to pass through.
  also some massive town part factory with streets u can race through. plan how to develop mars.
  add some canyons that u can race in with tilt. and some canyons and rocks and stuff like that"
- (A later phase) "a bunch of ghosts, enemies, robots that u have to shoot and explode and charge
  into with the turbo. giant spider robots. dusty manta rays. space squids in the sky. flying ufos
  in the sky."
- "for Mars sharks make them jump into the air sometimes."

## The vision

All the worlds are one connected free world, built as racetracks that keep expanding: "the more u
know the more u discover". On Mars that means places that feel like discoveries off the routes: a
canyon mouth you notice from the plain, a portal glinting at the end of a straight, a ring of
cooling towers on the horizon. The routes (his loop, the highways, the pipelines) carry you; what
lies off them rewards whoever leaves them.

## The plan

1. **Terrain to race in** (shipped, below): canyons cut into the desert with banked walls you ride
   the tilt of, some opening into wide gorges; rock fields (arches, boulder gardens, mesas, rocks as
   natural jumps); superboost portals at the canyons' exits and along the desert straights.
2. **The factory city** (shipped, below): huge factories in the City's factory shapes (stacks, tanks, conveyor
   halls, cooling towers); factory pieces you ride (conveyor ramps to jump, a pipe loop or barrel to
   ride through, gaps between halls to thread, tank tops to land on, a chimney slalom); an
   industrial town with real streets to race through; big nuclear towns (cooling-tower rings,
   reactor domes, workers' blocks, a glow at night).
3. **Things to explore**: big crashed space stations (broken rings, half-buried hulls you drive
   through), artefacts (monoliths, dead satellites, alien ruins).
4. **Enemies**: ground robots (shoot them or ram them with the turbo and they explode), giant
   spider robots, ghosts, dusty manta rays; in the sky, space squids and UFOs.
5. **Connect it**: highways and pipelines between the regions, the map showing them, missions that
   route you through each place.

Every part is placed by the map's region and site system (lib/art/mars-map.ts, lib/art/mars.ts
`REGIONS`, `SITES`, `siteClear`, `siteHit`, `CLEAR`), so nothing stands on the Red Bastard's loop,
the start, the measured mile, the drift lake bed, the crater or the lakes. Anything you ride is a
real surface the physics drives (`marsHeight`); anything solid you flow round (`siteHit`).

## 1. Terrain to race in (2026-11-24)

### The canyons

- Two canyons cut into the real terrain (lib/art/mars-canyons.ts `CANYON_DEFS`), in the physics
  (`marsBase`) and in the backdrop shader alike (`canyonGlsl`, called from `marsH`), so the walls
  you ride are the walls you see.
  - **The Red Canyons**, south-east of the start (from about (650, -1500) to (3000, -1500), about
    2.7 km): a snake that banks left and right round 420 to 620 m bends, 36 to 40 m wide on the
    floor and 20 to 26 m deep, opening into a gorge 220 m wide and narrowing again.
  - **The Rift**, west past the Field of Arches (from about (-2350, -1700) north to (-3050, -190),
    about 1.7 km): longer, straighter bends (700 to 900 m), 40 to 44 m wide and up to 26 m deep,
    with a gorge 180 m wide.
- Each canyon is a chain of circular arcs laid end to end (`layCanyon`): each piece turns round a
  radius, its floor width and depth easing (smoothstep) from the last piece's end to its own, so the
  floor runs on smoothly from piece to piece. The first piece starts at no depth and the last ends
  at none: you drive in and out at grade.
- The cut across a canyon: a flat floor, then banked walls 70 m across (`CANYON_BANK`) rising in a
  smooth S to a soft rim. The walls are 25° to 36° at their steepest with the dunes, steep enough
  to ride the tilt of round a bend (the bank's own hold, lib/art/vehicle.ts), never too steep to
  climb out. The dunes roll on under the cut, so the floor swells and dips with them.
- On the screen the walls show banded strata in rust, oxblood and pale sand, and the floor sits a
  shade darker.
- The regions: *The Red Canyons* and *The Rift* (`REGIONS`), named as you enter.
- Stations, kickers and pipelines keep 20 m clear of a canyon's rim (`canyonNear` in `siteClear`).

### The rock fields

Placed by lib/art/mars-rocks.ts `placeRocks`, kept clear by lib/art/mars.ts (`ROCKS`,
`ROCK_ARCHES`):

- **Mesas**: flat-topped buttes in tiers of strata, 24 to 58 m in radius at the foot and 22 to 48 m
  tall, on the canyons' rims, alternating sides, so a canyon runs between cliffs.
- **Spires**: hoodoos (a tapering column with a cap rock), 18 to 40 m tall, in clusters on the
  rims.
- **Boulder gardens**: about 130 boulders, 2 to 11 m across, on the gorges' wide floors, leaving a
  lane at least 36 m wide down the middle to race; weave between them for the fun of it.
- **Rock arches**: natural arches straddling a canyon's narrow floor, their feet at the walls'
  foot; the way under is open.
- **Rock slabs**: natural jumps, 22 m long rising to a 5 m lip, 11 m wide (`SLAB`; kickers drawn
  in rock, lib/art/mars-ramps.ts `rock`): one in the middle of each gorge and two out on the desert
  beyond each canyon's mouth.
- Every rock is solid: you flow round it as along every wall (`siteHit`). The rocks are merged into
  one mesh per 512 m cell (components/drive/mars-rocks-view.ts).

### The superboost

- **Portals** (lib/art/mars-boost.ts, lib/art/mars.ts `PORTALS`): tall rings of pale blue light,
  9 m in radius, standing on iron feet across their way, a faint disc of light breathing across
  each and a broken inner ring turning once in 12 s. Twelve of them: two on the approach to each
  canyon, one where each gorge narrows, one at each canyon's mouth, and two more out along the
  desert straight beyond it. They show on the map as small pale-blue rings.
- **Through a portal** (on the ground or flying, inside the ring, either way): the superboost
  pushes you along your heading at up to 38 m/s² toward 1.7 times your top speed (about 560 km/h
  in the car), easing off as you near it; full for 3.5 s, fading over 1.5 s (`superAccel`). Past the
  top the engine eases you back down (about 3 m/s²), so the speed bleeds off over many seconds,
  never stamped on. Another portal while it runs starts it again: chain them down the straights.
- **Its look and sound**: for 5 s the speed streaks thicken and the view widens (the engine's boost
  look at twice the strength, fading over the last second; `superLook`), the vehicle's fire burns
  hotter, and a rush of filtered air rises over a low swell (components/drive/mars-sound.ts
  `superWhoosh`). Nothing flashes.

### The Dust Sharks breach

Every 3.4 s or so each Dust Shark leaps out of the dust (lib/art/mars-attacks.ts `sharkBreach`):
an arc 6 m high over 1.1 s, nose up on the way out and down on the way in, its whole body showing
(a rust body, a pale belly, a forked tail), with a spray of dust as it leaves the ground and as it
dives back in. The first leap waits a moment after it sets off, and each shark keeps its own beat.
Only the look changes: where a shark is and when it hits are as before.

### Where it lives

- Pure: lib/art/mars-canyons.ts (canyons, their cut, the GLSL), lib/art/mars-rocks.ts (the rock
  fields' placement), lib/art/mars-boost.ts (portals, the superboost's push and look),
  lib/art/mars.ts (`marsBase` with the cut, `ROCKS`, `ROCK_ARCHES`, `PORTALS`, `siteHit`),
  lib/art/mars-attacks.ts (`sharkBreach`).
- Live: components/drive/mars-run.ts (portal crossing, `superPush`, `superShown`),
  components/drive/engine.ts (the push and the look), components/drive/mars-rocks-view.ts (rocks,
  arches, portals), components/drive/mars-attack-view.ts (the breaching sharks),
  components/drive/MarsWorldHud.tsx (the canyons, mesas and portals on the map),
  lib/art/drive-shaders.ts (the strata).
- Tests: lib/art/mars-canyons.test.ts, lib/art/mars-boost.test.ts, lib/art/mars-attacks.test.ts.

## 2. The factory city (2026-11-24)

The shapes come from the City's Industry superquarter (lib/city-industry.ts): sawtooth halls,
silo batteries, preheater towers of stacked cyclones, hyperboloid cooling towers, chimneys,
conveyor galleries. Everything is laid out in lib/art/mars-works.ts and kept clear, made solid and
made rideable by lib/art/mars.ts.

### Flat ground

The towns stand on flattened ground (`FLATS`): flat within 300 to 330 m of each town's middle, the
dunes back in full by 560 to 600 m, in the physics and the backdrop shader alike (the same pattern
as the measured mile's corridor). Floors and streets are at height 0.

### The Foundry Town

East of the Factory Belt, round (3650, 2350), on a slight turn (`TOWN`): a grid of 64 m blocks and
24 m streets, five by five, its middle row left open as an avenue 112 m wide.

- **Blocks**: foundry halls filling a block (16 to 26 m tall; those facing the avenue 12 m), pairs
  of brick warehouses with an 8 m alley between them to thread, and tank yards (three drums and a
  chimney). Walls in rust, brick or concrete with an iron band at the roofline, rows of steady warm
  windows.
- **Roofs and tank tops you land on**: every building's roof and every tank's top is part of the
  ground the physics drives (`platformTop`), from 2 m in from its walls (`ROOF_INSET`): dark tar
  with pale landing stripes. From the street a building is a wall you flow along (`boxHit`); it
  stops being one only when you are above its top (less than 0.6 m under it), so you never climb a
  wall from the street, even superboosted. Off a roof's edge you fly down to the street.
- **Roof ramps**: four iron ramps on the first half of the avenue (30 m long, a 15 m lip),
  slanting 52° off its line toward the blocks either side, so their run-ups stay on the avenue. At
  140 to 210 km/h they fling you across the street onto the 12 m roofs.
- **The chimney slalom**: seven brick stacks (58 to 80 m) down the second half of the avenue,
  alternating 13 m either side of its line, 30 m apart. A superboost portal stands at its head.
- **The barrel**: a giant pipe 100 m long and 10 m in radius at the avenue's far end, on its line.
  A true vertical loop cannot be driven on Mars (the ground is a height field, one height per
  point, so nothing overhangs), so the "loop to pass through" is this barrel: its floor curves up
  its sides like a half-pipe (`barrelAt`, three quarters of the way up its radius, about 3.4 m and
  48°), so off its line you ride high round it; past that its shell holds you in (`barrelHit`).
  Ribbed rust outside, a lamp ring every 20 m along its ceiling.

### The nuclear towns

*Reactor Town* (2700, 5350), north-east past the Factory Belt, and *the Cooling Ring* (-3400,
5650), north-west past the crater (`NUKES`), each:

- a reactor dome 64 m across on its drum, ribs of the City's star-light dots;
- six hyperboloid cooling towers 112 m tall in a ring 215 m out, a glowing green ring at each
  mouth breathing slow steam, dots round their feet, waists and mouths;
- twelve workers' blocks (44 by 16 m, 10 to 16 m tall, roofs you can land on) in a ring between
  the dome and the towers, gaps between them to race through; three tanks by the dome.
- Their radiation is milder than the lakes': 0.7 at the dome, none 420 m out (`NUKE_RAD`), so the
  Geiger column and the soft TV glitch rise as you near a reactor.

### The mega works

Seven big works standing alone (`MEGA_WORKS`), on the Factory Belt and round the Foundry Town,
each kept clear and off the towns' flat ground: preheater towers (a frame of four legs and six
floors, cyclones stacked down it, 92 m plus its stack), silo batteries (six drums 46 to 50 m tall
with cone tops and a gallery along them) and lone cooling towers. Each has a **conveyor gallery**
beside it: an iron ramp 70 m long rising to a 20 m lip (`galleryFor`), dark iron with pale hazard
bands, to jump high into the sky.

### Where it lives

- Pure: lib/art/mars-works.ts (the layouts, `platformTop`, `boxHit`, `barrelAt`, `barrelHit`,
  `FLATS`), lib/art/mars.ts (`BOXES`, `TANKS`, `BARRELS`, the works in `SITES`, the surfaces in
  `marsHeight`, the walls in `siteHit` with the vehicle's height, the flats in the terrain and its
  GLSL, the reactors in `radiation`).
- Live: components/drive/mars-works-view.ts (the towns merged per town, the barrel, the works'
  shapes), components/drive/mars-view.ts (the works among the stations, the galleries' iron),
  components/drive/MarsWorldHud.tsx (buildings, tanks, the barrel and the towers on the map).
- Tests: lib/art/mars-works.test.ts (roofs, walls, the barrel, flat ground, clearances, a roof
  ramp onto a roof, a wall never climbed, a run through the barrel, the galleries).

## Still to come

3. Things to explore (crashed stations, artefacts), 4. enemies, 5. highways and missions, as
planned above.
