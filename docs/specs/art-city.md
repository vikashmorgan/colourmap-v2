# City — the future city's chapter

**Status:** Building
**Date:** 2026-11-12
**Where:** `/geometry-field/city`, the **City** pill after Ocean ·
`lib/city.ts` · `lib/golden-city.ts` (the golden city: its plan from φ, the
city rising, its heart, the colour presets) · `lib/golden-buildings.ts` (temples, factories,
domes) · `lib/golden-quarters.ts` (each from the element to the quarter) ·
`lib/golden-plans.ts` (ten more plans) · `lib/nova-cores.ts` (the Nova Cores) ·
`lib/city-buildings.ts` (twenty buildings, one to a pill) ·
`lib/grain-mesh.ts` (buildings drawn as grains on lines, faces and
dots) · `lib/city-plans.ts` (the night cities from above) · `lib/atlantis.ts` (Atlantis, the
city under the sea) · the Ship's
city of dreams: `lib/city-game.ts` (districts, landmarks, signs, tunnels, ships) ·
`lib/city-grid.ts` · `lib/city-metro.ts` · `lib/city-sky.ts` · `lib/city-race.ts` ·
`lib/city-font.ts` ·
`components/City.tsx` · the shared trip player (`components/TripPlayer.tsx`)

## Why

> 2026-11-12: "basically the cells looked like a future city with spaceships
> travelling. work on creating that future city. as vegetal. ocean and city
> after that. in there u can create different components one by one. long
> term aim will be to create that future neon city that we fly through on a
> spaceship. kind of star wars city with spaceships."

The Vegetal chapter's **Cell** (a block of box-edged cells with pulses
travelling between them) read as a city with ships. City is the third chapter
after Vegetal ([art-vegetal.md](art-vegetal.md)) and Ocean
([art-ocean.md](art-ocean.md)), built the same way: one trip in numbered
pieces, each a formula from a grain and the time to a place and a colour,
the same grain budget, the name pills picking any piece.

The film mentioned is a mood reference only: no names, ship designs, planets
or anything recognisable from it. The ships are our own arrowheads; the
words are our own.

Neon is the point, so City leaves Vegetal's gold for cyan, magenta and amber
over a violet night. Colours drift slowly from one to the next (about a
minute each), never flash, as the user prefers.

## The golden city (2026-11-12)

> 2026-11-12: "build the city" (the golden city), and "all the visuals of
> cities seen from above which were in vegetal ... bring them back into city."
>
> "then imagine one 3d design of golden city rising from the map. then do 5
> visuals of temples in golden inspired by city using math to simplify to
> maximum and create architecture that is easy to construct and beautiful and
> looks solid."
>
> "then imagine 5 factory buildings in city. imagine a set of domes. and
> bubbles as well. like des serres. but golden. some can be geometric glass
> domes."

The golden city is now City's main theme and opens the chapter. It is a
round city seen from above, grown from one number, φ (1.618…), and drawn in
the language of the night cities and the roots (grains along roads) but
cleaner and more structured. Few forms only: ring, spoke, terrace, tower,
arch. Light grows brighter toward the centre: hope as a gradient. Gold, ivory
and warm white on a deep blue dawn; colours drift slowly toward rose gold and
back over minutes, never flashing.

**The plan** (`GOLDEN` in `lib/golden-city.ts`, worked out once and shared by
every golden piece, and by a flight later):

| Ring | Kind | Width |
|------|------|-------|
| Heart | an open golden garden | radius 3 |
| Inner canal | water | 3/φ² |
| Ring of knowledge | land | 3φ |
| Ring of making | land | 3φ² |
| Middle canal | water | 3/φ |
| Ring of living (terraces) | land | 3φ³ |
| Outer canal | water | 3 |
| Ring of nature (woods, fields) | land | 3φ⁴ |

Each land ring is φ times wider than the one inside it, and so is each canal;
the rim is about 55 out. Twelve boulevards run from the heart out through
every ring, crossing the canals on arched bridges.

**Heights** (the city rising), in units of 1.2: φ times higher each ring
toward the heart. Nature stays low (0.8); the ring of living steps down
outward in three terraces, 1.2·φ³, 1.2·φ², 1.2·φ; the ring of making stands
1.2·φ⁴ (its outer halls 1.2·φ³); the ring of knowledge 1.2·φ⁵, with a tower
1.2·φ⁶ high in each of its twelve sectors. The canals stay flat and shine.
Each sector holds one solid block per ring (wide lanes between), so the grains
go into few, clear walls and roofs and the rising city reads as buildings,
not a cloud.

**Gold, not silver.** The player adds grains on top of each other and blooms
them, so a bright pale gold on a dense edge sums to white. The palette is
therefore deep and saturated (gold about [1, 0.5, 0.12], deep gold, amber
glass, rose gold), each grain is dim on dense edges and faces so overlaps stay
gold, and only small lamps and the heart's light are warm white. Coordinator
finding that set this: "temples and domes render silver/white-lavender".
Golden plan and Rising draw with bigger grains (size 2 and 3) and fewer grains
spent on the heart, so the rings and boulevards read clearly.

Buildings are drawn by `lib/grain-mesh.ts`: a building is a short list of
lines (edges, dense and bright), triangles (faces, dimmer, lit by how squarely
they face the eye, so a face turned away stays faint and the building reads
solid) and dots (lamps, plants, fire, steam). Each grain picks one by its
golden-sequence number, lines by length, faces by area, so every part gets
its fair share of the fixed budget. A few slow motions live on the elements:
steam and motes rising and fading, lights flowing along a line (fading in and
out at its ends at an even pace, so no grain flashes as it wraps round), a lattice
turning and breathing, a slow orbit.

## The seventeen pieces

| # | Piece | What you see | Camera |
|---|-------|--------------|--------|
| 1 | Golden plan | The plan from above, revealed ring by ring from the centre outward: the heart's florets on the golden angle (a sunflower), ring roads and streets, terraces, towers as points of light, lit blocks thicker toward the heart, woods and fields in the ring of nature, canals with their banks and shimmering water, arched bridges, twelve boulevards with travellers walking slowly in toward the heart and out. Pills: **Golden** and the ten plans below (**Ten golden plans**) | High above, a slow orbit, drawing a little nearer |
| 2 | Rising | The same plan, flat as a map at first, rises in 3D ring by ring from the heart: walls, roofs and edges of every block between the boulevards, the towers, the terraces, woods staying low, canals flat; a small open sphere of light over the heart | From nearly straight above, tilting slowly down to an oblique three-quarter view as it orbits |
| 3 | The heart | The centre up close (the plan five times larger): an open golden sphere, a lattice of light (twelve meridians over the twelve boulevards, parallels at ±1/φ² and ±1/φ, nodes of light), not a solid ball, not a palace, floating over a round garden of florets where all twelve boulevards meet, a round basin in the middle; four low terraces stepping down to the inner canal, bridges over it, the first towers of the ring of knowledge beyond. The sphere turns slowly and breathes light (9 s a breath); motes rise from the garden; ships pass slowly far above. It belongs to no one: open, light | A slow orbit, a little above the garden |
| 4 | Nova Cores | Eight power sources in the heart's style on pills (below): an open lattice of light floating over a round plaza of florets, each from its own rule, breathing slowly, energy running out along its conduits on the ground | A slow orbit, a little above the plaza |
| 5 | Temples | Golden temples from the single building to the quarter on pills (**Rotunda**, **Ziggurat**, **Ring**, **Pyramid**, **Lotus**, then **Temple court**, **Sacred complex**, **Temple quarter**; see **Evolutions**) | A slow orbit, a little above; further back and higher for the bigger rungs |
| 6 | Factories | Works of the ring of making (**Sawtooth**, **Foundry**, **Assembly**, **Workshops**, **Solar**, **Cement works**, **Kilns**, then **Factory group**, **Industrial complex**, **Industrial quarter**): industrial and hopeful, with gentle signs of work, slow furnaces, a conveyor of light, soft steam | As the temples |
| 7 | Domes | Golden glasshouses ("serres"): **Geodesic**, **Bubbles**, **Palm house**, **Lattice**, then **Group of domes** (the former Garden), **Dome complex**, **Dome quarter**: glass a faint veil of grains, struts dense and bright, green-gold plants glowing inside | As the temples |
| 8 | Buildings | Twenty buildings from the quarters of the city on pills (**Buildings**, below): stair temples, a pagoda, a domed hall with minarets, twisted, rounded and faceted towers, each on its plinth with curvy walkways of dotted light winding round it | A slow orbit, a little above, drawn back to see each one whole |
| 9 | From above | Five night cities seen from far above, moved here from Vegetal (below): **Grid**, **Star**, **River**, **Bay**, **Canals** on pills | Drifting slowly over the city, looking a little ahead and down |
| 10 | Atlantis | The golden city's plan on the sea floor: glass domes of many sizes and pressure compartments with glowing portholes on its rings, joined by glass tunnels; coral gardens and kelp in its sunken canals and under some domes; a temple under a tall glass dome at its heart, its lattice sphere glowing through the water; submarines in lanes, one colour each, trailing bubbles; fish schools, jellyfish, mantas and far whales. Five views on pills (**Plan**, **Domes**, **Coral gardens**, **The heart**, **Harbour**, see **Atlantis**) | By view |
| 11 | Atlantis buildings | The sunken city's architecture from the single building to the quarter on pills (**Porthole tower**, **Pearl dome**, **Coral temple**, **Kelp spire**, **Submarine pen**, **Jelly lighthouse**, then **Dome cluster**, **Compartment**, **Atlantis quarter**; see **Atlantis buildings**), on the seabed in Atlantis's water, bubbles rising from every crown | As the temples |
| 12 | Towers | Twenty-five towers on a five-by-five grid of blocks, taller toward the middle, rise floor by floor from the ground, the middle from the first moment, all up within about ten seconds (see **Towers and sky lanes, round two**). Each is the Cell's box stacked: its corners and a line at every floor on the faces toward the eye, the rim being built glowing warm. Windows on those faces, two rows a floor, warm or cool, now and then one going out or coming on over seconds. Block outlines on the ground, stars overhead | Slowly round the city, above its roofs |
| 13 | Sky lanes | The grown city, dimmer, its faces toward the eye; ships, each a bright head and a short fading trail, already streaming as the piece opens, along lanes in the streets at four heights, crossing grids, both ways in every street: white lights one way, red the other | Round the city, at the height of the lanes |
| 14 | Neon | Each tower wears bands of neon (two to four ribbons), a tall blade sign of glowing dots on some, a spire with a slow beacon on all; coloured light pools on the street; a few ships. Every light drifts slowly round cyan, magenta, amber and violet, each tower on its own beat | Lower and closer, looking up |
| 15 | Chinatown | A red gate (four pillars, two beams, three roofs turned up at the ends, a plaque reading 中華街, Chinatown) at the mouth of a narrow street. Tall signs hang down the street side of the towers, standing out into the street, in real Chinese and Japanese characters: ラーメン ramen, 茶 tea, 龍 dragon, 酒 wine, 夢 dream, 麺 noodles, 福 good fortune, 喫茶 café; a 夜市 night-market banner across the street and a small 喫茶 sign over a doorway. Lantern red and gold mixed with cyan and magenta. Rows of round red lanterns strung across the street, swaying a little | Walking pace through the gate and down the street |
| 16 | Bridges and docks | Sky bridges (tubes of four edges and ribs, lights along the floor) join neighbouring towers high above the street; landing platforms stand out from the faces of the taller towers, lights chasing slowly round their rims. Ships come in on a curve, settle on a deck, rest, lift off and leave the other way | Round the city, from above the bridges |
| 17 | Canyon | Flying down the middle of an endless street: towers either side (only the faces the street sees are drawn, so every grain shows), feet below the eye and roofs above it; traffic in lanes above and below the eye, all flying forward, one colour per height (amber, cyan, white, violet); high above, one-way cross streets carry ships left to right or right to left, each in its own colour (2026-11-12: "the canyon make it only with lights going forward … each road has one colour of spaceship to keep it coherent"); every third tower carries a tall Chinatown sign, flown past. Towers and ships that pass behind come round to the far end, so the street never ends and no grain is added | Down the middle of the street |
| 18 | Ship | A game, keys only, as the Shark Sim: you pilot a small ship (a flat arrowhead, a raised spine, two cyan engines streaming light) down an endless avenue of solid, lit towers, with side streets to turn into; the avenue runs through the districts of the City of Dreams, Chinatown first (see **Ship, round two** and **Ship, round three**). **A** / **D** turn (the ship banks into the turn), **W** / **S** climb and dive, **E** or Shift faster, **Q** or X slower, **Space** boosts to three times the cruise or more, for as long as it is held; **Space** with **W** climbs on into the stratosphere; **L** slows to look down; **Enter** starts a race at its start. Towers' walls hold you: you slide along them. Traffic above and below you. Two dials read height and speed. With no one at the controls (the Journey, or before you steer) the ship flies down the avenue; let go with Esc and it carries on from where you were, back to the avenue | Behind the ship and a little above, looking past it |

The page opens on one piece alone, picked by name, as Ocean's do: it starts
at its beginning with no ball of stars and loops, each grain gliding back to
where the piece began; the canyon and the ship fly on, so their loops do not show.
The golden plan lights again ring by ring on each loop, and Rising rises again
from its map. From above, on its own, is lit from the start and stands still,
so it needs no glide back. **Journey** plays the seventeen as one trip: between
pieces a ball of faint stars; the pills fall back to the first of each.

Backgrounds: **Dawn** (the default, a deep blue-violet twilight with a warm low glow near
the horizon, kept soft so the gold stands out),
**Violet night** (darkening downward), **Black**, **Deep night**, **Dusk**;
remembered on the device by name, so adding Dawn first never shifts a saved
choice.

## Temples

Each built from a few shapes and one ratio, so it is easy to construct; dense
bright edges, faces lit by how they face the eye, a soft light inside. The
rules (`lib/golden-buildings.ts`, sizes in `RATIOS` checked by the tests):

- **Rotunda**: a = 7. Three round steps, radii a(1 + φ⁻²), a(1 + φ⁻³),
  a(1 + φ⁻⁴), each a·φ⁻⁵ high; twelve columns on a circle of radius a, each a
  high and a·φ⁻⁶ thick; a ring beam a·φ⁻³ deep; a hemispherical dome of radius
  a whose twelve ribs stand over the columns, open at the crown (an oculus); a
  soft light inside and a shaft of light from the oculus.
- **Ziggurat**: four square terraces, each φ times smaller than the one below
  (half-widths 11, 11/φ, 11/φ², 11/φ³), each as high as its half-width over φ²;
  a small shrine on top, turned 45°; on each side a stair at 45° up every
  terrace, 11/φ³ wide.
- **Ring**: a round plinth of two steps (radii 9 and 9 − 9/φ⁴); an upright ring
  of radius R = 7, its tube R/φ⁴ thick; a second ring φ times smaller, turned a
  right angle inside it; a sphere of light R/φ³ across at the centre.
- **Pyramid**: a square base of half-width 10 on a low plinth; the golden slope
  of the Kepler triangle (slant height φ times the half-width, so height
  10√φ); nine courses marked round it; a light at the apex rising in a thin
  beam; a doorway on one face.
- **Lotus**: an eight-sided plinth; eight outer petals, each a pointed vault on
  a circle of radius R = 8.5, Rφ high; eight inner petals between them, R/φ
  out; eightfold symmetry throughout; a small lattice of light breathing at its
  heart.

## Factories

The ring of making: industrial and hopeful, the same principles as the temples.

- **Sawtooth**: a hall 24 long, 24/φ deep, its walls 24/φ³ high; five roof
  teeth, each as high as its width over φ, a glazed north face lit warm from
  inside and a sloped back; two conveyors of light running down the hall, lit
  windows along its walls.
- **Foundry**: a round hall of radius R = 8, R/φ high, under a cone R/φ² high
  with a glazed lantern R/φ³ wide glowing with fire; six chimneys on a ring
  R(1 + φ⁻²) out, each Rφ tall, breathing soft steam that rises and fades; four
  furnaces glowing slowly in arched doorways.
- **Assembly**: a long hall 30 by 10, its walls 5/φ high under a barrel roof of
  radius 5; eleven arched trusses, one every 3, each two arcs (the inner φ⁻⁴
  smaller) braced in a zigzag; a skylight along the ridge; arched doors of
  light at both ends; a conveyor of light inside.
- **Workshops**: five floors, each 5/φ high, each φ^(1/4) narrower than the one
  below and turned by the golden angle; a band of lit windows round each; a
  lattice crane beside it, 20 tall, its jib turning slowly round its mast.
- **Solar**: a tower 18 high with a glowing receiver at its top; six rings of
  mirrors round it, each ring √φ times further out (6, 6√φ, 6φ, …), the mirrors
  2.4 apart, each tilted halfway between the sky and the receiver; faint beams
  of light running up to it.

## Domes

Golden glasshouses: glass a sparse, dim veil of grains (lit from both sides),
struts dense and bright, green-gold plants glowing inside (trees placed by the
golden angle, the tallest in the middle, a few lit flowers in their crowns).

- **Geodesic**: an icosahedron cut three times each way, blown out to a sphere
  of radius 11, its upper half standing on a ring (the lowest row set down on
  the ground).
- **Bubbles**: five half-bubbles, radii 8, 8/φ, 8/φ², 8/φ³, 8/φ⁴, set round the
  largest by the golden angle, each overlapping its neighbour; golden films
  drifting slowly through rose gold; a garden in each.
- **Palm house**: a barrel vault 24 long, radius 4.5, ribs every 1.5, on walls
  1.5 high, with half domes at its ends; across its middle a glass drum of
  radius 6.5 and a ribbed dome on it; palms inside, the tallest under the dome.
- **Lattice**: a grid shell of hexagons 1.3 across over a circle of radius 12,
  lifted to a shallow dome 12/φ high (height ∝ 1 − (r/12)²).
- **Group of domes** (was **Garden**): five geodesic domes on a ring of radius 13, radii
  4.5·φ^(−k/2) for k = 0…4, a sixth √φ larger in the middle, paths between them.

## Cement works and kilns (2026-11-12)

> "factories do different ones: cement factory inspired by big old rusty cement factories etc..."

Our own works, drawn from the same few shapes (no real plant copied):

- **Cement works**: a = 2.4. Four silos in a row, radius a, a·φ³ tall, banded every a, cone
  roofs; a preheater tower a·φ⁴ tall and 2a square, its floors every a, four cyclones down its
  face (each a cone a/φ wide); from its foot the kiln, a tube a/φ round and 10a long falling one
  in twenty-five on three piers with a tyre at each, its far end glowing; conveyor bridges (truss
  galleries with a belt of light) from the silo tops to the tower and down to a stockpile; a
  chimney a·φ⁵ tall breathing slow steam; a low hall along the kiln. Big, plain and heavy. Its
  rusty look is the **Rust** palette (below).
- **Kilns**: five bottle kilns round a yard by the golden angle, the first base radius 3.2 and
  each φ^(1/2) smaller; each wall a bottle, r(y) = R(1 − 0.6·(y/H)^0.8), H = Rφ², a neck R/φ²
  wide; a fire glowing slowly in each door, steam from each neck; a long low workshop beside.

## Evolutions: from the element to the quarter (2026-11-12)

> "for the designs factories domes etc... do different versions of each or evolutions (1 dome,
> one group of domes, one dome complex etc... so u see from the element to the whole quartier
> factory etc..)"

Temples, Factories and Domes are each **one row of pills** (flattened, so ↑ / ↓ walk it in one
line): first the single buildings (the kinds), then three rungs of a ladder, each built from the
rung below placed again smaller (`Placed` in `lib/golden-quarters.ts`: a mesh drawn into another
one, moved, scaled and turned; turning and breathing parts are stilled there, steam, flow and
pulses go on). The eye stands back 1, 1.3, 1.55 and 2.1 times as far for element, group, complex
and quarter, and higher.

| Piece | Group | Complex | Quarter |
|-------|-------|---------|---------|
| Temples | **Temple court**: a square court of half-width 16 walled by a colonnade (columns every 2, 16/φ³ tall); the Rotunda at φ⁻¹ in the middle, a temple at φ⁻² in each corner, a gate and a pool on each axis | **Sacred complex**: the Lotus at φ⁻¹ on a round terrace; eight temples at φ⁻³ on a circle of 24; a reflecting canal ring from 12 to 12 + 12/φ³; eight processional ways; a ring of trees | **Temple quarter**: the sacred complex at φ^−1.5 in the middle; twelve streets, ring roads at 24 and 40; in each sector a court or a temple on the ring of 32 between lit houses; gardens; a canal on the rim at 46 |
| Factories | **Factory group**: Sawtooth, Foundry and Workshops at φ⁻¹ on a triangle of side 22 round a yard, conveyor bridges between them, a rail siding | **Industrial complex**: the Cement works at φ⁻¹ in the middle; Assembly, Kilns, Solar and Foundry at φ⁻² a quarter turn apart on a ring of 27, conveyor bridges out to each, a rail loop of 19 | **Industrial quarter**: a 5 × 5 grid of blocks 18 apart (corners left as yards), a work at φ⁻³ on each, every kind in turn, the industrial complex in the middle; a canal and quay with cranes along the south; a rail ring round it all |
| Domes | **Group of domes** (the five on a ring round a sixth) | **Dome complex**: the Geodesic at φ^−0.5 in the middle; Palm house and Lattice at φ⁻¹ west and east, Bubbles at φ⁻¹ north, a group at φ⁻² south, each 24 out and joined by glass corridors | **Dome quarter**, a solarpunk district: the Geodesic √φ larger as its landmark; terraced gardens to 18; eight streets, ring roads at 26 and 42; eight neighbourhoods on the ring of 34, by turns a dome complex or a group of domes, houses with roof gardens between; a canal at 46; trees everywhere |

## Atlantis buildings (2026-11-13)

> "ok work on atlantis design components and add them, make sure all design components for
> categories can be navigated by going up and something tells us. factory one of five or
> something so it is clear"

A piece after Atlantis (`lib/atlantis-buildings.ts`), one row of pills like Temples, Factories
and Domes, standing on a seabed (a sandy disc, its rim, slow rings of light) instead of a plaza:

| Pill | Rules |
|------|-------|
| Porthole tower | Three drums, radii 5, 5/√φ, 5/φ, each 5φ high, two rings of portholes on each (12, 10, 8 round); a glass cap with a pearl of light under it |
| Pearl dome | A geodesic glass dome of radius 11 on a drum 11/φ³ high ringed with sixteen portholes; a coral garden inside round a pearl of radius 11/φ⁴ on a plinth |
| Coral temple | Three round terraces, radii 12, 12/φ, 12/φ², each 12/φ³ high, corals on each; a scalloped shell roof, a half dome of thirteen ribs, open to the front; a stair up the front |
| Kelp spire | Four ribs in a helix a turn and a half, radius 4 at the foot to 4/φ⁴ at the top, 4φ⁴ high, glass between, lit floors every φ³; kelp swaying round its foot |
| Submarine pen | A basin 24 by 12 under three glass barrel vaults; a submarine resting in the middle bay, its hull an ellipsoid with a conning tower and lit portholes; lit quays |
| Jelly lighthouse | A stem 5φ² high; a bell of radius 6 flattened to 1/φ, scalloped in eight, breathing; twelve tentacles of light trailing down, light running along them |
| Dome cluster | The Pearl dome at φ⁻¹; Porthole tower, Coral temple, Kelp spire and Jelly lighthouse at φ⁻² a quarter turn apart on a circle of 22; a glass tunnel out to each; a reef |
| Compartment | A sea wall of radius 30, 30/φ⁴ high, ringed with portholes, a shallow glass dome over it 30/φ² high; the dome cluster inside, a submarine pen by the east gate; reefs round the rim |
| Atlantis quarter | A Kelp spire as the landmark among coral gardens; six neighbourhoods on the ring of 34, by turns a compartment and a dome cluster, joined by a ring of glass tunnels and six more to the middle; submarine lanes of light at 45 and 47.5; reefs |

Bubbles rise from every crown (dots climbing, swaying and fading). Palettes: **Deep sea** (the
default: teal and aqua, pearl lights), **Pearl & coral**, **Bioluminescent** (cyan and violet),
**Gold**. The water behind is Atlantis's own.

**Where you are in a row.** Under the piece's name in the Studio, small caps say which pill of
how many is showing, in the row's own word: "Factory 3 of 10", "Plan 2 of 11", "Atlantis 1 of
9". It shows on every piece with more than one pill, with the ˄ ˅ arrows beside the name.

## Colour presets (2026-11-12)

> "a design pill that opens colour presets or other stuff when needed for design variants."

A **Palette** pill in the Design menu (only on pieces that offer presets) opens a row of them;
each piece opens on its first, the Journey always gold. Each preset is a full set of tone
colours (edge, face, glass, water, plant, fire, light, ground, road, steam, film), kept deep and
dim enough that dense edges stay their colour, each drifting slowly toward its own second colour:

- Golden plan, Rising, The heart, Nova Cores, Temples, Domes: **Gold** (the default), **Rose
  gold**, **White marble & gold** (ivory faces, gold edges), **Night neon gold** (gold edges,
  deep blue faces, cyan lights, magenta roads).
- Factories: **Gold**, **Rust** (rust-brown faces, ochre roads, red-orange edges: the old cement
  works), **Steel blue-grey**, **Night neon gold**.

## Nova Cores (2026-11-12)

> "that part called the heart is absolutely premium. would love to have more novas like this
> around the city that are like power sources, each unique, with different designs for the
> hearts. call them the Nova Core."

Each core, R = 5.5, floats over a round plaza (radius 11, florets on the golden angle, a basin
of light, a beam rising to the core), breathes light as the heart does (9 s a breath, eased off
with the distance from the core so nothing jumps) and sends its energy out along its conduits:
lights flowing slowly along the ground to 46, small pylons on each. Each leans its lights a
little toward its own colour, within the warm family. The Heart itself is unchanged.

| Core | Conduits | Rule |
|------|----------|------|
| **Icosa** | 12 | An icosahedron blown out to the sphere, each edge cut in two (a frequency-two geodesic lattice), a small icosahedron φ² smaller turning the other way inside |
| **Armillary** | 10 | Five rings of radius R·φ^(−k/4), each tilted k·36° and turning round the vertical, by turns one way and the other, round a still equator |
| **Vortex** | 8 | A torus, its tube R/φ² round, wound by one line eight times round the tube for every three round the ring (a (3, 8) torus knot), a beam of light up its axis |
| **Helix** | 6 | Two helices R/φ out, 2R tall, three turns, half a turn apart, a rung every twelfth of a turn, rings closing top and foot |
| **Platonic nest** | 8 | A sphere (three great circles), the octahedron in it (corners on the sphere) and the cube in that (corners on the octahedron's faces, R/3 out), octahedron and cube turning opposite ways |
| **Star tetra** | 6 | Two tetrahedra through each other on a cube's alternate corners, its long diagonal upright, turning opposite ways, a ring of light round its waist |
| **Crystal** | 7 | Seven hexagonal crystals out from the centre on the golden-angle spiral, each φ^(1/3) shorter than the last, pointed at both ends |
| **Satellites** | 12 | A small lattice orb R/φ across; twelve satellites on a ring of radius R tilted 1/φ² and eight on one tilted the other way, turning opposite ways, each tied to its neighbours |

**For the game.** `novaCore(kind, mesh?, at?, s?)` in `lib/nova-cores.ts` builds a core (its
plaza and conduits too) into any mesh: at the origin it breathes and turns round its own centre
(the mesh's pivot); placed elsewhere (`at` a point on the ground, `s` its size) it is drawn
still, since a mesh turns round one pivot only. `NOVA_CORES`, `NOVA_RULES`, `NOVA_CENTRE`,
`NOVA_R` and `NOVA_REACH` go with it, so the city game can set cores round its districts as
landmarks and power sources.

## Ten golden plans (2026-11-12)

> "the golden plan design is amazing, do 10 like this that represent different cities, or the
> different quartiers etc..."

Ten more round cities from above, each about 55 across its radius, in the Golden plan's style
and drawn with one shared kit (`lib/golden-plans.ts`: ring roads, boulevards with travellers,
canals with arched bridges, lit blocks thicker toward the heart, woods and fields, a sunflower
heart). They light in eight even rings from the heart out, as the golden city does ring by ring.

| Plan | Rule |
|------|------|
| **Sunflower** | Blocks on the golden angle, r = 52√(n/987), streets along the 21 and 34 spirals that join them, seven of the thirteen spiral arms as boulevards |
| **Atlantis** | Equal rings of land and water out from an island (water at 6–9, 17–21, 33–38), one canal cut straight in from the sea, bridges on three axes |
| **Twelve gates** | A round wall of radius 44 with twelve gates, a boulevard through each, ring roads at 14 and 28, woods outside |
| **Star fort** | Walls on a sixteen-pointed star (points at 48, notches at 34) with a moat, eight streets to the points, ring roads at 10 and 22 |
| **Lotus** | Eight outer petals from 10 to 50, eight inner ones turned half a petal from 6 to 30, a pool at the heart, an avenue down each petal |
| **Hive** | A grid of hexagons 6.8 across clipped to a circle of 50, the middle one a garden, six avenues on the grid's axes |
| **Mandala** | Circle, square in it, circle in that, square turned 45° in that…, each 1/√2 of the last from 50 down to 6, avenues on the axes and diagonals |
| **Spiral** | One avenue on the golden spiral, r = 2·φ^(2θ/π) (φ wider each quarter turn), out to 52, blocks either side, woods between the turns |
| **Harbour** | A half circle on the shore (ring roads at 12, 24, 36, 48, seven avenues fanning inland), piers, a breakwater arc at 30, an island and its lighthouse |
| **Garden city** | Garden, halls, park, glass arcade, houses, a grand green avenue, houses, a railway ring and a green belt of farms, six boulevards out |

## Towers and sky lanes, round two (2026-11-12)

> "towers and sky lanes make them start moving faster." Then: "towers and sky lanes more
> defined, more dots."

- **Sooner.** The middle tower rises from the first moment, quickly at first and settling (an
  ease-out over a fifth of the piece), the rim's by a seventh of the way in: every tower stands
  by about a third (some ten seconds), where it took most of the piece before. The sky lanes
  open already streaming (no ship waits to come on), and run quicker: 6.5 to 10 a second.
- **Defined.** The tower grains go where the eye sees them: on each tower, the faces turned to
  the eye, shared by how squarely they face it (a face seen edge-on gets few, the faces turned
  away almost none), their corners, floor lines and windows. A grain near the line between two
  faces' shares is dimmed, so as the eye goes round the grains that change face do it unlit,
  never popping. Fewer grains go to stars and ground lines; grains are drawn a little smaller
  (0.65, was 0.8). The sky lanes' city does the same from its own eye, and more of its grains go
  to the ships.

## Buildings

> 2026-11-12: "think about some temples or buildings with stairs, or monumental
> temples. or roads for pedestrians that are curvy around the buildings. or
> buildings that are not square but more innovative shapes or rounded shapes,
> or mixes of rounded, diagonals and squares. do a cool buildings category for
> building designs. do 20 cool buildings, each unique, can be in different
> quartiers like chinatown etc..."

A Studio piece of twenty buildings, one to a pill, each from a quarter of the
city and built from a few rules (`lib/city-buildings.ts`). Drawn like the
temples: dense bright edges, faces lit by how they face the eye, warm lamps,
slow motions only (lanterns and cores glowing up and down, water running,
rings orbiting). Every building stands on its own plinth (round, square or
eight-sided), with a walkway loop of dotted light winding round it, swelling
and narrowing on a few lobes, trees on its outer side, and two curving spurs
out from the front and back to the edge of the site. The eye orbits slowly,
a little above, drawn back by the building's height and the site's reach so
each is seen whole. The designs are our own; the quarters are moods, not
copies of any real building.

| # | Pill | Quarter | Rules |
|---|------|---------|-------|
| 1 | Sun Stair | Temple Hill | Three terraces (26×18, 21×14, 16×10), each 1.6 high; one grand stairway 6 wide climbing all three in a single flight; on top a hall of 2 × 7 columns under a low gabled roof; two fire bowls at the stair head |
| 2 | Step Mastaba | Nile Quarter | Six levels, each a seventh smaller than the first (half-widths 12(1 − k/7)), 2.2 high, walls battered to 0.94; a stair 3 wide up the front to a small shrine; two obelisks (tapering to 0.55, a pyramid cap) and an avenue of lamps |
| 3 | Pagoda | Chinatown | Nine eight-sided storeys, each 0.91 the width and 0.95 the height of the one below; an eave 1.5 out on every storey, its corners turned up and its sides sagging; a red lantern under each corner; a spire of seven rings; a round moon gate on the front path |
| 4 | Shikhara | Spice Quarter | A high plinth 2.4 tall with a stair; a tower on a sixteen-ribbed plan whose outline curves in as r = 5.2(1 − t^2.4)^0.55, a course every level; a ribbed cushion stone and a finial on top; a hall of pillars in front under a stepped pyramid roof; lamps along the plinth |
| 5 | Domed Hall | Bazaar Quarter | A square hall 18 wide, 6 high; a dome of radius 6 on a drum of 24 lit windows; four half domes (radius 4.2) on its sides; four minarets 27 tall at the corners, each with two lit balconies and a cone cap; a round fountain in front |
| 6 | Sky Bridge | Business District | Two towers on chamfered square plans, 34 and 28 high, turned ±0.2; each crown cut on a slant (one along x, one along z) and glazed; a glass tube bridge at 20 between them, lights flowing along its floor; a podium joining their feet |
| 7 | Tree Tower | Solarpunk Gardens | A trunk tapering from radius 3 to 1.6 over 32; seven roots curving out over the plinth; ten round garden pads branching off it on the golden angle, one every 2.7 up, each with a rail and plants; a crown of seven tilted solar leaves |
| 8 | Porthole Hall | Atlantis Quarter | A drum of radius 9, 8 high, ringed with three rows of 18 round portholes (offset by half a step each row), each a double frame round a glowing light; a geodesic glass dome of radius 8.6 on top, a soft sea-blue light inside; a moat round it crossed by four bridges |
| 9 | Nova Core | Nova Quarter | A hyperboloid shell of 2 × 20 straight struts, each running from the base ring (radius 7) to the top ring (radius 5, 29 higher) 108° round, so straight lines make a curved waist; a column of light pulsing slowly up its middle; three tilted rings orbiting at three heights |
| 10 | Twist | Business District | Forty square floors 9.2 wide, 0.8 high, each turned 2.25° from the one below (a quarter turn in all) and tapering to 0.85; a ring every two floors, windows on every other floor; a lit crown and a spire |
| 11 | Pebbles | Riverside | Three rounded towers (27, 13 and 8 high) on superellipse plans, each swelling up a soft profile (sin^0.35) to a rounded crown, bands of light every two levels; a round canopy over the entrance |
| 12 | Crystal | Arts District | A triangle turned 60° at each of three sections (radii 8, 9, 4 at heights 0, 12.4, 27.4), every band joined by six diagonal triangular facets (an antiprism), alternately solid and glass, a three-sided point on top, a light in its heart; a shard 0.42 its size beside it |
| 13 | Trio | Old Town Edge | A square podium 18 × 14 × 5 (the square), a round tower of radius 5 rising from it, its roof cut on a slant from 19 to 25 and glazed (the round), and a wedge leaning on the tower, its long edge a diagonal from 18 down to the podium's edge (the diagonal) |
| 14 | Cantilever | Design Quarter | Six long boxes 13 × 5.2 × 3, stacked, each turned 30° more than the one below and slid 2.5 out along its length, the other way each time; a band of light round each; a glass lift core through them; a roof garden |
| 15 | Great Arch | University Quarter | A catenary arch y = H − a(cosh(x/a) − 1), a = 4.5, spanning 22 and standing about 22 high, its square section thinning from 2.8 to 1.6 toward the crown; a reflecting pool in front; a half cloister of eleven columns with round arches behind |
| 16 | Ring Stack | Harbour Quarter | A glass column 30 tall; seven rings threaded on it, each 2.6 thick, their radii rising and falling on a sine (6.6 ± 2.2), each set 1.3 off the axis on the golden angle; a band of lit windows round each |
| 17 | Hanging Gardens | Garden Quarter | Seven round terraces, radii from 12.5 down by 1.4, each 2.2 high and set 0.55 further north, so their south faces step back like a hillside; plants spilling over every rim; four waterfalls down each south face; a stair up the south; a domed pavilion of six columns on top |
| 18 | Amphitheatre | Theatre District | Ten tiers, each 0.6 high and 1 deep, swept 220° round a round stage on an ellipse (1.12 : 1); seven aisles; a ring of 23 posts and lamps along the top; a backdrop wall of five round arches lit inside |
| 19 | Spiral Library | Scholars' Quarter | A drum tapering from radius 7 to 4.5 over 22; a ramp 2.2 wide winding three times round it with a lit balustrade; lit window slits between the turns; a glass reading dome on top with a soft light |
| 20 | Sail | Harbour Quarter | A lens-shaped tower 32 tall: its width an ellipse 8(1 − t^1.6)^0.5, curving forward as it rises (−4 + 7t²), a full bow in front and a shallow glass back meeting at sharp edges; diagonal ribs both ways across its face; a mast and a lamp at its tip; mooring posts round its pier |

`building(kind, mesh, place)` builds any of them (by index or name) on its
plinth and walkways into a mesh at a place (its foot, a turn round the
vertical, a scale), so the game city can set them along its streets later;
`BUILDING_KINDS` lists their names, quarters, heights and sites.

**Acceptance (Buildings)**

- Twenty pills with twenty different names; Chinatown and the Atlantis Quarter among at least
  fifteen quarters.
- Every building is finite and the same every time; nothing goes below the ground; every edge and
  face stays inside its site; each mesh stays under 20,000 elements so a grain's pick stays cheap.
- Placed elsewhere, turned and scaled, a building's every point moves with it exactly.
- On its pill, most grains are lit, no grain is below the ground, no two buildings share more than
  60% of their filled space, and the eye stands outside the site and above the ground.
- Frame cost, 9,000 grains (bun, the build machine): 8–16 ms a frame across the twenty, against
  11–14 ms for the temples in the same run.

## From above

Moved from Vegetal (2026-11-12: "all the visuals of cities seen from above
which were in vegetal ... bring them back into city"), looking exactly as
they did; first asked for on 2026-11-12 ("then do a new one called city.
cityscapes seen from above in vegetal. like cities seen from space or from an
airplane (must look a bit like the roots visuals but more structured). do 5
such visuals in the cities collection.").

A city at night lies flat across the picture: grains of light along its
streets, avenues and ring roads, a dense, bright, whiter centre fading to
sparse amber suburbs, highways reaching out into the dark and forking at their
ends like roots, and car lights moving along the fast roads, white one way
and amber the other. Lights in the blocks hug the streets. Water and parks
stay dark. In the Journey the lights come on from the centre outward; the eye
drifts slowly over the city, as if flying over it. Pills pick the city; the
Journey shows the first:

- **Grid**: a tilted grid, close in the middle and twice as wide in the
  suburbs, an old road cutting across it on a slant, a river with
  embankments and avenues crossing it on bridges.
- **Star**: twelve boulevards from one centre, three ring roads, short
  streets fanning out between the boulevards, a dark park.
- **River**: an old city grown like roots from two cores, one on each bank
  of a winding river, its main roads the first forks, lanes the finest;
  bridges and embankments.
- **Bay**: ring roads in half circles round the head of a bay, boulevards
  fanning inland, a grid between them, a shore road, piers, an island with
  its own streets and a bridge.
- **Canals**: five rings of canals round an old centre on a harbour, streets
  along both banks and across them on bridges, a newer grid beyond, a ring
  highway, and a sparser town across the harbour.

## Atlantis

> 2026-11-12: "add Atlantis as a city, with marine life around it, like ocean, and spaceships are
> submarines that leave a trail of bubbles etc... think map, different compartments etc...
> develop. has coral gardens in some parts etc..."
>
> "can have hublots (portholes) for atlantis etc... atlantis also has domes, and glass tunnels
> between them."

The golden city sunk to the sea floor, after the ringed island of the old story: the plan is
`GOLDEN` itself (read only), so the rings, their widths by φ and the twelve boulevards are the
golden city's. Our own design throughout: no names, shapes or symbols from any film or game.

**The city** (`lib/atlantis.ts`, worked out once and drawn with `lib/grain-mesh.ts`):

- The land rings are the sea floor; the three canals are trenches 1.2 deep, walled on both banks
  (a faint wall, its top edge bright), so the rings read from above. Past the ring of nature the
  floor rises into a rocky rim, the basin's edge.
- **The heart**: a temple under a tall glass dome (radius 3, 5.2 high): three round steps, twelve
  columns, a ring beam, and over it an open lattice sphere (twelve meridians, parallels at 0,
  ±1/φ² and ±1/φ, nodes of light) breathing slowly round a glowing core, still rays reaching out,
  motes rising from the dome's crown toward the surface as a beacon.
- **Ring of knowledge**: six small geodesic domes (radius 1.7) lit inside, slim towers with
  portholes between them.
- **Ring of making**: twelve pressure compartments, drums under low glass caps, ten round
  portholes each, joined round the ring by a glass tunnel.
- **Ring of living**: twelve great glass domes (radius 3.6) on drums ringed with portholes,
  gardens of coral and kelp under the even ones, terraced homes with lit windows under the odd;
  joined round the ring by a glass tunnel; beside each, two smaller domes (radius 1.1 to 1.8),
  each joined to it by its own tunnel.
- **Ring of nature**: reefs in five sectors, kelp meadows in the others, and three clusters of
  three domes (large, middle, small) joined to each other and to the boulevard's end.
- **Glass tunnels** (the boulevards): twelve from the heart's dome out across every ring, each a
  faint skin of glass, a gold rib every 1.5, two gold rails and a lit walkway along its floor;
  lights run along the long ones (on a short one a running light would blink, so it stays steady).
  Where a tunnel crosses a canal, an airlock drum stands on each bank with portholes and a lamp.
- **Portholes** ("hublots"): round gold frames with warm light glowing through from inside, each
  breathing slowly on its own beat; on the compartments, the dome drums, the towers, the airlocks,
  the harbour hall, the pier and the submarines' sides.
- **The harbour**, on boulevard 0: a hall under a geodesic dome, a long pier with portholes and
  lamps, eight berths (four a side), each a cradle and a gangway tube, and a ring gate whose lamps
  glow one after another in a slow chase.
- **Coral gardens**: branching corals (each branch forking in two or three, shorter, leaning
  out), flat sea fans, anemones with glowing tips and round boulder corals, in pink, orange,
  violet, gold, sea green and red; kelp strands with blades. They sway slowly in the current, more
  the higher they reach (kelp most). Gardens grow in the inner and middle canals, a kelp forest in
  the outer canal, under the six garden domes, and on the five reefs.

**Submarines** (instead of ships): nine lanes, each one colour (the Canyon's rule, 2026-11-12:
"each road has one colour"): a ring round the heart (warm white); the middle canal low (cyan) and
high (coral), one each way; the outer canal low (lime) and high (violet), one each way; four long
loops from the heart out over the rim along boulevards 0, 3, 6 and 9 (gold, aqua, rose, ice), out
at one height and back at another. Each submarine is a hull, a sail, a turning propeller ring,
warm portholes and a bow lamp, hull and lamp in its lane's colour. It keeps to its lane, clear of
every dome and airlock and at least 1.5 above the floor. Each leaves a stream of **bubbles** from
its stern: a bubble starts where the stern was, rises (1.1 a second, quickening) and wobbles, and
fades in quickly and out over six seconds, so a trail of bubbles hangs behind each submarine along
its lane. At the harbour, eight more come in through the gate on a curve, rest still at their
berths (bubbles stop), and leave up toward the loop, fading.

**Marine life** (Ocean's ideas, drawn simpler): seven fish schools (round the heart, round three
garden domes, over two reefs, and one wide school of 30 high over the city), nine jellyfish
rising slowly and coming round from below (faded at both ends), three mantas looping high over
the rings, two whales far off beyond the rim.

**The water**: far things dim and turn teal (the fog starts past where the eye looks; light
carries further than stone), the teal drifting slowly toward a deeper blue over minutes; caustics
ripple slowly over the sand, the stone and the glass; plankton drifts up; shafts of light slant
down from the surface, which shimmers far above. Plankton, the sand of a close view and the shafts
stand still in the water as the eye moves (fixed in place, kept in a window round the eye, faded
where they come round). Nothing flashes: a frame apart no grain's colour moves by 0.05.

**Views** (pills, label **View**; the Journey shows the Plan). The whole city is 130 across, so
each close view keeps only the part of the city and its reefs the eye looks at and spends the
budget there; the Plan keeps all of it.

- **Plan**: the map. From nearly straight above (more than 0.95 of the way), turning slowly and
  drawing a little nearer: the rings, the domes as circles, tunnels as spokes, gardens as colour,
  the harbour's pier, the submarines in their coloured lanes. More grains on the buildings and
  gardens, no shafts.
- **Domes**: from just outside the outer canal, a little above the domes, gliding slowly round and
  looking in across the great domes, the canal and the compartments toward the glowing heart;
  submarines of the outer canal pass below.
- **Coral gardens**: low over a reef of the ring of nature, looking in over the corals; more than
  a third of the grains on the reefs, fish thick about them.
- **The heart**: a slow orbit round the temple, a third of the grains on it; submarines circle in
  the heart ring, a school of yellow fish above.
- **Harbour**: a slow orbit over the pier, a quarter of the grains on the harbour and an eighth on
  its submarines coming in, resting and leaving.

Frame cost, 9,000 grains (bun, the build machine, offline, the same run): Atlantis 5.7 to 8.4 ms
by view (Plan the most), against 3.2 to 5.6 ms for Golden plan, The heart, Domes, From above, Neon
and Canyon. Each view's meshes are built the first time it is shown (under 70 ms).

**Tuning (2026-11-12).** The user, in the real player: the Plan was too dark and murky, the
Domes and Coral gardens sparse up close. Now:

- **The Plan reads as a map.** Every building grain is lifted 2.2 times and leaned halfway toward
  its ring's hue (`ringHue`: the heart warm white, knowledge cyan, making amber, living coral
  rose, nature sea green, the canals water blue); the reefs and the sand are lifted too. A sixth of
  the grains is the map itself (`mapSite`): a bright line on every bank and the rim, a slow wave
  running outward; the twelve tunnels with soft pulses running in toward the heart; every dome and
  compartment a lit disc in its kind's colour (gardens green, homes warm, knowledge cyan, making
  amber), its rim brighter; the heart a sunflower of light on the golden angle, breathing on its
  9 s breath. Less goes to plankton, fish and whales. The Plan's grains are drawn larger (1.9,
  against 1.4 for Domes and Coral gardens and 1.2 for the heart and the harbour).
- **Fuller up close.** Domes gives nearly half its grains to the city (was a third), Coral gardens
  nearly half to the reefs, and each reef sector has a carpet of forty small colonies between the
  big ones.
- **Its own water.** The player takes a per-piece background (`pieces.background`, a step's own
  stops over the chosen one, the Journey keeping the chosen one): Atlantis shows a teal-blue
  water, teal near the surface deepening to blue-black.

## Chinatown

> 2026-11-12: "add chinese signs on side of buildings. or japanese. like that
> cyberpunk asian mood. so we can create a chinatown in the city."

The characters are real: rasterised once at 16 × 16 from the MS Gothic font
and kept in `lib/city.ts` as bits, so they read the same in tests, on the
server and in the browser, with no canvas. Every grain of a sign falls on a
lit pixel of its characters (or on its thin frame). In a vertical sign the
long vowel mark ー stands upright, as it is written down a page. Only common,
kind shop and street words, each meaning listed beside the table in the code.

## Ship, round two

> 2026-11-12: "solid tower walls while you fly the ship, since they still look like sparse lines of
> light. After that would come the ship flying down the canyon past Chinatown, which is the start
> of the full fly-through." ("work on it.")

**The city.** An endless grid of blocks with a tower on each. A wide avenue (18 across) runs on
forward down the middle, with narrower streets beside it and side streets across, at least six
wide, so you can turn into any of them. Three blocks in every eight, the avenue is **Chinatown**:

- a red gate at each end (the Chinatown piece's gate made larger, with 中華街 on its plaque, tall
  enough to fly under its beams);
- tall signs hanging down the walls in real characters (from the same glyph bitmaps), standing
  out over the avenue and facing down it so you read them as you come;
- ten strings of red lanterns across the avenue, over the ship's head;
- a 夜市 banner across the middle.

Chinatown's towers are lower and lit warm, with red and gold bands. After it come neon towers
again.

**Solid walls.** The grain budget stays fixed, but it now goes only where the eye can see. Every
frame the city becomes a list of light sites, taken only from:

- towers in front of the eye and within sight (160);
- the faces turned toward the eye;
- faces that other towers don't hide (each site is checked when a face is partly hidden).

Each face has a dense grid of windows (lit warm or cool, now and then one going out or coming on
over seconds), clearly drawn corners and roof edge, floor lines, neon bands and a faint fill.
Nearer sites are kept more densely than far ones. Far light dims and leans violet, gone by 160.
Grains closer than about ten to the eye fade out, so they never show as big soft dots. The
player draws every grain the same size (one size for the whole cloud) and lets a piece set only
its colour, so fading is the only way to tame them. The pool of grains is dealt out to the
sites, and the rest wait unlit. This is the Canyon's recycling made general: towers that fall
behind give their grains to the ones ahead. A site keeps its grain from frame to frame, and sites
come and go by fading, never popping.

**Flight.** With no one steering, the autopilot flies down the middle of the avenue, weaving a
little. It dips low (8 over the street) through each Chinatown, under the gate's beam and the
lanterns, and rises again among the neon towers. If you let go, it carries on from where you
were: it follows the street you're in, turns back toward the avenue at the next crossing, then
heads on down it. Traffic streams above and below you along the avenue and the nearby streets,
both ways. The avenue's low lanes go quiet through Chinatown. Like the canyon, the ship flies on
with no loop. In the Journey its route passes near the middle of the city, so the grains pour in
and out over a short distance.

**Acceptance (round two)**

- Walls: faces within 40 of the eye carry at least three times the grains per area of faces 80 or
  more away. No lit grain is behind the eye or beyond 160 (apart from the star dome), and the
  pool never asks for more grains than the player draws.
- The autopilot's route never enters a tower, stays at least two inside the avenue's walls and
  heads down it. It passes a Chinatown stretch about every half minute, and through each one it
  flies under 12 (below the gate's beam).
- Passing a Chinatown sign, most of its characters' pixels are alight, so it reads. Red lanterns
  hang over the avenue above the eye.
- D at a crossing turns you into the side street. Letting go never jumps the ship, and within 40
  seconds the autopilot is back on the avenue heading down it, never inside a tower on the way.
- Colours drift and flicker as elsewhere (signs never more than 0.02 a frame); nothing flashes.
- Frame cost, 9000 grains: Ship 5.4 ms (it was 6.5 ms before this round), against 2.5–4.2 ms for the
  other pieces (bench on the build machine, bun).

## Ship, round three: the City of Dreams (game design)

> 2026-11-12: "develop the video game city with elements from the studio. developing chinatown. to
> go higher not just one street. but panneaux chinois on many levels of the city higher and lower
> and other streets with lampions. or portals. or diwali lights. or tunnels inside buildings u can
> navigate through. add a few other spaceships. plan the city. allow a super boost when u just go
> up so u can go into stratosphere and see city from above. a slow mode to just look down. stars and
> constellations. a few satellites in the sky or sky stations."
>
> "think videogames what makes it fun what makes the city interactive etc.... how to keep it simple
> for memory etc.... add some golden trees in some parts. lampions chinois volants. chinatown
> district with chinese design buildings as well. indian district quarter with indian temples.
> etc... also a spaceship racing track in some part of the city with obstacles like diagonal bars u
> have to navigate through. and u can start race when u go there (do u wanna start the race, and
> have 3 2 1, and other spaceships racing with u). different racetracks to be developed for each
> quartier. one egyptian pyramids, mosques istanbul oriental district as well."
>
> "love the city responds. also love idea like tunnels in tunnel racer, where u get pulses in the
> tunnel like rings light up faster than you. also imagine a metro in the city that is on suspended
> rail tracks that swishes through city with curves to balance square shapes and curves."
>
> "then the factories domes etc... must be incorporated. industrial quarter. dome organic solarpunk
> part. etc... each organised around center landmarks. stairs temples. etc.... u can also have
> bank. Bar. or other panneaux. Welcome to the City of Dreams panels."
>
> "think about ideas of pulse and rhythm in the city. not everything has to be overloaded with
> infinite colours but pulse is an important notion. tunnels can be underground for racing."
>
> "also a racing track in the sky with tunnels and stuff, on a sky station flying island thing."

The film is still a mood only: every building, ship and sign is our own, from a few primitives.

### Principles

- **The city is a compass.** A few big districts in a fixed, readable plan; each has one strong
  colour, one silhouette and one slow motion, and a landmark on an open plaza where its streets meet.
  The golden spire is seen from everywhere (its beacon is drawn from any distance). A district's name
  shows quietly beside the bar for four seconds as you enter it.
- **The city responds.** Dark windows wake as you pass and anything lit within twenty of you glows a
  little brighter; sky lanterns you fly through turn gold and stay lit; the other ships rise and
  move aside as you come near; a race won lights its district on the plan from above.
- **Pulse and rhythm, not more colours.** One city clock, 66 beats a minute (`beat` in
  `lib/city-grid.ts`: a soft swell and slow fall, never a flash). Each district beats at a simple
  ratio of it (Chinatown 1, the Heights 2, the market 3/2, Istanbul 2/3, Indian quarter, canals and
  domes 1/2, golden gardens 1/3, temples and Egypt 1/4): its roofs and landmark breathe on it, the
  lantern strings swell along their length, word signs breathe, and from above slow waves of light
  run down every street. Each district keeps to one or two hues plus white and gold.
- **Fun loop.** Explore, find a place (a race start, a portal, a tunnel, a station), do a short
  challenge, get a small quiet reward. No scores on the screen.
- **Simple for memory and the frame.** Everything is data (`DISTRICTS`, `BANDS`, `LANDMARKS`,
  `TRACKS`, `RAIL_POINTS`, `SHIP_LANES`) and a handful of reused primitives (lines, rings, domes,
  turned surfaces, eaves); shapes are built once and cached; only what is near is detailed (the
  same light-site pool as round two, nearer kept denser); the grain budget never changes.

### The plan (`lib/city-game.ts`)

A tile of 12 blocks across and 56 along (312 × 1904; 48 and 1632 before the Green Code quarter),
repeating every way so the city never ends. The avenue runs down its middle; seven bands of eight
blocks lie along it, a district each side:

| Band | Left of the avenue | Right of the avenue |
|------|--------------------|---------------------|
| 0 | **Chinatown**: lower towers with Chinese roofs (eaves turned up at two floors, a three-roofed pagoda on top), red and gold; tall signs at three heights on both street walls of every tower, on every street; red lanterns strung across the side streets at three heights and across the avenue high up; sky lanterns rising; landmark the **Pagoda of nine roofs** | **Chinatown** too: the **race plaza** (a ring of moon gates, a RACE sign), start of the Lantern Loop |
| 1 | **Indian quarter**: low towers crowned by curved temple spires (shikhara: ribs and rings up the curve, a flat stone ring and finial) or four chhatris; Diwali lamps strung across the streets at three heights, twinkling slowly; landmark the **Temple of the curved spire** (a tall shikhara, four small ones, a chhatri, stepped plinth) | **Istanbul**: towers with domes and slender minarets; landmark the **Mosque of the four minarets** (square hall, great dome on its drum with sixteen ribs, four half domes, four minarets with balconies) |
| 2 | **The Heights**: tall towers (70–128), sky bridges between them at the height both reach (upper streets between the tops), more tunnels; over the avenue a long **tube** whose rings pulse ahead of you, and two **portals** | **The Canals**: the undercity: three cross streets are canals 14 deep under the street, their walls lit with pipes and lamps, water shimmering, arches of pulsing light over them so each reads as a tunnel; you can fly down into them |
| 3 | **Golden gardens**: golden towers, golden domes, parks of golden trees (gold-leaf crowns shimmering); landmark the **golden spire** (190 high, rings of light, an open sphere of light on top, eight golden trees round it), seen from everywhere | **Temple quarter**: the Studio's temples (lib/golden-buildings.ts, read-only) on blocks; landmark the Studio's **ziggurat**, stairs on every side, 1.7 times its Studio size |
| 4 | **Industrial quarter**: the Studio's five factories on blocks; landmark the Studio's **foundry**, its chimneys breathing steam | **Solarpunk domes**: the Studio's glasshouses and parks of golden trees; landmark the Studio's **garden of domes** |
| 5 | **Egyptian quarter**: pyramids on the blocks (the golden slope, courses marked, a light at every apex; they hold you like walls, on their slope), obelisks on the avenue's low towers; landmark the **great pyramid** with a lying sphinx-like figure and two obelisks (our own simple shapes) | **Neon market**: word signs in a small Latin pixel font (BANK, BAR, HOTEL, CAFE, NOODLES, CINEMA, TEA, DREAMS) |
| 6 | **Green Code quarter** (both sides, below): dark towers with code falling down their faces; landmark the **data spire** | **Green Code quarter** too |

Every district's name is written over its mouth on the avenue's walls. The great panel
**WELCOME TO THE CITY OF DREAMS** hangs over the opening road, where the Ship starts (below). Now
and then a word sign lights a tower elsewhere too.

**Levels.** Canals under the street (floor 14 down); the street; the lanes; sky bridges; the metro
at 35–45; the tops of the Heights; a lane of ships at 150 over every roof; the stations and the
sky island at 300–360; the stratosphere at 520.

**Tunnels.** About one tower in eight (three in ten in the Heights) has a lit tunnel through it,
along x or z, 6.8 wide and 5.6 high: square rings of light every 1.6, warm at the mouths, no windows
over the mouth, and no wall there: you can fly through. In every tunnel, the tube and the canals,
**pulses** run in waves the way you fly, always faster than you (`pulseSpeed(v) = 1.7v + 8`), a
soft swell up to each front: a tunnel rider's pull, in two hues only.

**Portals.** Two ring gates over the avenue in the Heights, turning slowly in cyan and violet; fly
through one (steering) and it carries you on, ahead the way you fly, to the mouth of another band
(the golden gardens, the market).

**The metro** (`lib/city-metro.ts`). A suspended monorail: a closed Catmull-Rom loop through twenty
points per tile, down one side of the city and back up the other in long swinging curves, rising and
falling gently; the rail drawn as two lit lines and sleepers, a pylon every 30 with its arm curving
over to the rail. Three trains of four carriages hang under it, leaning into the bends, their windows
lit; four stations on platforms beside the rail with a METRO sign. Towers under the rail stand lower,
so it never meets one.

**Other ships.** Six cruise all the time, each our own grain shape (a long hauler in a ring, a thin
dart with twin tails, a round pod in a turning ring): a convoy of three down the avenue, one on a
side street, one across, one in the lane over the roofs; three more (a second convoy) when no race
takes them. Brought round near the eye as you fly, like the traffic; they rise and step aside as
you come near.

**The sky** (`lib/city-sky.ts`). Stars, and three constellations from their real stars' places
(right ascension and declination, the public catalogue): **Orion** in the south, the **Big Dipper**
and **Cassiopeia** to the north, all up all night (a sky at 50° north, turning a little round
Orion's hour), each star three grains, their figures faint; three satellites slowly crossing on
their own great circles; a turning **ring station** and a **platform** station (the sky island)
high over the city; the golden spire's beacon. Brighter the higher you fly.

### Flying it

| Key (phone) | Does |
|-------------|------|
| A / D (stick) | turn, the ship banking |
| W / S (stick) | climb, dive |
| E or Shift (Faster) / Q or X (Slower) | pace |
| Space (**Boost**) | three times the cruise while the bar lasts (the bar does not drain over the towers) |
| Space + W | **super boost**: climbs on at 48 a second while W is held, past the towers' sky (150) up to the **stratosphere** (520); up there W climbs, S dives back down fast; under the towers' sky you fly as before |
| L (**Look**) | **slow mode**: a gentle drift (0.22 of the pace), the eye rising and tilting down at the city below; L again to fly on |
| Enter (**Go**) | at a race's start, starts the race |

**From above.** As you climb the eye stands back and rises (up to 150 back and 190 up) and looks
down ahead; the view opens from the street's 160 to a thousand; the city is drawn as its plan:
every roof's outline in its district's colour, the avenue's lights white, every street a thread of
amber with slow waves running down it, the landmarks lit, the stars brighter.

**Seen clearly from above** (2026-11-12: "make city more visible from above"). The plan was there
but dark: the player's fade dissolved every grain beyond 260 from the eye (the eye in the
stratosphere is some 700 over the street), its far plane stopped at 900, the grains were specks
at that distance and the far haze turned them violet. Now, read as the Golden plan reads:

- the City's own fade keeps the journey's for every eye under the towers' sky (every piece but
  the Ship climbing) and opens its far edge with the height above it; the player's far plane is
  1600;
- the Ship's grains grow with the eye's height, up to 14 times their street size, so from 800
  away they read about as large as the Golden plan's; your own ship grows a little and dims, so it
  stays a ship, not a blot;
- the haze lifts over the towers' sky: no violet lean, only a short fade at the edge of the view;
- the plan spends its grains only where the eye looks (the view's footprint on the ground), and
  from the stratosphere on few, bold things: each roof a fill of its district's hue (so every
  district reads as a patch of one colour), the avenue in white, the main roads (the tile's edges
  along, the bands' edges across) as dense threads of gold, the side streets and roof outlines
  faint; every landmark's plaza a ring of its district's hue round a bright heart, breathing on its
  district's beat.

**Flight feel (2026-11-13)** ("specially playability navigation effects. for making city fun to
fly through. smooth turn effects when u turn a lot, effects behind ship for the boost. boost not
too fast in the city but faster when above."). Every change eases; nothing flashes.

- **Turns** ease in and glide out: the turn rate eases toward the keys (1 − e^(−6 dt)), so letting
  go carries the turn on a moment; a turn held long banks deeper (a quarter radian more by 1.5 s).
  Each ship's turn still scales the rate.
- **The chase camera** follows the heading a beat late (1 − e^(−5 dt)), so a turn swings the view
  round the ship, and rolls slightly with the bank (0.22 of it); level on the autopilot's route,
  looking down and from high up.
- **The boost by height**: 2.5 times the cruise in the streets, 3.6 at the roofs (the towers'
  sky), 5.5 in the stratosphere, blending smoothly (2026-11-13, later: "add more boost"; it was
  2, 3 and 4.5). Since 2026-11-14 ("more boost on all ships so boost is not limited, and
  abundant") it is 3.2, 4.6 and 7.5, every ship by its own handling, and **the bar never drains**:
  hold Space as long as you like (it was 4.5 s, filling in 8). Out in space it stays three times
  space's pace; the Speed dial's range holds the fastest you can go, so the needle never runs past it.
- **The plume**: boosting raises a glow (an afterglow fading over a few seconds after): the trail
  grows up to 1.6 ship lengths longer with a gentle ripple growing from the engines, brighter and
  fuller, the engines brighter, a few more grains given to it; the chase eye stands back a little
  (up to 2.2).
- **A soft wall bump**: sliding along a wall bleeds a little speed and leans the ship away from it,
  easing back after; never on the autopilot.
- **The hyperboost** (2026-11-13: "a second faster boost, with tab"): **Tab** with Space flies 1.8 times
  the boost, as long as both are held; its
  own glow rises and fades more slowly, the eye stands back further (up to 2.8 more). On a phone, a
  **Hyper** button.
- **The trail along the path** (`lib/city-trail.ts`; "a better boost trail"): the last 1.6 s of
  where the ship actually flew are kept, and a share of its grains (up to 55% of them at full boost,
  more under the hyper) lie along that path, so the trail curves with every turn: two streams from
  the engines drawing together then spreading like a contrail, sparks drifting off and falling,
  cyan cooling to violet with age, a hot white-pink core under the hyper. Not drawn from the cockpit.
- **Depth of field** ("more depth of field"): the player's grains go larger and dimmer by the same
  measure the further they are behind the distance in focus (the ship, or 45 ahead from the
  cockpit) and when very near the eye, so they soften without adding light; the softening grows
  under the boost and the hyper, and fades out climbing to the plan (none in space).
- **Seeing far, more grains** (2026-11-14: "improve density for the City videogame and visibility
  so buildings can be seen in the distance"). The view reaches 340 in the street (was 160),
  opening as you climb to 1,300 (was 1,000), and tower walls are gathered out to 420 (were only
  160); beyond, from high up, the plan draws the city. Grains stay as dense near the eye as before
  (they are dealt by the old reach), the far towers more sparsely. Once you fly, the player's fade
  reaches 460 (was 260, which the other pieces keep). The City draws 13,000 grains on a computer
  and 6,500 on a phone (the other worlds 9,000 and 5,200): each thousand costs about 0.6 ms of a
  frame's 16.7, the wider view about 3%.
- **Ring portals, forgiving** ("boost rings don't work for going to space"): a run counts flown
  either way (big ring first, or small first), a ring missed here and there is forgiven (the last
  must be flown), and flying at a portal within about 45° of its way, the ship eases sideways
  toward the next ring's middle (up to 110 ahead, within twice its radius), so a run can be flown
  without threading each ring by hand.
- **Through a portal** the glow flares and the camera comes along at once, so the jump never snaps
  the view.

### Races (`lib/city-race.ts`)

Tracks are data, one per quarter: `{ district, name, full, start, gates, bars }`.

| Track | District | State |
|-------|----------|-------|
| **Lantern Loop** | Chinatown: from the race plaza down a side street, across under the lanterns, up the avenue, back to the plaza; thirteen moon gates; five diagonal bars, two turning | **Full** |
| **Undercity Run** | The Canals: down into one canal, along it under its pulsing arches, up and over, back along the next; eleven gates, two bars | **Full** |
| Sky Island Loop | Round the platform station high over the Canals, through its deck, round its mast | Draft (gates only) |
| Diwali Run, Minaret Slalom, Stair Climb, Greenhouse Glide, Pyramid Circuit | Indian quarter, Istanbul, temples, domes, Egypt | Drafts (gates only) |

Fly into a full track's start (within 12) and the count beside the bar asks quietly: "Lantern Loop ·
Start the race? Enter". Enter (or Go) starts a 3, 2, 1 (the ship held on the start, facing the
first gate), then three rivals race you along the course (a smooth line through the gates) at their
own paces. Pass the gates in order (the next one brighter, the passed ones dim); a gate out of order
does not count. A bar touched slows you to a third for a second, never more. The finish shows your
place and time and the best time, kept on the device (`localStorage`, never failing where there is
none); a win lights the district from above. Esc, or straying 70 from the course, calls it off
("Race off").

### Acceptance (round three)

- The plan is the same every time and repeats every tile; every district appears; every landmark
  stands on its open plaza; towers stay out of the avenue, streets six or more.
- You never fly into a tower or under the floor (the street, or a canal's bed); you can fly through
  a tower's tunnel and down a canal.
- Space and W together climb past the towers' sky into the stratosphere (over 400 within 16
  seconds); the eye then stands far back and high, looking down on a lit plan; S brings you back
  under the towers' sky. Without the super boost the ceiling is the towers' sky.
- From the stratosphere the plan shows through the player's fade (nine in ten of its grains at more
  than half their light, their mean shown brightness over 0.3, where it was 0.0002), drawn at
  over eight times the street's grain size, with at least four districts each in its own hue; back
  under the towers' sky the grains are the street's size again. Every other piece keeps the
  journey's fade exactly.
- L toggles slow mode: under 4 a second, the eye above the ship looking down; L again, back to the
  cruise.
- The Ship claims Space, L and Enter (round buttons on a phone: Boost, Look, Go).
- Pulses always run faster than the ship; the metro's rail is a smooth closed curve (no corner
  sharper than 0.07 radians in 1.5) with every carriage hanging exactly under it; every tower it
  passes over is lower than its carriages.
- The race runs idle → prompt → countdown → racing → finished (or cancelled), gates in order,
  rivals at finite places; a bar slows, never stops.
- Every site the game adds, high or low, is at a finite place with a colour of 0 or more; the beat
  never jumps.
- Frame cost, 9000 grains (bun, this machine, offline): about 20–22 ms down the avenue and 22 ms in
  the stratosphere, against 16–19 ms for round two's Ship measured the same way on the same machine
  (round two's 5.4 ms was the build machine): about a fifth more.

### The river and the rain (`lib/city-rain.ts`)

> 2026-11-12: "in the city make a part with rain and rain on the water below. and parts with a
> river."

- **The river** crosses the whole city along x on the street line before tile row 24, between
  the Canals and the Heights and the golden gardens and temples beyond: 24 wide, its water 7 under
  the street between lit embankment walls, lamps every 8 along both banks. The towers on the two
  rows beside it are plain towers standing back from its banks (an embankment walk, the street
  behind them still six or more wide). You can fly down onto it (the floor is 2 over its water) and
  on along it under the bridges.
- **Bridges**: one on every street line, a deck with railings, an arch under each edge springing
  from the walls, lamps on six posts; the avenue's is cable-stayed, two pylons on its middle, eight
  cables fanning from each to the deck, a cyan light climbing each pylon, slowly, on the beat.
- **Wet reflections**: the water is a dark mirror. Every lamp shows again under its surface,
  stretched toward it and wobbling; each arch's reflection closes it into a ring. One blue for the
  water, light flowing slowly downstream over it, leaning violet where it rains (the neon round it).
- **The rain** falls over the Canals and the river beside them (soft at every edge, dry
  everywhere else): streaks of four grains slanting in a slow wind (0.32 along x for every unit
  fallen, 24 a second), pale blue leaning to the Canals' violet, kept in a box round the eye
  (68 across) under the towers' sky, ending where they meet the street or the water. Where they meet
  the water, the river's or a canal's, rings spread and fade (1.7 s each), half of them on the
  river.
- From high up, the river's water is drawn brighter, so the plan shows a blue line across the
  city.
- Frame cost (9,000 grains, bun, this machine, offline, the same run): 8.1 ms at the river in the
  rain against 7.9 ms without the river and rain at the same place; 7.7 against 6.9 in the Canals.

### The business district (`lib/city-business.ts`)

Queued from the user (2026-11-12): "a business district of twisting towers with docks". The
Heights becomes it: every block off the avenue holds a tower of its own design (picked by the
block's number), standing taller toward the plaza (about 60 at the district's edge to over 120
beside the core; the metro still lowers the ones it passes over), each in a box that holds you
and leaves streets of six or more. Drawn as grain meshes (`lib/city-mesh.ts`: a mesh built once in
its own frame, drawn as light sites at a place and size, faces lit by how they face the eye):

| Design | Rule |
|--------|------|
| **Twist** | Square floors 3.4 apart, turning a quarter turn from foot to roof and narrowing by a fifth; its four corners rising as helices, a rim every other floor, two windows a floor on each face; a mast and a light |
| **Setback** | Three tiers (full width to half the height, 0.72 to 0.8, 0.46 to the roof), fins up their faces, a band of windows every floor, each setback's roof edge lit and the first one a garden |
| **Tubes** | Four round shafts on a square, heights 1, 0.82, 0.64 and 0.9 of the tower's, a ring every 4, windows round them, a light on each |
| **Diagrid** | A round tower netted by crossing helices (twelve round, a row every 7), its waist drawn in a little, a window in every diamond, a crown ring tilted over the roof |
| **Blade** | A lens-shaped slab, its roof sloping up to a sharp prow, ribs up its faces, a mast and a light at the prow |

Cyan and white edges over faint glass, warm and cool windows, gold roof edges; every crown light
breathes on the Heights' beat (2). Sky bridges (glass tubes, lights running along the floor) join
tall neighbours across the streets, along x and along z. On the plaza stands the district's
landmark: the Studio's **Armillary** Nova Core at 1.7 times its size, breathing and turning as in
the Studio, its conduits running out along the streets. From above, the Heights reads as before:
every roof a patch of cyan, the core's plaza ringed.

### Docks and rooms (`lib/city-docks.ts`, `lib/city-rooms.ts`, `lib/dot-walker.ts`)

Queued from the user (2026-11-12): "docking the ship and cyberpunk rooms ... with panoramas", and
then: "rooms are places where the dot walker can rest. improve the dot walker to walk across
these."

Four docks every tile, each a small lit room with a pad on its right and a window onto its own
view:

| Dock | Where | Pad | Window | Neon word |
|------|-------|-----|--------|-----------|
| **Avenue lounge** | 52 up a tower beside the avenue | a cantilever reaching out | down the avenue | AVENUE |
| **River lounge** | on the river's south wall | a ring of light | across the water and its rain | RAIN |
| **Street lounge** | low over the street, near the Heights | a helipad (H and edge lights) | down the street, a skylight overhead | LANES |
| **Chinatown lounge** | 40 up, among the lanterns | a garden pad, leaves round its rim | west over the rooftops | TEA |

- **Docking:** bring the ship down onto a pad (within its ring, just above it) and the bar reads
  "Docked — Enter to go inside". On a pad the ship settles and stays put until a flying key moves
  it on.
- **Inside:** Enter puts you in the room as the Dot Walker (the Vegetal's golden figure of dots,
  `lib/dot-walker.ts`), the eye over its shoulder and held inside the walls. W S walk, A D turn,
  Shift runs, Space jumps. Walls, the sofa's back and the corner plants hold it; a step into them
  slides along them.
- **Resting:** standing still on the sofa for a moment, it sits down facing the window, breathing;
  the eye moves behind its head and drifts slowly over the view. Any step stands it up.
- **The panorama is the real city**, drawn from inside the room in true perspective, only through
  the window (and the skylight); the room itself is drawn from the ship's own grains (edges, a
  floor grid, the neon word, strips pulsing on the beat, mullions, sofa, plants, a lamp).
- **Leaving:** Enter again (or Esc) puts you back in the ship on its pad, facing out.

The Dot Walker's steps are smoother than the forest's: pace and turn ease in and out, it slides
along walls rather than stopping dead, and it has a seated pose. The Vegetal uses the same body.

Cost: from a room the city is drawn only out to 90 through the window (with tighter culling and a
lower density cap), about 9 to 12 ms a frame in the bench, against 8 to 10 in flight.

### Embassies of Happiness (`lib/city-embassy.ts`)

Queued from the user (2026-11-12): "Embassies of Happiness with a Shark Simulator cabinet":
several unique buildings with a big glowing "EMBASSY OF HAPPINESS" sign, each with a dock to a big
room holding an arcade cabinet, SHARK SIMULATOR; walking up to it asks "Do you want to take a rest
from the city and play Shark Simulator?", and yes opens the Ocean on its Shark Sim.

Three embassies a tile, each its own design and two hues, on a block of its own away from the metro
and the river:

| Embassy | Where | Design | Hues |
|---------|-------|--------|------|
| **Lotus** | the Golden district, among its parks | a round glass tower in three rings of ten petals opening outward up it, each ring turned half a petal, their light drifting slowly up between the hues | rose, gold |
| **Hanging Gardens** | the Oriental quarter, near the mosque | five terraces widening as they rise, plants along every rim, water falling from tier to tier | turquoise, leaf |
| **Prism** | the Market | a triangular glass prism turning a sixth as it rises round a heart of light breathing on the beat, a round deck and a mast on its roof | violet, white |

- **The sign:** EMBASSY OF / HAPPINESS in light standing on the roof's edge toward the avenue and
  readable from it, in a white frame, a slow wave running along the letters between the two hues.
  The sign shows from as far as the city is drawn; the building itself from 220.
- **The room:** each roof holds a big room (12 by 10, 5 high), a dock like the lounges (its pad
  over the street, "Docked — Enter to go inside"), HAPPINESS in neon on its back wall.
- **The cabinet:** against the room's left wall, SHARK SIMULATOR on its marquee, a blue screen with
  a little shark chasing a gold fish across and back, a red stick and two buttons breathing on the
  beat, a pool of its light on the floor. It stands in the walker's way like the sofa.
- **The question:** walk up to the cabinet and face it, and the words beside the bar ask "Do you
  want to take a rest from the city and play Shark Simulator? Enter: yes". Enter opens
  `/geometry-field/ocean?piece=swim`, the ship left on its pad; walk away and the question goes.
  Enter anywhere else in the room still goes back to the ship.
- **The deep link:** any world's page opens on one piece with `?piece=<step id>`
  (`pieceFromSearch` in the trip player); a link wins over the side the world was last left on.

### Cars on the ground (`lib/city-cars.ts`)

Queued from the user (2026-11-12): "cars on the ground": simple grain cars with head and tail
lights, one colour per road, ready for ground racing later.

- **Roads:** every street line along z carries cars both ways, keeping to the right; the avenue has
  two lanes each way (the outer one faster); every cross street along x carries a few. Each lane
  keeps one pace, so no car runs into the one ahead.
- **One colour a road:** the avenue gold, the streets along z cool (cyan, violet, turquoise,
  magenta, steel), the cross streets warm (amber, rose, saffron, leaf, ivory); neighbours differ.
- **A car:** about sixty grains: its sill, belt line and roof in outline in its road's colour, two
  warm headlights with a faint pool on the street ahead, two red tail lights.
- **Where not:** never on the river (the streets cross it on their bridges), never over the
  Canals' water, never on Chinatown's avenue (a street to walk under the lanterns); they fade out
  round the Street lounge and its helipad.
- **Cost:** only cars within 130 of an eye below the sky lanes (80 over the street), ahead of it,
  are drawn; about 0.2 to 0.4 ms a frame at street level in the bench.
- **Ready for racing:** a car's place is a pure function of its road, way, number and the time
  (`carAt`), so a ground race can read the traffic without stepping it.

### Hyperspace and three solar systems (`lib/city-space.ts`)

Queued from the user (2026-11-12): "ultraboost ring portals high in the sky into hyperspace and
other solar systems": a few portals very high over the city, runs of rings shrinking from big to
small, seen from far; flying through every ring is the ultraboost, into a hyperspace tunnel
(streaking star lines, rings of light pulsing past, a quiet Mach readout), then space with three
solar systems (a star, planets with rings, moons and the glow of an atmosphere, in grains) to fly
between, with portals on to the other systems and back to the City. No cities on the planets.

- **The city's portals:** three a tile (the Avenue, Chinatown and Market Gates), each five rings
  (radius 24 down to 8, 30 apart) at 210 to 240 over the street, above the towers' sky, so you
  reach them with the super boost (Space and W together, then let go of W to hold the height).
  Violet to cyan, a bright knot of light chasing round each ring, a breath on the beat. They show
  from 300 to 400 away from the sky over the towers, and from over a thousand from the
  stratosphere.
- **The ultraboost:** through every ring in order, each within 6 seconds of the last ("Ultraboost ·
  ring 3 of 5" beside the bar as you go); a ring missed, or flown through the wrong way, starts
  the run over.
- **The tunnel (6 seconds):** star lines streaking past round you, longer the faster, violet rings
  rushing by on the beat; the words beside the bar read only "Hyperspace · Mach 27", the number
  climbing quickly, gliding, easing down. You are carried; the keys wait.
- **Space:** out in a system, facing its star, the background near black. W and S climb and dive,
  A and D turn, Shift faster, Space boosts (its bar never drains out here); you fly five times the
  city's pace, and nothing lets you inside a star, planet or moon. Stars all round (a band of the
  galaxy across them), faint dust sliding past to feel the speed, each planet's orbit a faint
  dotted ring to steer by.

| System | Star | Planets |
|--------|------|---------|
| **Aurora** | gold | Cinder (small, red), Maren (blue, an atmosphere, a moon), Hallow (a banded giant, rings, two moons), Rime (ice, an atmosphere) |
| **Tidewell** | blue-white | Vesper (violet, rings), Verdance (green, an atmosphere, two moons), Abyssal (a banded blue giant, an atmosphere) |
| **Ember** | red | Forge (a lava world glowing), Saffron (a banded giant, wide rings, a moon), Hush (small, a moon) |

- Planets are lit from their star (a day side and a dim night side), their far side hidden, their
  rings hidden behind them and dimmed in their shadow; they move round their stars slowly.
- **Gates out there:** in every system a violet-to-cyan run of rings leads on to the next system
  (Aurora, Tidewell, Ember, Aurora again), and a gold run leads home: back through the tunnel and
  out over the city just past the portal you left by, still held high.
- **Cost:** out in space only the system is drawn; about 3 to 5 ms a frame in the bench.

### Richer streets, round four (2026-11-13)

From the user (2026-11-13): "the core buildings of the game city are boring: improve them", "more
tunnels inside buildings, and one that bores through several buildings in a row", "diwali corridor
rope lights", "tunnels below the city you can enter", "stars above the city, the city shining from
above, not black roofs", "make sure the factories etc. are in the city", "windows for some of the
buildings".

- **The twenty in the city (`lib/city-designs.ts`):** the Buildings piece's twenty
  (`lib/city-buildings.ts`, without their walkways) stand on a share of the blocks of the quarter
  they belong to: the Pagoda in Chinatown, the Shikhara and Hanging Gardens in the Indian quarter,
  the Domed Hall and Spiral Library in Istanbul, the Twist, Sky Bridge, Crystal and Sail among the
  Heights' towers, the Twist, Crystal, Cantilever, Sail, Trio and Sky Bridge in the market, the
  Porthole Hall, Ring Stack, Pebbles and Sail on the Canals, the Tree Tower, Great Arch, Spiral
  Library and Hanging Gardens in the gardens, the Sun Stair, Amphitheatre and Great Arch among the
  temples, the Trio, Ring Stack and Cantilever among the factories, the Step Mastaba among the
  pyramids. Each is scaled to fill its block (its plinth within 10.5 of the middle, up to 1.9× the
  Studio's size) and kept under the metro, drawn as a grain mesh in its quarter's colours, lit from
  your eye. They hold you: a box for the towers, a tapering mass for the stair temples, pagoda and
  spire.
- **The Studio's temples, factories and domes** now go through the same meshes (lit from your eye,
  their quarter's colours, 2000 grains a block, 4000 on the landmark plazas), where before they were
  drawn from the Studio's turning eye and read faint.
- **More tunnels through towers:** one tower in five (two in five in the Heights). **The through
  tunnel:** the neon market's column x = 65, blocks 43 to 47 (z 1462 to 1632): five towers on one
  line, each bored at 14 over the street, rings of light running on over the streets between, so
  it reads, and flies, as one tunnel.
- **Rope lights (`lib/city-ropes.ts`):** corridors of ropes from wall to wall across the streets,
  one every 4.2 down the street, each sagging in a catenary a fifth of its span deep, a tiny light
  every half metre: marigold and warm in the Indian quarter (most streets), red and gold in
  Chinatown, turquoise in Istanbul, magenta in the market, warm white now and then elsewhere. A
  slow wave runs along them and down the corridor; never a flash.
- **The Deep Line (`lib/city-under.ts`):** a tunnel 13 wide and 11 tall, 18 under the street. In
  by the ramp in the avenue at z 520 (Indian quarter, under a lit portal and DEEP LINE), down to
  z 460, along under the avenue to z 340, west to x −130, south under Chinatown's west side to
  z 136, east under the avenue to x 130 (a second ramp rises from that crossing to Chinatown's
  avenue at z 76), then north under Istanbul, rising gently, out through the south wall of the
  Canals' first canal (z 612). Rings of light every 3 with the tunnels' pulses, lamps down the
  floor, chevrons down the ramps. The street over it is solid; deep inside, the city overhead is
  out of sight and the camera stays in the tunnel. The map draws it (and the through tunnel)
  dashed in cyan, its two mouths named.
- **Roofs from above (`lib/city-roofs.ts`):** looking down on a plain building, its roof's edge is
  lit all round in its quarter's colour, nine lamps on it, a slow red light on the tall ones, and a
  haze of soft light rising off it; from the plan's height each roof is a 3 × 3 of its colour.
- **Stars:** four in ten of the sky's grains are plain stars now (they were sixty in all), a few
  bright, most faint, each its own slow twinkle.
- **Windows:** a share of the plain buildings (not Chinatown's) wear their quarter's windows in
  place of the city's grid: arched in the Indian, temple and Egyptian quarters, round in Istanbul
  and the domes, a grid of panes in the gardens, canals and factories, ribbon bands in the Heights
  and the market. About six in ten are lit; one in six switches on or off every two to five
  minutes, easing over six seconds.
- **Cost:** everything new is an item for the Ship's renderer, near the eye only (within 160, the
  windows within 120, the tunnel from the street only near its ramps), thinned with distance like
  the rest; the frame's grains are the same pool, so the cost is in building the items (the same
  few milliseconds as before in the bench).

### Signs, posters and gates (`lib/city-font.ts`, `lib/city-signs.ts`)

> 2026-11-13: "check how banner typos can be better." / "work on different typos. pancartes like
> chinatown ones. affiches publicitaires. cool pancartes. japanese doors like those temple doors
> that u must fly through. also think of a cool entry for the game. a first road that is awesome
> (like the chinatown one)."

- **Four faces**, written as bits: `sign` (5 × 7, the plain one), `tall` (4 × 9, M W T V X Y five
  wide: neon and narrow boards), `deco` (the plain one bold, every stroke two wide: the big
  banners and the districts' names), `brush` (the plain one drawn with a 45° nib: hanging
  boards). Letters set by what they hold (I narrower than M), a pair leaving room on every row a
  pixel closer (L T, A T), words five pixels apart. Every letter of a face is distinct (O and 0 by
  the slash, I and 1 by the flag). Punctuation: `. , ' ! ? & : / + · -`.
- **Filled strokes**: a light halfway between every two neighbouring lit pixels (diagonals too),
  so words read as lines from far off.
- **Both sides**: every word sign, the posters and the embassies' sign read from behind too, the
  letters laid the other way so they never read mirrored (the embassy sign read only from the
  avenue's side before).
- **Frames**: big banners (a pixel of 0.4 or more) a quiet frame with three brighter lights at each
  corner; smaller words an underline; hanging boards a frame and a faint backing.
- **Posters** on about one roof in twelve (not Chinatown, not the Green Code quarter): a board on
  the roof's street edge on two legs, an invented brand in `deco` in its district's hue over its
  line in `tall` in white, a gold frame with a soft light going round it once in about seven
  seconds. Brands are our own (GLOWBERRY SODA, ORBIT NOODLES, DRIFT TEA HOUSE, VELVET HOURS, ...).
- **Hanging boards**: a word stacked top to bottom in `brush` on a framed board standing out from
  a wall over the street, facing down it: on about half the market's towers (one side, one or two
  heights) and on the opening road's walls at two or three heights.
- **The SHARK SIMULATOR marquee**: in `tall`, its strokes filled, on a topper as wide as the
  cabinet rising to 3.2 (it was 0.5 high before).

**The opening road.** The Ship now starts 190 short of Chinatown's gate (60 before), at the head of
the avenue's stretch through the Indian band's first six rows: ten temple gates (our own, from the
torii: two round posts leaning in, a lintel swept up at its ends over a lower beam, a strut and
plaque between, two paper lanterns hanging from the beam), one every 18, the route flying under
every lintel; each swells to a warm glow over a second and a half as you pass through it and
stays lit. **WELCOME TO THE CITY OF DREAMS** in `deco`, gold drifting to warm white, framed, hangs
over the cross street just ahead of the start; boards in red, gold and saffron hang over the avenue
from its walls; its roofs carry posters far more often. Then Chinatown's own gate and lanterns.

### The Green Code quarter (`lib/city-code.ts`)

> 2026-11-13: "do a matrix quarter in green".

A mood only: no film names, logos or characters. The seventh band (rows 48–55 of the tile,
z 1632–1904, both sides of the avenue), added at the far end of the plan so every other place keeps
its tile-local spot: you reach it flying on from the market, or back out of Chinatown across the
tile's edge.

- **Towers**: slim and dark (half-widths 6.4–8 by 9–12, 34 to 82 high), holding you like walls.
  Deep green edges, a green rim on the roof, and on the faces turned toward the eye the code:
  columns every 1.25, cells every 1.15, each cell a glyph of two dots (fixed per cell); two streams
  fall down each column at 2 to 3.5 cells a second, a mint head and a twelve-cell trail fading
  smoothly behind it (no cell's light ever changes by more than 0.07 a frame). Budget as the
  business towers': at most 4200 sites a tower, weight 1.25.
- **Streets lit green**: a kerb of green round every tower with a mint lamp every few steps; cars
  there take the green, their lights too; from above its streets are green threads.
- **The data spire** on its plaza (x −78, z 1768 in the tile): a monolith 16 across tapering to 9 at
  150, a point to 162, its edges bright, the code falling down its faces, three square halos sinking
  slowly down it (about seventy seconds each, fading in and out), a beacon breathing on the
  quarter's beat (1/3), a ring and eight lines of light on the plaza. On the map as **Data spire**.
- **WELCOME TO THE GREEN CODE QUARTER** in `deco`, green drifting to mint white, framed, over the
  avenue at both its mouths.
- Green only: everything the game adds there (towers, spire, kerbs, cars, signs) has green its
  strongest channel.

### Rising, hearts, Atlantis and depth (2026-11-13)

"make the rising start rising faster. and do different ones of these", "do different options for the heart", "bring more verticality to atlantis. and it seems to shine too much still or too much glow", "check depth of field for the city".

- **Rising** starts within a second and is all up by a third of the piece. ↑↓ picks how it rises: Heart first, Outside in, Spiral (sector after sector), Ripple (each ring settles with a small overshoot, never a jump) or Bloom (each block on its own beat).
- **The heart** has five on ↑↓, over the same garden, canal and bridges: Open sphere, Golden torus, Lantern (twelve ribs turning a quarter as they rise), Lotus (two tiers of petals, a seed head of florets) and Armillary (three tilted rings turning slowly).
- **Atlantis** gains spires of three drums, each narrower, with porthole rings, a lamp at each step and a slow light on a mast: in the ring of knowledge, rising out of the homes' domes, and beside the nature clusters. They stay below the high submarine loops, and their bounding spheres keep submarines clear. Less bloom (glow 0.6), smaller grains in the close views, buildings lit rather than glowing up close, a softer heart.
- **Depth of field** in the game softens the far city from cruise on, not only under the boost: it starts at 1.35 times the focus distance and ramps over 110.

### Taller landmarks and fireworks (2026-11-14)

> "a lot of landmark buildings are not tall enough. they need to be much bigger like the arch or
> other innovative buildings."
>
> "also add fireworks in some places above the city they pop at random. in the colours of the
> quarter."
>
> "BIG TEMPLES. BIG DOMES. AND NOVA CORES IN THE CITY."
>
> "ALL THE COOL BUILDINGS SERIES MUST BE MUCH BIGGER. MAKE 15 MORE OF THEM AND ADD THEM TO THE CITY."

Our own designs only: no real named building, no other game's look. Everything is grains from a
few primitives (`lib/city-shapes.ts`: lines, rings, spheres, turned surfaces, twisting boxes).

**The landmarks' crowns** (`lib/city-landmarks.ts`). Each landmark keeps its old self as the foot
and gains a tall crown in its quarter's colour, dense enough to read from 300 and more away (1,000
to 3,600 sites, weight 1.6, seen over the towers by probes high on it), breathing on its quarter's
beat; from high up it is lit up to the plan's strength.

| Quarter | Landmark | Was | Now | The crown |
|---------|----------|-----|-----|-----------|
| Chinatown | Pagoda of nine roofs | 64 | **190** | the **lantern tower**: six great lanterns stacked on a gold mast over the nine roofs, each smaller, a warm heart breathing in each |
| Chinatown | Race plaza | 10 | **140** | two great **moon arches** along the plaza's diagonals, crossing at 128 over the crossing, lanterns hung under them, a gold moon where they meet; the race starts under them |
| Indian quarter | Temple of the curved spire | 55 | **138** | a **temple mountain**: four terraces, four great corner spires to 88, an upper spire over the old one |
| Istanbul | Mosque of the four minarets | 51 | **142** | four **great minarets** at the plaza's corners (three balconies, turquoise caps), a stack of three domes on the great dome, and a great **floating ring** at 88–120 turning very slowly, its middle open to fly through |
| The Heights | Nova Core | 24 | **287** | the **sail tower**: two curved blades twisting up from round the Core to a needle, violet rings between them |
| Golden gardens | Golden spire | 199 | 199 | unchanged: it was already the tallest |
| Temple quarter | The Studio's ziggurat | 20 | **161** | a **stair tower**: ten receding terraces on the ziggurat, a stair up every side, a light climbing them (a minute from foot to top) |
| Industrial quarter | The Studio's foundry | 31 | **196** | a **twisting tower** turning a quarter round as it rises from the foundry's roof, furnace light at its foot, slow rings of steam rising off its top |
| Solarpunk domes | The Studio's garden of domes | 9 | **142** | a **stack of five glass domes** on a stalk, plants glowing under each |
| Egyptian quarter | The great pyramid | 36 | **178** | a **floating obelisk** over the apex, a thread of light up to it, three rings drifting slowly round it |
| Green Code quarter | The data spire | 165 | 165 | gains a **cascade of twelve data pillars** spiralling up round it (30 to 140), light falling down their faces |

**Big squares** (`lib/city-big.ts`). Ten open squares, each the four blocks round a crossing in
the landmarks' columns (x ±78), halfway between two landmarks, hold one of the Studio's temples
or domes or a Nova Core, stretched to five to seven times its height and half as wide again (the
Core 0.6 as wide), in its quarter's palette: big temples (Rotunda 98, Ring 97, Lotus 83), big domes
(Geodesic 76, Palm house 92, Bubbles 55) and four Nova Cores (86). No two of a kind are
neighbours, along a column or across the avenue (the landmarks counted). They stand clear of the
metro's rail (the Code quarter's two on row 50, past its loop), the through tunnel, the embassies
and every race course (no gate within 36).

| Row (z) | Left of the avenue | Right of the avenue |
|---------|--------------------|---------------------|
| 8 (272) | Nova Core, saffron | big temple (Ring), turquoise |
| 16 (544) | big dome (Geodesic), cyan | Nova Core, violet |
| 32 (1088) | big temple (Rotunda), steel | Nova Core, leaf |
| 40 (1360) | big dome (Palm house), sand | big temple (Lotus), magenta |
| 50 (1700) | Nova Core, green | big dome (Bubbles), green |

**The Studio's buildings on the blocks**, the "cool buildings series" (temples, factories, domes):
much bigger, stretched to 0.8 across and 3.6 up (they stood at 0.72), so 27 to 79 high over
quarters whose towers stand 12 to 34; drawn out to the whole view (to 420), not only near (from
high up the plan stands for them).

**Fifteen new buildings** (`lib/city-buildings-15.ts`), one or two to every quarter, each on a
block of its own kept open for it (off the avenue, out from under the metro, no race gate within
30, no landmark within 60, never on a big square, never two side by side), slim and tall (125 to
176 high, within 12 of their axis) in their quarter's colour, a lighter and a deeper shade:

| Building | Quarter (block) | High | Form |
|----------|-----------------|------|------|
| Lantern Spindle | Chinatown (5, 1) | 156 | seven six-sided lanterns threaded up a gold spindle |
| Lotus Stair | Indian quarter (−2, 10) | 144 | twelve petal terraces turning up round a column |
| Crescent Needle | Istanbul (1, 14) | 162 | a tapering needle, three crescents standing round it, each turned |
| Helix Exchange | The Heights (−5, 18) | 176 | two strands winding up, rungs between them |
| Lily Bell | The Canals (2, 18) | 132 | a slim stem opening into a tall flared cup, water light at its foot |
| Hourglass Tower | The Canals (4, 17) | 155 | straight lines between two turned rings make its waist |
| Sunleaf Column | Golden gardens (−5, 26) | 150 | leaves fanning out at nine levels, a gold sun on top |
| Halo Stack | Golden gardens (−2, 29) | 145 | seven tilted halos round a slender column, turning slowly |
| Ivory Echo | Temple quarter (2, 25) | 157 | square frames rising, each smaller and turned a step more |
| Cog Tower | Industrial quarter (−2, 33) | 152 | nine gears on a shaft, turning very slowly, each the other way |
| Vertebra Tower | Industrial quarter (−5, 39) | 155 | discs stacked up a spine swaying in a gentle S |
| Seed Pod | Solarpunk domes (1, 37) | 145 | four tall lattice pods up a stalk, a glowing seed in each |
| Sunboat Mast | Egyptian quarter (−6, 44) | 161 | a tapering mast carrying a crescent boat and a sun |
| Neon Prism | Neon market (4, 45) | 158 | a triangular tower twisting a third round as it rises |
| Cascade Monolith | Green Code quarter (5, 53) | 150 | six slabs stacked and set back, light falling down them |

Each is 900 to 2,200 sites (weight 1.5), drawn out to the whole view, seen over the towers by
probes high on it.

**Flying through.** All of it is light, as the Studio's other additions are: the plazas, the big
squares and the fifteen's blocks are open ground (no tower, nothing holds the Ship), so you fly
through every crown and new building, under the moon arches and through the floating ring.
Nothing reaches the avenue (every crown, square and new building stands 25 and more off it), so the autopilot's route and the race courses are untouched (tested).

**Fireworks** (`lib/city-fireworks.ts`). Over every landmark and big square, the three canals and
either side of the river (26 places a tile; the Ship's game has no canyon, so the river stands in
for it), each place has its own slot every 9 to 15 seconds, and about half the slots fire, so from
anywhere a burst goes up every few seconds within sight. Random but only from the time and the
place's number: the same moment always shows the same bursts.

- A shell (six faint warm grains) rises 1.6 s from 100 over the street, slowing, to its height: never
  under 200 over the street, at least 60 over the tallest thing at its place, never over 390
  (the stratosphere is at 520).
- It blooms into a **sphere** (sparks evenly round) or a **peony** (unevenly, fuller) of 140
  sparks, each with a fainter grain behind it as its trail, 18 to 30 across; the sparks fly out,
  slowing, and fall gently (2.6 s² a unit), fading over 2.2 to 3 s.
- In its quarter's colours: the quarter's colour, a lighter shade (toward warm white, never
  white) and a deeper one.
- **Mellow**: it blooms in over 0.4 s (no step of more than 0.08 a frame), fades to dark by its
  end; each spark is a grain no brighter than a lit window (0.5), so nothing lights the screen.
- Budget: at most the 8 nearest bursts within sight are drawn, 286 sites each (weight 1.6, as
  the lanterns), in the same grain pool as everything else; from the cockpit they show too.

### Still rough, and next

- The Studio's domes, minarets and spires on the box towers are light: you fly through them (the
  towers, pyramids, the twenty and the code towers hold you). Sky bridges and the metro are light
  too. So are the landmarks' tall crowns, the big squares, the fifteen new buildings and the
  Studio's buildings on the blocks (2026-11-14).
- The Canals and the Neon market still have no landmark of their own; the big squares are only in
  the landmarks' columns; the Studio's meshes are stretched upward rather than redrawn tall.
- The Deep Line has no race of its own yet (the tracks are one a quarter), and no side branches.
- The Green Code quarter's towers have no tunnels, docks or race; the code's glyphs do not change.
- The opening road's boards and gates are only on the Ship's first stretch; Chinatown's avenue
  keeps its own signs.
- Sky lanterns and portals are only near the avenue; the Sky Island Loop and four other tracks are
  drafts (gates only); the sky island itself is the platform station, still small.
- Traffic does not yet move in platoons on the beat; the beat does not yet travel out from a heart
  (the Nova Cores, another round).
- Docks are the four lounges and the embassies' rooms; the business towers have none of their own yet.
- Cars do not yet stop at crossings or react to the ship; no ground race yet.
- Space has no race, no other ships and no landing; the cockpit gauges still read the city's
  height out there.

## Ships, cockpits and the map (2026-11-12)

> "add a cool 2d city map that can turn into 3d city map that u can spin in air to see (M for map)
> or in menu for those on the phone. can be a bit simplified so it doesn't show full city in detail
> but captures the map etc... also do a few different spaceships with different cool spaceship
> cockpit instruments that u see on ur screen. height speed. play with different types of
> displays, and option to have no displays always possible, can be chosen in menu. and a pov view
> from inside the cockpit when u drive ur spaceship."

All on the Game side (the Ship), through the shared player's generic game hooks (art-journey.md,
**Cockpit displays, game rows and a game's panel**): nothing in the player names the City.

**Ships** (`lib/city-ships.ts`). Four of our own, each of grains like the first (the film is a mood
only; no ship copied). Chosen in the Design menu's **Ship** row; remembered on the device
(`colourmap:city-ship`, read and written in try/catch).

| Ship | Shape | Handling (pace · turn · boost · climb, the Arrow = 1) | Its displays |
|------|-------|--------------------------------------------------------|--------------|
| **Arrow** | the first ship: a flat arrowhead, a raised spine, two engines | 1 · 1 · 1 · 1 | Dials |
| **Manta** | a wide ray's wing bowing to its tips, a thin tail, two engines, violet glow | 0.9 · 1.3 · 0.9 · 1.2 | Lines |
| **Ring racer** | a pointed pod inside a ring standing across its way, four struts, one engine, gold glow | 1.25 · 0.85 · 1.2 · 0.9 | Holo |
| **Hauler** | a long box frame with ribs, a rounded cab, four engines, amber glow | 0.75 · 0.7 · 0.8 · 0.7 | Segments |

Pace scales the cruise, Faster, Slower and the boost; boost scales the boost on top; turn the
turn rate; climb the climb and dive. The autopilot's route (the Journey, before anyone steers)
keeps its own steady pace, so it stays the same for the same moment.

**Instruments** (`lib/city.ts` `gauges`): Height, Speed (its range grows with the ship's boost),
a **Heading** compass (0 up the avenue, round to the right) and the **District** you are in.
Four styles (components/Gauges.tsx): **Dials** (round dials, a gold needle; the compass a rose
turning under a fixed mark), **Lines** (a minimal stack of hairline bars, the heading a sliding
tape), **Holo** (open arcs of soft warm light, the heading a bead riding the arc) and
**Segments** (a retro amber read-out of ten cells and digits). The **Displays** row: *Ship's own*
(the default), any one style for every ship, or **None**, which hides every instrument (the bar
and the race words stay). Remembered (`colourmap:city-display`).

**Cockpit view.** **V** (a round **View** button on a phone; the **View** row, Chase · Cockpit,
in the Design menu; remembered as `colourmap:city-view`) moves the eye from behind the ship to the
pilot's seat: just behind the nose and over the spine, looking on ahead; the horizon leans with
the bank (six tenths of it, so a turn reads without the world spinning); slow mode tips the gaze
down at the city. Your own hull is not drawn there; instead each ship's **canopy** sits at the
edges of the screen as a light overlay (`lib/city-cockpit.ts` `CANOPIES`, components/CityCockpit.tsx):
the Arrow two slim struts and a straight sill, the Manta a wide low bubble, the Ring racer a round
porthole, the Hauler a square windscreen in three panes. The canopy stays put while the world
leans, as it would around you; the middle of the view stays clear.

**The map** (`lib/city-minimap.ts`, components/CityDreamsMap.tsx). **M** on the Game side (the
Design menu then answers to **N**; in the Studio M stays the Design menu), the **Map** button in
the Design menu, or the small **Map** pill above the round buttons on a phone. A simplified plan of
one tile of the city from the game's plan data: each district a patch of its colour with its name,
one block per plot (its tower's footprint and height; pyramids as pyramids; parks and plazas flat),
the avenue pale, the main roads (the avenue's edges, the tile's edges, the bands' edges) in gold,
the side streets faint, every landmark named on a ringed dot, the race starts as diamonds with
their tracks' names, the metro's loop dashed in pale rose with its four stations, the portals, the
WELCOME panel, and your ship as a gold pointer breathing softly, the way you fly. **2D · 3D**:
the plan tilts into extruded blocks (a little taller than life, the metro raised to its height,
places on stems); drag spins and tips it (pans it when flat), the wheel or a pinch zooms, **Fit**
brings the whole city back. Flat, it fits the long way up a tall screen and across a wide one.
3D opens framed (polish, 2026-11-13: "3D map opens tiny in the middle of the screen"): tilted
0.9, turned off the city's long axis by whichever angle (0.3 to 0.9) lets it fill the screen
best, then zoomed and shifted until the projected box round the whole tile (its ground and tall
towers) fills four fifths of the screen, centred; switching 2D and 3D eases between the two
homes. **Names never pile up**: they are laid out greedily, districts first, then landmarks,
race starts and the rest, nearer first within each; a name that would touch one already placed
(or leave the screen) waits, and shows as you zoom in or when the pointer comes within 26 px of
it. In 3D the far names fade (four tenths to full by depth). Time
stands still while it is open (the player holds the last picture); **M**, **Esc** or ✕ closes it.
The Dawn sky behind, gold lines, district hues. Canvas 2D, redrawn only when the view changes or
about ten times a second for the pointer. New parts of the city add places by appending to
`MAP_EXTRAS` (the docks and embassies are there now).

**Keys** (Ship, Game side): V cockpit view, M map, N Design menu; the rest as before.

**Acceptance (ships, cockpits, map)**

- The map's data comes from the plan and is the same every time; every district, one block per
  plot, every landmark and race start; the metro a closed loop; flat from above, raised when tilted.
- Four ships; the Ring racer cruises fastest and the Hauler slowest, the Manta turns furthest in a
  second; every ship's grains finite and close round it.
- The Displays choice is remembered; None hides every instrument; each style draws every gauge and
  takes new readings each frame without re-rendering.
- V moves the eye to within 1 of the ship and back to the chase; holding V does not flicker; the
  cockpit view banks in a turn.
- M on the game opens the map and holds time; Esc, M or its close shut it; in the Studio M is the
  Design menu.
- 3D opens with the tile's projected box filling 0.8 of the screen (±0.03), centred, turned off
  its long axis, at least 0.4 of the screen both ways (1536 × 640, 390 × 844, 1024 × 768). No two
  names shown overlap, flat or in 3D; a hidden name shows with the pointer on it.
- The Ring racer's porthole stays round on any screen; on a short landscape phone the round
  buttons sit two by two.

**Canopy and phone** (polish, 2026-11-13). The Ring racer's canopy is `round`: fitted inside the
screen (`xMidYMid meet`), its porthole a circle, its frame running on far past the box so the
sides are filled, not stretched; the other canopies still stretch to the screen. On a short
landscape phone (at most 520 high) the round buttons (Boost, Look, Go, View) sit two by two and a
little smaller, the pace pills above them.

**Map and game polish** (2026-11-13). The map shows every dock's pad (an H in a ring) and every
Embassy of Happiness (a small triangle), named after the race starts. On a touch screen a tap
shows the name under the finger for 3 s (the footer says "tap a place for its name"). A quiet
"You · 52 m" (your height) sits beside your pointer where no name is in the way. A district
whose race you won is drawn brighter, edged in gold. The Game side has its own hint, once per
world: "W A S D fly · Space boost · M map · Esc lets go" (on a phone "Stick to fly · Boost · Map
above the buttons"). Letting go says "Autopilot" for 3 s. Coming in to a pad (within 30, no more
than 12 over or under) its rim lights brighten and the words say "<lounge> · land on the pad".
A room's controls are spelled out in the first room on the device; after that only its name, for
3 s. Cars dip their lights as the ship passes low over them (dark within 5, full again by 10).
On a phone the bar and its words sit up under the step, the words cut short instead of wrapping.

**Still rough.** The map shows one tile (the city repeats every way).

## Game · Studio, and the phone

(2026-11-12; the shared player, [art-journey.md](art-journey.md#design-menu-game--studio-phone-controls-2026-11-12).)
Every control sits in the **Design** menu. The Ship is the **Game** side, every other piece the
**Studio** (found by `game.has`, so new pieces join the Studio on their own); the page reopens
on the side last used. On a phone the Ship has a stick (turn, climb, dive) and a round
**Boost** button (Space), with **Look** (L) and **Go** (Enter) beside it.

In the Studio ↑ / ↓ (or a flick up and down on a phone, or the small ˄ ˅ by the name) go
through the current piece's variants and ← / → (a sideways flick, the small ‹ ›) through the
pieces; the name reads e.g. "Domes · Dome complex" (art-journey.md, **Studio navigation**).

## Words

Each piece has a line saying what you see and two lines of its own on cities,
light and travel: a city built one floor at a time; lights making one slow
river; light as how a city speaks after dark; smaller cities kept inside a
city; a bridge as a promise, a dock as somewhere to arrive and leave; the sky
between walls becoming a road; a window waiting for you somewhere. The golden
pieces' words are about a city drawn from one number, every road leading to a
centre that belongs to everyone, hope rising from the centre outward, simple
rules making calm buildings, making as hope you can hold, and gardens keeping
their summer under glass.

## Acceptance

- `/geometry-field/city` opens on Golden plan alone, looping; the name pills pick any piece, which
  starts with no ball of stars; Space pauses (in Ship, Space boosts while you steer).
- The pills read Stars · Geometry · Tunnels · Oils · Big Bang · Journey · Vegetal · Ocean · City ·
  Experiment, on the Art panel and the trip pages.
- **Journey** plays the seventeen pieces as one trip and loops; each piece opens as a wide ball of
  faint stars and every grain pours into the next piece with no cut.
- Golden city: the land rings and the canals each grow by φ, edge to edge; twelve boulevards; the
  plan lies flat on the ground, the heart lit first and the ring of nature last, brighter toward
  the heart. Rising starts flat (under 0.5 above the ground) and ends with the knowledge towers about
  1.2·φ⁶ high, the living terraces no higher than 1.2·φ³ and nature under 3; the eye goes from nearly
  straight above to an oblique view. The heart's sphere is a lattice (most grains near it lie on its
  shell) above the garden; a frame apart no colour moves by more than 0.05.
- Temples (8 pills), Factories (10) and Domes (7) run from the single buildings to group, complex
  and quarter; every pill stands on the ground (no grain below it), within 40 of the centre times
  how far its eye stands back, most grains lit, no two alike; the quarter is seen from further
  back than the complex, the complex than the building; the stated ratios hold (pyramid height² =
  φ · half-base², ziggurat and bubbles by φ, workshops by φ^(1/4), mirror rings by √φ).
- Golden plan: eleven pills (Golden and the ten plans), each flat (under 3.5 above the ground),
  reaching 40 to 65 out, finite, the same every time, no two alike.
- Nova Cores: eight pills, each its own, on the ground, many grains on the core, lit energy on the
  conduits far out, a frame apart no colour moving more than 0.05; `novaCore` placed elsewhere is
  still, scaled and on the ground.
- Palettes: the golden pieces offer Gold, Rose gold, White marble & gold, Night neon gold; the
  factories Gold, Rust, Steel blue-grey, Night neon gold; the neon pieces none; a preset changes
  the colours (Rust less green than Gold), the Journey and unknown presets fall back to gold.
- From above: five cities on pills, each distinct; all grains on the plane; denser and brighter in
  the centre than at the edge; no block or centre light on the water; car lights move; the same
  city every time.
- Every piece keeps the fixed grain budget (9,000, or 5,200 on small screens). Frame cost, 9,000
  grains (bun, the build machine, offline): Golden plan 12 ms, Rising 9, The heart 8, temples,
  factories and domes 5–7, From above 8–11, against 5–9 for the neon pieces in the same run.
- Towers rise from the ground, the middle first; flat at the start, above 10 by a twentieth of the
  way in, every tower up by 0.36; no grain goes below the ground. Seen from a side, a tower's
  faces toward the eye carry over 4 times the grains of those turned away.
- No ship in the sky lanes is ever inside a tower; lanes run both ways at four heights, every lane
  at least 6.5 a second, ships lit from the first moment.
- Frame cost of the new pills (9,000 grains, bun, the build machine under load from other work, so
  compare within the run): golden pills, the ten plans, the Nova Cores and every rung 20–29 ms,
  against 22–25 ms for Towers, Sky lanes and The heart in the same run; Golden plan 39 ms, as
  before the heaviest.
- Neon colours never jump: a frame apart, a light's colour moves by under a hundredth.
- Chinatown (2026-11-12: "add chinese signs on side of buildings. or japanese. like that cyberpunk
  asian mood. so we can create a chinatown in the city."): tall signs hang on the towers' street
  walls, inside each tower's length and below its roof; every glyph grain lands on a lit pixel of a
  real character; signs flicker very gently (never more than 0.02 a frame, never below 0.45), with a
  soft dip now and then; red lanterns hang across the street inside its walls; a gate with 中華街
  stands at its mouth. Some signs show in the Canyon and the Ship too.
- Ships rest on a dock's deck a while, still, between arriving and leaving.
- Atlantis comes after From above, with five views on pills (Plan, Domes, Coral gardens, The heart,
  Harbour); each is finite, mostly lit and the same at the same moment, seen from its own place. The
  Plan looks from nearly straight above; the canals are sunk, the rim rises. Domes of many sizes
  (knowledge, making, garden, homes, small domes, airlocks); coral grows inside the garden domes.
  Every submarine stays on its lane, clear of every dome and above the floor, in its lane's colour
  (one per lane, all different); bubbles rise as they age, leave from the stern, and are faint where
  they come round. Harbour submarines rest still at their berth. A frame apart no colour moves by
  0.05; in The heart, plenty of grains sit on the temple's sphere.
- In the Canyon every tower grain stays within the stretch of street round the eye however far it
  has flown; ships pass above and below the eye, both ways.
- Ship: it takes over from the autopilot where it is; A turns left and D right; W climbs, S dives;
  E speeds up, Q slows; Space boosts until the bar runs dry, then the pace falls back, and cruising
  fills the bar again; it never flies into a tower, through the ground, or past the towers' sky unless super boosting (Space with W) into the
  stratosphere; two dials
  read height and speed.
- The same moment always gives the same picture.
- No new dependencies.

## Next components

For the long-term fly-through of a future neon city:

1. **Free flight in the canyon:** begun in Ship, round two; still to come: traffic you weave
   through, and near misses that ruffle the trail.
2. **Districts:** begun in Ship, round three (eleven districts round their landmarks); still to
   come: a harbour of docks, a business heart of twisting towers, a river under rain.
3. **Layers of the city:** begun in round three (canals, tunnels, sky bridges, the metro, the
   stratosphere); still to come: gardens on the roofs and rooms to dock at.
4. **Traffic that turns:** ships changing lanes and turning at crossings, the Cell's pulses again,
   and a landing you can make on a dock.
5. **Weather:** slow rain streaks that catch the neon, mist that softens the far towers.
6. **Signs that speak:** more words, and signs the user writes, rasterised the same way.
7. **Arrival:** a sky-port at the edge of the city where the flight begins and ends.
