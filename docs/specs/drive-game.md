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

2026-11-17, on the roads: the night roads were "invisible like a transparent black shadow"; on the
Coast and Canyon "the car moves on top of the curves … and then it gets stuck"; "the idea is that
the car stays on track, on the road … wider roads, longer turns … so the car doesn't drift
excessively and lose control". Then: "I don't want obstacles on the canyon race or coast. The aim
for now is to make it nice and flowy and clean", "keep very wide roads in canyon race, so it is
easy to stay on it", "same with coast road, make them much wider".

## Worlds (keys 1–7, or the names at the top)

1. **Salt Flat**: the piece itself, now open. Endless crazed salt at sunset, heat shimmer, the
   mirage, low violet hills, the red streak crossing the flat now and then (in front of wherever you
   look), mesas, and layered mountain ranges in haze (near ones darker, far ones pale blue-violet,
   snow on the tallest, the sunset lighting one flank, a faint mirror in the salt, almost no
   parallax). A painted line runs north; tenth-mile poles stand beside it; two gates time **a
   measured mile**. Sparse survey stakes are scattered over the flat (never in a lattice).
   **Drift gates** (2026-11-19: "for the salt flat do gates, so it becomes a game on speeding and
   drifting"): a loop of 12 gates west of the mile, 22 m wide, in long alternate bends 150 to 200 m
   apart (`lib/art/drift-gates.ts`). The first stands 50 m ahead of the start. The next gate's posts
   glow gold and breathe, with a gold line across the salt; the one after is warm and dim, the rest
   faint. Through them in order: a lap is timed from the first gate back to it, and the next starts
   at once. **Drift score**: a slide past 8° above 43 km/h earns points (speed × angle), a combo
   grows from ×1 to ×4 the longer it is held, sliding through a gate adds 150 × the combo, and the
   drift is banked half a second after it ends (so two linked bends keep the combo). The HUD adds
   one quiet line: "drift 1240 ×2.5" while sliding, "· best 3120" otherwise. Best lap time and best
   score per vehicle (`drive.gates.time.<vehicle>`, `drive.gates.score.<vehicle>`). While a measured
   mile is run its clock shows instead.
   The car keeps the piece's camera: 1.2 m up, level, the car's tail 5.8 m ahead.
2. **Coast Road**: the cliff-top road, very wide (44 m; 24 m until 2026-11-17), packed brown earth
   with ruts, in long sweeping curves. Its curves are **banked** (gently, at most 0.2 rad) (the outer edge raised, to the angle that holds you at about 200 km/h); running down a
   bank pumps you forward. The rail on the sea side and the cliff on the other hold you in (a glance,
   never a crash); a gate every kilometre times each km. Default vehicle: the hover ship.
3. **Canyon Race**: a fixed course, the same every time, on the Salt Flat: out over the salt, into
   red-brown canyons (passages narrowing only to 36 m, two arches), back out. The road is 44 m wide;
   the bends are long (tightest radius about 234 m), banked, with three crests that launch you and
   dips that compress and speed you up. **Quarter-pipes** (2026-11-19: "don't do those borders where
   the road that went up has a corner … so I can go higher up on the walls … a feeling of freedom,
   but I can't wallride indefinitely"): inside the canyon the road has no lip; each edge curves up
   into a 16 m quarter-circle (no corner anywhere), to about 11 m high at 72°, and the rock rises
   from its top. You ride up as far as your speed takes you; the higher you are, the more the nose is
   turned back down and part of gravity gets past the tyres, so you always come back to the road.
   The road's hold (below) reaches the pipe's top, which is the cap on how high you go. Nothing stands on the road: no obstacles or hazards since
   2026-11-17 ("nice and flowy and clean"). Start, four checkpoints, finish; race time and best time.
4. **Night Rain**: overhead lamp rows drawing the course in three lines, a wet road (28 m) with long
   reflections, rain and spray, no white lines. Towers in the City's glowing-grain look set well back,
   a Great Arch every 1.5 km, LED arrows on the bends, boost rings. Banked, with crests.
5. **Chinatown Run**: red and gold. Lantern strings overhead, lanes (20 m) between shophouses opening
   every 600 m onto wide avenues (30 m, eased in over 180 m), Chinatown gates and temple gates, banners and hanging signs with
   letters, CITY OF DREAMS panels. Uncluttered; no flashing.
6. **Neon District** (32 m road): the City of Dreams' neon (2026-11-19): magenta, cyan, amber and
   violet. Towers, bridges overhead, three ship highways streaming above at different heights, all
   one way, the way you drive (2026-11-19: "not back and forth, only in one direction"), LED
   arrows, a few flashing signs (this world only, about one sign in seven), and **mood rings**
   (2026-11-19: "make the golden circles transform all lights into golden, orange ones make it all
   between yellow to red, and pink ones make it neon"): the boost rings come gold, orange, pink in
   turn, and going through one turns every light in view toward its mood's three colours (gold:
   warm golds; orange: yellow, orange, red; pink: magenta, cyan, violet). Each light keeps its place
   along them by its own hue, so the variety stays; the change eases in over half a second, carries
   into the glow, and holds until a ring of another mood. One screen pass before the bloom
   (`moodPass` in components/drive/engine.ts, `MOODS` in lib/art/night-course.ts).

7. **Sky Canyon** (2026-11-19: "a racetrack like the canyon but with the path also turning left and
   right like a long road, for spaceships … three vertical levels. It must feel like an infinite
   race, but you can do a door that is the start or finish of the laps"; "designed for a spaceship
   that can fly on multiple heights"; "you can use the mechanics of the City of Dreams with dots").
   An endless canyon in long alternate bends (never tighter than a 250 m radius), the road 60 m
   wide in red sandstone with a paler middle, 16 m quarter-pipes each side, and walls 130 to 190 m
   tall. The hover ship flies it as the City's ship flies: always cruising forward, **W S** climb
   and dive (easing in, up to 26 m/s, from the ground to a 62 m ceiling), **A D** turn, **E**
   faster, **Q** slower, Space and Shift boost, F the handbrake. Three bands of dots of light run
   along both walls just above the three flying heights (0, 22 and 44 m): amber, rose, violet, a
   dot every 5 m, and streams run along them ahead of you, faster than you (the City's pulses:
   1.7 × your pace + 8 m/s), each head bright with a 14 m tail. Every 6 km a **lap door**: three
   gold frames of dots, two pillars and an arch, wall to wall; the first is 300 m ahead of the start,
   each lap is timed door to door. Default vehicle: the ship (the car drives it on the ground).

8. **Mars** (key 8; 2026-11-19: "one map becomes Mars, in the style of the salt flats"): the Salt
   Flat's open plain and its course (the measured mile, the drift gates), in Mars colours: rust
   regolith with darker basalt grit and deeper polygon cracks, a butterscotch dusk going to dusty
   rose and dark umber, a small white sun in a blue halo (Martian dust scatters blue round the sun),
   Phobos and Deimos as two small grey moons, rust mesas and ranges with pale dust for snow, red
   grit for motes. One shader with the salt (`#define WORLD 4`, lib/art/drive-shaders.ts).
   Craters (2026-11-19: "more craters on Mars"): three sizes scattered over the plain, 3–11 m,
   12–40 m and 60–170 m across, each a bowl shadowed on the sun side and lit on its far wall, a rim
   catching the sun, and a pale apron of dust round it. They are painted on the ground; the plain
   still drives flat.

Why three night tracks: Night Rain stays the plain lamp course the user loved (with the City's
towers, arch and rings added back from the road); Chinatown and the Neon District are new tracks
with their own curvature, elevation and furniture from one generator (`lib/art/night-course.ts`),
rather than merged into Night Rain, so each keeps a clear mood.

**Night roads you can see** (2026-11-17): the three night roads are a lit asphalt, tinted per world
(cool grey in the rain, warm in Chinatown, violet in the Neon District), lighter at the lips and
darker off the road, with glowing lines: an edge line 2.6 m in from each side and dashed lane lines
(4 m every 12 m) between, pale blue in the rain, gold in Chinatown, cyan and magenta in the Neon
District. Night Rain keeps its "no white lines": its lines are dim blue, not white.

## Controls

- ↑ / W accelerate; ↓ / S brake, then reverse; ← → / A D steer.
- F or the **Handbrake** button (bottom middle, held): hold it and turn to drift.
- Space boost (top speed ×1.25); Shift double boost (×1.5).
- Touch: any touch drives; hold the left or right third to steer; two fingers boost, three double.
- Sky Canyon: W S climb and dive, A D turn, E faster, Q slower (see world 7).
- 1–7 worlds · R restart · Esc closes the Design panel, else back to the builder (Experiment tab).

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
- **The road holds you** (2026-11-17): on a road the vehicle follows the curve under it, lines up
  with the road's direction when you are not steering, and the bend's pull is added to the grip, so
  it no longer rides up the outside of a bend and sticks there. Steering is capped at about 20° off
  the road's direction (less near the edge you are heading for), so a key slammed over carves and
  glides to the edge instead of spinning. Within 5 m of an edge, outward speed fades and a gentle
  push brings you back toward the middle, on the ground and in the air (a jump follows the bend).
  Off the road (the Salt Flat) none of this applies. Tested on every track, car and ship, keys off
  or slammed, 30 s at full throttle: never more than 2 m past the edge, above 40 m/s, slip under 0.25.
- **Leaning** (2026-11-19): the car's lean was flipped on request ("the tilt of the car is inverted
  … when you turn left you lean left"), up to 0.09 rad; the ship keeps the bank it always had, an
  arcade racer's, up to 0.4 rad ("you inverted the sense in which the spaceship should tilt …
  should be like in Gal Racer"). Both also lean with the ground's slope.
- **Quick sideways moves on a road** (2026-11-19: "quicker tilt left right so I can do more small
  turns … go left right while still moving in the same direction, as if you wanted to skip an
  obstacle"): on a road the steering answers twice as fast and also slides you straight across it,
  up to 16 m/s (easing in at 9/s, out at 7/s), apart from the velocity so the tyres never scrub it
  away and the speed is all kept; the nose turns only a little. The slide fades within 4 m of the
  road's hold edge and never climbs a pipe. Open ground (the Salt Flat) keeps the plain steering.
- **Handbrake** (2026-11-19: "a button to brake so I can brake and turn to drift harder"): the rear
  lets go: the grip falls to 55%, the body may swing nearly twice as fast as the grip turns the
  velocity, the front turns 40% further, and the locked wheels drag 5 m/s². It eases on in a
  twelfth of a second and off in a sixth, and off the road a slide past 7° straightens itself once
  it is released, so a handbrake turn swings to about 25° and comes out straight, never a spin.
  Steering alone still slides as before (under 15° at full lock).
- **Walls you flow along** (2026-11-19: "you can't fail and break … you can't stop if you hit
  something, maybe just sparks when you scratch against a wall"): every track's barriers turn the
  speed into them along the wall, losing none of it, and swing the nose parallel at once. Scraping
  throws orange sparks, more the faster you slide along. No bounce, no spin, no slowdown.
- **Hits**: there are no obstacles left and every wall flows (above). The physics still knows a
  hard hit (a loss and spin growing to full at 14 m/s into it) for any world that wants one.
  No game over, ever.
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
  `salt-flat-game.ts`, `drift-gates.ts`, `night-course.ts`, `weather.ts`, `drive-design.ts`, `drive-worlds.ts`,
  `drive-shaders.ts`; `lib/art/speed-shaders.ts` shares its common head (`SPEED_COMMON`).

## Edge cases

- No WebGL: "This game needs WebGL." in place of the canvas.
- Storage blocked: the design falls back to the defaults and bests are not kept.
- `?world=coast` (any world id) opens that world.
- Focus lost: all keys and touches are released.

## Gears, speedometers, speed flames, driving modes (2026-11-19)

- **Gears** ("different gear speeds on the cars and spaceship, so you have another counter on the
  cockpit instrument for gear 1, 2, 3, 4"): an automatic box, six gears for the car and five for
  the ship, each ending at a share of the top speed (`GEARS` in lib/art/drive.ts). The pull is
  strongest low in each gear and eases toward the shift (`gearPull`), so you feel the gears.
- **Speedometers** ("one inspired by the timer in School, another more futuristic"), picked under
  Design → Speedo:
  - Futuristic (the default): a glass ring dial, its arc glowing cyan to magenta with speed, the
    gear in a hexagon, the revs as a thin inner arc that turns orange near the shift.
  - Timer: the School Timer's paper card, its seven-colour rainbow lighting up with speed and its
    beige-to-brown bars as the revs.
  - Plain: the number and the gear.
  All read up to 420 km/h (components/drive/Speedometer.tsx).
- **Speed flames** ("a mode where flames come out when you are at high speed"): Design → Flames,
  on by default. Above 72% of the top speed, flames come out of the car's two exhausts and the
  ship's fire stretches long and hot, rising to full at the top speed, in the chosen fire's colours.
- **Driving modes** ("4 driving modes for all vehicles. Easy tilt for one, where you can easily
  slide left right of the track fast but still stay focused on the right direction, so the flow
  continues"): Design → Mode (`MODES` in lib/art/vehicle.ts).
  - Easy: wide, quick sideways slides; the nose barely turns on a road.
  - Flow (the default): as before.
  - Drift: looser grip, the tail swings wider.
  - Grip: tight and precise.

## Garage (2026-11-19)

Drive's ride is built in the Garage (docs/specs/garage.md): the same saved design. Hulls gained
Gold and Paint (your own colour). The Design panel links to it ("Open the Garage ›").

## Autopilot (2026-11-19)

`setAutopilot` on the engine: the races play themselves (lib/art/autopilot.ts). On a track it aims
at a point on the centre line 16 m plus 0.55 s ahead, steering by the heading error, and boosts
when lined up; on the salt it wanders in long curves; in Sky Canyon it climbs and dives slowly
through the heights. Used by the Grid's porthole (`/drive-window`, docs/specs/the-grid.md).

## Golden Track (world 9, 2026-11-19)

Asked: "use the design art elements for the racing games in golden dots … for a golden track".
A wide night road (18 m half-width) of long sweeping bends and soft rises (`GOLDEN`,
lib/art/track.ts), drawn only in the City's and Art's gold dots (`goldDots`,
components/drive/track-view.ts): a row of dots along each edge plus a higher, fainter row; a dotted
arch over the road every 90 m; a standing ring of dots beside the road every 360 m, alternating
sides; and gold constellations scattered over the dark ground either side. The dots share Sky
Canyon's dot material, so their light streams ahead of you. Gold edge lines and dashes, a warm dark
wet road that mirrors the gold, and a black sky with a low gold glow and fine gold stars
(`#define WORLD 5`). Key 9; the ship by default; timed by the kilometre.

## The menu column (2026-11-19)

Asked: "the space garage should be accessible below the menu top right where the tracks can be
chosen … make that top right menu better, smarter: open/closed column, and the design options for
racing also available there". The top right holds one button naming the current track (three lines,
the name, a caret). It opens a column under it: *Tracks* (each world with its key, the current one
lit), *The Garage ›*, and *Design* (vehicle, body, fire, hull, weather, mode, speedo, flames). The
Design button at the bottom right is gone; Esc closes the column, Esc again leaves.

The ship now banks into the turn like the car: turning right, its right side goes down ("when I
turn right the right side should be lower").
### The Golden Track, reworked (2026-11-19)

Asked: "more curving on the turns, more tilt on the slope as a curve, and more graphic elements to
decorate it, like a city around" and "a big Saturn with rings in the sky, so it feels we are on a
planet".

- Tighter bends: the tightest about 130 m across. The road banks up to 0.34 rad (about 20°; the other
  tracks stop at 0.2). A test checks the road never crosses itself.
- The city of gold: towers drawn in dots (their edges and a ring at every floor) every 45 m on
  both sides, set back 30 to 140 m, taller the farther they stand, a beacon on the tallest; none on
  the inside of a tight bend. A dotted sphere floats over the city every 600 m.
- A great ringed planet in the sky: banded in golds, lit from one side, its tilted ring passing
  behind the globe above and in front of it below; the wet road mirrors it.

### The Golden Track's sky and weather (2026-11-21)

Asked: "weathers bring too much light. i want the snow or sand but keeping dark sky", "car doesnt
change colour for hull … stays black", "stars look unnatural … saturn as well … how can it look like
a real planet".

- Dark sky in every weather (`DARK_SKY`, `keepDark`, lib/art/weather.ts): snow and sand keep their
  falling motes as bright as anywhere, but the haze keeps only its hue at 6% of its brightness, the
  colour wash is a fifth of its strength, and the ground whitens a third as much.
- The hull keeps its colour at night (every night world): the reflections a metal hull sees carry a
  warm glow along the horizon and a soft light overhead (the sky you see is unchanged), and a soft
  light rides just over the vehicle (`CAR_LIGHT`, components/drive/engine.ts).
- A real night sky: stars in three layers jittered off any grid, many faint and a few bright, white,
  blue-white, yellow and orange, a very slow twinkle, fading near the horizon; a faint Milky Way
  with dust lanes, the stars denser in it.
- Saturn as it is: flattened a tenth, soft cream and butterscotch bands with a little turbulence, a
  bright equator, greyer poles, its limb darkened and a soft terminator. Its rings in their real
  order (faint C, bright B, the dark Cassini division, A with the Encke gap), fine ringlets that
  fade where they would shimmer, translucent to the stars behind; the globe's shadow falls on the
  rings and the rings' shadow on the globe.

## Rivals

2026-11-20: "racing more with other racers of another colour and flame, for all the racetracks, can be turned on or off, 5 other racers, in the menu can be activated."

- The menu column's **Racers** row: *5 rivals* or *Alone* (Design.rivals, off by default, kept with the design).
- On every track world, five rivals line up round your start: Cyan (plasma fire), Violet (gas), Lime (blaze), Orange (white-hot), Pearl (speed). Each is a glossy paint in its own colour and rides what you ride in that world. The cars mix bodies (wedge, Future GT, Classic GT).
- They hold the grid until you pull away, then drive the autopilot (lib/art/autopilot.ts), each on its own line across the road at its own pace (lib/art/rivals.ts).
- A gentle elastic keeps the pack near you: a rival more than 160 m ahead eases off, and one more than 160 m behind boosts.
- Racers bump: touching pushes the two apart and trades the head-on part of their speeds. They never pass through each other.
- Under the clock, the HUD shows your place, e.g. *P2 / 6* (gold when leading).
- On the open plains (Salt Flat, Mars) there are no rivals, since there is no road to race on.
