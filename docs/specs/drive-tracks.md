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
- [x] Gear rings, on every world (2026-11-23: "add boost circles visual like speed sound circle
      wall explosions for each gear u pass bigger and bigger"). `lib/art/gear-rings.ts`,
      drawn by `components/drive/shift-rings.ts`.
      - On each upshift a soft band of light bursts out round you, across your way, in your hull's
        colour, and slides back past you as it grows and fades.
      - Each gear's ring is bigger, brighter and lasts longer: second gear a 4.5 m radius,
        the top 22 m, with up to two echoes following.
      - The top gear is a full sonic boom: three echoes, a wall of rings, and a cone of light
        opening back from the nose.
      - Additive and at most 55 % at its peak. Never a flash over the screen.
      - A gear rings again only after 2.5 s, so a speed hovering at a shift never strobes.
        Downshifts never ring. Nothing rings in the menus' preview or while diving off a twist.
      - On a twist or in Undertown the rings turn with you.
      - The engine calls `onShift(gear, top)` at each ring, for the drive sound to use.

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
- [x] **Longer, and a tall street canyon with many more publicity panels** (2026-11-24: "chinatown
      make it longer and really think how all the elements form the chinatown in the 3d city.
      check how streets look and check it to make a taller chinatown streets with more of those
      chinese publicity panels"). `lib/art/chinatown-street.ts` (pure, tested),
      `components/drive/chinatown-signs.ts`, the shophouses in `components/drive/track-view.ts`.
      - **From the City's Chinatown** (`lib/city-game.ts` tieredTower, towerSigns and the tower
        heights, `lib/city-chinatown-open.ts`, `lib/city-signs.ts`): towers storey on storey, a
        flared gold eave with swept-up corners on every other storey over a red fascia, a balcony
        rail and a lantern at the corners on those storeys, a pagoda crown of three roofs (five and
        a spire on the tall towers); one height band with a tall tiered tower about one in six;
        tall blade signs of one to four characters (ラーメン, 茶, 龍, 酒, 夢 …) standing out from
        both street walls at several levels, facing down the street, staggered so two never face
        each other; name boards high on the tall towers; strings of lights across the streets at a
        few heights; windows as grains of light; red, gold and lantern red with a little jade, all
        steady. And its lesson from 2026-11-14 ("too overloaded"): openings and air, so nothing
        crosses the road but light.
      - **Longer**: lanes 1,100 m (were 600) opening onto avenues for 900 m (were 600); the bends
        about 1.6 times as long (periods 3,100 and 1,500 m, were 1,900 and 900; the tightest about
        320 m across), the crest and dip spaced to match. Undertown first comes after 1.3 km of
        street, then every 3.6 km (was 700 m, then every 2.4 km), so the canyon has room between
        flips.
      - **Taller**: shophouse towers shoulder to shoulder 2.5 m back from the lane's edge, six to
        eleven storeys (3.4 m each) along a slow swell of the roofline, so the cornices recede as
        one line; about one in six a tall tiered tower of 13 to 17 storeys with a spire. Two storeys
        more on the avenues, set further back. Where Undertown hangs over the street they stay at
        five storeys and a single roof (under 21 m), clear of its hanging houses.
      - **Panels**: blade signs at three levels up each tower (five on the tall ones, the higher
        ones bigger), lettered on both faces so they read the right way coming and going, each
        with a neon edge in its ink; horizontal boards flat on two faces in three, between the
        blades, on storeys without a balcony (中華街, 福星樓, 金龍, 夜市, 茶樓, 龍門, CITY OF DREAMS
        …); a name board on the roof of each tall tower, facing you as you come. Eight tones: gold
        on lacquer, lantern orange, dark red on gold, pale gold, warm white on red, amber, and a
        jade and a pink neon for a little neon. Glow steady, nothing flashes. No blade in a gate's
        beams.
      - Lit windows as points of light up every street face (about a third lit: warm, red, pale
        gold, a few jade). High strings of light across at 18 and 26 m every 90 m where both towers
        stand taller; none under Undertown.
      - Performance: every sign of a chunk is one mesh on one shared atlas (64 cells, lettered once
        on a 2048 canvas), the windows one cloud of points a chunk, built per 120 m chunk as the
        rest; decoration above the wet road's mirror cap has no mirrored copy.
      - Design's own tall signs are no longer worn on Chinatown Run (the street carries its own);
        still there to pick. Design's boards now read the right way round on both sides of the
        road (they were mirrored on the right-hand side and on the gates' plaques).
- [ ] More banking in the bends (as the Neon District).
- [ ] Push and crash against the shophouse walls.
- [ ] Bridges built into the buildings and over the road, not floating.
- [x] **Undertown** (2026-11-23: "make racetrack two sided and at the edge there is a cool twist
      edge that makes it flip and u race the other way from under … mirrored … a different decor
      … called the undertown with undertown letters when u ride there"). `lib/art/undertown.ts`.
      - Every 3,600 m from 1,300 m (every 2,400 m from 700 m until 2026-11-24, the longer street),
        the road's left edge curls up and over: over 180 m it rolls half
        a turn about an axis 18 m above it, and you drive its underside upside down, mirrored
        (your left on the road's right), 36 m over the street, the shophouses hanging over your
        head. 620 m later it rolls on the same way, another 180 m, and you are back on top.
      - Built on the twist: the physics drives a flat road, and the road, the racers and the camera
        are drawn turned (`twistPose`, with the new `axis` and `under` on `TrackDef`). Gravity
        always holds you to the road.
      - Unlike a twist it keeps its barriers. They close in to the ribbon's edge (0.4 m past it),
        easing over 40 m, so nobody falls off and nobody is drawn hanging in the air. No straight
        road through its hollow: everyone goes under. The boost out of a twist still comes at its
        end.
      - Where it flips, nothing crosses the road and nothing stands inside the sweep (the flip
        reaches out to the axis' height either side). Upside down, the street below keeps all its
        pieces.
      - The underside is darker: plum asphalt, crimson edges. Spray and sparks are not drawn while
        you are rolled over (they would show on the ground below).
      - Its own decor (the design cell **Chinatown · Undertown**, worn always on Chinatown Run):
        violet and crimson lights along the ribbon's edges that roll with it, strings of light
        across the road with their lanterns rising instead of hanging, shophouses with turned-up
        roofs in deep red and plum, signs (下町, UNDERTOWN, 夜, 影, 月, 逆), and a gate saying
        UNDERTOWN 30 m into the underside. Built in the road's frame: to the world it hangs under
        the road roofs down; to you, upside down, it stands the right way up.
      - Past halfway over, **UNDERTOWN** comes up on screen in big spaced letters (下町 · the other
        side of the road under it), holds, and fades over 4.6 s. Once each time you go under.
      - Not built: you keep driving the same way along the road, not back the other way. A road
        that runs back the other way under itself and then comes up on top again would meet the
        stretch you just drove (topologically it closes into a band), so it needs a second deck,
        a separate road. That is a bigger change to the track format.

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
- [x] Surf instead of walls (2026-11-22: "on some of those turns the car moves on the sides above
      the racetrack and has this awesome surfy flight pattern where it tilts even more and almost
      flips before coming back down … use that so you fly out of the track but gravity keeps you
      coming back, instead of the big black unaesthetic walls").
      - **The kicker:** on the Golden Track (`"surf": 4`) the curled wall on a bend's high side is
        cut to a kicker 4 m above the edge. Past its lip there is no ground to catch you; it is
        drawn as the flat beyond.
      - **The pull:** fly off and gravity stops pointing down. It pulls you back toward the road
        (just inside the edge, a little over it), so you arc out, up and back onto the track.
        The body rolls into the pull, near upside down at the top of the arc.
      - **Physics:** a drop of more than 3 m in one step is now flight, never a snap to the
        ground. The secret deck keeps its tall wall: that is the way up.
      - **Code:** `surfPull`, `SURF` in `lib/art/track.ts`; `World.pull`, `DROP_AIR` in
        `lib/art/vehicle.ts`.
- [x] Straight through the loop (2026-11-22: "straight road option below and inside, straight
      through the loopings"): every twist now gives three ways through.
      - **The loop:** ride the ribbon, get the boost after.
      - **The side lane:** the straight bypass beside the loop.
      - **The straight road:** a centre strip marked in gold for 300 m before the twist, with
        chevrons pointing in. Be on it (within 4.5 m of the centre) as the twist begins and you
        go straight through. You run flat along the ground, inside the loop, while the ribbon
        rolls up and over you. A gold-edged lane 14 m wide is lit through the hollow. There is no
        void to fall into, and no boost.
      Rivals choose the same way. Pure rules live in `lib/art/wreck.ts` (`STRAIGHT`,
      `choosesStraight`, `twistEntry`).
- [x] The secret high road (2026-11-22: "some place where you shoot up on the turn tilts and
      another road option offers itself, like driving on top of grandstands, with fire on the
      sides … a secret road"): from 1.03 to 1.44 km, on the high (left) side of the long left-hand
      bend at full bank. Ride hard up the curled wall and it carries you over onto a flat deck
      20 m above the road, reaching 30 m past the edge. Its wall and top are ridden, never launched
      from. Up there:
      - burners on both sides every 12 m shoot fire straight up, roaring as you pass;
      - its edges are lit in gold, with rows of light down the stands that fall away outside it;
      - gold chevrons climb the wall just before it, so you know there is a way up.
      Where it ends you drop back down to the road. Data: a `deck` feature (`from`, `to`, `side`,
      `every`).
- [x] The blazing deck (2026-11-22: "the fire on turn edges is amazing, add that even stronger on
      another one of the edges"): a second deck on the left-hand bend at 10.9–11.3 km. Its
      burners stand every 6 m, two rows a side, and shoot a taller, thicker, hotter fire that never
      dies right down (`blaze: true`).
- [x] The superloop (2026-11-22: "make second one a normal looping not a sideways rotation";
      "1st is side loop, 2nd is superloop"):
      the second twist, at 4.1 km, is now a vertical loop. Over 560 m the road climbs a circle
      (radius length/7.5, about 150 m tall), runs back over itself upside down at the top, and
      comes down where the straight carries on. It swings aside one way going up and the other
      coming down, so the two never meet where they cross. You and the camera tip over end over
      end with it. There is no straight through its middle; the bypass on the right is the way
      round, and riding it to the end still gives the boost (`twist` with `loop: true`,
      `loopShape`).
      Strong red fire runs down both its sides ("add strong red fire on sides of the second loop"):
      burners on each edge every 8 m ride the loop round, shooting long thick red jets straight out
      sideways, roaring as you reach them.
- [x] The dive (2026-11-22: "after superloop make slope keep shooting downwards, so it enhances
      acceleration, then it comes back up and a jump"; "u can make tracks longer"): just past the
      superloop, at 4.72 km, the road runs straight down a 700 m slope, 50 m deep at its bottom
      (steepest about 11%), with the wave fire tunnel down in it. Gravity pulls you faster all the
      way down. It climbs half back up into the kicker of a jump at 5.56 km, holds that height
      through the landing, then eases back to the road's own height by about 6.9 km (`dive`:
      `at`, `length`, `depth`, `hold`). To make room the lap grew to 12 km, the crossover moved to
      7.1 km, and the blue fire tunnel to 11.6 km.
- [x] The crossover (2026-11-22: "the track passes over the track so you can see it from above, or
      jump above it"): the lap is now 12 km (it was 10 km until the dive, 2026-11-22). At 7.1 km
      (5.7 km before the dive) a figure of eight: the road climbs 18 m
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

## Design space (2026-11-23)

> "create a design space for the golden racetrack. where u can play with elements u would add.
> mainly graphical context background constructions bridges. types of roads and road design.
> bridges or stuff like that inspired by system of city. move up for variation move right for
> another category of element." Then: "different ones of those arch tunnels with fire. different
> fires. fireworks. etc... love the fires shooting to the side as we slide on a turn", "use the
> actual universe of the track in question" and "put design menu on the track selecter on some
> part next to race button so i can check em from there."

**Where:** the track ring's **Design** button, beside **Race**, on every track world (not the Salt
Flat or Mars, which have no track). The autopilot drives the chosen track, in its own world, and
the chosen element is laid along the real road ahead in chunks of 150 m (built up to 1.3 km ahead,
dropped 200 m behind), placed through `twistPose` so it sits on the road as drawn: banking, rises
and the dive. Structures skip the twists, the loop, the jumps and the decks.

**Moving:** right/left is the category, up/down the variation, both wrapping (a new category keeps
the row when it has one). Arrows on the keyboard, swipes on a phone, the buttons, or a click on the
map of cells. **Space** or ☆ picks a cell; **Picks → Copy list** gives "Category · Variation" lines
to say which to build into the track for real. The cell and the picks are remembered on the device.
**Esc** or **Tracks** goes back to the ring.

| Category | Variations |
|---|---|
| Fire arches (every 120 m) | Ring of fire, Flame pillars, Blue gothic, Spiral tunnel (rings every 9 m, the burner turning round them), Dragon breath (jets across the road taking turns), Spark curtain |
| Slide fire (outside of the bends, lit as you pass) | Outer jets, Wave (both edges, riding with the car), Red wall, Blue tongues (trailing back), Fans, Geysers |
| Fireworks (rockets from beside the road ahead) | Chrysanthemum, Peony, Rings, Willow, Palm, Rocket arch (from both edges in turn, bursting over the road), Grand finale |
| Road surface (a new skin over the real road) | Gold dots, Glass lit below, Hex tiles, Light rails, Race tarmac, Black mirror |
| Road markings (on the black mirror) | Chevrons, Flowing dashes, Kerbs, Pulse rings, Light grid, Edge arrows |
| Bridges | Arcades, Suspension (towers every 260 m), Cable-stayed (pylons every 240 m), Bowstring (every 120 m), Truss, Golden rings (every 16 m) |
| Tunnels | Lattice tube, Ring of light (a pulse running through), Gallery, Pergola (φ-tall frames), Hex tube, Spiral ribbon |
| City backdrop (from the City chapter, beside the road) | Golden plan, Temples, Domes, Skyline, Solar tower, Sky lanes (ships white one way, red the other) |
| Gates (every 240 m, the gates' six looks; see Gates and pickups) | Fire spitters, Halo, Inner light, Old chrome, Rusty metal, Local fabric |

Structures are drawn in the City's grain language: gold lines, grains of light along them, dark
faces where solid. Fire, sparks and fireworks are one pool of glowing points (24,000) in the
flame tool's palettes. Nothing flashes; pulses and flames ease.

`lib/art/design-space.ts` (the catalogue, moving, picks; pure, tested) ·
`components/drive/design-space.ts` (the drawing) · `components/drive/DesignHud.tsx` (the controls)
· `DriveEngine` hands over its scene, the track and where you are (`stage3d`, `where()`) and calls
`onFrame` before it draws.

### The districts (2026-11-23)

- Two more categories, from the City's own districts:
  - **Chinatown**: red gate (中華街), lantern strings, tall signs, pagodas, a dragon of light, sky lanterns.
  - **Neon District**: neon towers, blade signs, sky bridges, docks, traffic, jump bridges.
- On their tracks, Design opens on the district's own category.
- **Chinatown Run** always wears the gate, lantern strings, sky lanterns and Undertown (its tall signs are its street's own since 2026-11-24). Across the road it stays light only: lanterns and strings are points of light, not solid pieces.
- **Neon District** always wears blade signs, sky bridges, traffic and jump bridges.
  - Sky bridges never stand over a jump's flight.
- **Neon jumps:** two a lap. The second lands on a downslope (`down: 30`):
  - steepest where you touch down, falling 30 m further over 380 m
  - easing back over 600 m
  - `down` is validated from 0 to 40 m
- Every jump has neon chevron frames up the kicker, a lit bridge across the void under the flight, and arrows down the landing.

## Gates and pickups (2026-11-23)

> "i want different awesome gates some spit fire some have a semi circle of light. some are filled
> with inner light. some are old chrome some are rusty metal. or local fabric. u pass through them
> and get the boosters and weapons."

**Where they stand.** On every road a gate stands every `every` m (the track's `gate` feature;
1 km on the tracks without one), nudged forward up to 600 m (at most half the spacing) off a twist,
a jump, a deck, a fire tunnel or a bridge so it always stands on plain road; a gate with no plain
road near enough is left out. The Canyon's stand on its four checkpoints (none past the finish);
Sky Canyon's every 1.5 km between the lap doors, 1.6 times taller so the top level flies through.
On the Salt Flat and Mars the drift course's twelve gates wear them.

**Six looks.** `{ "kind": "gate", "every": 1000, "style": "rust" }`: `style` is one of `fire`,
`halo`, `glow`, `chrome`, `rust`, `fabric`, checked by `validateTrackData`. Left out, gate k wears
look k of the world's own round:

| World | Round of looks |
|---|---|
| Salt Flat | chrome, glow, chrome, fire |
| Mars | rust, rust, fire |
| Golden Track | halo, fire, glow, chrome |
| Coast Road | fabric (sailcloth, sea-blue stripes), chrome, halo |
| Canyon Race | fire, rust, fire, chrome |
| Night Rain | glow, chrome, halo |
| Chinatown Run | fabric (red silk, gold disc and trim), fire, halo |
| Neon District | fabric (neon mesh, magenta and cyan threads), glow, halo |
| Sky Canyon | glow, halo, fire |

- **Fire:** two iron pillars, three jets each in toward the road (short of its middle, so the way
  through stays clear), two out to the sides, a plume off each top.
- **Halo:** a half ring of light in the world's colour, soft haze round it, a line of light across
  the road under it.
- **Glow:** a chrome arch filled with a soft sheet of light, brighter toward its rim, a slow drift
  inside.
- **Chrome:** old polished chrome columns and arch; the sky, the horizon band and the ground are
  faked in its gradients, with dull and pitted patches.
- **Rust:** a riveted girder portal, rusted through, old paint in patches.
- **Fabric:** poles and a crossbar hung with two banners and a valance of the place's cloth,
  swaying from the top.

The light is soft and steady: nothing strobes or flashes, the fire is a continuous stream.

**Pickups.** Driving through a gate (between its posts) gives what its orb shows, the same for
the same gate every time: a **booster** (warm gold orb) or a weapon charge: **dust shark** (teal),
**shot** (yellow), **laser** (red). Each look leans its own way: fire arms you with shots, halos
and glows push, chrome gives lasers, rust sharks, fabric a mix. A road's gate gives once a run;
the plains' loop gates give again 20 s later. The orb goes out once taken.

- **Booster:** a push ahead of 16 m/s² that comes in over 0.2 s, holds to 0.7 s and eases away by
  2.2 s (about 60 km/h), with the boost rings' flames and camera.
- **Charges:** up to three, oldest first; a weapon past three becomes a booster. The HUD shows them
  quietly under the clock (a coloured dot and the name each, then "x"), and names the pickup just
  taken for a moment. **X** fires the oldest charge that has a handler.
- **Sound:** through a gate, a soft rush of air (the boost's whoosh, a little quieter) and a warm
  swell for what it gave.
- **The weapons are the attack code's** (Mars: Dust Sharks, the yellow explosive shot, the laser
  with a crosshair). The engine only carries the charges and hands a spent one over:
  `engine.onWeapon(id, handler)` registers what `'shark' | 'shot' | 'laser'` does;
  `engine.fireWeapon(id?)` spends a charge of that weapon (or the oldest with a handler) and calls
  the handler with a `WeaponFire` (`weapon`, `t`, and the shooter's `x`, `y`, `z`, `h`, `vx`,
  `vy` in physics coordinates). A charge whose weapon has no handler stays held and shown.

`lib/art/drive-gates.ts` (where they stand, their looks; pure, tested) · `lib/art/pickups.ts`
(which gate gives what, the inventory, the booster's curve, the weapon hook's types; pure,
tested) · `components/drive/gates-view.ts` (the six looks drawn, and the gates stood on the track)
· the Design space's **Gates** category previews each look along the track.

### Stage passages (2026-11-24)

"love the fire sparking on the sides at start do more passages like that": every road (not Salt
Flat or Mars) carries a stage passage every 900 m where the road is plain: seven mirror pairs of
burners 18 m apart down both edges, like the start's. Each pair lights as you come within 110 m, so
the fire runs up the road ahead of you; the last pair stands tallest; gold sparks arc up and over
the road to cross the other side's. Also in Design: Slide fire · Stage passage.

## Vehicles and garage (shared)

- [x] Leopard hull with gold rims; the Space Racer (2026-11-21).
- [ ] A four-engine wing fighter (original design), four fires.
- [ ] Five turbine shapes to choose from (same fire for now).
- [ ] The hover ship's fire as real gas flame (the Art gas burner's look).
- [ ] More speedometers: geometric ones (hexagon, ring of segments, triangle).
