# RIVERDUST

A design series of desert-town elements, drawn the way the City of Dreams draws its Studio
pieces: glowing grains at dusk, one piece per category and one pill per design. Route:
`/geometry-field/riverdust`. It is the parts kit for the desert racing worlds
(`/geometry-field/salt-flat`, built separately), so the racing worlds can later be furnished with
flags, tents, a souk, a town, rock, the river and a start/finish gate.

## Why

2026-11-16, the user: "we will later add stuff like Tibetan flags, rows of real flags like the UN
in Geneva but orange dusty, golden lights and lampions, a cavern, and elements of a desert town,
tents etc... a market with burgundy dusty cloths hanging above and poles etc... Create series of
desert town elements like you did for night city and call it RIVERDUST, with design elements and
up/down to go to variations." Then: "cool arches and gradins for the racetrack installation around
the main gate at start and finish."

## Where it lives

- `app/(app)/geometry-field/riverdust/page.tsx` → `components/Riverdust.tsx` → the shared trip
  player (`components/TripPlayer.tsx`), like the City, Vegetal, Ocean and Hyper-speed.
- `lib/riverdust-kit.ts`: the palette and the grain primitives (flag strings, banners, lanterns,
  fire bowls, plaster walls, windows, arches, tents, cloth sheets, domes, palms, rock, cliffs,
  canyon walls, water, boats, grandstand tiers, `place` to move/turn/scale parts).
- `lib/riverdust-designs.ts`: the categories and designs, reusable builders, the budget, and the
  drawing functions (`designModel`, `designSite`, `designGrains`).
- `lib/riverdust.ts`: the trip: one phase per category, the variants, the eye, the leftover
  grains (dusk stars, sand ripples, drifting dust), the fade, and the Journey.
- Linked from the Art hub (`lib/grid.ts`, after City vision), placed on the Life Tree II
  (`lib/life-tree-2.ts`, Art → Visual), and listed as **Riverdust** after Hyper-speed in the Art
  pills (`ART_PILLS` in components/GeometryField.tsx, `ART_LINKS` in the trip player).
- A visitor path like the rest of `/geometry-field`. It reads no data.

## Controls

The trip player's own Studio controls, the same as the City's:

- **← / →** (or a sideways swipe): the previous or next category.
- **↑ / ↓** (or an upright swipe): the previous or next design in the category; the pills under
  the piece show all of them, the label is the category's (Tent, Market, Race gate ...).
- The design's name sits quietly beside the category's name (`· Burgundy Souk`).
- Drag to orbit, pinch or wheel to zoom; the view eases home. Journey plays the categories one
  after another, each on its first design.
- Backgrounds: Dusk (violet above, burnt orange at the horizon, dark sand below), Desert night,
  Dust storm, Black.

## The categories and designs

1. **Flags and lamps** (label "Flags and lamps"): Prayer Street, Hall of Banners, Lampion Lane,
   Lamp Tunnel, Fire Bowl Road, Lamp Post Row, Summit Cairn.
2. **Tents and camps** ("Tent"): Nomad Cones, Long Low Tents, Caravan Camp, Canopy Row, Tarp
   Village, Dune Yurts.
3. **Market** ("Market"): Burgundy Souk, Rug Lane, Lantern Bazaar, Spice Stalls, Crossing Square,
   Covered Arcade.
4. **Buildings** ("Building"): Adobe Street, Tower Houses, Caravanserai, Town Gate, Watchtower,
   Wind Towers, Roof Terraces.
5. **Cavern and rock** ("Rock"): Glowing Cavern, Stone Arch, Cliff Dwellings, Lamp Canyon, Hoodoo
   Field, Cave Shrine.
6. **Water and river** ("Water"): Plank Bridge, Palm Oasis, Pulley Well, Channel Fields, River
   Boats, Water Steps.
7. **Race gate** ("Race gate"): Sun Gate, Timber Gantry, Rock Gate, Grandstand Straight, Start
   Line, Paddock, Finish Arena.

Each design has a one-line `idea` in the code. All are original designs. The flag avenue uses
abstract orange and ochre cloth, no real flags. The towers and gates copy no real building.

## Look

- **Palette** (`RD`): sand, ochre, burnt orange, terracotta, burgundy, faded gold, saffron, dusty
  rose, wood, stone, dusk violet, palm green, river violet, warm lamp gold, fire. The prayer flags
  use the five traditional colours (blue, cream, red, green, yellow) faded 30% toward sand.
  Everything stays warm: red at least as strong as blue less 0.15, no white.
- **Light is mellow.** Cloth and stone are drawn dimmer (`dim`) than light. Lamps breathe gently
  (twinkle at most 0.2), colours drift slowly, flags flutter slowly, flames rise on slow loops,
  water slips downstream, boats drift. Nothing flashes or jumps. Fewer than 2% of grains move more
  than 0.5 units from one frame to the next, and those are a flame grain returning to its bowl or a
  boat going round its loop out of sight.
- **Perspective first.** Almost every design is a scene running away from the eye along -z:
  streets of flags, avenues of banners, tunnels of lamp arches, souk corridors under sagging
  cloth, canyon walls, rivers to the horizon, grandstands receding down the straight. The eye
  stands low (about 2.5 to 5 high) looking into it, and glides forward and back over a 60-second
  loop with a small sway. The loop closes smoothly. Sand ripples on lines that grow wider and
  further apart toward the horizon give every scene a floor. Grains fade at the eye and far off
  (gone by 320).

## Budget

- The trip draws 6,000 grains on a phone and 9,000 on a computer (`GRAINS`).
- A design has at most **5,000** light sites (`DESIGN_BUDGET`), so even on a phone at least 1,000
  grains are left for the stars, sand and dust.
- A design that comes out over budget is thinned by `fitBudget`. Walls, cloth and rock are thinned
  first, and lamps stay whole while they take less than half the budget, so a thinned scene still
  glows. Every part keeps at least one site.

## Reuse in the racing worlds

- A design is a list of Parts round its own origin, with the ground at y 0, so it can be set
  anywhere. `designGrains(id, { x, y?, z, rot?, scale? }, t)` returns flat positions and colours
  for a whole design at that placement. `designSite(model, s, t, placement, k, out)` draws one site,
  for a renderer that keeps its own grains.
- The builders are exported for composing new scenes: `house`, `stall`, `lampArch`, `lampTunnel`,
  `bannerRow`, `lampPost`, `canopy`, `yurt`, `hoodoo`, `towerHouse`, `townWall`, `river`,
  `duneRidges`, `roadEdges`, and for the races `sunGate`, `timberGantry`, `grandstand` and
  `timingTower`.
- Designs are built once and cached by id.

## Tests

- `lib/riverdust.test.ts`:
  - The series: seven categories, 5 to 8 designs each, unique names and ids, and the race
    installations asked for.
  - Every design within budget, warm and mellow, every site finite.
  - Slow motion between frames, depth for perspective.
  - Placement (moved, scaled, turned) and the builders standing alone.
  - `fitBudget` keeping lamps.
  - The trip: phases, pills and switching, leftover grains, the eye's closed loop, the fade and
    the Journey.
- `components/Riverdust.test.tsx`: the trip handed to the player, one piece a category with its
  designs as pills, and the menu link after Hyper-speed.
- `app/(app)/geometry-field/riverdust/page.test.tsx`: the page and its metadata.

## Next

- Place the race gate designs at the start and finish of the salt-flat racing world, and the
  flags, tents, souk and town along its route.
- Possible additions: animals of the caravan, a moving crowd in the grandstands, banners that
  answer to the wind of the race.
