# Drive: the tracks and what each one needs next

Asked 2026-11-21: "push this game to the next level with overall coherence, better menus and a clear
improvements list for each track". One section per track: what it is, then its improvement list in
the order we build it. Ticked items have shipped. The data behind the menus (colour, tagline,
timing, length, highlights) lives in `lib/art/track-registry.ts`; the worlds themselves in
`docs/specs/drive-game.md`.

**Order** (2026-11-22: "golden track on top of the menus. so we have an order from best tracks to
least cool"): Golden Track, Neon District, Canyon Race, Sky Canyon, Chinatown Run, Night Rain, Coast
Road, Mars, Salt Flat. The menus, the ring and the number keys 1–9 follow it (`WORLDS`,
lib/art/drive-design.ts); with nothing remembered the game opens on the Golden Track.

Every track also gets the shared work from `docs/specs/drive-menus.md` (the track ring, the race
intro and grid, the results) and the design language in `docs/specs/drive-design-language.md`.

## Shared across every road track

- [ ] Tracks as data: the bends, rises, banks, jumps, gates and decor as JSON keyframes instead of
      formulas, checked by the track tests (the map, the intro flyover, Fable and the games site
      all read it).
      - [x] The format, its compiler and its checks (`lib/art/track-data.ts`): bends as heading
            waves plus curvature keyframes, rises as waves, repeating bumps and keyframes, width,
            lip, banking, terrain, walls, features (gates, start, jumps, wall-rides).
            `validateTrackData` refuses a bend tighter than 110 m, a bank past 0.45 rad, a slope
            past 30 %, a jump past 120 m, and names the problem in plain words.
      - [x] Coast Road, Night Rain, the Neon District and the Golden Track are JSON
            (`lib/art/tracks/*.json`), compiling to exactly the road they were by hand (tested to
            the last bit) (2026-11-22).
      - [x] `trackOutline`: the centre line, heights and banks for the ring's map and the flyover,
            traced as the physics traces it; works for every track, data or not.
      - [ ] Chinatown (its lanes and avenues), the Canyon (its passages and pipes) and Sky Canyon
            as data: needs width and pipe keyframes in the format.
- [ ] A start line and grid on every road: the gantry, six slots, the click to start.
- [ ] Laps on every road that can close (start/finish gate, lap count chosen in the menu); the
      endless roads keep their timed kilometres as a "Cruise" mode.
- [ ] Push and crash between racers: a shove that throws the other into the wall, a crash that
      bursts in its fire's colours, a respawn a second later (rivals and you alike).
- [ ] Slipstream: tucked in behind a racer, your boost charges.
- [ ] Boost meter: a big tank that drains while boosting and refills slowly.
- [ ] Slow motion (a key and a menu toggle).
- [x] Lean in the air: the body leans with the wheel while airborne (up to 1.2× its most on the
      ground), both car and ship (2026-11-22: "I need tilt to keep working when in the air").
- [ ] A continuous smoke trail behind the car, never puffs.

## 1. Salt Flat (`salt`)

Endless salt at sunset; the measured mile and the drift gates.
- [ ] Drift gates read as a lap in the ring's map (their loop drawn under the screen).
- [ ] A ghost of your best mile.
- [ ] Dust trail that hangs in the low sun.

## 2. Coast Road (`coast`)

Banked cliff road over the sea, timed every km.
- [ ] A closed lap version with a start/finish over a headland.
- [ ] Spray off the cliff on the windward bends.
- [ ] Gulls and a lighthouse as landmarks in the sightlines.

## 3. Canyon Race (`canyon`)

Red rock, quarter-pipes, two arches, crests that launch you.
- [ ] Low-sun lighting: one wall glowing orange, the other in violet shadow, light shafts through
      the arches.
- [ ] Sightlines: each bend opens onto a corridor framing the next arch; spires and mesas outside
      in two or three layers of haze.
- [ ] A slot canyon: walls past 100 m closing to about 12 m, then a burst into an open bowl.
- [ ] The jump: the 6.5 m crest at 3,550 m becomes a gap over a dry riverbed.
- [ ] A high road on a ledge up the left wall, faster and narrower, rejoining after the slot.
- [ ] Eagles, pebbles off the walls, an echo inside.

## 4. Night Rain (`night`)

Lamp rows in the rain.
- [ ] Deeper puddle reflections and spray off the rivals.
- [ ] Lightning far off now and then, lighting the towers for an instant (mellow, never a strobe).

## 5. Chinatown Run (`chinatown`)

Lanterns, lanes and avenues.
- [ ] More banking in the bends (as the Neon District).
- [ ] Push and crash against the shophouse walls.
- [ ] Bridges built into the buildings and over the road, not floating.

## 6. Neon District (`neon`)

The City of Dreams in neon, mood rings.
- [ ] More banking in the bends: the outside rises toward a wall you can ride.
- [ ] Bridges built into the towers and the road.
- [ ] Push and crash: shove rivals into the barriers; they burst in neon.

## 7. Sky Canyon (`sky`)

An endless canyon on three heights, lap doors.
- [ ] The lap door as the race's start line (the grid in front of it).
- [ ] Waterfalls down the walls between the light bands.

## 8. Mars (`mars`)

The salt flat on Mars.
- [x] Quicker, sharper turns and far more lean (2026-11-21).
- [ ] Dust devils in rust, a dust storm weather.
- [ ] A rover track and a lander as landmarks.

## 9. Golden Track (`gold`)

A road of gold dots under Saturn.
- [x] Dark sky in every weather; a real night sky and Saturn; hulls keep their colour at night
      (2026-11-21).
- [x] Steeper banking: up to 0.62 rad (≈ 36°; 0.34, then 0.46), design speed 85 m/s, so the
      tightest bends tilt most and gentle ones less (2026-11-22: "even more tilt to the roads on the
      turns", "some turns with even more tilt").
- [x] A level start: the first 140 m run straight and unbanked (a `straight` feature), so the grid,
      the gantry and the stage fire stand level and symmetric; the grid holds still until GO.
- [x] A smooth floor: the road is lit with the surface's own normals, not flat facets, and its grain
      is light, so it never breaks into shades of black (2026-11-22: "the track floor is not smooth
      some parts seem divided like shades of black").
- [x] Calm arches: the streams' head softer over a brighter rest, a 30 m tail, and the light sweeps
      over each arch foot to foot instead of lighting it all at once (2026-11-22: the light
      semicircles "flash too much. stressful").
- [ ] G-force bends: on some turns the outer edge curves up into a steep banked wall you can carry
      speed high along, still part of the track.
- [x] The long jump over the void (2026-11-22): at 1.9 km of every 6 km lap the road runs dead
      straight for 200 m, rises on a 140 m kicker 12 m high, and is gone for 140 m, road and
      ground both, down to nothing; the far side lands 8 m lower. Flat out you clear it with about
      2 s in the air; too slow and the void takes you, and you are put back 450 m before the gap
      rolling at 45 m/s, enough to make it with the throttle down. Rivals lost to it reappear just
      past it. The lips drop away as dark cliff faces; no lines or dots are drawn over the gap.
      Data: a `jump` feature in tracks/gold.json (`at`, `length`, `every`), limit 160 m.
- [x] Rings of fire on the arches (2026-11-22: "the flames need to be on those arches and be made
      of real big fire shots … big ass rings of shooting fires"; "shorter but more intense …
      different ones have different dynamics and aesthetics"): four short tunnels a lap, each a
      golden arch every 20 m carrying 11 burners round its curve. Each idles low and roars out as
      you reach it (from 90 m ahead, dying 30 m past). Styles (`fire.style`):
      - roar (0.8 km): great orange tongues out from the arch, billowing and lifting.
      - crown (3.5 km): white-hot jets in toward the middle, a ring closing round you.
      - wave (5.15 km): deep red fire swelling round the arch, foot to foot, slowly.
      - blue (9.3 km): long thin lances of blue gas.
      Nothing strobes. Data: a `fire` feature (`at`, `length`, `every`, `style`).
- [x] The twist (2026-11-22: "a side looping, as if the road did a full twist while still going
      straight"): at 2.7 km of every lap, 320 m long on a straight, the road rolls a full turn about
      an axis one half-width above it, easing in and out; at the top you ride upside down with the
      city of gold overhead, the edge lights tracing two golden helices. The physics drives a flat
      road; the road, the racers and the camera (its up turning with the road) are drawn through
      `twistPose` (lib/art/track.ts). Data: a `twist` feature (`at`, `length`, `every`).
- [x] The big twist (2026-11-22: "another one even bigger where your driving choice impacts the
      power of your speed, in the opposite sense"): at 4.1 km, 560 m, rolling the other way. Your
      line changes your speed: the right side runs downhill (up to a 0.14 slope, faster), the left
      uphill (`twist.dir`, `twist.surge`).
- [x] The choice at every twist (2026-11-22: "a choice to pass straight … but if you do the
      loopings you get a boost after it"): a straight lane 18 m wide peels off the right edge 420 m
      before each twist, runs 46 m out from the centre beside it (clear of the ribbon), and rejoins
      420 m after. Ride the twist on its ribbon from start to end and you get a boost out of it; the
      lane gets none (`twist.bypass`).
- [x] No rails on a twist (2026-11-22: "loopings without rail so if you exit out you fly into the
      void and dive into the stars below and accelerate and explode, and it says U FUCKED UP! race
      over"): once a twist has turned past 0.15 rad its barriers are gone and the road's hold lets
      you go. Ride off the ribbon (not onto the lane) and you are thrown out from its axis, diving
      ever faster into the stars (26 m/s²). You explode at 2.4 s; at 3.4 s the race is over: "U
      fucked up!", Race again or Tracks (lib/art/wreck.ts).
- [x] Curled walls past the edge (2026-11-22: "the top side of tilted roads on turns need to curve
      up higher … so you can drive up those tilts to boost back down"; "after the golden lines on
      the sides, so it feels like you are going off track and get back into it"): past the golden
      lines on the high side of a banked bend, a quarter-pipe that grows with the bank (radius up
      to 14 m at full bank, `curl`). The barrier stands back past its top.
- [x] The crossover (2026-11-22: "the track passes over the track so you can see it from above, or
      jump above it"): the lap is now 10 km. At 5.7 km a figure of eight: the road climbs 18 m
      through a 270° left loop, crosses over the road it came in on, comes down through a 270°
      right loop and passes back under that bridge (`crossover`). The bridge (2026-11-22: "more
      aesthetic … a cool bridge … a feeling of grandiose"):
      - only its deck is drawn, on a dark 1.6 m slab;
      - its edges are lit, with three lines of light under the deck;
      - tall golden pillars of light stand every 48 m, clear of the road beneath.
      The city keeps off the road where it loops back.
- [x] The STAY WILD portal (2026-11-22: "a kind of portal dome arch with stay wild written on top
      in golden letters at the end of the track lap"): at the end of every 6 km lap a dome of gold
      light spans the road, 60 m deep, its ribs rising to a crown and falling away, the words
      STAY WILD in golden serif capitals standing over the way in.
- [ ] The gate: blue gas fires along both sides, a ring above drawing the gas up, pulsing harder
      as you come closer; it becomes the start/finish of a lap.
- [ ] A black ocean round the track and a distant landscape on the horizon.
- [ ] The rings change with a colour mode: fire rings, or a few neon ones.
- [ ] The track draws itself ahead of you; the dots breathe slowly with the music.

## Vehicles and garage (shared)

- [x] Leopard hull with gold rims; the Space Racer (2026-11-21).
- [ ] A four-engine wing fighter (original design), four fires.
- [ ] Five turbine shapes to choose from (same fire for now).
- [ ] The hover ship's fire as real gas flame (the Art gas burner's look).
- [ ] More speedometers: geometric ones (hexagon, ring of segments, triangle).
