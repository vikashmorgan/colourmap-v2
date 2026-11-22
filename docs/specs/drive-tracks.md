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
- [x] Steeper banking: up to 0.46 rad (≈ 26°, was 0.34), design speed 85 m/s, so medium bends
      bank more too (2026-11-22: "even more tilt to the roads on the turns").
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
- [x] Blue gas-fire tunnel (2026-11-22: "tunnels of blue gas fire shooting outwards"): at 3.3 km
      of every lap, 320 m long, an arch of 13 burners over the road every 9 m, each jet shooting a
      blue flame straight outwards, away from the road: white-blue at the nozzle, deep blue, violet
      as it thins, a steady roar, never strobing. Data: a `fire` feature (`at`, `length`, `every`).
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
