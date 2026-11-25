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
3. **Things to explore** (shipped, below): big crashed space stations (broken rings, half-buried
   hulls you drive through), artefacts (monoliths, dead satellites, alien ruins), each on the map
   only once you have found it.
4. **Enemies** (shipped, below): ground robots (shoot them or ram them with the turbo and they
   explode), giant spider robots, ghosts, dusty manta rays; in the sky, space squids and UFOs.
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

## 3. Things to explore (2026-11-24)

Laid out in lib/art/mars-wrecks.ts; kept clear, made solid and made rideable by lib/art/mars.ts
(`WRECKS`, `HULLS`, `ARTEFACTS`, `WRECK_SOLIDS`, `DISCOVERIES`).

### The crashed stations

Five big wrecks, each well off the routes on open ground (`WRECK_DEFS`), each kept 230 m clear of
the loop's band, the line, the start, the stations, the rocks, the ramps and the portals
(`wreckClear`, its trench too):

| Wreck | Where | Hull | Ring |
| --- | --- | --- | --- |
| The Fallen Ark | (-700, -2000), south past the line's end | 200 m, radius 15 | 62 m |
| Halo Down | (3900, 400), east beyond the canyons' head | 150 m, radius 12 | 86 m, the big one |
| The Broken Spindle | (-4100, 1500), far west past the Rift | 220 m, radius 16 | 55 m |
| The Sleeping Leviathan | (1500, 7000), north past the Glow Lakes | 240 m, radius 17 | 70 m |
| The Last Lantern | (-1600, 6800), north-west past the lakes | 170 m, radius 13 | 50 m |

Each one:

- **Lies on ground flattened by its fall**: flat within 240 m of its middle, the dunes back by
  470 m (`WRECK_FLATS`), in the physics and the backdrop shader alike, like the towns.
- **A broken hull you drive through**: a tube open at both torn ends, its axis 0.3 of its radius
  above the sand (the rest buried). Inside, the sand floor curves up its sides like the barrel's
  (`hullFloor`, three quarters of the way to its walls, about 4 m), easing in over the first and
  last 14 m so you drive in at grade. Its shell holds you in and keeps you off from outside
  (`hullHit`), up to its top: above that you fly over it. Ribs every 12 m inside, stringers along
  its outside, shards of plate bent out round each mouth, a few lamps along its ceiling.
- **A torus ring standing tilted out of the sand**: its middle half its radius above the ground,
  leaning back 0.25 to 0.6 rad, a piece torn away up on its left shoulder and lying in the sand by
  its foot. Its two feet are solid (`ringFeet`); the way under it is open. Lamps along it.
- **The nose**, torn off and skidded to one side of the hull's front mouth, half buried, its
  cockpit windows dim (solid).
- **A scorched trench** 360 m long running back from the hull's tail, narrow where it hit and
  widest where it came to rest, a dark strip fading into the sand at its edges. Its line runs
  straight into the hull: down the trench, through the hull, out of its front.
- **A debris field**: about 30 pieces (plates, girders, pods, solar panels) along both sides of
  the trench and scattered round, never on the lane through the hull. Pieces 2.2 m across or
  more are solid; smaller ones you drive over.
- **Lights that flicker** (`flicker`): a dim unsteady glow that now and then drops out for an
  eighth of a second, each lamp on its own beat; **sparks** spit in small bursts from the hull's
  torn rims and the ring's torn ends (only within 900 m of you).

### The artefacts

Nine, each a little off the routes (`ARTEFACT_DEFS`), standing on the dunes:

- **Monoliths**: a black slab 4 by 1.2 m and 26 m tall, sunk a little and leaning a hair, a
  violet glow over it. *The Black Monolith* (2200, -2600), *the Second Monolith* (3400, 4400),
  *the Silent Monolith* (-3800, -1800).
- **Dead satellites**: a gold-foil body tipped in the sand, a dish 9 m across resting on its rim,
  one solar wing still on and one snapped off and lying by it, a red lamp. *Vesta* (1200, 1300),
  *Orpheus* (-1100, 4700), *Juno* (-4000, 4200).
- **Alien ruins**: ten stone pillars in a ring 26 m across (some broken short), the two pairs
  either side of the way through carrying lintels (arches you drive under), an altar in the
  middle; glyphs glow teal up the pillars' outer faces and round the altar, breathing slowly.
  *The Glyph Circle* (-3700, -400), *the Old Gate* (4300, 4200), *the Sunken Temple* (900, -2600).
- Solid below their tops (`artefactSolids`, `solidHit`): the slab, the satellite's body and dish
  foot, each pillar and the altar.

### Finding them

"The more u know the more u discover": a wreck is found when you come within 450 m of it, an
artefact within 240 m (`REVEAL`, `newlyFound`). The moment you find one its name fades in low on
the screen under a small *found* (components/drive/MarsWorldHud.tsx `FoundCard`, 5 s), and from
then on the map shows it: a wreck as its hull's line, its ring and its name; an artefact as a small
mark in its colour (violet monolith, red satellite, teal ruins). Nothing you have not found is on
the map. The finds are kept on the device (`drive.mars.found`, their ids).

### Where it lives

- Pure: lib/art/mars-wrecks.ts (the layouts, `hullFloor`, `hullHit`, `ringFeet`, `solidHit`,
  `flicker`, `newlyFound`), lib/art/mars.ts (`WRECKS`, `HULLS`, `ARTEFACTS`, `WRECK_SOLIDS`,
  `DISCOVERIES`, the hull floors in `marsHeight`, the walls in `siteHit` with the vehicle's height,
  the wrecks' flats in the terrain and its GLSL).
- Live: components/drive/mars-wrecks-view.ts (the wrecks, artefacts, lamps, glyphs, sparks),
  components/drive/mars-run.ts (finding, `found` and `news` in `MarsWhere`),
  components/drive/MarsWorldHud.tsx (`FoundCard`, the finds on the map).
- Tests: lib/art/mars-wrecks.test.ts (the hull's floor and walls, the ring's feet, clearances,
  flat ground, a run through a hull, finding), components/drive/mars-wrecks-view.test.ts.

## 4. Enemies (2026-11-24)

The rules are pure in lib/art/mars-foes.ts (who, how they move, what beats them, what they do to
you); where they live comes from the world in lib/art/mars-lairs.ts. Fun, never punishing:
nothing ends a run or stops you dead; the worst is a bounce or a little speed lost.

### Who, where, and how each is beaten

| Kind | How many, where | How it moves | Beaten by |
| --- | --- | --- | --- |
| Patrol robots | 30: two round each factory, preheater, silo battery and lone cooling tower, and each wreck | Roll round a ring 24 to 34 m off what they guard (5 m/s); see you within 75 m (on the ground) and roll at you at 15 m/s, never more than 170 m from home | One shot, shark, laser or boosted ram (health 2) |
| Giant spider robots | 4: one down each canyon's floor (mouth to mouth and back), two round wobbly loops on the open plain at (1650, 250) and (-1300, 1150) | Walk at 8 m/s, the body 9 m up on eight legs | Several hits (health 12): a boosted ram or the laser takes 4, a shot or shark 2 |
| Ghosts | 24: three round each wreck and each alien ruin | Drift a slow figure eight round their haunt, 2.5 to 4 m up, fading in and out | Only the laser dispels one |
| Dusty manta rays | 18: three flocks of six, gliding round wide ellipses over the dunes at (1400, 900), (-1900, 900), (900, 4400) | A V that weaves, 3 to 6 m up, wings beating, dust streaming under them | Anything, even a gentle bump (for a little score) |
| UFOs | 5: over the Landing Plain, Dome City, the Factory Belt, the Field of Arches, the Glow Lakes | Loop their round 90 to 110 m up; every 24 s swoop down to 5 m for 7 s, a beam of light under them | Anything while low (health 3); out of reach up high |
| Space squids | 8, high over the whole world | Drift a wide circle 190 to 240 m up, pulsing, tentacles of beads of light trailing in slow waves | Out of reach: the sky's life |

Scores: robot 100, spider 600, ghost 150, manta 25, UFO 300. A wrecked one comes back home after
a while (25 to 90 s), once you are 300 m away.

### What they do to you

- **Ramming while boosting** (the turbo, a gate's booster, a ring's surge, or a superboost) hits
  a robot or a spider hard (4) and you plough on, losing 8% of your speed. **Without the boost**
  you bounce off it: the speed into it turned back out and 45% of everything lost
  (`bounceOff`), a robot knocked back 2 m. Flying over one, nothing.
- **A ghost driven through**: a cold breath (a high airy noise, a glassy tone) and a pale blue
  over the screen's edges fading in under a second; you keep 82% of your speed. Each ghost chills
  you at most every 2.5 s.
- **A swooping UFO passing over you** lifts you into a little hop (7 m/s up), once in 4 s.
- **A manta you touch** goes in a puff of dust.

### The attacks on them

- The attacks work on the enemies as on him, and still go after the catch (there are enemies to
  fight): a **Dust Shark** goes for the nearest robot, spider or manta ahead of it within 240 m
  when that is nearer than him (`sharkPrey`, the `aim` of `stepAttacks`), and bites the first it
  reaches; a **shot** bursts on the first it passes close to, and every burst hurts all within
  its 28 m; the **laser's** beam hurts all along it.
- Hits show a quick warm brighten on the enemy and a spark; a wreck goes up in a white core gone
  in a quarter second, an orange ball swelling and fading over a second, a shock ring racing over
  the ground, debris flung out tumbling and falling, a cloud of dust, and a deep boom (longer and
  deeper for a spider, components/drive/mars-sound.ts `boom`).
- The run's tally sits quietly under the attacks once there is one: *wrecked 7 · 1,250*
  (components/drive/MarsWorldHud.tsx `Tally`). A new run starts it again and brings every enemy
  home.

### How they are drawn

Robots, ghosts and mantas are one instanced mesh each (the mantas' wings beat in the vertex
shader); the four spiders, five UFOs and eight squids are their own groups. A spider's legs are
two bones each, bent at a knee raised above the line from hip to foot (`legKnee`); each foot
stays planted until it lags 3.4 m behind its rest, then steps there in a 0.32 s arc while the
other group of four stands (`SPIDER_LEGS`, `STRIDE`). Only enemies within their kind's distance
are drawn (900 m for ghosts up to 5 km for squids), only those near you are moved (robots,
ghosts and mantas within 2.5 km of home), and the counts are capped (`CAP`).

### Where it lives

- Pure: lib/art/mars-foes.ts (kinds, placement, paths, movement, hits, touches, bounces, the
  legs), lib/art/mars-lairs.ts (the habitat from the world, `spawnFoes`), lib/art/mars-attacks.ts
  (the sharks' `aim`).
- Live: components/drive/mars-run.ts (moving them, the attacks on them, what you touch, the
  tally and the cold), components/drive/mars-foes-view.ts (the enemies and the explosions),
  components/drive/mars-sound.ts (`boom`, `coldBreath`), components/drive/engine.ts (passes
  whether you are boosting), components/drive/MarsWorldHud.tsx (`Tally`, `ColdFlash`).
- Tests: lib/art/mars-foes.test.ts, lib/art/mars-attacks.test.ts (the sharks' aim),
  components/drive/mars-foes-view.test.ts (the view, a boosted ram wrecking a robot and an
  unboosted one bouncing you off).

## Still to come

5. highways and missions, as planned above.
