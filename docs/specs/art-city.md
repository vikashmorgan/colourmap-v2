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
| 18 | Ship | A game, keys only, as the Shark Sim: you pilot a small ship (a flat arrowhead, a raised spine, two cyan engines streaming light) down an endless avenue of solid, lit towers, with side streets to turn into; the avenue runs through the districts of the City of Dreams, Chinatown first (see **Ship, round two** and **Ship, round three**). **A** / **D** turn (the ship banks into the turn), **W** / **S** climb and dive, **E** faster, **Q** or X slower, **Space** boosts to three times the cruise or more, for as long as it is held, and **Shift** is the double boost, twice the Space boost's pace (2026-11-14); **Space** with **W** climbs on into the stratosphere; **L** slows to look down; **Enter** starts a race at its start. Towers' walls hold you: you slide along them. Traffic above and below you. Two dials read height and speed. With no one at the controls (the Journey, or before you steer) the ship flies down the avenue; let go with Esc and it carries on from where you were, back to the avenue | Behind the ship and a little above, looking past it |

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
- **Ring of nature**: reefs in five sectors, kelp meadows in the others, and two clusters of
  three domes (large, middle, small) on the free diagonals, joined to each other and to the
  boulevard's end (there were three; two gave way to the dome complexes, 2026-11-14).
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

A tile of 12 blocks across and 56 along (312 × 1904; 48 and 1632 before the Matrix quarter),
repeating every way so the city never ends. The avenue runs down its middle; seven bands of eight
blocks lie along it, a district each side:

| Band | Left of the avenue | Right of the avenue |
|------|--------------------|---------------------|
| 0 | **Chinatown**: lower towers with Chinese roofs (eaves turned up at two floors, a three-roofed pagoda on top), red and gold; tall signs at three heights on both street walls of every tower, on every street; red lanterns strung across the side streets at three heights and across the avenue high up; sky lanterns rising; landmark the **Pagoda of nine roofs** | **Chinatown** too: the **race plaza** (a ring of moon gates, a RACE sign), start of the Lantern Loop |
| 1 | **Indian quarter**: low towers crowned by curved temple spires (shikhara: ribs and rings up the curve, a flat stone ring and finial) or four chhatris; Diwali lamps strung across the streets at three heights, twinkling slowly; landmark the **Temple of the curved spire** (a tall shikhara, four small ones, a chhatri, stepped plinth) | **Istanbul**: towers with domes and slender minarets; landmark the **Mosque of the four minarets** (square hall, great dome on its drum with sixteen ribs, four half domes, four minarets with balconies) |
| 2 | **The Heights**: tall towers (70–128), sky bridges between them at the height both reach (upper streets between the tops), more tunnels; over the avenue a long **tube** whose rings pulse ahead of you, and two **portals** | **The Canals**: the undercity: three cross streets are canals 14 deep under the street, their walls lit with pipes and lamps, water shimmering, arches of pulsing light over them so each reads as a tunnel; you can fly down into them |
| 3 | **Golden gardens**: golden towers, golden domes, parks of golden trees (gold-leaf crowns shimmering); landmark the **golden spire** (190 high, rings of light, an open sphere of light on top, eight golden trees round it), seen from everywhere | **Temple quarter**: the Studio's temples (lib/golden-buildings.ts, read-only) on blocks; landmark the Studio's **ziggurat**, stairs on every side, 1.7 times its Studio size |
| 4 | **Industrial quarter**: two of the Studio's works on blocks (the rest stand singly through the city, below); landmark the Studio's **foundry**, its chimneys breathing steam | **Solarpunk domes**: the Studio's glasshouses and parks of golden trees; landmark the Studio's **garden of domes** |
| 5 | **Egyptian quarter**: pyramids on the blocks (the golden slope, courses marked, a light at every apex; they hold you like walls, on their slope), obelisks on the avenue's low towers; landmark the **great pyramid** with a lying sphinx-like figure and two obelisks (our own simple shapes) | **Neon market**: word signs in a small Latin pixel font (BANK, BAR, HOTEL, CAFE, NOODLES, CINEMA, TEA, DREAMS) |
| 6 | **Matrix quarter** (both sides, below): dark towers with code falling down their faces; landmark the **data spire** | **Matrix quarter** too |

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
| [ / ] | **hop** to the quarter before or after, at its start (below; no phone button: a phone taps the map) |

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
- **No sentences while you fly** (2026-11-14: "no sentences and quotes while we fly in the city,
  it just takes space"): while the Ship is played, its quotes and its line under the name are
  hidden (the game's `wordless`); the Journey and the Studio pieces keep theirs.
- **Seeing far, more grains** (2026-11-14: "improve density for the City videogame and visibility
  so buildings can be seen in the distance"). The view reaches 340 in the street (was 160),
  opening as you climb to 1,300 (was 1,000), and tower walls are gathered out to 420 (were only
  160); beyond, from high up, the plan draws the city. Grains stay as dense near the eye as before
  (they are dealt by the old reach), the far towers more sparsely. Once you fly, the player's fade
  reaches 460 (was 260, which the other pieces keep). The City draws 13,000 grains on a computer
  and 6,500 on a phone (the other worlds 9,000 and 5,200): each thousand costs about 0.6 ms of a
  frame's 16.7, the wider view about 3%.
- **Further on a computer** (2026-11-14: "make much more visibility for computer"). The City
  knows whether it runs on a computer or a phone by the trip player's own rule for its grains (a
  screen under 700 wide is a phone): components/City.tsx calls `setCityQuality('large' | 'small')`
  (lib/city-game.ts), a phone until told (so the tests see the phone's). A phone keeps every number
  above. A computer sees **520** in the street (`STREET_VIEW_LARGE`, opening as you climb to the same
  1,300), gathers tower walls out to **640** (`TOWER_SIGHT_LARGE`, lib/city.ts), and the flown
  Ship's fade reaches **680** (`SHIP_FAR_LARGE`); it draws **15,000** grains (was 13,000). Near
  detail is as fine as before: grains are still dealt densely only out to the old reach (`dreach`,
  160 in the street), the far towers sparsely. Faces beyond what a phone sees in the street (340)
  are checked for being hidden at four points instead of twelve (each look along the streets out
  there is long, and the face gets few grains), so the longer view itself costs next to nothing.
  Measured (a throwaway bench: `setFly` + `pieceCamera` + `pieceAt` over every grain, 120 frames,
  four runs, this machine): on the avenue in the Heights 13.0 ms a frame for today's 13,000 with the
  phone's view, **15.3 ms** for 15,000 with the computer's, 16.1 ms for 16,000; at roof height in
  the golden gardens (a quarter's start, more city in sight) 16.5, 20.0 and 21.0. 16,000 went past
  the ~15 ms line on the avenue, so 15,000 it is.
- **Ring portals, forgiving** ("boost rings don't work for going to space"): a run counts flown
  either way (big ring first, or small first), a ring missed here and there is forgiven (the last
  must be flown), and flying at a portal within about 45° of its way, the ship eases sideways
  toward the next ring's middle (up to 110 ahead, within twice its radius), so a run can be flown
  without threading each ring by hand.
- **Through a portal** the glow flares and the camera comes along at once, so the jump never snaps
  the view.

### Quarter starts and fast travel (`lib/city-travel.ts`, 2026-11-14)

> "ability to go to main street or main starting point of each quarter. so there is a special road
> on each quarter that has a great view etc..." and "from map i can click to the diff spots and
> fast travel."

**A start in every quarter** (`QUARTER_STARTS`, in the plan's order down the avenue). Each stands
over a street at about roof height (**GROUND + 50**, raised further only if a wall were there, by
the collision's own `blocked`), facing down its road toward the quarter's view:

- a quarter with a landmark (Chinatown's pagoda, the Indian temple, Istanbul's mosque, the Nova Core
  of the Heights, the golden spire, the ziggurat, the foundry, the garden of domes, the great
  pyramid, the data spire): on the street through the landmark's plaza, six short of the band's far
  edge, the landmark straight ahead some 130 away, the quarter's towers walling the road;
- **the Canals**: over the middle canal, in from the tile's edge, looking along it to the avenue;
- **the Neon market**: inside the Neon Canyon near the foot of its long run, looking up between
  its walls to the bend.

Every start is in its own quarter, clear of every wall (and so in every copy of the tile), and the
road ahead of it is open at its height. Positions are tile-local; a trip goes to the copy nearest
the ship.

**Fast travel from the map.** In the map (M), a tap or click on a quarter's name, or a place's
(a landmark, a race start, a pad, an embassy, the Neon Canyon, the WELCOME panel), flies there: a
quarter's name to its start; a landmark or the Neon Canyon to the start that looks at it; any other
place to a clear point some 60 back from it along a street, a little over its height, facing it.
With a mouse, a click anywhere on a quarter's ground goes to its start too; on a touch screen a
tap on bare ground still shows the names near it (as before), and a tap on a name flies. A drag
still pans or spins; only a lift within 8 px of where it came down counts. The sheet closes, the
controls come back (piloted, even if you had let go), and the ship is carried there in **0.6 to 1
s** (longer the further), its heading easing round, over a gentle arc above the roofs on a long
trip (up to 80, a little of the plan glimpsed on the way), the plume glowing; no flash, no cut.
Leaving a room, space or a race first. One quiet line in the map says so: "Tap a quarter to fly
there".

**Hops while flying.** **[** and **]** fly to the start of the quarter before or after the one you
are in, round the plan's order (the Matrix quarter's next is Chinatown), the same short trip. Neither
key was taken; they get no phone button (a phone taps the map).

**Acceptance (quarter starts and fast travel)**

- Twelve starts, one per quarter, each inside its quarter, over GROUND + 30, not blocked here or
  in a far copy, facing its view (a landmark, the avenue, the canyon's bend) more than 100 away,
  the road there open at its height.
- After a trip the ship is within 3 of the start's nearest copy, clear, piloted, facing its way,
  in at most a second; no frame moves it more than 60.
- [ and ] hop to the next and the previous quarter.
- On the map a tap on any shown name travels to that name's quarter or place; a mouse click on a
  quarter's ground travels to it; a finger on bare ground does not.
- A phone keeps 340, 420, 460 and 6,500 grains; a computer sees 520, gathers to 640, fades at 680
  and draws 15,000.

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
  A and D turn, E faster, Space boosts and Shift boosts twice as fast (its bar never drains out here); you fly five times the
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
- **Posters** on about one roof in twelve (not Chinatown, not the Matrix quarter): a board on
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

### Chinatown higher, and the city's names (2026-11-13)

> "make chinatown higher with many levels. i like how it is becoming devlopped. also u can put
> more banners liek city of dreams. city of hope etc...all around the city."

- **Chinatown, many levels** (`lib/city-game.ts`): its towers now stand 30–58 (the avenue's 30–52;
  22–38 before), about one in six off the avenue a **tall tiered tower** of 74–104; all still
  under the metro and under the Chinatown lounge's pad. Storey on storey, one every 6.5 or so,
  each with its own eave flaring past the walls, corners swept up, every other one further out
  over a red fascia; every other storey a balcony rail along both street walls and a lantern
  under each eave corner; a crown of three roofs on top (five and a ringed spire on the tall
  towers). **Covered walkways** cross the side streets between towers at 20, 32, 44, 57 and 70
  (about half the heights both walls reach; never over the avenue; light, as the sky bridges).
  The tall signs climb with them (five levels on towers over 46), the lantern strings too (side
  streets to 38 and 50, the avenue to 46). Collision is the towers' boxes at their new heights;
  the avenue, its gates and the opening road stay open.
- **The city's names** (`CITY_NAMES`, `nameBanner` in `lib/city-signs.ts`; `cityBanners` in
  `lib/city-game.ts`): CITY OF DREAMS, HOPE, LIGHT, PEACE, LOVE, JOY and FRIENDS, about twenty a
  tile, framed like the welcome, each in its district's colour drifting slowly to a second hue:
  over the avenue at the mouths of the Heights (LIGHT), the Golden gardens (PEACE) and the
  Studio's band (FRIENDS), and high over it in the middle of the Heights (DREAMS) and the Studio's
  band (JOY), all above the lanes you cruise in; over the roofs at the tile's two edges (FRIENDS
  by Chinatown, HOPE, LOVE, DREAMS, JOY, LIGHT in the Matrix quarter); on a roof near the
  avenue in seven quiet districts; and high on the street face of every tall tiered tower in
  Chinatown, in `brush`. Faces `deco`, `tall`, `sign` and `brush`. Each over a cross street, on a
  roof or on a face, so none cuts a wall. The Neon market's side and the opening road keep their
  own signs.

### The Matrix quarter (`lib/city-code.ts`)

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
- **WELCOME TO THE MATRIX QUARTER** in `deco`, green drifting to mint white, framed, over the
  avenue at both its mouths.
- Green only: everything the game adds there (towers, spire, kerbs, cars, signs) has green its
  strongest channel.

### The Neon Canyon, and factories through the city (`lib/city-canyon.ts`, `lib/city-factories.ts`)

> 2026-11-13: "add a neon part to the city and a canyon in there. if not done allready. think how
> factories can be better integrated not all together."

- **The Neon Canyon**: a street 12 across and 298 long through the Neon market: down x = 52 from
  the domes' edge (z 1360), a bend west along z = 1428, then down x = 26 to the Matrix quarter
  quarter's edge (z 1632). Its walls are the plan's own towers pushed up to the street, 104 to 140
  high (lower only in its last two rows, where the metro crosses over it), so they hold you like
  every tower. The city's neon part: bands of neon every six up the faces it sees, a strip up each
  edge, the light lying on its street in soft streaks, boards hanging over it at five heights,
  glowing cables strung across it every 8.5 at up to eight heights, and NEON CANYON over both
  mouths. Every hue drifts slowly round cyan, magenta, amber and violet (a turn in about a minute
  and a half); nothing flashes. Lit only near the eye and ahead of it, each face at most 3600
  sites. On the map as a magenta line, named **Neon Canyon**.
- **Factories through the city**: the Industrial quarter keeps its landmark foundry and two works;
  the others stand singly, never two on neighbouring blocks: cement works on the Canals' quay,
  an assembly hall at the city's edge by the Heights, solar works at the desert's edge among the
  pyramids, kilns beside the domes (their glassworks), and the Matrix quarter's **data
  foundry**, drawn in its green only. Each has a lit yard, a chimney breathing slow steam with a
  slow red lamp, and a conveyor of light gliding to its neighbour's wall (`FACTORY_SITES`).

### Rising, hearts, Atlantis and depth (2026-11-13)

"make the rising start rising faster. and do different ones of these", "do different options for the heart", "bring more verticality to atlantis. and it seems to shine too much still or too much glow", "check depth of field for the city".

- **Rising** starts within a second and is all up by a third of the piece. ↑↓ picks how it rises: Heart first, Outside in, Spiral (sector after sector), Ripple (each ring settles with a small overshoot, never a jump) or Bloom (each block on its own beat).
- **The heart** has five on ↑↓, over the same garden, canal and bridges: Open sphere, Golden torus, Lantern (twelve ribs turning a quarter as they rise), Lotus (two tiers of petals, a seed head of florets) and Armillary (three tilted rings turning slowly).
- **Atlantis** gains spires of three drums, each narrower, with porthole rings, a lamp at each step and a slow light on a mast: in the ring of knowledge, rising out of the homes' domes, and beside the nature clusters. They stay below the high submarine loops, and their bounding spheres keep submarines clear. Less bloom (glow 0.6), smaller grains in the close views, buildings lit rather than glowing up close, a softer heart.
- **Depth of field** in the game softens the far city from cruise on, not only under the boost: it starts at 1.35 times the focus distance and ramps over 110.

### Atlantis, circular and vertical (2026-11-14)

"make Atlantis more vertical with factories domes towers but all connecting with human sized tunnels unravelling around it and in circles or spirals around some buildings (these are for decoration) will be used by humans in the city much later in development. so we get a whole city that keeps feeling of having been designed from the start. and that isn't square. adding 4 dome complexes NSEW so it creates this super cool circular design with circle plazas and complexes at every quarter."

Drawn as its own two roles in every view, `rise` (the buildings, a mesh) and `tunnel` (worked out grain by grain), so the old city keeps its budget; in Atlantis's own gold, glass and warm white, no brighter than the city (its tunnels fainter), nothing flashing.

- **The skyline climbs in rings toward the heart**: four **great towers** on the diagonals of the ring of knowledge (45°, 135°, 225°, 315°), 17 high (the spires reached 7.8): five drums each narrower by φ^¼, porthole rings, a balcony with small lamps at every step, an open lantern of rings and ribs round a slow light, a mast. Two stand where the diagonal spires were, two rise out of the knowledge domes. A **factory** rises out of every compartment of the ring of making: three banded drums with tall slits of warm light, pipes up the sides, a low glass cap and two chimneys breathing slow bubbles, 12.5 high on the diagonals and 9.5 (slimmer) between, clear of the long loops above the boulevards. Then the homes' spires (7.8) and the dome stacks (8.6) out in the ring of nature.
- **Four dome complexes**, N, E, S and W, on the boulevards of the four long loops (north is the harbour's), all 46 from the heart: each a **circle plaza** of radius 5 (rings and a compass rose on the floor, eight lamps, bubbles rising from its middle) ringed at 10 by domes of two sizes (radius 2 and 1.5) and two **stacks of four domes**, each 1/√φ smaller on a neck over the last, to 8.6. Each complex is the last turned a quarter round the heart. A **circle road** (a line on the floor and a tunnel over it) runs round through all eight stacks, complex to complex. The north plaza is the harbour's: its pier crosses it. The reefs and meadows leave the complexes' circles clear; the nature clusters at 165° and 285° gave way to them.
- **Tunnels** (`TUNNELS`, 74 drawn, about 1,070 long in all): thin glass tubes of radius 0.14, human sized beside the boulevards' (0.35), each a faint skin, two gold rails along the top, a walkway along the floor and a gold rib at every other joint, with soft pulses of warm white drifting along inside at 0.55 a second, each tunnel its own way, fading at the open ends. They join everything (`ATLANTIS_NODES`; with the boulevards and the ring of living's corridor, every place is reachable from the heart): in from the heart's dome to each great tower (4), sky tunnels from the towers to the factories at 10 high (4), on over the middle canal to the great domes (4), out along the loops' boulevards to the plazas (3), round each plaza (4), out from each plaza to its six domes (24), and the circle road (4 arcs). For show: **helices** winding up the four great towers (4½ turns), the six homes' spires (1½) and the eight dome stacks (3), 18 in all, and **rings** round the heart's dome high on its shoulders and round the larger domes of each complex (9).
- **Submarines keep clear**: every tower, factory, stack, dome and tunnel point has a bounding sphere in `COMPARTMENTS` (the tunnels' 2,545 small ones), and no cruising or harbour submarine comes within 0.3 of any. The tall things stand off the loops (the factories beside them slim enough), the tunnels run low under the lanes, and the yellow school round the heart now swims inside the great towers' ring.
- The Plan draws each place once as a disc on the map (a tower's stacked spheres count once, tunnels none). Frame cost is as before.

### Life in the city (2026-11-14)

"above chinatown add flying lampions and jelly fish", "for green code make that some buildings are growing up and down so it gives vertical movement", "do some avenues have only traffic in one direction like in canyon. and traffics crossing only left on one street then only right on another street that it crosses. or playing with different levels. but i like feeling of being in a flow.", "make flocks of flying birds creating abstract shapes above the whole city that open up when u fly past them. organically.", "and stars above in the sky when u look up."

All of it mellow, as ever: colours lean slowly, nothing flashes or jumps, and every place is a formula of the thing's number and the time (no state kept frame to frame). Gathered for the Ship's picture by `lib/city-life.ts`.

- **Flying lanterns over Chinatown** (`lib/city-lanterns.ts`): 64 paper lanterns over each Chinatown stretch, red to amber paper a little wider at the top, a warm flame low inside, a gold rim at the open foot. Each rises slowly (a third to two thirds of a unit a second) from eight over the highest roof round it (seventy over the street at least, over the grand pagoda), swaying as it goes, fading in as it starts and out ninety higher, then comes round: always some at every height. 22 sites each.
- **Jellyfish of light** among and over them: 10 a stretch, a translucent bell of six rings with a brighter rim, eight trailing tendrils and four frilled arms, the bell pulsing slowly and softly (five to eight seconds), drifting a little; each leans round rose, amber and soft violet, about a minute from one to the next. They float high enough that their tendrils clear the roofs. 120 sites each.
- **The Matrix towers rise and sink** (`lib/city-rise.ts`): a little under half of the quarter's towers sink slowly from their full height by a fifth to nearly half of it and grow back, each on its own cosine cycle of eight to twenty seconds and its own phase. Never above the height they were built to (so under the metro and every ceiling). Their walls follow the drawn height (`blocked` reads the city's clock, set by the Ship each frame and each picture), the towers hide only as high as they stand, and a roof rising under the ship lifts it with it, so the ship is never inside a tower. The autopilot's avenue is untouched.
- **The traffic's flow** (`lib/city-flow.ts`): the avenue streams one way at each level, the two low levels (5, 11) down the avenue with you, the two high (28, 35) toward you. Every street along z is one way, all of it, alternating street by street (low, 5 and 11); every cross street along x is one way, alternating the same way (one street only to the right, the next only to the left), and higher (15 and 30), so the crossing streams pass over the streets they cross. Express lanes over the roofs (112 along z, 120 along x), each against the street under it and faster. A lane is brought round to the streets ahead two or four at a time, so it never changes its way. Ships coming toward the eye show white headlights, ships going away red tails. None at the cruise height (21) and none low on the avenue through Chinatown, as before.
- **Murmurations** (`lib/city-flocks.ts`): a flock in most cells of a 360 × 480 grid over the whole city, wandering slowly round its cell some 140 over the street (over the roofs, under the stratosphere), 520 small dark-gold and silver birds each. A flock holds a shape, then eases into the next every sixteen seconds: a twisting ribbon, a ring, a spiral, a wave rolling through a sheet, a sheet folding like a book; it turns slowly, each bird wandering a little, a slow shimmer running across it. As the ship nears, the birds part from the line it flies along in a soft wave, opening some 13 round it, earlier ahead of it than behind, closing again once it is past; a bird is only ever pushed further out than it was, so none crosses another, and from 70 away none moves at all. The nearest five flocks are drawn.
- **Stars when you look up** (`lib/city-stars.ts`, `lib/city-sky.ts`): the sky keeps its five grains a hundred, and as the eye looks up (the camera's forward over the horizon) it borrows up to six more a hundred from the traffic's eleven, one after another, each easing across from a ship to a star; looking ahead, the city keeps them all. The borrowed grains are a faint Milky Way arching over the city (half of them) and more scattered stars, most faint, a few bright. All stars twinkle slowly and gently (never under 0.82 of their light), are brighter looking up, and are no longer dimmed by the player's fade at the dome's distance.
- **Budget**: the lanterns, jellyfish and flocks are items in the pool like everything else, dealt nearest first and thinned with distance: at most some 1,400 lantern and 1,200 jellyfish sites over a stretch in full and five flocks of 520, far fewer drawn when far. The sky's share of the frame plan is unchanged (5, 4, 6, 11, the rest the pool); only looking up does it borrow from the traffic.

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
| Matrix quarter | The data spire | 165 | 165 | gains a **cascade of twelve data pillars** spiralling up round it (30 to 140), light falling down their faces |

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
| Cascade Monolith | Matrix quarter (5, 53) | 150 | six slabs stacked and set back, light falling down them |

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

### The Grand Avenue (2026-11-14)

> "make the main street when u go from chinatown start forward forever unique. on multiple heights
> so it is all top quality stuff like chinatown main street part. but not only close to ground
> level. and make it a loop so when i go to end of map it goes back to the other side. so from
> china town forward finish game and goes back to china town so u can go infinitely forward."
>
> "make sure these main streets are high with many vertical levels. so I don't fly on road level
> and all good info is on the levels above road level as well."
>
> Earlier: "different cool main streets like the china town one. with many layers and levels above
> or below and long avenues well designed and side streets that work well and potentially open
> spaces for temples, factories, novas etc.... making sure rooftops aren't boring or just black."

`lib/city-avenue.ts`, hooked into `lib/city-game.ts` (`blockTower` raises the avenue's towers,
`gameItems` draws the rest). Our own designs only, each in its quarter's colours; every hue drifts
slowly between the band's two quarters' colours, lamps twinkle softly, nothing flashes.

**High walls.** The avenue's own towers stand taller in every quarter (`avenueHeight`): Chinatown
36–62, the Indian quarter 64–104, Istanbul 60–100, the Canals 58–94, the golden gardens 70–110,
the temples 64–100, the industrial quarter 66–102, the domes 60–96, Egypt 52–82, the market
72–116, the Matrix quarter 66–116 (the Heights were tall already). The metro, the Neon Canyon and the
Chinatown lounge still set the height where they cross. So the avenue is a deep street all the way,
its good things climbing from 20 to past 100 over the road.

**Every band's stretch** has, all of it light (fly-through, never in `blocked`):

- **bridges across the avenue** at four heights, two in each block and the other two in the next,
  staggered along the block, wall to wall under both walls' tops (`avenueSpans`);
- **galleries up both façades** at four to seven levels, standing out over the avenue;
- **lit roofs** on its towers (seen from about their height up): gardens, pools, landing pads,
  stepped crowns, signs, glass domes — no plain black roof;
- a **feature over the avenue** in places, hung just under the walls' tops where they are lower.

| Band | Bridges (height over the road) | Left façade | Right façade | Roofs | Over the avenue |
|------|------|------|------|------|------|
| Chinatown | moon bridges, a swept gold ridge and lanterns under it (24, 32, 40, 50) | lantern balconies, red rails (22, 32, 42, 52) | the same | (its tiered roofs) | — |
| Indian quarter · Istanbul | carved lattice bridges with lamps at their foot, and arcade bridges on pointed arches with a small dome (30, 44, 58, 74) | carved bay balconies, an arched bay and a little dome over each, a lamp at its foot (22, 36, 50, 64, 78) | domed arcades and terraces in tiers, lamps hung in the arches (20, 34, 48, 62, 76) | a garden with a domed pavilion; a lit pool | a ceiling of hanging lamps on chains (band rows 6–7, up to 96) |
| The Heights · the Canals | glass skybridges with ribs and a slow shimmer, and arched water bridges with lit water down their middle (36, 52, 70, 92) | glass bands with mullions and a light running along (30, 50, 70, 90, 110) | lit water terraces stepping up, falls running down their edges (20, 32, 44, 56, 68) | landing pads; roof pools | a suspended garden deck with trees and trailing vines (rows 5–6, up to 100) |
| Golden gardens · temples | colonnade bridges, gardens trailing under them (30, 46, 62, 80) | golden colonnades, hanging gardens below each (24, 44, 64, 84) | ivory colonnades, the same | roof gardens; stepped crowns with a lit apex | a trellis of hanging vines (rows 4–5, up to 104) |
| Industrial · domes | truss gantries with a lamp at every node, and pipe bridges (28, 42, 56, 72) | catwalks with rails, braces and slow amber lamps (24, 40, 56, 72) | dome balconies of glass, green light inside (22, 38, 54, 70) | landing pads; glass domes over gardens | a long glass tube down the right side with plants in it (rows 1–6, 76) and a travelling crane rolling slowly on rails (rows 3–4, up to 98) |
| Egypt · Neon market | floating obelisk bridges (on nothing, gold bands, a lit tip), and neon bridges with a board hung under each (28, 42, 56, 72) | stepped terraces, each further out, lamps and small obelisk lamps (18, 30, 42, 54, 66) | neon decks every twelve (20 to 92) | stepped crowns; rooftop sign frames | sun-disc gates to fly through, rays and wings, at rows 1, 3, 5, 7 (54); a neon grid (rows 4–6, up to 104) |
| Matrix | code bridges, glyph lights streaming along them (30, 46, 62, 80) | glyph ledges, a stream falling along (24, 44, 64, 84, 104) | the same | landing pads | a cascade of glyph columns hanging from a lattice, light falling down each (rows 3–5, up to 112) |

Over the Heights' tube and its two lounges (rows 17–21) nothing of the avenue's stands under 64.

**The loop, seamless.** The plan already repeats every 56 rows, so flying on down the avenue
always comes back to Chinatown. Now every band's edge has a **gateway** (`GATEWAYS`, seven a turn):
two pylons on the cross street's corners (x ±10.8) rising 112, rings and lamp beads up them, three
lintels across the avenue (34, 64, 94), a double arch crowning it (to 128), its light drifting
between the two bands' hues; the name of the band you fly into going down the avenue (−z) on its
near face (at 88), the other band's under it (at 60), in the deco face. The join where the plan
turns (z = 0, the Matrix quarter into Chinatown) and Chinatown's other edge (into the opening road)
carry a flared red-and-gold roof over the crown and two great lanterns under the top lintel; the
gateways at the Matrix quarter's two edges have glyphs falling down their pylons; the others a ring in
the crown. Each band's first and last rows lean 30% toward the neighbouring band's hues, so one
quarter blends into the next. Gateway words: CHINATOWN, LAMPS & DOMES, THE HEIGHTS, GOLDEN
GARDENS, FORGE & GLASS, SUN & NEON, MATRIX.

**Budget.** Near-eye items like Chinatown's: each block's bridges one item, each tower's galleries
and roof one item each, each feature and gateway one; drawn within 160 ahead (the gateways 270),
nearest first and thinned with distance by the renderer, each shape built once and kept. About
35–50 items and 30,000 sites in sight, under a microsecond a site. Timed over 120 frames of
`setFly` + `pieceCamera` + `pieceAt` at 15,000 grains on the avenue, before and after, in the same
session: golden gardens 53.8 → 53.3 ms, industrial 51.6 → 51.2 ms, Egypt 50.3 → 50.9 ms; a
second pair later, the machine busier, 69.2 → 61–63, 66.8 → 57–61, 65.9 → 55–59 (no measurable
cost: the frame's grains are a fixed pool; this machine's timings drift threefold between runs).

**Acceptance** (`lib/city-avenue.test.ts`): a design for every band, each its own; the walls high
(median over 50) in every quarter after Chinatown; bridges at three heights or more over 20 in
every band, wall to wall, in the block; sites on six or more ten-high levels over 20 in every
band; the avenue's middle clear at every height to 120 and the autopilot's route clear; the
quarter starts and race gates clear; colours drift slowly (no step over 0.03 a frame); a gateway at
every band's edge, the join's naming CHINATOWN and MATRIX, crowned over 112, its lintels lit,
flown through at every height, on every turn of the plan; each band blending into the next.

### Flying stations and rings of light (2026-11-14)

> "add 15 cool flying stations. can be futuristic. circular. etc... like mini cities or buildings
> or temples or novas above the sky. these will add an element above the city so when u fly above
> there is cool stuff. ... and big circles of lights concentric in many parts, they look good as
> decorative element u can fly through. can be part of architecture on top or on side of a tall
> building or below a flying station. or just in the air creating a kind of tunnel parcours higher
> up as you fly above the city and try to align flying into them and turning carving to keep on
> going through that tunnel. but make circles big so not too precise and tiny."

`lib/city-stations.ts` and `lib/city-rings.ts`, hooked into `lib/city.ts` (`gather` draws them,
`setFly` counts the parcours, `tally` shows the count, a fresh start forgets it). Our own designs
only, grains from the shared primitives (`lib/city-shapes.ts`) and a few of their own. Mellow: every
colour drifts slowly toward a warmer shade and back, a few lamps twinkle softly, nothing flashes;
every motion is a formula of the time (nothing kept frame to frame), so the same moment always
shows the same picture and nothing jumps.

**Fifteen flying stations**, one to every quarter and two over Chinatown, the Heights and the
Matrix quarter, floating over the towers' sky (their middles 240 to 420 over the street, all of each
between 210 and 450): reached with the super boost, under the stratosphere's top, so the super
boost still opens the whole plan over them. They stand at the tile's sides (x ±115, ±140, left
quarters left, right quarters right), so the parcours weaves down the middle between them. Each
turns slowly round the vertical (0.02 to 0.05 radians a second, some each way) and bobs 2 to 3.5
up and down over 17 to 25 seconds; some have parts of their own turning (orbits, gimbals, discs,
habitat rings, shuttles) or light flowing (waterfalls, falling light, fading at both ends).

| Station | Quarter | Middle (over the street) | Design | Sites |
|---------|---------|------|--------|-------|
| Lantern Harbour | Chinatown | 240 | a gold ring deck, eight great lanterns hung under it round one greater lantern | 1,836 |
| Orbital Monastery | Chinatown | 360 | a ring walkway with eight small shrines on it, a bell under an arch in its middle | 1,950 |
| Lotus Rock | Indian quarter | 300 | a temple on a floating rock, terraces round its curved spire, six waterfalls of light | 1,930 |
| Turquoise Wheel | Istanbul | 420 | a torus on six spokes round a hub, a crescent over its axle | 1,476 |
| Nova Stack | The Heights | 340 | three Nova Cores stacked on a spine, each wrapped in two turning orbits | 1,616 |
| Docking Spire | The Heights | 280 | a needle with three docking rings and their pads, shuttles circling it | 1,801 |
| Violet Disc City | The Canals | 250 | a mini city of tiny towers on a floating disc round a twisting tower | 1,960 |
| Garden Island | Golden gardens | 260 | an island of gold trees round a great tree, roots trailing under its rock | 1,936 |
| Sky Ziggurat | Temple quarter | 380 | two stepped ziggurats base to base, a halo round them, a pillar of light under | 1,160 |
| Gyroscope Foundry | Industrial quarter | 400 | three nested rings turning on their own axes round a furnace core | 1,590 |
| Biosphere Cluster | Solarpunk domes | 270 | three glass spheres joined by tubes, plants glowing inside | 1,378 |
| Hanging Pyramid | Egyptian quarter | 340 | a pyramid hanging point down, a sun ring with rays over it | 1,182 |
| Neon Carousel | Neon market | 300 | four discs on a mast, each turning the other way, boards hung round them | 2,406 |
| Data Lattice | Matrix | 320 | a lattice cube standing on its corner, a core inside, light falling through it | 1,328 |
| Twin Ring Habitat | Matrix | 420 | two habitat rings turning opposite ways round a hub, panels over them | 1,844 |

Each wears its quarter's colour, a lighter shade (toward warm, never white), a deeper one and a
golden one. **Fly-through**: all light, as the Studio's other additions are; no collision, so the
ship can never be caught on one. They float over every tower (no probes; the street sees them
looking up) and stand clear of the landmarks and big squares where the fireworks burst (at least
their reach and 20 more across), the space portals, the Sky Island Loop and one another.

**Concentric rings** (`ringSets`): 28 sets of two to four rings round one middle in one plane,
radius 16 to 40, every ring dashed (twelve dashes, a warm lamp at every third), turning slowly, each
the other way to the next, breathing gently, in the quarter's colour:

- **crowns**: halos 30 over six landmarks' crowns and at least 200 over the street (pagoda, temple
  mountain, stair tower, twisting tower, floating obelisk, data spire), under where their
  fireworks burst;
- **halos** round six of the fifteen buildings (Lantern Spindle, Helix Exchange, Sunleaf Column,
  Sunboat Mast, Neon Prism, Cascade Monolith), 56 to 70 up, under the big ships;
- **over** four more (Hourglass Tower, Ivory Echo, Cog Tower, Seed Pod), standing 226 over the
  street, some 70 over their tops, facing down the city, so you fly through them along it;
- **under** six stations (Lantern Harbour, Turquoise Wheel, Violet Disc City, Sky Ziggurat, Neon
  Carousel, Twin Ring Habitat), hanging 16 under them and bobbing with them;
- **free** in the air: six sets standing at a slant, 224 to 232 over the street.

All of them under 80 over the street or over 195, so never among the flocks (some 120 to 165),
the high currents of ships (142 to 182) or the big ships (96 to 142), and apart from the
parcours.

**The parcours**: a chain of 45 big rings (radius 20) along one smooth curve down the whole tile,
weaving across the avenue (x −75 to 75) and rising and falling from 275 to 365 over the street.
The curve repeats with the plan, so the chain never ends: flown down the city it comes round to its
start. Rings stand about 46 apart along it, never turning more than 16° from one to the next; each
leans into the turn (up to 0.46 radians) and has a brighter keel at its foot, so the banking reads.
Through a ring (its plane crossed within 1.1 of its radius from its middle, either way: big and
forgiving, never precise) it warms toward gold over half a second and cools over six, a soft halo
ripples out from it and fades over 1.4 seconds, and **"Rings N"** shows in the quiet words beside
the bar (after the race's, before a district's name): the rings flown in a row, the count starting
again after ten seconds without one. The same ring twice within a second and a half counts once.
These rings are not the space portals: they never open hyperspace, and they stand well clear of
them (at least the two radii and 20 more), of the stations and the Sky Island Loop. The super
boost takes you up to them; once up, the ship holds its height while you carve.

**Kept clear**: everything here is 40 and more from the autopilot's route, 20 and more from every
quarter start, 15 and more from every race gate (the Sky Island Loop's gates 25 and more from the
stations, the rings' radius and 15 from the parcours).

**Budget**: items in the pool like everything else, dealt nearest first and thinned with the
distance by the renderer. At most the nearest 6 stations (1,160 to 2,406 sites each, weight 1.8),
10 decorative sets (about 530 to 1,060 sites each, weight 1.6) and 16 parcours rings (280 sites each,
weight 2.2) are drawn: some 30,000 sites in all at the very most, far fewer shown. From over the stations (the
stratosphere, looking down on the plan) they weigh a quarter, so the plan keeps its grains (the
plan's own test unchanged). Costs measured with a throwaway bench (deleted): 0.6 to 0.9 µs a site,
as the landmarks' crowns are on the same machine.

**Acceptance** (`lib/city-stations.test.ts`, `lib/city-rings.test.ts`): fifteen stations, each its
own design and shape; heights in range, over the towers' sky and under the stratosphere's top; each
in its own quarter and its colours (mean colour within 0.97 of the quarter's); turning and bobbing
deterministically, no grain moving more than 0.4 a frame unless dark, no brightness step over 0.03;
clear of the fireworks, portals, Sky Island Loop, one another, the route, starts and races; drawn
from the street and from far off. Sets concentric (every light its ring's radius from the one
middle, in one plane), radius 16 and more, turning slowly, clear of the flocks, the high currents
and the big ships, apart from the parcours, the under-sets
bobbing with their stations. The parcours: radius 16 to 25, heights 270 to 370, a steady gap, under
25° from ring to ring, banked both ways; a pass within 0.8 of the radius counts either way, 1.5
does not; the tally counts the rings flown in a row and lapses; flown through the whole chain no
portal opens; the ring warms with no step over 0.06 a frame; the Ship's own flight through a ring
shows "Rings 1"; only the nearest are drawn, a modest share, thinner from the stratosphere.

**Finished: the map, fast travel, the best run, docking** (2026-11-14, "finish the sky stations").
`lib/city-skyport.ts`, with small hooks in `lib/city.ts` (`setFly` docks and holds, `travelTo` lands
high, `tally` names the station, a fresh start undocks), `lib/city-minimap.ts`, `lib/city-travel.ts`
(`spotFor` only), `lib/city-rings.ts` and `lib/city-stations.ts`.

- **On the map**: every station a small level disc (a thin ellipse round a dot) in its quarter's
  colour, the parcours a faint dotted gold line down the tile and its start a small open ring. In
  3D they stand at 0.45 of their height (a layer over the towers, kept in the frame), their stems
  fainter than the other places'. Their names come last (after the docks and embassies), so they
  never push another aside; a pointer near one brings it first, as for any place.
- **Fast travel**: a tap on a station's name or mark (its name shown or not, within 9 px) flies
  there: level with its middle, out past its reach on its +z side by 30, facing it. **Ring
  parcours** flies to its start: on the curve a little past the first ring (0.6 of the way to the
  second), facing the first ring's middle some 25 ahead, so flying straight on goes through it and
  on down the chain. A trip landing over the towers' sky keeps the super boost's height, so the
  ship holds its height there instead of sinking.
- **The best run**: the most rings in a row shows beside a shorter run, quietly: "Rings 7 · best
  12" (only "Rings 12" while the run is the best). Kept on the device as the races' best times are
  (`colourmap:city-rings:best`, in try/catch; where there is no storage it lives the visit only);
  a fresh start forgets the run, never the best.
- **Docking**: flown slower than 6.5 (under the cruise: Q, or slow mode) into a station's middle
  (within 16 of it), the ship docks: it eases in to at most 8 from the middle and holds there gently,
  bobbing with the station, while the station's lamps warm (toward the warm shade, a little
  brighter) over two seconds; "Docked · Lantern Harbour" shows beside the bar. Any steering,
  climbing, Faster or boost undocks at once (the keys fly on as usual, from rest), and so do letting
  go, a trip or a fresh start; the lamps cool over four seconds. A station just left docks again
  only once the ship has been 24 from its middle, so it can never catch the ship.
- **Polish**: fireworks no longer bloom into a station or a parcours ring (a burst whose sparks,
  falling as they fade, would reach a station's reach or a ring's stays unlit; before, a burst
  could reach up to 16 into Violet Disc City and Biosphere Cluster and 28 into the parcours'
  fourth ring). A station's lamp is never brighter than 0.74 (the lift from over the plan and a
  dock's warmth together would reach 0.85). Checked and already clear: the high currents (under
  182), every block tower (under 137) and every Matrix (code) tower (under 115) stay under every
  station (over 210); the landmarks' tall crowns stand off them across (their fireworks' places,
  each station's reach and 20 more); the decorative sets stay off every station but the one each
  hangs under.

Acceptance (`lib/city-skyport.test.ts`, `lib/city-minimap.test.ts`, `lib/city-travel.test.ts`,
`lib/city-rings.test.ts`, `lib/city-stations.test.ts`): fifteen station marks and the parcours start
on the map, inside the tile, one disc each and the dotted line drawn, names after every other
place's and none overlapping; a tap on a mark with no names shown leads to it; each station's spot
clear, out of every station's reach, outside its docking zone and facing it; the parcours start
facing the first ring, 15 to 40 from it, flown straight through it; the Ship flown to a station,
to the parcours (shows "Rings 1"), landing within 3 and holding its height; the best run up with a
run, beside a shorter one, kept through a fresh start and on the device; docking only slow, unsteered
and in the middle, held bobbing with the station, undocked by any steering, never docking again
until the ship has left; warming and cooling with no step over 0.03 a frame; no burst alive in
four minutes over every firework place within 5 of a station or a parcours ring.

### The far city (2026-11-14)

> **Taken off the City, 2026-11-14 (later).** The user: "the horizon drawing is awesome but it feels
> like a totally different game and makes it all confusing. take it off but add it to the designs".
> The City's trip no longer passes `farLayer` (components/City.tsx; components/City.test.tsx checks
> it). `lib/city-far.ts` and `lib/far-layer.ts` stay, ready to become an Art design: a psychedelic,
> futuristic neon horizon, for a later game of mega speed over quickly generated cities.
>
> **Now a design of its own, 2026-11-15:** the **Hyper-speed city** (`/geometry-field/hyper-city`,
> docs/specs/hyper-speed-city.md) flies on autopilot in a straight line at mega speed above
> procedurally generated neon cities, drawn through the same far-layer path (`lib/far-layer.ts`),
> its tiles from `lib/hyper-city.ts`. `lib/city-far.ts` stays unused.

The user asked "what stops u from increasing field depth of vision 5 times on computer?" The
answer: the grains are worked out in JavaScript every frame (about a millisecond a thousand), so a
longer live view costs frame time. The way round it is a far layer built once and drawn by the GPU.
Then: "lets try it. try a light version that doesn't take u too much energy but still looks nice."

- **Computer only.** It shows when the City's quality is `'large'` (components/City.tsx,
  `setCityQuality`) and the trip player is not on a phone (under 700 wide). Phones and the other
  worlds are unchanged. It shows only on a game step (the Ship), never in the Journey.
- **One tile, built once** (`lib/city-far.ts` `farCity`, made the first time it shows): every
  block's tower gives its roof corners and the middles of the roof's sides, 3 to 16 points down each
  edge (dimming toward the street) and, on towers over 40 (over 80), two (three) rows of warmer
  window points; pyramids give their apex and their edges; the Studio's buildings on open blocks,
  the ten landmarks (all but the race plaza) and the ten big squares get a silhouette of about 60
  points (a column to the tip and eight narrowing rings); parks and plazas a glow or two on the
  ground. All in the districts' colours, dimmed as a night city far away, a little difference from
  light to light, fixed. **27,895 points**, positions and colours as Float32Arrays: **669,480
  bytes** (about 650 KB), built in about 50 ms. The tile is cut into seven strips along z, one to
  each band of districts, so each can be left out on its own when out of sight.
- **Drawn round the eye** (`lib/far-layer.ts`, generic; the drawing in components/TripPlayer.tsx
  `farLayerOf`): the tile is 312 across and 1,904 along, so the copies of its strips that come within
  reach (about 280 in the street) are each a `THREE.Points` sharing its strip's geometry and one
  `ShaderMaterial`, placed again only once the eye has moved 12 (about 40 µs of JavaScript each
  time); three.js leaves out the ones out of sight. Copies wholly inside the live view are skipped.
- **Reach and fade** (`farFade`, the shader the same): nothing inside 0.8 of the live view
  (`viewAt`, 520 in the street on a computer), coming in smoothly to its edge, so there is no seam
  with the live grains; dimming slowly to under half with distance, a bluish haze mixing in, and
  gone by **2,600** (`FAR_REACH`, five times 520) from 0.7 of it. The camera's far plane opens to
  2,700 while it shows (1,600 otherwise). Points are about a grain and a half wide where the live
  view ends, one pixel far off, additive like the grains. Still colours: no drift, no flicker.
- **Where it hides** (`farShown`): in a room, in space, on a phone. Climbing, it keeps half of
  itself once the plan from above has taken over (the plan's own far edge, `viewAt`, is then far
  out, and the layer starts beyond it, so the two do not double up), and fades away by the
  stratosphere. It stays in the cockpit view.
- **Cost.** The live grains' per-frame JavaScript is unchanged (the same 15,000, the same work);
  the far layer adds a few uniforms a frame and a placing every 12 moved. On the GPU it is about a
  million points in reach, a quarter to a third of them in sight: small next to the bloom passes.
  Not measured in a browser yet.
- **Acceptance** (`lib/city-far.test.ts`, components/TripPlayer.test.tsx): built once (the same
  object on a second call); 20,000 to 40,000 points, under 1 MB; every point inside one tile and
  each strip inside its span; colours in the districts' families and dim; the fade nothing inside
  the near view, rising after, dimming with distance, nothing beyond the far edge; the copies cover
  the reach and skip what is wholly inside the near view; off for `'small'`; the player builds it
  only on a game step, once, and never on a phone.

### Ship currents and quarter ships (2026-11-14)

> "make more channels where ships navigate together in one direction to avoid overload. so u
> follow linear currents of ships. some of these currents can be above and turn together or be
> more curvy currents. but mainly one street one direction of ship and a few outliers with the
> unique big ships. also make some unique ships or drones for each quarter."
>
> "a few unique ships become part of the quarter. this doesn't mean only those. feeling of current
> is to have a cool feeling that you are going in a direction, it feels satisfying."
>
> Earlier: "i like feeling of being in a flow."

`lib/city-currents.ts` and `lib/city-quarter-ships.ts`, drawn by the traffic's grains in
`lib/city.ts` (`trafficAt`). The traffic becomes rivers you can slot into and follow: steady
streams, aligned, at one speed, smooth curves over the roofs. Every place is a formula of the time;
colours lean slowly, nothing flashes. Our own designs only.

**Street channels** (on the flow's rules, `lib/city-flow.ts`): the avenue one way at each level,
two files a level either side of its middle (±4.8, the middle left clear), the two low levels with
you, the two high toward you; one file down the middle of each street, one way, the next street the
other way (5 or 11 over the street, alternating); the cross streets higher (15 or 30), alternating
the same way, so the crossings pass over; express lanes over the roofs (112 and 120). Twenty
channels round the eye, each brought round two or four streets at a time so it never changes its
way. In a channel every ship flies at the channel's one speed (7.5–10 in the streets, 9–11 on the
avenue, 15–18 express), single file, one spacing apart (the stretch of 180 shared evenly), so a
channel reads as a river; the avenue's files are fuller (half again as many ships), the express
thinner. A ship's streak is a little longer the faster its channel flows. **Lane lights** mark
each channel: faint dots fixed over the street, a slow swell of light (some eight seconds a
wave) running along them the way the channel flows — warm on the avenue, pale blue in the streets,
violet over the roofs. None at the cruise height (21), none low on the avenue through Chinatown.

**High currents** over the roofs: one long loop a cell (a tile wide, twelve blocks deep), centred on
the avenue so it crosses it twice and links the quarters either side, 150–174 over the street
(above every tower), rising and falling a little; its path a sum of a few sines, so smooth
everywhere. A flock of twelve ships flies each, two abreast nine apart, all turning together and
banking into the turns (the bank from the loop's curvature, never over 0.7), a bright nose, two
wingtips and a fading tail each; a faint path of light ahead of the flock shows where it will turn
(a bridge of light where it crosses the avenue). Pale gold leaning slowly to a soft cyan. The two
loops nearest are drawn, seen further than the street traffic.

**Outliers**, three big ships of our own, each alone in a stretch of 700–900, slow (2.2–3.6 a
second), high over the blocks at its own height, never down the avenue low: the **cargo liner**
(34 long, a spindle hull, a warm row of windows, its bridge toward the bow, three soft engines;
126, along z over the blocks left of the avenue, with you), the **lantern barge** (22, a flat
deck, twenty lanterns swaying under its edges, an arched canopy; 96, right of the avenue, toward
you) and the **long ferry** (40, two decks of windows in soft bands, a slim mast with a soft
beacon; 142, crossing over the avenue). The two nearest share their grains.

**Quarter ships**: each quarter has its own design in its colours (body in the quarter's colour
leaning slowly to its accent, a soft light): lantern skiffs (Chinatown), lotus gliders (the
Indian quarter), crescent wings (Istanbul), glass needles (the Heights), gondola drones (the
Canals), gilded seed pods (the golden gardens), prayer-flag drones (the temples), cargo haulers
(the industrial quarter), bubble pods (the domes), sun-sail boats (Egypt), neon kites (the
market) and glyph drones (the Matrix quarter). About three in ten of the ships in the street channels
are their quarter's own, flying among the general ones in the same file at the same speed; at a
quarter's edge one fades out and the next quarter's fades in, so each flies only its own streets.
And small **swarms of drones**, six each, drift slowly round each quarter's heart (its landmark's
crossing, or the middle of its side of the avenue), 40–54 out, 48–74 high, hovering a little; the
two hearts nearest are drawn.

**Out of your way.** A ship near yours moves up and aside (as the other ships do), so none is ever
inside yours; the avenue's middle stays clear; all of it is light (nothing in `blocked`), so
nothing traps you.

**Grain shares.** The traffic keeps its eleven grains a hundred, reshared: two for the high
currents, one for the big ships, one for the drones, one for the lane lights, six for the street
channels' ships (the last six, the ones the stars borrow when you look up). Whether a ship is in
sight is found once a frame from its middle, and each street ship once a frame for all its grains.
Timed over 120 frames at 15,000 grains on the avenue (golden gardens, industrial, Egypt), the
traffic's grains alone: 5.1–5.4 ms before, 3.8–4.1 ms after.

**Acceptance** (`lib/city-currents.test.ts`, `lib/city-quarter-ships.test.ts`): every channel one
way on the flow's rules, keeping its way as it comes round, none at the cruise height, the avenue's
files clear of its middle; single file, one spacing, one heading, moving at the channel's speed;
lane lights fixed, swelling slowly; high currents over every tower, spanning the avenue, no heading
or bank step over 0.03 a frame, side-by-side ships heading and banking together; big ships slow,
long, rare, high and off the avenue; every district its own design, each a different shape,
every colour in its quarter's family and leaning slowly; quarter ships a share (15–45%) of the
street ships, every district's seen in its streets; drones drifting slowly round every heart;
no lit traffic grain inside your ship; all deterministic.

### Wider streets (2026-11-14)

> "make a lot of the thin streets larger."
>
> "avoid streets being too narrow where panels almost touch themselves. great when tall streets
> with lots of pancartes but needs to breathe. u can expand map if necessary, widen it etc..."
>
> Earlier: "side streets that work well".

The grid stays as it was (26 × 34 blocks, the tile 12 × 56): changing it would move every
landmark, square, start, race and the canyon, and the streets could be won inside the blocks.
`lib/city-grid.ts` (`wideLine`, `WIDE_FACTOR`) chooses the streets; `lib/city-game.ts`
`blockTower` stands the towers back from them, and everything that reads the towers follows:
collision, walls, roofs, façades, signs and boards, Chinatown's walkways and lantern strings, the
sky bridges, the factories' conveyors, the minimap.

- **Boulevards and lanes.** Every other side street is a boulevard: along z the even lines (the
  streets that flow +z) but the avenue's, across x the odd lines (so the band edges keep theirs).
  The towers either side stand back 1.75 times as far from a boulevard's middle as they stood, the
  far face staying put, so wide and narrower streets alternate both ways. Over a tile, where both
  towers stand back: along z 9.2 → 16.3 in the Canals, 9.8 → 17.1 Indian, 8.8 → 15.5 temples,
  9.2 → 17.0 Heights, 11.4 → 20.0 Matrix (about 9 → 16 on average); across x 12.5 → 19.7 in the
  Heights, 10.3 → 15.6 Indian, 9.8 → 14.7 industrial, 13.6 → 21.6 Matrix. A business tower
  keeps its design's proportions and shrinks to its new box; a tower is never thinner than 7.2;
  a tunnel through a slimmed tower runs along it when it no longer fits across.
- **Every side street breathes.** No side street narrower than nine (it was six at the
  narrowest): each tower stands at least 4.5 from a side street's middle, and beside the towers
  that keep their places (the avenue's, the canyon's walls, the through tunnel's row, now seven
  either side of its tunnel) the other side makes the street up to nine alone. The Neon Canyon's
  first wall stands three further back from the street behind it.
- **Chinatown** keeps its own lanes, out of the rhythm, but its side streets are fourteen wide
  (they were ten, twelve behind the avenue's walls): towers six across at most, its first towers
  off the avenue five and a step out. Its tall signs stand out nearly four from both walls, so six
  of open air are left between them; its covered walkways are fourteen long.
- **Staggered signs.** Chinatown's tall signs and the hanging boards (the market, the canyon, the
  opening road) are staggered by wall: a level's sign on a +x wall hangs where the wall across has
  none, so no two face each other across a street. Boards (under two out) leave five and more
  between the walls of any side street, eight across the canyon.
- **Traffic.** On a boulevard the two streams of ships run 3 off its line (1.8 elsewhere) and the
  ground cars 2.6 (1.7).
- **Kept as they were** (tested): the avenue and its towers, galleries and bridges; the canyon,
  twelve across; the big squares, the fifteen buildings' and the Studio's blocks, the plazas and
  embassies; the autopilot's route, the race courses and the quarter starts.

**Acceptance** (`lib/city-streets.test.ts`): every boulevard stretch between two towers that
stand back at least 1.6 times as wide as it was (1.75 on average); the avenue's towers unchanged;
every side street nine or more but where two kept towers meet, Chinatown's fourteen; collision
at the drawn walls of the boulevards and their middles clear; walkways and sky bridges meeting
both walls; facing signs and boards never closer than four, a way of six (Chinatown) or five
between; the canyon's boards apart; the traffic further out on the boulevards.

### Atlantis rising and the speed tunnel (2026-11-14)

> "Plant Atlantis circle by circle, adding height and circles as you go." "More spaced out than
> the first city", "high and tall": towers, spirals, tubes connecting bubble domes that float in
> the air. A speed tunnel from the middle north of the city: "one deep lane between two tall
> walls, with space to fly", tunnels along it, "lights that flash and stream in the ship's
> direction, faster than the ship, so it feels like full speed". "Welcome to Atlantis" on
> entering, and a school of sharks that follows at your speed for about 20 seconds, peels away,
> and sometimes comes back.

The City's own Atlantis, flown in the game (the Atlantis pieces of the Studio, `lib/atlantis.ts`,
are unchanged). The city repeats every tile, so a city this big cannot stand in it: Atlantis has
its own ground, reached only by the speedway, as space is reached only by the ring portals. Our
own designs only. `lib/city-speedway.ts`, `lib/city-atlantis-rings.ts`, `lib/city-sharks.ts`, with
small hooks in `lib/city.ts` (flight, camera, grains), `lib/city-avenue.ts` (its bridges give way
to the mouth), `lib/city-far.ts` (the far city hides), `lib/city-travel.ts` and
`lib/city-minimap.ts` (two map places).

**The mouth** (in the city, every copy of the tile). At the plan's north end, the top middle of the
map: over the avenue in Chinatown's first rows, from z = 76 north to the **gate** at z = 8. Two tall
walls of light 12 apart, from a glowing deck at 26 to 140, streaks running north along them and
the deck, the gate and the opening each a frame of light with a quick chase round it. All light:
under the deck (the cruise at 21, the autopilot's route, Chinatown's lanterns and banner) the
avenue runs on as before; the Grand Avenue's bridges in rows 0–2 give way above 22. Fly north
through the gate, piloted, between the deck and the top (not in a race) and you are on Atlantis's
ground, the lane going straight on from where you were. In the mouth the pace already rises (up to
1.75 times by the gate).

**The lane** (Atlantis's ground; the gate at z = 0, north is −z). **640** long. It opens from the
mouth's 12 to **44** across in the first hundred and flares to about 124 at its end. Its walls
stand 176 high and are solid; you fly up to 150 (so you stay in it), and both ends are open, so
it never traps you. Its light is the one exception to the City's mellow rule, as asked: sixteen
rows of streaks up each wall and five along the floor run north with the ship's way, each a
bright flickering head and a fading tail, riding a phase that advances at `lightSpeed(v) =
2.2v + 12` (always well past the ship; eased from its speed, so a change of pace never makes
them jump; never gaining more than `MAX_GAIN` 3.6 on the ship in one frame); dim rails between,
scattered. **Three tunnels** of arches (posts up the walls to 44, a half
circle over; one every 6 for 72; at 120, 290 and 460 along) light in waves running north faster
than you. **The push**: in the lane your pace is multiplied by up to 2.25 (`PUSH` 1.25), easing off
over the last stretch; keys still speed you up, slow you, steer and climb. Fly back south out of
the lane's start and you are home, in the mouth you left by; the map and [ ] also bring you home
from anywhere in Atlantis.

**Atlantis** (`ATL_CENTRE`, 1,160 north of the gate). Six rings of towers round the heart, planted
from the rim in, **each ring taller than the one outside it**: radius 460, 384, 308, 232, 156, 84;
height 44, 72, 100, 128, 156, 186 (each tower within 8% of its ring's, so the rings never overlap);
the **heart** a tiered spire of 250 with a pearl floating over its tip. Seen from the lane the city
rises like a crown. Towers about 62 apart along a ring, rings 76 apart: **at least 26 clear between
any two towers** (a whole block of the first city, whose streets are 6 to 11). A straight avenue
from the lane to the heart is kept clear (72 across). Three kinds of tower in turn: **drums** of
three tiers, **spiral towers** (a square twisting three quarters of a turn as it rises), **needles**;
each a ring's hue, teal at the rim warming to gold at the heart, drifting slowly; edges, bands,
portholes breathing, a crown of lamps. **Spiral tubes** wind up every third tower (2 to 5 turns)
and a great one round the heart (5 turns). **Bubble domes float** over the gaps between the rings
(at about half the rings' height), glass with gold bands and equator and a pearl light inside,
chained round each gap by glowing tubes and each tied by a tube to the nearest tower of the ring
inside. **The four dome complexes** (PR #465's, folded in): at north, east, south and west on the
circle of 270, a great dome of 20 and four smaller floating at 118, over a **circle plaza** on the
ground, joined to one another by a great ring of tube; the rings either side leave their plazas
open. **Ring roads** of light on the ground mark every circle, a slow swell running round them.
Tubes carry soft warm pulses at 3 a second; nothing in Atlantis flashes. Towers and domes are
solid; tubes and roads are light. Past 560 from the heart a gentle turn brings you back, and 640
is the edge. Over Atlantis: a deep sea at night (its own background), only the plain stars.

**The welcome.** Past the arrival line (150 short of the lane's end) the first time in a session,
**WELCOME TO ATLANTIS** lights in big deco letters of grains hung across the lane near its end, read
as you come: glowing in over 0.8 s, held 7 s, gone by 9.5 s, never again until the page is opened
afresh. The game stays wordless otherwise: beside the bar Atlantis shows nothing (the gauges'
district reads "Atlantis").

**The sharks.** On every arrival a school of seven (our own: a spindle body paler underneath, a
swept dorsal fin, two pectorals, a crescent tail, a teal lateral line, small eyes; each body
swishing, more toward the tail) comes up from behind and swims **beside you at your speed** (14 to
one side, a little below), each at its slot, wandering on slow sines. After **20 s** it peels away:
slowing, turning off to its side and down, each shark fading in turn, gone within 6 s. While you
stay it **comes back** between **60 and 120 s** later (each time on the other side), and again. It
uses the traffic's grains (eleven in a hundred, about 100 a shark on a phone); when the sharks are
away those grains are faint motes in the water.

**Fast travel.** Two new places on the map at its top middle: **Speedway to Atlantis** (a start over
the avenue 50 south of the mouth, at 60, facing north up it) and **Atlantis** (a trip to the gate,
then on down the lane to just before the arrival, flying north).

**Budget.** On Atlantis's ground only Atlantis is drawn (the city's towers, traffic and other ships
not at all): the same pool, every tower, dome, tube and road an item made once and kept, only its
distance set each frame; nearest first, thinned with distance (dense to 220, drawn to 1,100).
Nearly every site is a light, so no grain is spent looking. Measured in the test runner (6,500
grains, `setFly` + `pieceCamera` + `pieceAt`, the same session): 24–39 ms a frame over Atlantis
against 44–58 ms in the city.

**Acceptance** (`lib/city-atlantis-rings.test.ts`, `lib/city-speedway.test.ts`,
`lib/city-sharks.test.ts`): six rings, each ring's lowest tower over the tallest outside it, the
heart tallest; every gap between towers over 26 and rings more than two blocks apart; the approach
clear to the heart; spiral towers, helices round towers, floating domes each touched by a tube, four
complexes on plazas joined by 32 arcs; towers and domes solid, the edge turning you back; no site of
Atlantis in the lane. The mouth clear of the city's collision in every copy, its bridges under the
deck; the gate opening only northward between the deck and the top; the lane 12 then 40 or more
across, clear inside, its walls and top holding you; the push only in the lane and the mouth; the
lights always faster than the ship and moving north; flying north through the gate lands in the
lane straight on; the welcome once a session, gone after; flying back south brings you home; the
map's two places travel there and back; in Atlantis every grain finite, the sharks within the
traffic's share. Sharks: following beside you for 20 s at 40 a second, gone by 27; returning 60 to
120 s after each leaving, three times or more in 400 s; leaving at once when you leave Atlantis;
no frame-to-frame jumps; grains near each shark and mellow.

**Smooth at speed (2026-11-15).** "the speed tunnel to atlantis is bugging. looks good but cuts
the fps or feels laggy not smooth. but concept is good." Measured first
(`lib/city-speedway.bench.test.ts`, off unless `CITY_BENCH=1`: `setFly` + `pieceCamera` +
`pieceAt` over every grain, after 30 frames to settle): a frame in the lane costs about half the
city's (6,500 grains: 4.9–5.3 ms against 11.5 in the city and 10.7 in the mouth; 15,000: 10–12 ms
against 18.5), with fewer grains near the eye and less screen area to fill (0.46–0.68 megapixels
against 1.28), no hitch at the gate, and the same numbers after the fix. So the lag was in the
picture, not the work: patterns passing the eye faster than half their spacing a frame read as
judder (the wagon wheel). The lane's pace is about 70 a second boosting, 140 with Shift: the
walls' and floor's **rail dots**, every 2 in lockstep rows, passed 1.2 a frame at 60 frames a second
and crawled back or stood; the **arches**, every 4, did the same under Shift; the **streaks** (9
apart, gaining 1.6 to 3 a frame at 60, twice that at 30) aliased on a slow frame; the **heads'
flash**, an on/off square at 7 a second, beat with the frame rate; and every streak's tail was cut
at each 40-long stretch's edge, blinking at the same places. Now: the rail dots are scattered,
each somewhere in its own stretch of 2 (stratified, standing still); the arches stand every 6, each
drawn denser, so the tunnel keeps its grains; the lights never gain more than 3.6 (0.4 of their
spacing) on the ship in a frame, so they still always outrun you and run exactly as fast as before
at 60 frames a second below a speed of 170; the heads pulse smoothly at 4.5 a second (0.45 to
full); a streak's tail runs on into the next stretch. Guarded in `lib/city-speedway.test.ts` ("the
speed tunnel runs smooth").

**Still rough.** Not yet seen in a browser (tests and timings only). The avenue's walls stand two
closer off the tile's middle column (an older quirk of `blockTower`), so the mouth is 12 across to
fit every copy. The sharks are light and may pass through the lane's walls if you hug one. Nothing
lands in Atlantis yet, and its tubes, like PR #465's tunnels, are for show (nobody walks them).

### Matrix quarter and Neon Market (2026-11-14)

> Two quarters to come alive. The Matrix quarter (the Green Code, renamed): always green,
> buildings rising and sinking, some towers blinking, running lights giving a feeling of speed;
> the first buildings at its edge round tubes you can spin around, deeper in more rigid and
> square; playful and interactive. The Neon Market: a few more bridges across its streets at
> various heights, a few flashing lights and signs, and ship currents as flying highways at
> different heights.

**The name.** Everything a player reads says Matrix: the district's name (Matrix quarter, on
the minimap and in fast travel), WELCOME TO THE MATRIX QUARTER over the avenue at both its
mouths, MATRIX on the gateways and the district sign. The internal id stays `code`, and so do
`lib/city-code.ts` and its exports. Only the mood is borrowed: our own glyphs, shapes and spire.

**The Matrix quarter** (`lib/city-matrix.ts`, `lib/city-rise.ts`; drawn from `lib/city-game.ts`):

- **Forms by depth.** A tower's form follows its row's distance from the quarter's nearer entry
  edge (the market's side and the next tile's Chinatown side): the entrance rows are **round
  tubes**, the next rows **octagons**, the four rows in the middle **square blocks**. Round and
  octagonal towers are as deep as they are wide (their narrower side), so there is room to fly
  round them and come back, and their walls are their own outline: a circle, an octagon, so the
  ship can pass close by where a box's corner would have been. A tube wears twelve ribs and a
  ring every seven up; an octagon its eight corners and a band every nine. The avenue's own towers
  stay square (its bridges and galleries hang on them).
- **Rising and sinking, more.** Seven towers in ten move now (it was a little under half), by
  three tenths to over half their height, on cycles of nine to eighteen seconds; no roof ever
  moves faster than 10 a second, so a tall tower's swing is held to what stays smooth. Never above
  the height they were built to; walls, hiding and the lift onto a rising roof as before.
- **Blinking.** About three towers in ten blink: a soft, doubly eased swell down to under a fifth
  of their light and back, on a 1.25 to 2 second rhythm, each tower on its own phase. Never dark,
  never more than a soft step a frame, so never a strobe. The kerb lamps do not blink.
- **Running lights.** On every tower, streaks of green race one way only: up the ribs or corners
  (and the middle of a square's faces), down them, or round the tower at three heights, one way
  round. Bright mint heads, tails fading behind, at 26 to 48 a second: falling code and pulses
  running up the edges, a feeling of speed.
- **Play.** As the ship comes within 30 of a tower's wall (and not high over its roof), its
  streaks brighten and stretch, so towers light up as you slalom past. Read from the ship's place
  alone each frame: no state, nothing kept.
- **Green only**: every light is a mix of the quarter's three greens.

**The Neon Market** (`lib/city-market.ts`, highways in `lib/city-currents.ts`):

- **Bridges.** About one pair of neighbouring market towers in two (plain towers, off the avenue,
  never the canyon's walls) is joined across the street between them, both ways across, hung at
  about 0.28, 0.52 or 0.78 of the lower roof and always 6 clear of the highways' heights: two
  rails each side, deck lamps, and a neon strip under it drifting slowly round the canyon's hues.
  Light, like every sky bridge: you fly through them.
- **Flashing signs.** The one exception to the city's mellow light, asked for by name. About one
  market tower in eight carries a framed word of our own (OPEN, LIVE, NOW, NIGHT, NEON, JOY) high on
  its -z wall (the shop words have +z), in magenta, cyan, amber or rose. Each flashes crisply on
  and off (edges of 35 ms) on a 1.1 to 1.7 second period: on for a little over half, or a quick
  double flash. Off, it keeps a faint tube (6%). Never the whole quarter, never a strobe.
- **Flying highways.** Six one-way streams of ships through the market, at three heights clearly
  apart, each between two of the canyon's cable heights and clear of the street channels (5 to 35)
  and the express lanes (112, 120): **low at 20** down the Neon Canyon's long run toward the
  Matrix quarter and back up the street at x 104; **mid at 57** across the market along two cross
  streets, opposite ways; **high at 94** down x 78 and back up x 130. Streams that cross run at
  different levels. In each, every ship flies the stream's one speed (13 to 22) at one spacing,
  fading in at its start and out at its end; low ships warm rose, mid magenta, high cyan, each a
  bright nose, wingtips, a fin and a tail; a faint line of lane lights under them carries a slow
  swell the way the stream flows, so you can see a stream from afar and slot in behind it.

**Cost.** Everything is near-eye items (within 160, ahead of the eye) computed from the time; no
per-frame state, no allocation per grain. A Matrix tower adds 64 to 128 streak sites to its
item; a highway 15 to 20 ships of nine grains and 65 to 90 lane lights; a bridge six lines.

**Acceptance** (`lib/city-matrix.test.ts`, `lib/city-market.test.ts`): no player-facing "Green
Code" left; round towers on the entrance rows, octagons next, square deeper in, round and
octagonal as deep as wide; collision at the circle (a box's corner free); outlines closed,
normals out; most towers rising, by a lot, smoothly; a share blinking, staggered, between 1.25 and
2 seconds, never dark, never more than 0.1 a frame; every tower's streaks one way, fast, brighter
with the ship close; every form green only; bridges both ways, at heights 15 and more apart,
under both roofs, clear of the highways, over open air; few flashing signs, crisp, lit a quarter
to three quarters of the time, at most two flashes a period; six streams at three heights 25
and more apart, in the market and in open air, crossings at different levels, every ship one
way at its stream's speed, evenly spaced.

### Alive quarters (2026-11-14)

The user's asks: ordinary towers much taller and joined at height; roads, ramps and bridges round
the temples and unique buildings, composed as one design; a big gate in each quarter; banners
across the streets you fly under; more bridges in the tall streets, which must still breathe;
signs turned every way; hanging lights in every quarter; bridges over the canals with arched
undersides; the Canals' unique buildings as big as the Heights'; a much taller Indian quarter with a
few super-tall spires; and highways of ships just over the low roofs. Code: `lib/city-alive.ts`
(and its shared ground `lib/city-alive-base.ts`), `lib/city-gates.ts`, `lib/city-banners.ts`,
`lib/city-plazas.ts`, `lib/city-canal-bridges.ts`, `lib/city-strokes.ts` (structures drawn as
strokes of light, built once), with small hooks in `lib/city-game.ts` (the towers' heights, the
spires' open blocks, the Canals' designs, one call in the items) and `lib/city-currents.ts`
(SKY_STREAMS). Light only, mellow: a slow drift, nothing flashes; nothing new blocks the Ship.

- **Taller towers:** the plain and business towers off the avenue rise per quarter (RISE: the
  Indian quarter 36 to 72, the Heights 92 to 124, the Canals 38 to 84, Golden, Industrial, Domes
  and the market up to 90 to 104, about a fifth taller still), never lower than they were. They
  stay under ALIVE_CAP (128: the high currents dip to 142), ten under a big ship's line over their
  column (the liner over column -5, the barge over column 4), under the metro and the sky lounges.
  The first column beside the avenue keeps its height: the quarters step up away from the avenue.
- **Sky bridges and walkways:** between neighbouring towers of the same quarter, across both kinds
  of street, at up to three of SKY_LEVELS (38 to 102) under both roofs: glass tubes, trusses and
  slender arched walkways, lamps along their decks.
- **Hanging lights:** strings across the side streets of every quarter but Chinatown and the
  Indian quarter, at 24, 34 or 46, lamps on drops in the quarter's shape (globes, bells, cages,
  stars, paper drops), a slow swell along them.
- **Gates:** eleven, one in each quarter but Chinatown, across the wide street two lines off the
  avenue in the quarter's second row, each its own style (Mughal arch, horseshoe arch, glass
  portal, Venetian bell towers, half sun, gopuram, steel gantry, onion domes, pylons, neon frames,
  wireframe), its posts at the walls, every beam 20 or more over the street, the quarter's name on
  its lintel.
- **Banners across the streets:** wall to wall on two cables, across the side streets (facing
  along them) and the cross streets (turned a quarter), feet at 38 to 80 so you fly under or over.
- **Signs turned every way:** blade signs standing out of the walls into the cross streets (read
  flying along them), corner signs at forty-five degrees over the crossings, signs on posts over
  the roofs at their own angles (top 104 at most, never into a highway).
- **Plazas:** round every landmark (but the race plaza) and big square: a ring road with its dashed
  line, a pool with rings spreading from it and paving rays, a ring walkway at 22, two ramps
  curving up to it through opposite quarters, four bridges in to a halo round the building.
- **Canal bridges:** fifteen over the three canals at the middles of blocks: tall single arches,
  low three-arch stone bridges, slender footbridges whose deck is a curve, the Gallery Bridge (a
  wide arch with an arcade on top) and arched sky bridges from tower to tower at 44, 62 or 84.
  Every arch's underside curves up to its crown, over ten above the water; nothing under it;
  every street-level top under 11 (the cross street's lowest lane is 15).
- **Canals' unique buildings:** the Studio's designs in the Canals stretch upward to 92 to 124
  (their footprint kept), under the metro and any big ship's line.
- **Indian spires:** the Saffron Shikhara, the Garden of Lamps and the Marigold Dome (Studio
  buildings stretched to 112 to 126) on blocks of their own kept open, out from under the metro,
  spread over the quarter, ten under any big ship, under the rings and far under the stations.
- **Highways over the low roofs:** four, three lanes abreast, one way each, the market's look in
  their quarter's tone: two over Egypt's pyramids (40, 46), two over the Temples' quarter (86, over
  its temples up to 79); each over every roof under it by six or more in every copy of the tile
  (a raised tower stays HIGHWAY_CLEAR under one), clear of the street lanes, the big ships, the
  high currents and the stations.
- **Higher streams:** two, one way each, the length of the tile at 186: over the high currents'
  loops (182 at most), under the stations (their lowest over 190) and the ring sets.
- **Orbits round the monuments** (`lib/city-orbits.ts`): round every landmark but the race plaza,
  every big square, the fifteen new buildings, the Indian spires and the Turquoise Crown, a ring of
  ships at a constant radius seven outside its reach, one way, at the lowest height over every roof
  under it by eight that is clear of the street lanes, the big ships' lines and the ring sets (104
  at most, under the express lanes, the flocks and the high currents); about half get a second ring
  higher flying the other way, about a third fly the first as a two-turn spiral, up or down, fading
  at its ends. Found per tile copy, since the towers round a monument differ from copy to copy.
- **The Oriental quarter, Istanbul-like** (`lib/city-istanbul.ts`): its towers rise to 40 to 84
  (some to 106), each plain one crowned with a drum and dome of our own, now and then a smaller dome
  stacked over it, and two or four slender needles with balcony rings and pointed caps, turquoise
  and gold. The Turquoise Crown, the centrepiece, on its own open block at the quarter's entrance
  (block 3, row 8): an octagonal shaft in five tiers with balcony rings, a drum and a great dome at
  132 to 150, a gold finial to 176, four needles beside it; taller than every tower in the quarter
  and than the Crescent Needle (162), under the stations and the ring sets. Like the fifteen new
  buildings it stands in the high currents' band (142 to 182): light, the ships fly through it.
- **Lanes:** whatever crosses a street keeps LANE_CLEAR (4) from every street channel's height (5,
  11, 15, 30, the express 112 and 120), and in the market from its highways'.
- **Acceptance:** `lib/city-alive.test.ts`, `lib/city-gates.test.ts`, `lib/city-orbits.test.ts` and
  `lib/city-istanbul.test.ts`: towers raised and capped, orbits at a constant radius, one way, over
  the roofs and clear of the walls, the higher streams threaded, the Oriental quarter raised and the
  Turquoise Crown its tallest,
  the Canals' uniques at the Heights' scale, the spires and their clearances, sky bridges, hanging
  lights in the new quarters, the highways over the roofs and one way, gates per quarter with room
  to fly through, banners in both orientations with room to fly under, signs in several
  orientations, canal arches concave with room under, plazas inside their blocks, no grains in the
  lanes, a modest budget, and nothing jumping between frames.

### Temple skyscrapers and the Skyscraper series (2026-11-14)

> "Temple quarter should have a bunch of awesome unique skyscrapers as well, with a big long
> bridge between them, so they are not right next to each other. This creates cool spaces to fly
> around. Add a skyscraper series to the designs." And: "Perspective is everything and the whole
> point of this city. Perspective is power, and makes it beautiful."

Code: `lib/skyscrapers.ts` (the series), `lib/city-skyscrapers-plan.ts` (where the towers stand,
how the high currents climb over them), `lib/city-skyscrapers.ts` (drawing, bridges, walls), with
small hooks in `lib/city-game.ts` (open blocks, walls, one call in the items),
`lib/city-currents.ts` (loopAt) and `lib/city.ts` (the Studio piece).

- **The Skyscraper series:** a Studio piece after Buildings, eleven pills (label "Skyscraper"):
  Helix Twist (36 square floors turning a quarter and a half turn, tapering), Crowned Needle (an
  eight-sided needle with a crown of eight tines), Offset Stack (five boxes set off one another,
  garden rails on the terraces), Garden Void (opened right through at its sky gardens, only its
  corner columns standing, trees and lamps between), Twin Crown (two legs with a slot between,
  joined high by a glass crown), Lattice Spire (a diagrid of light round a glass core), Orbit Tower
  (a domed round core, three tilted rings turning very slowly), Stepped Temple Tower (a temple's
  terraces, a ribbed shaft, a stepped crown, a gold finial), Prism Blade (three-sided, turning, its
  roof cut on a slant), Lotus Crown (a slim shaft opening into eight glass petals) and Arch Gate (a
  tower on a great arch you fly under). Our own designs. Each is a builder of any height and
  footprint, standing inside its square at every height (its reach), cut by voids where asked
  (nothing drawn there); the golden palettes as the other Studio pieces.
- **Five towers in the Temples quarter,** each on a block of its own in columns 4 and 5, rows 26
  to 31, staggered like a chessboard so no two stand on neighbouring blocks (a diagonal block apart
  at the nearest, nine or more of open air between their walls), 150 to 170 high (every tower in
  the quarter is under 110; the tallest three over Ivory Echo's 157): the Garden of Bells (Garden
  Void, x 143, row 26), the Gate of the Barge (Arch Gate, x 117, row 27), the Helix of Dawn (Helix
  Twist on a gate, x 143, row 28), the Twin Lanterns (Twin Crown, x 117, row 29) and the Stair of
  Light (Stepped Temple Tower on a gate, x 143, row 31). **Perspective:** two files, x 117 and x 143,
  that line up as you fly down the quarter, two rows of gates receding: the lantern barge (x 117,
  96) sails through the file on x 117, the Temples' eastern highway (86) through the file on x 143.
  The blocks beside them in columns 4 and 5 are open, but for the Studio's temples, which stand low
  and well back. A design that cannot carry a slot stands on a gate: two legs either side of the
  slot and a lintel, the design on top.
- **Clearances:** kept off the racing corridors (x 66 to 90) and the slimmed columns beside them (2
  and 3; nothing opened there, so every corridor obstacle keeps a tower beside it), off the avenue
  and its own columns (0 and 1), off the river's row and its neighbours (23 to 25, so the river
  gap's walls stay put); every footprint inside its block (4.5 or more from each street's middle);
  clear of the landmark's plaza and orbit, Ivory Echo's orbit and the Domes' big square; under the
  higher streams (186) and the stations.
- **Five long bridges,** every tower joined, spans of 40 to 80, no piers, none over a corridor's
  column: a lattice truss and a bowstring arch down the file on x 143, an arch under its deck down
  the file on x 117 (each framing the view across the quarter as you fly under it), a straight deck
  crossing between the files and threading the gap between two towers, and a second truss; decks at
  128 to 140, every part between 124 (over the express lanes) and 145 (under ordinary flight's
  ceiling, 150): you fly under, over and between.
- **The high currents climb over them:** over the towers' area (and twelve round it) every loop
  flies at 177 or more (the tallest plus seven), easing back to its own height over 110 round it, a
  soft maximum so the flocks climb without a jolt, still under the higher streams.
- **Walls:** each tower's square at each height and each bridge's deck hold the Ship off
  (`blocked`); its voids are open, so you fly through the gates and under the arch.
- **Light and budget:** 3,600 sites a tower, the bridges as strokes of light built once; ivory
  leaning slowly to gold, lamps breathing; nothing flashes.
- **Acceptance:** `lib/skyscrapers.test.ts` and `lib/city-skyscrapers.test.ts`: the series
  registered with eight or more designs, each inside its footprint and out of its voids; the towers
  apart, in files, the tallest in the quarter; the corridors, their columns, the avenue and the
  river's rows clear; bridges joining
  pairs with room under and over; the currents lifted and smooth, the highway, the barge, the high
  streams and the orbits clear; walls that stop the Ship; the grain budget; slow light.

### Mountain and Favela quarters (2026-11-14)

> "add the mountain and favela above, so the city becomes more square. doesn't have to be a
> square map yet." Then: the two quarters need not take the strip's full length; and "draw the
> mountains NOT as scattered dots but as TOPO LINES, contour lines like a topographic map".

**The plan, wider** (`lib/city-grid.ts`, `lib/city-annex.ts`). The tile is two strips wide now.
The **strip** is the twelve columns the quarters always stood in (x from -156 to 156 round the
avenue), every block, landmark, start and street exactly where it was. The **annex** is twelve
more beside it on +x (x from 156 to 468), the top of the map on a wide screen, so the tile is
624 across and 1904 along: about three to one, where it was six. The whole city still repeats
every tile both ways, so everything that repeats every `TILE_X` (the far city's tile, the high
currents, the stations, the rings, fast travel's copies) now repeats every 624; a strip column's
own number is unchanged (`STRIP_I`, `tileCol` now runs -6..17, the annex 6..17). The annex holds
two quarters along the tile: the **Mountain quarter** from the tile's start to the river
(rows 0 to 23), the **Favela** past it to the tile's end. The river runs on between them. The
annex has no streets: its blocks are open ground (shape `hill`); no towers, street lights, cars,
street currents or cross-street cruisers there; the strip's +x edge is a main road.

**The Mountain quarter** (`lib/city-mountain.ts`):

- **Peaks.** Eight rounded cones, steep near the summit and easing out to a wavering foot, 96 to
  128 high, with valleys to fly between and saddles where their feet meet. Four end in a small
  plateau for a summit temple. Nothing over 128 (a temple's roof under 142), so the high currents
  and the long ferry pass over.
- **Topographic lines.** Each peak is drawn as its contour rings, one at every 8 of height,
  every fifth an **index contour** (brighter, paler, its points closer): grains sit on the
  curves, never over the slopes. Where a neighbour's slope stands higher a ring is hidden, so the
  lines merge round the saddles as a map's do. Three faint ridge lines run from each summit to
  its foot. Colour: the Art builder's Data Peak ramp, violet at the foot through magenta, amber
  and pale gold to a white summit; each ring's hue leans slowly up and down the ramp and its
  light breathes (no flash).
- **Temples.** On the four plateaus and on a ledge halfway up each other peak, turned toward the
  strip: a platform's rim, four columns, two eaves and a roof to a tip, a warm lamp inside; gold,
  ivory and saffron.
- **Stairways.** From the foot of each temple's peak, zigzagging up its city side, a step about
  every 1: two rails, a tread and a lamp at every seventh step; the last 8 a flight rising off the
  slope onto the platform.
- **Cable cars.** Six stations (a lower and a valley station by the strip's edge street, four on
  summits) and five cables between them, each two ropes sagging gently. Four cabins a cable glide
  at 2.2 a second, up one rope and back down the other, evenly spaced, a formula of the time;
  each a framed box with warm windows on a hanger. Every cable clears the slopes under its cabins
  by 3 and more.

**The Favela** (`lib/city-favela.ts`): nine low domed hills past the river, cut into terraces 3.6
apart. Along every terrace small houses stand side by side, each its own width (2.6 to 4.4), one
to three storeys, so they stack over one another as they climb: about 8,500 houses, hundreds to a
hill. Our own design, a warm palette: coral, orange, ochre, rose, cream, terracotta, now and
then turquoise, lime or lilac. Narrow alleys open now and then; four straight stairways climb each
hill, kept clear of houses, lamps at every eighth step. Over half the windows glow warm, flickering
slowly; about a third of the roofs carry a water tank, a fifth an antenna with a soft red light;
strings of small lights hang along every other terrace, sagging between poles, twinkling slowly.

**Collision.** A cheap height field in `blocked`: in the annex, a peak's slope, a temple's or
pylon's box, or a hill with its houses (its slope plus 8.8 since 2026-11-15, reaching 1.5 past its foot) holds the ship, `MARGIN` round. Off
the slopes the street and the river are the floor as everywhere.

**Gateways, names, fast travel.** Each quarter's name over its way in, as the bands' gates are:
MOUNTAIN QUARTER on the river's bank, FAVELA at the tile's end, between two glowing posts. Both
are districts with names (the label as you enter), colours, quarter-ship designs (Peak glider,
Rooftop balloon) and starts, after the Matrix quarter in the plan's order: the Mountain's on the
river's bank looking up the valley, the highest peak beside the way; the Favela's at the tile's
end looking up the open way past its last hills. The map shows the annex above the strip on a
wide screen, its peaks as contour lines (rising in rings on the 3D map), its hills as terraces,
the temples and cable stations named; the far city carries a coarse cut of the contours and a
glow for every eighth house.

**Cost.** The geometry (contour points, steps, about 8,500 houses, string bulbs) is
laid out once into flat arrays the first time it is asked for; a frame only builds items for what
is in reach and ahead, and each site writes straight into the renderer's array (no allocation per
grain). The renderer thins them by distance as everything else.

**Acceptance** (`lib/city-annex.test.ts`, `lib/city-mountain.test.ts`, `lib/city-favela.test.ts`):
the tile 624 across, every strip quarter and landmark where it was, copies too; the annex's
blocks open, mountain to the river and favela after; the annex above the strip on a wide map;
peaks, temples, hills and houses block, valleys and the river open; contour grains on their
lines (within 0.7 of the slope's height), rings every 8, index every fifth, mellow; temples on
their slopes, stairs from foot to platform, cables clear, cabins moving slowly along their ropes;
the favela dense (over 0.05 houses a square metre), warm, tanks and antennas on some, stairs
clear; no street current or car in the annex; both starts clear and reached by fast travel; the
grain budget kept at 6,500 and 15,000, every grain finite.

### Industry superquarter and the observatory (2026-11-14)

> "a new INDUSTRY SUPERQUARTER in the annex alongside Mountain and Favela ... a massive giant
> factory town: factories like the existing ones but much BIGGER, inspired by cement factories
> (silos, kilns, preheater towers, conveyor galleries), CONNECTED to each other into one mega
> set", "LOTS of bridges, rails and diagonal conveyor galleries and pipes, so you can fly below
> them and in between the parts", "big nuclear cooling towers, windmills with turning blades, big
> spinning wheels, and mechanical clockwork movements", "the ATOM SYMBOL on top of one of the big
> industry towers", and "also add an OBSERVATORY design to the Domes collection". The principle:
> "Perspective is everything and the whole point of this city. Perspective is power, and makes it
> beautiful."

**The annex in three** (`lib/city-annex.ts`). The annex now holds three quarters along the tile:
the **Mountain quarter** (rows 0 to 23, unchanged), the **Favela** (rows 24 to 44) and the
**Industry superquarter** (rows 45 to 55, 312 across by 374 along). The Favela keeps its first six
hills, every one where it stood; the three beyond them gave their ground to the industry (still
thousands of houses). Its gateway and start moved to its edge with the industry.

**Laid out for perspective** (`lib/city-industry.ts`). One long open lane, the **Great Lane**,
runs the quarter's length from its gateway at the tile's end to the **Atom tower** at its far
end, kept clear 16 either side of its middle and lined with sodium lamps and dashed edge lines like
a runway. Five stations of works stand along it in two rows, a work a side at each: kiln halls
(sawtooth roofs, warm windows), silo batteries (four silos and a headhouse), preheater towers
(an open frame of stacked cyclones) and, at the last station, two industry towers. At every
station a diagonal conveyor gallery crosses the lane, rising one way and then the other at the
next, so the galleries recede as a run of frames toward the atom; the towers line up behind them.
Between the stations: two pipe racks, an elevated rail bridge and the **clockwork gate** cross the
lane too. Everything over the lane stands at least 20 over the street, so the ship flies under all
of it, at street level and higher, from the gateway to the atom.

**Connected.** Galleries run along each row from work to work (diagonal, from one work's top to
the next one's middle) and from each row's last tower up to the Atom tower, so all eleven works
are one set; big pipes join each cooling tower to its nearest work over the rail viaducts. A
gallery is a truss tube (four chords, a frame every 3, bracing zigzagging on both sides) with a
conveyor along its floor on which soft sodium pulses glide.

**Outside the rows.** Two rotary kilns roll slowly beside the lane (striped shells turning, riding
tyres, a burner's ember glow). Two elevated rail viaducts run the quarter's length either side,
each with a slow ore train of six hoppers fading in and out at its ends. Two pairs of hyperboloid
**cooling towers** (96 high, drawn by their straight rulings twisting both ways, rings, a warm glow
in the throat, slow steam rising) frame the rows; between each pair a **big spinning wheel** (26
across its spokes) turns slowly the opposite way to the other. Two chimneys breathe slow steam.
Seven **wind turbines** stand along the far edge, three blades each, turning at about a turn every
twenty seconds.

**Clockwork** (`lib/city-gears.ts`). The clockwork gate hangs a train of five meshing gears on a
lattice frame over the lane; two more trains turn on the kiln halls' walls facing the lane. Gears
mesh truly: one tooth pitch for all (teeth in proportion to radius), centres two pitch radii
apart, neighbours turning the opposite way at speeds in inverse proportion to their radii, started
at the phase that puts a tooth into the other's gap where they touch, for all time. A big gear
takes over a minute a turn.

**The atom.** The Atom tower is the quarter's tallest (112, a tapering lattice), its atom on a mast
over it: a nucleus of light and three orbits turning slowly round the vertical, an electron with a
short fading trail on each. Its top stays under 142 (the high currents' loops). It is weighed as a
landmark (drawn densely from the lane's far end) and stands in the far city brightest of the
quarter.

**Light.** Mellow: sodium orange, steel and cement grey, warm windows. Pulses glide, lamps and
beacons breathe, steam drifts, nothing flashes.

**Collision.** A bucketed check in `blocked`: the works (boxes), cooling towers (their real
hyperboloid radius at each height), chimneys, kilns, turbine masts and the tapering Atom tower
hold the ship, `MARGIN` round. Galleries, rails, pipes, gears, wheels and blades are light, flown
through as the other sky bridges are.

**Names, travel, map.** The district `industry`, named **Industry superquarter**, its colour a
warm cement, its quarter ship the **Ore hauler**. INDUSTRY over the Great Lane at the tile's end is
its gateway; its start stands there looking straight down the lane to the atom, after the Favela
in the plan's order. The map shows it beside the Favela with its works', silos', cooling towers'
and chimneys' footprints as lines and the Atom tower, the clockwork gate and the cooling towers
named; the far city carries its towers' rims, works' roofs, chimneys, turbine hubs and the atom.

**Cost.** About a hundred pieces laid out once, each with flat numbers; a frame builds an item only
for what is in reach and ahead, and each site writes straight into the renderer's array (no
allocation per grain). The renderer thins them by distance as everything else.

**The Observatory** (`lib/golden-buildings.ts`, `lib/city-observatory.ts`). A new design in the
Domes collection, after the Lattice and before the rungs: a round terrace, a drum with lit windows,
a hemispherical dome cut by an opening slit from its foot over the crown (its edges bright ribs,
its shutter folded back), and a telescope on a fork mount looking out through the slit at a few
stars. In the game it stands once, in the Solarpunk domes quarter on the block beside the garden of
domes' plaza (column 4, row 35, kept open), at its Studio proportions (not stretched, so its dome
stays round), its slit toward the long way of the city; its drum and dome are solid. The domes'
landmark and blocks keep their own buildings (the group of domes moved one place along the list).

**Acceptance** (`lib/city-industry.test.ts`, with `lib/city-annex.test.ts`): the annex holds the
Mountain, the Favela and the industry in order, every hill short of the industry; every work joined
to every other by galleries, most of them diagonal, their ends on their works' faces; every span
over the lane at least 20 up, the lane open along its length at street level and higher, open ways
between rows, towers and turbines; cooling towers hold the ship from wall to throat and let it over;
works, chimneys, kilns and the Atom tower hold it; gears mesh (one pitch, two radii apart, opposite
turns, phases summing to whole numbers at the contact, rims never crossing) and turn slowly;
turbine blades a third of a turn apart and turning; the atom on the tallest tower, under 142, its
orbits and electrons moving; the Observatory among the domes and standing solid in the domes
quarter; the start clear and reached by fast travel; the grain budget kept at 6,500 and 15,000.

### Racing corridors and the Heights–Golden bridges (2026-11-14)

> "I love the space between the Heights and Golden Garden. Add more bridges higher up, so I can fly
> below them, or above, or in between. That width is perfect for racing and the pleasure of flying."
>
> "Some Chinatown parts are getting too overloaded with panels and lampions and stuff. Would be cool
> to have openings so I can fly through."
>
> "Open up and enlarge the main long streets, so it creates other long corridors like the central
> horizontal one on the map, but three buildings above and three below. Make that long road larger,
> from far left to far right ... where I can zigzag a bit and go above and below."
>
> And over all of it: "Perspective is everything and the whole point of this city. Perspective is
> power, and makes it beautiful."

**Perspective first.** Each of the three is designed for sightlines: long, straight, open views;
things that recede into the distance as frames; openings that show what lies beyond.

**The Heights–Golden bridges** (`lib/city-gap-bridges.ts`). The space the user loves is the river's
strip: the river along x before row 24, the Heights' towers back from its north bank and the Golden
gardens' from its south, **30 wall to wall**, kept exactly (no tower moves; the walls tested
against their measured places). West of the avenue, where the two quarters face each other, **six
bridges** span it bank to bank (x −144, −120, −112, −60, −40, −18: off the street lines' ground
bridges and the corridor at x −78), each with **two or three decks stacked**: 15 decks from 18 to
112 over the street, four low (under 35), five middle, five high (over 75, one at 112). The lowest
deck of each stands 16 or more over the street, and 20 or more of open air separates any two decks
of one bridge, so you fly under, between or over. Heights are staggered from bridge to bridge, so
flying along the gap the decks climb and fall like a staircase receding ahead. Three styles in
turn: **flat** decks with rails, **arched** decks (an arch over each edge rising 5, hangers down),
**lattice** girders (a top chord 3 up, diagonals zigzagging). Slim posts of light on the embankment
walks carry them, with a warm lamp where each deck meets a post. Steel toward the Heights warming to
gold toward the gardens, a slow swell across each deck. Light, like every sky bridge; drawn out to 420.

**Chinatown breathes** (`lib/city-chinatown-open.ts`). Fewer: tall signs four levels up a tall tower
and two on the rest (were five and three), lantern strings across its side streets at 9, 26 and 50
(were five heights), walkways on three heights in ten (were half), rope lights on four streets in ten
(were six), 44 flying lanterns a stretch (were 64). Over one Chinatown that is 358 signs, 229
strings and 17 walkways where there were 512, 368 and 38 (a third fewer in all). Its character
stays: storeys, tiered towers, signs at several heights, strings, walkways. **Seven windows**, clear boxes of air from end to
end of the stretch: three down side streets (x −130 from 10 to 32 high, x −52 from 34 to 56, x 52
from 20 to 42) and two along each of two cross streets (row 2 from 14 to 36, row 6 from 34 to 56),
either side of the avenue. No sign, string, walkway or rope reaches into a window, and no tower
stands in one, so each window frames a long view through to the next quarter. Strings and walkways
are never strung across a racing corridor either.

**Racing corridors** (`lib/city-corridors.ts`). The street lines **x = ±78** (three blocks either
side of the avenue; the landmarks' columns) open to **24 wall to wall along the whole tile** (the
avenue is 18, the widest ordinary street 20, the average 11.5). The towers on the blocks beside them
step back and slim (`corridorClear`, hooked into `blockTower` after the wider streets): never thinner
than 7.2 (Chinatown's 7, its lanes still fourteen). Where that is not enough, the boulevard on the
far side gives up the rest; it is never narrower than it was before the wider streets, nor than nine.
To make room: none of the twenty designs stands beside a corridor (a round plinth cannot slim);
Egypt's pyramids there are smaller (the golden slope kept); the Neon Canyon's two walls on column 2
stop 12 short of x 78 (they stopped 3 short); the three Embassies of Happiness moved one block out
(Lotus to −5, 30; Hanging Gardens to 4, 11; Prism to 4, 46). The through tunnel's row keeps its place,
so for its five rows the tower across stands further back and the corridor is 20 there (x 72 to 92).
The landmarks and big squares stand on the corridors' crossings in their open plazas (52 across),
light, so the corridors run through them like roundabouts: a tall marker at the end of every long
view. The gateways, Atlantis's mouth, the stations and the rings are over the avenue or high
above, so none crosses a corridor.

- **Obstacles, sparse.** Fourteen in a tile, seven on each corridor, taking turns down the plan
  (never side by side, five rows or more apart on one corridor, never in a plaza or by the river):
  in turn a **low bridge** (deck at 12: hop it or dive under), a **ring gate** (radius 9 at 24,
  standing across the corridor) and a **high bridge** (a lattice deck at 40). On the corridor's
  middle and drawn out to 420, so seen down the corridor they recede as a row of frames, each
  smaller than the last. Light; rose on the −x corridor, teal on the +x, a slow chase round each gate.
- **Kerbs.** Lamps along both walls every 8, out to 320 each way: two lines converging on the
  vanishing point, a slow swell running along them. Spanning lights (lantern strings, walkways, rope
  lights) are never strung across a corridor.
- **The map.** Both corridors are main roads in gold, their two walls the whole tile long, on a
  pale band like the avenue's.

**Cost.** A few items a frame: each obstacle 160 to 450 sites, the kerbs some 160 a corridor, each
gap bridge about 1,500 (decks and posts); all computed from the time, nothing kept, no allocation
per grain.

**Acceptance** (`lib/city-corridors.test.ts`, `lib/city-gap-bridges.test.ts`,
`lib/city-chinatown-open.test.ts`, `lib/city-streets.test.ts`): the Heights–Golden walls where they
were, 30 apart; six or more bridges off the corridor and the ground bridges, decks stacked with 20
of air between, the lowest 16 up, low, middle and high bands, all three styles; flying under,
between and over every deck free; sites bank to bank, finite, mellow. Chinatown's clutter down by a
third and more, still hundreds of signs and strings; seven windows twenty high, no tower in them and
no sign, string, walkway or rope reaching in. Both corridors 24 across on every row (20 beside the
through tunnel), in every copy, flown end to end low, middle and high with nothing solid, wider than
every ordinary street; landmarks and big squares on open plazas, embassies and canyon walls off them;
nothing strung across; obstacles sparse, staggered, mid-block, room under and over each; a long view
down each corridor with frames receding in order and kerbs out past 300; both on the map as main
roads. The grain budget kept at 6,500 and 15,000 racing a corridor, among the bridges and in a
Chinatown window, every grain finite.

**Still rough.** Not yet seen in a browser. The bridges, gates and kerbs are light (nothing holds the
ship, like every sky bridge). The landmarks, big squares, the fifteen buildings on blocks beside
the corridors (Lily Bell, Ivory Echo), the Studio's buildings on open blocks and the halos round some
buildings are light and still stand in or reach into the corridors. The corridors have no race
course of their own yet.

### Space bars, the Saturn tower, the great arch (2026-11-14)

> "A space bar in big flying buildings with terraces, warm, beautiful. Add 5 space bars to the
> designs as a category of its own. Some more elegant with golden lights, with a name above. One is
> the Flying Saloon, cowboy style."
>
> "A giant triumphal arch over one of the main big streets", "a big tall tower with a large Saturn
> on top of a pole, as the symbol of the city", "add some big novas around the golden spire", and
> "make sure the buildings with unique designs are properly big and reach high".
>
> Over all of it: "Perspective is everything and the whole point of this city."

**The Space Bar series** (`lib/space-bars.ts`): five flying bars of our own, a piece of their own in
the Studio ("Space bars", after the Canyon, one bar to a pill, label "Space bar", golden palettes),
and the same five floating in the game's sky. Each is grains from the shared primitives, round its
main deck, with open terraces, warm amber and gold lamps (a soft twinkle at most, 0.2) and its
**name glowing over it** on a framed sign, read the right way from the front and from behind.

| Bar | Sign | Form |
|-----|------|------|
| Flying Saloon | FLYING SALOON | a wooden western saloon on a floating rock: a stepped false front with a lantern sign, a porch terrace on six posts with lanterns along its roof, swinging doors swaying gently, a water tower on legs behind, wagon-wheel lamps on the deck's corners |
| Golden Lounge | THE GOLDEN LOUNGE | three round terraces stepping up on slim gold columns, gold rails lined with lamps, glass rings round the lounge, a ribbed crown with a finial, a chandelier hung beneath |
| Moonlight Terrace | MOONLIGHT TERRACE | a crescent deck of gardens (seven trees), a pergola of nine arches of lamps, a long lit counter on its inner rim, light falling from its tips, a crescent of light standing over it |
| Lantern Junk | LANTERN JUNK | a sky ship with a bar on its deck: three batten sails as canopies, strings of lanterns from the masts, warm portholes, two great lanterns at the stern |
| Amber Balloon | AMBER BALLOON | a great balloon of amber gores over a round basket terrace, its burner breathing a soft fire, three little balconies hung round it, sandbags of light |

**In the sky** (`lib/city-bars.ts`). Their decks float 200 to 222 over the street (all of each from
190 to 260, sign included): over the high currents' flocks (to 182), under the stations' and the
parcours' layer. They stand a little off the avenue, either side in turn (x ±40 to ±45, at z 262,
700, 1305, 1560, 1840), so flying up the avenue they float by left and right, framing the long
view. Each turns slowly (0.018 to 0.03 radians a second) and bobs 2.2 to 3 over 18 to 24 seconds,
from the time alone. Clear of every station, ring set, parcours ring, portal, of the arch, the
Saturn Tower and the spire's novas, and 200 or more apart (tested). Light: the ship flies through
them. The two nearest are drawn with the stations (weight 1.8, thinned with the distance).
**Docking**: flown slowly into a bar's middle the ship docks as at a station (the same rules,
`lib/city-skyport.ts`, the bars numbered on after the fifteen stations); "Docked · Flying Saloon";
its lamps warm. The fireworks keep off them. **The map** shows each as a small warm cup, its name
beside it; a tap flies there, ending 30 past its reach, level with its deck, facing it.

**The Great Arch** (`lib/city-symbols.ts`): across the avenue at row 13 (z 459), our own design
after the triumphal arches: two piers on the blocks either side (x ±28 to ±50, 24 deep, kept open
for them), an opening 56 wide springing at 300 with its crown at 328, a cornice at 350, an attic to
392 with **CITY OF DREAMS** on both faces, and a crowning sun of thirteen rays and a halo to **436**
over the street. Pilasters of warm lamps up every pier face, a gold niche high on each, coffers of
gold across the vault's soffit, lamps round the archivolt. The avenue under it keeps its towers, its
traffic and its route; the ring parcours passes through the opening (tested clear of the stone).
**Collision on the piers only**: the opening is free from the street to under the vault. The high
currents are laid out on cells of their own, not the plan's, so somewhere one always crosses a pier:
each pier is open right through at a **loggia** from 134 to 198 (only its four corner columns
standing), where the flocks fly (142 to 182), and the ship may fly through it too. Seen down the
avenue from 700 off, it frames the street.

**The Saturn Tower**: the city's symbol and its tallest thing, beside the avenue at the plan's heart
(block 1, 32, kept open; across the avenue from the Golden band). A round stepped plinth, a pole of
six gold edges tapering from 5 to 1.4 up to 404 (rings every 16, a light climbing it slowly, two lit
decks at 150 and 280), and on top a **planet** of radius 24 at 430, banded in sand and cream with a
warm equator, its **eight rings** (radius 32 to 55, a gap between the fifth and sixth) tilted 0.42
and turning very slowly round it. Its top, 454, is over the arch (436), the sail tower (287) and
everything else, under the stratosphere (520). Light, like the landmarks. Clear of every station by
15 and more, of the parcours, of the bars.

**Big novas round the Golden Spire**: six Nova Cores (the Studio's cores, each a different kind,
without their plaza), 2.4 times the Studio's size (reach some 26), climbing round the spire in a
slow spiral 38 from its axis, one each sixth of a turn, from 48 to 178 over the street (under the
spire's tip), off the directions of the Sunleaf Column and the Halo Stack; gold, warm and amber.
Their feet stay over 20 above the corridor running through the plaza.

**Properly big.** The four crowns that read small beside the others are stretched up over their
old landmark's top (everything under it kept): the moon arches 140 → **192**, the temple mountain
138 → **188**, the mosque's crown 142 → **192**, the stack of domes 142 → **195**. The big squares'
temples, domes and Nova Cores are stretched further up (7.5, 10 and 9 times, were 5.5, 7 and 6):
**79 to 133** high, were 55 to 98, still under the high currents. No ordinary filler had to go
beyond the three blocks opened for the arch's piers and the Saturn Tower.

**Cost.** The arch some 9,100 sites, the Saturn Tower some 7,900, each nova 1,500, the bars 3,700 to
4,400 (the two nearest drawn): all computed from the time, nothing kept, thinned by the renderer like
everything else; the grain budget kept at 6,500 and 15,000 flying through the arch and by the
Saturn Tower.

**Acceptance** (`lib/space-bars.test.ts`, `lib/city-bars.test.ts`, `lib/city-symbols.test.ts`, and
the clearance suites): the series a piece of its own with five bars, the Flying Saloon among them,
each with a name sign over it read both ways, warm, mellow, finite, its doors swinging smoothly;
the bars in their band, clear of the stations, rings, parcours, portals and symbols, on the map,
travelled to, docked at, fireworks kept off; the arch spanning the avenue with the opening free and
the piers solid (loggia open), the parcours through it, off the metro, the stations and the
corridors, drawn from 700 off; the Saturn Tower the tallest, ringed, tilted, on its open block,
clear of the sky; six novas round the spire with no gap over a quarter turn; the four crowns and
the big squares taller than before; the grain budget kept.

**Still rough.** Not yet seen in a browser. The Saturn Tower, the novas and the bars are light;
the novas share the air with the high currents where they cross the spire's plaza.

### UFOs, more flying cars and the space police (2026-11-15)

> "More cool unique UFOs like the current circular orange ones, some bigger UFO ones that fly around
> the city, and more flying cars flying around. They are awesome."
>
> "Space police with flare lights; they travel through town sometimes at full speed chasing other
> spaceships like ours."

Perspective first, as everywhere in the city: every new path runs along the long views (the
corridors, the boulevards, the city's length), so UFOs, cars and chases recede to the vanishing
point. All three are items the plan deals grains to like any other, nearest first and thinned with
the distance, hooked into `gather` in `lib/city.ts` in three lines; every place a formula of the time.

**UFOs** (`lib/city-ufos.ts`). The circular orange ones are the cruisers' ringed orb (a warm orb in a
turning rose ring). Eight designs of our own in that spirit, every hull warm orange:

- Small, darting: **Ember saucer** (a lens under a small dome, eight rim lights turning), **Halo
  ring** (an open turning ring, an orb hung at its heart on three spokes), **Twin discs** (two discs
  with air between, their lights turning opposite ways, a column of light joining them), **Lantern
  lens** (a thin lens trailing three swaying lights), **Triad** (three orbs turning round a faint
  ring). 2.2 to 3 in radius, 90 to 110 sites.
- Big, drifting: **Crown dome** (a wide disc under a tall dome, a rim of 24 lights brightening one
  after the next, a walk round), **Pulse torus** (a great torus, its core a soft sun breathing over
  five seconds), **Mothership** (a vast flat disc, three rows of windows, a dome at its heart, a warm
  glow under it). 16, 20 and 28 in radius (more than five times the largest small one), 620 to 820 sites.

The big ones fly long slow loops (4 to 6 a second) stretched along the city, 460 to 1,260 long and
under 60 across, over the strip's middle (rim within |x| 64, well off the Temple skyscrapers),
between every solid roof (135 at most there) and the stations, ring sets and parcours (198 and up):
centres at 164 to 172, the Mothership's dome topping out under 190; all three turn short of the Great
Arch's row (too broad for its opening), and no small one patrols the stretch beside its piers
(2026-11-14, `lib/city-symbols.ts`). Drawn out to 900. The small ones
patrol stretches of four blocks down the wide boulevards (x ±52, ±104) and the corridors (x ±78), 56
to 84 over the street (over the lantern strings, under the express lanes), in hops: a quick dash
(fast start, easing in), a hover, the next dash, leaning a little into each. A stretch has one only
where the street is wide enough all along it (every solid tower either side back from the line by
the UFO's size, its sway and some air; none beside a Studio design or over the Temple skyscrapers'
blocks). Six at most are drawn, out to 300. Light mellow: colours lean slowly, nothing jumps 0.05 a
frame, every grain under 0.6 of its colour.

**More flying cars** (`lib/city-cars.ts`, `lib/city-skycars.ts`). The street's cars are denser: 30 a
way down a street (were 22) and 7 along a cross street (were 4). Five car bodies now, a saloon most
often, a low coupe, a tall van, a flat wedge and a rounded hover pod, each its own three outlines.
Flying cars, new: sky lanes down both corridors, a lane each way at two levels (8, under the low decks
and the gates; 48, over the high decks and under the darting UFOs), and down the four wide
boulevards at 44; right-hand, one pace a lane so none runs into the next, 18 cars a lane-tile in the
corridors and 12 on the boulevards (240 in a tile in all). Each one of the five bodies in a cool neon
tone, floating a little, a soft glow under it instead of the headlight pool. They ease out where a
boulevard narrows and over the Temple skyscrapers' blocks. 32 at most drawn, out to 240.

**The space police, step one** (`lib/city-police.ts`): chases between others.

- **Cruisers**: an interceptor of our own, a slim swept hull, two tail fins, a light bar across its
  back with a flare at each end. The flares **alternate red and blue**, swapping every 0.32 s with a
  quick soft rise: the one flash in the city, asked for, and kept to the police lights alone.
- **Chases**: in two of three 50-second slots a chase runs for 16 to 24 seconds. A **fugitive** (a flat
  arrowhead with two engines, the player's Arrow's shape, in a hot amber with its boost plume) races
  down a racing corridor at the Ship's street boost (9 × 3.2 = 28.8 a second), weaving inside 2.5
  across and up and down, at 24 over the street: over the low decks, through the ring gates' middles,
  under the high decks. One to three cruisers follow 0.75, 1.3 and 1.85 seconds behind, each flying
  the very path the fugitive flew, in a loose file. About two in five chases are laid down the
  corridor nearest the player so they pass right by; the rest anywhere down either corridor. A chase
  is planned once at its start (from its slot and where the player is then) and is then a formula
  of the time; it eases in over a second and out over two, and is drawn out to 520.
- **Hooks for later, not built**: the police chase a `ChaseTarget`, a path in time; today always a
  fugitive's run. *Chasing the player*: after wild flying (boosting near traffic, cutting through
  the lanes), a chase whose target is the player's recent flight (the trail already keeps it); the
  police lose the player when the line of sight breaks for a while (a tunnel, under a bridge, the
  Deep Line), where `hidden` in `lib/city.ts` already answers line of sight. *Bounty*: a chase's
  fugitive becomes a wanted ship; tail it close for a while to capture it, the cruisers arriving to
  take it away.

**Cost.** Three big UFOs, six small ones, up to 32 flying cars and a chase of up to four ships: at
most some 2,100 + 660 + 2,050 + 340 sites in full, thinned with the distance by the plan like every
item, so the pool is never all theirs. No allocation per grain.

**Acceptance** (`lib/city-ufos.test.ts`, `lib/city-skycars.test.ts`, `lib/city-police.test.ts`,
`lib/city-cars.test.ts`): eight UFO designs, unique, warm, two or more big ones over four times the
small ones' size, every grain finite, within its size and mellow; the big loops long and slow, every
grain all the way round clear of each station (outside its reach or under it), each ring's circle,
the parcours and every solid roof; the small ones on the boulevards and corridors, dashing and
hovering inside their stretch, no grain in a building. More cars than before by half and more, five
bodies, flying cars one way a lane on the right, none into the next, under the low decks and over the
high ones, no grain in a building along any lane. Police flares alternate red and blue, swapping
every flare, nothing else on the cruiser flashing; a chase is a fugitive and one to three cruisers
on its path behind it at the street boost, down a corridor inside its walls with nothing solid in
the way, some passing the player, ending within 16 to 24 seconds. The grain budget kept at 6,500
and 15,000 with a chase, UFOs and flying cars about, every grain finite.

**Still rough.** Not yet seen in a browser. The UFOs and cars are light (nothing holds the ship), and
the big UFOs can cross the high currents' and flocks' heights. The chases keep to the corridors.

### The space police chase you, and the bounties (2026-11-15)

> "Space police with the flare lights ... think how police chases could be and how we could do
> bounty hunting and try to capture bad guys. And police stops chasing when u hide."

Steps two and three of the police (the hooks above, now built). Fun, never punishing: no game over,
no count or badge while flying.

**The police chase you** (`lib/city-pursuit.ts`).

- **What brings them** (a heat, filling and cooling): Shift's double boost held low in the streets
  (under 32 over the street) for 8 seconds; scraping walls at speed (over 20) for 2.5; buzzing a
  patrol (passing within 12 of a step-one cruiser at speed) at once. Calm flying cools it over 15
  seconds; no heat while you tail a wanted ship, in a race, a room, space or Atlantis.
- **The chase**: one to three cruisers come up from 45 behind you and follow **the very path you
  flew** (breadcrumbs every 1.5, the last 960 or so kept), 7, 12 and 17 behind you, at 24 a second:
  faster than the cruise (9), slower than the street boost (28.8). Following your own path, they
  never clip a solid.
- **Hiding**: they follow only as far as where they last saw you. Seen means within 170, no tower
  between (`hidden`), and nothing solid over you (a tunnel, a tower's bore, the Deep Line, a sky
  bridge). Out of sight for 3 seconds, they lose you: they search back and forth along your path round
  that spot for 7 seconds, then rise and fade away. Seen again within 100 while searching, the chase
  is on again. Out-boosting them to past 170 loses them too.
- **Caught**: the leading cruiser within 10 of you, seeing you, for 2.5 seconds: their flares flash
  brighter a moment, your ship slows softly to 0.45 of its pace, easing back over 3.5 seconds, and
  they leave. Then 30 seconds before they can come again.
- **The one cue**: a soft red glow at one screen edge and blue at the other, swapping with their
  flares (the police light's exception to the mellow rule), at most 0.42 opaque, fading as you hide
  (`components/CityPoliceGlow.tsx`, in the game's overlay).

**Bounty hunting** (`lib/city-bounty.ts`).

- **A wanted ship**: a dark blunt delta, a dim spine, one red warning light breathing slowly on its
  back, a faint violet exhaust. In about three of five 70-second slots, while you fly along a racing
  corridor (within 34 of its middle, in the streets), it breaks out 45 ahead of you and flees down
  the corridor at 24 over the street, weaving inside 2.5 across and 3 up and down: through the ring
  gates, under the high bridges, over the low ones, receding down the long view.
- **Fleeing smartly**: 13 a second while you are 75 or more away, up to 26 as you close within 18:
  quicker than the cruise, under the street boost, so the boost catches it.
- **The capture**: within 16 of it and behind it for 3 seconds (the count drains at half speed when
  you slip off). It slows to a stop, its light turns a soft steady gold, a ring of gold light spreads
  round it once; two cruisers come down its route, one from ahead turning about to lead, one from
  behind to follow, and the convoy flies it away down the corridor, fading over its last 3 seconds.
  Fallen 320 behind, or after 50 seconds, it gets away and fades. The captures show only on the map
  (M), quietly: "· 2 wanted caught". No wanted ship while the police are after you.

**Cost.** Up to three cruisers (90 sites each) after you; the wanted ship (84, 120 with its ring)
and two escorts: some 540 sites at most, thinned with the distance by the plan like every item.

**Acceptance** (`lib/city-pursuit.test.ts`, `lib/city-bounty.test.ts`): calm flying never brings
the police, even boosting; the low double boost does in about 8 seconds, scraping in about 2.5,
buzzing a patrol at once, never while tailing a wanted ship; the cruisers keep behind you on your
path, never in a wall, and catch a cruise; caught, a soft slowdown easing back, they leave and cool
down; out-boosted or hidden 3 seconds they search where they last saw you, never past it, and give
up; seen close while searching, the chase again; the edge glow fades as you hide; in the city, the
double boost down a corridor brings them, their glow up, the grain budget kept. A wanted ship breaks
out in some slots only, by a corridor, along it, never while the police are after you; slow while
you hang back, fast as you close, between the cruise and the street boost; its route and its
escorts' clear of every solid down both corridors; tailed close behind 3 seconds, captured, counted,
escorted away; never from ahead or too far; gets away when left behind or after a while. Its light
red and slow, gold once captured, the ring spreading.

**Still rough.** Not yet seen in a browser. Wanted ships keep to the racing corridors. The
breadcrumbs follow you through a portal or fast trip only by starting afresh (the police then let
you go). The captures are counted for the session only.

### The loop metro and the tube metro (2026-11-15)

> "A metro in a loop; another metro flying through the city in a tube, with a few holding pillars."

> "Perspective is everything and the whole point of this city. Perspective is power, and makes it
> beautiful."

**The loop metro** (`lib/city-metro.ts`, extended). The suspended monorail was already one closed
loop; it is now a proper ring line. Three trains of four carriages run round it all the time, evenly
spaced, never stopping. Each of the four stations glows softly while a train is in: `metroStationGlow`
eases from 0 to 1 as a carriage comes within 16 of the platform and back as it leaves, never jumping.
The drawn station brightens its platform edge with it, and sixty lamps over the edge warm from amber
toward a warm white.

**The tube metro** (`lib/city-tube-metro.ts`, new). A transparent glowing tube, 2.2 in radius, one
closed loop a tile about 2,030 long. It is a uniform cubic B-spline through 48 control points, so
its curvature is smooth all the way round: no bend tighter than a radius of 19, and the curvature
never changes by more than 0.003 a metre.

- **The route is laid for perspective.** The tube crosses the Grand Avenue twice, high over the
  street: once just past the river and once at the far end of the Matrix quarter, past where the
  market's lanes end. Flying up or down the avenue, it frames the long view twice, with a station
  hanging over the street at each crossing. Between the crossings it makes long curves:
  - up the west side, round the golden spire's novas and between the temples' blocks;
  - back down the east side, between the market's high lanes and the strip's edge;
  - under the barge's line twice, once as it turns off the north crossing and once past the
    Saturn Tower.
- **Heights.** About 80 to 100 over the street. That is over:
  - the street channels (to 35) and the metro (35 to 45);
  - the corridors' obstacles (to 43; cleared by more than 30);
  - the darting UFOs' patrols (to 84; the glass at least 4 over the top of their sway).

  It is off to the side of the low-roof highways and the market's high lanes, and under:
  - the barge where it crosses its line (a hull and 6 of air clear);
  - the express lanes (112, 120), the big ships' lines (126, 142) and the high currents;
  - the flying stations and space bars (190 and up).

  Kept clear of every wall (a body round it free all the way), of the landmarks' crowns, the spire's
  novas, the temple towers, the metro's rail (20 or more), the great arch, the Saturn Tower, the
  stations and the bars.
- **Pillars.** Seven tall slender columns (0.9 in radius), from the street to the tube's underside.
  They stand on open ground:
  - off the avenue, the corridors and the river;
  - off every car lane's middle and every flying-car lane;
  - more than 6 off any darter's line.

  The tube is light (you fly through the glass); the pillars are solid. `tubePillarHolds` in
  `blocked` is a quick reject on z and then seven distance checks.
- **Capsules.** Three trains of three capsules (5 long, 1.25 in radius) shoot round inside the glass
  at 36 a second, a lap in about 56 seconds. A capsule warms the glass rings round it as it passes.
- **Stations.** Two, one over the avenue at each crossing. Each is a stretch of wider, brighter glass
  that glows softly while a capsule is in, eased the same way as the loop's stations.

**Map and travel.** The tube is drawn on the minimap as a pale blue line at its height (raised in
the 3D map). Its stations are marks named Tube 1 and Tube 2, beside the four Metro marks. A tap on
any of the six marks is a fast-travel spot:
- a loop station places the ship back along the rail, 6 above it, facing the platform;
- a tube station places it over the avenue, 40 back toward the tile's middle, facing the station.

Picking a map mark now takes the nearest one within reach, so stations beside a landmark do not
steal its taps.

**Cost.** The glass is drawn in chunks of 24 along the tube, a ring every 2.4: 16 grains a ring near,
10 farther and 6 far, threads along it only within 140, nothing beyond 700. Near a station some
7,500 to 10,500 sites are offered, and the plan deals grains from them nearest first like any item,
so the 6,500 and 15,000 budgets hold. No allocation per grain; every place is a formula of the time.

**Acceptance** (`lib/city-tube-metro.test.ts`, `lib/city-metro.test.ts`, `lib/city-minimap.test.ts`):
- The loop is closed with even steps, and its trains advance smoothly and lap back to their places.
- A station glows from 0 to 1 and back without jumps, and is drawn brighter with a train in.
- The tube is continuous and closed, its curvature smooth, and it crosses the avenue twice with a
  station at each crossing.
- Its height sits between the lanes and the express lanes.
- It is clear of the walls, crowns, novas, temple towers, the metro, the arch, Saturn, the bars and
  stations, every current and big ship's line, the darters, and the corridors' obstacles.
- There are 3 to 8 pillars a tile; they block in every tile, are slender, and stand on open ground.
- Capsules stay inside the glass at their speed.
- Every grain is finite and mellow (under 0.8), within budget and sight, with far chunks smaller.
- Both travel spots are clear and face their station; the map has the tube's line and its two
  named stations, and a tap on a tube mark picks it, flat or tilted.

**Still rough.** Not yet seen in a browser. The capsules do not stop at the stations, and the ship
cannot board either metro. The pillars are plain columns, and the glass is light everywhere,
including at the stations.

### Boost rings, LED arrows and the big fireworks (2026-11-15)

> "More big unique circles above the city, or in the city, that you can fly into, and they boost
> you."
>
> "A bunch of arrows on some of the buildings that create a feeling of speed, pointing the
> direction, as an LED design element."
>
> "Big fireworks above the other parts of the city."
>
> And again: "Perspective is everything and the whole point of this city. Perspective is power, and
> makes it beautiful."

**Boost rings** (`lib/city-boost-rings.ts`). 65 in a tile, each in one of **four designs**:
**double** (a second rim inside, drifting the other way), **spokes** (eight spokes to a hub, turning
slowly), **chevron** (ten chevrons inside the rim pointing in, lit one after another round it) and
**segmented** (ten turning segments with gaps). They stand upright across long views and are laid
out **in series** down them, so seen from one end they recede as a row of frames:

- **Down both racing corridors** (37): tall ovals 21 across and 32 high between the walls, centred
  33 over the street, mid-block, about every other block, clear of the corridor's bridges, gates and
  races.
- **Along the Heights–Golden gap** (3, x −134, −100, −52): ovals 22 by 32, centred 62 up, between
  the bridges and over the cross street's traffic.
- **High over the avenue** (5, radius 22, at 204): three in Chinatown, two over Egypt. Never over
  the Golden band: the spire and the avenue's arch are left be.
- **High over the canals** (3, radius 20), facing along them, and **high over the corridors' lines**
  (17, radius 24), the length of the tile, all between the high streams (186) and the parcours.

Every ring is checked when the list is made (and tested): no tower, peak or wall on its rim; off the
stations, the parcours, the decorative sets, the portals, the corridor obstacles, the race gates,
the quarter starts, the sky streams, the space bars, the Great Arch, the Saturn Tower's pole and
the Golden Spire's surroundings (100); low ones under the
big ships (92 at the top) and over the street channels; high ones from 194 to 246. Never two
crowding one another.

**The surge.** Flown through (its plane crossed within 1.15 of its rim: forgiving), a ring gives a
surge: the pace rises over a tenth of a second to 2.4 times (1.7 times on top of the boost, so it
stacks without running away) and eases off to nothing over **2.6 seconds**. The ship takes the push
fast and glides back. The ring warms to gold, a soft halo ripples out from it, and the ship's plume
flares warm. Boost rings never count toward the parcours' "Rings 7", and the parcours never surges.
The hook sits in `setFly` beside the speedway's `pushAt`.

**LED arrows** (`lib/city-arrows.ts`). 119 rows of chevrons on plain towers' faces along the
streets: 31 on the corridors, the rest on other streets and 39 on cross streets. None are on the
Grand Avenue or in Chinatown. Some run along a tower's top (62), the rest down the facade. Each row
points the way its street's traffic flows (`lib/city-flow.ts` `zStreetWay` and `xStreetWay`, which
the currents share). Each chevron is lit by one soft wave per street that runs in the traffic's
direction at about 8 a second. The wave uses world coordinates, so the arrows on tower after tower
run together toward the vanishing point. Mellow: dim always (0.1), brighter as the wave passes
(0.46 at most), never a blink. Drawn out to 340, the nearest 36 rows, none from high over the city.

**Big fireworks** (`lib/city-fireworks.ts`). Bursts are much bigger: sparks fly out to 30–52 (were
18–30), with 200 sparks to a burst (were 140) and up to 12 at once (were 8). Each blooms 30 higher so
its lowest sparks still clear the roofs. There are 45 more places: two more a side in every band of
the strip, and 33 over the annex's Mountain, Favela and Industry. Each is in its own quarter's
colours, clear of the stations (by their reach and 34), of each other (60) and of the Golden Spire
(110). Bursts also stay clear of the boost rings, as they already did of the stations and the
parcours.

**Cost.** Up to 12 boost rings (some 250 to 500 sites each), 36 arrow rows (30 to 90 sites each)
and 12 bursts (406 sites each), all thinned by distance like everything else. Everything is
computed from the time. No allocation per grain.

**Acceptance** (`lib/city-boost-rings.test.ts`, `lib/city-arrows.test.ts`, `lib/city-tall.test.ts`):
- Boost rings come in four designs, sized 14 to 30, in every one of the five places.
- Each corridor has runs of three or more, no two neighbours alike.
- Every placement clearance holds, including the route.
- A pass surges the pace, which decays smoothly to nothing in 2 to 3 seconds. Less is added under the boost.
- The parcours tally is untouched. The Ship flown through one speeds up by half and more.
- Sites are finite and mellow, with a halo after a pass.
- LED arrows sit on real tower faces over open streets. They point the flow's way (tips leading),
  and their crest moves along the street that way, dim to bright and never a flash.
- Fireworks are bigger, over every quarter and the annex's three, and clear of the boost rings.
- The grain budget is kept at 6,500 and 15,000 flying down a corridor through the rings.

**Still rough.** Not yet seen in a browser. The rings and arrows are light. The arrows sit on box
towers only, so the business towers, designs and Matrix towers have none. The surge does not show
on the map.

### Favela boxes and the city's cable cars (2026-11-15)

> "Make sure favelas look like favelas. Add cable cars inside the city. Right now favelas are just
> dots, not boxes stacked on each other etc..."

> "Perspective is everything ... perspective is power, and makes it beautiful."

**The Favela, redrawn as boxes** (`lib/city-favela.ts`). Same six hills and terraces, same warm
palette, but every house is now a box outline, lines of grains along its edges, the way the
Mountain quarter draws its peaks as contour lines. Our own design, no real place copied.

- **Boxes stacked.** Each house draws its flat roof's rim, the rim of the slab its top storey
  stands on (a one-storey house's foot), and the corner edges of both boxes: 68 sites a house.
  The top storey of a two- or three-storey house is a box of its own:
  - half the time the same size, so the slab reads as a storey line;
  - a quarter of the time narrower and shifted along the terrace, set back a little;
  - on two-storey houses, a quarter of the time jutting out over the slope (0.4 to 0.8): an
    overhang.

  Every house is turned a little its own way (±4°) and set back by up to 0.45, so the rows are
  not ruled lines. The terraces step up, so the boxes stack over one another up the hill.
- **Flat roofs** carry water tanks (a small drum's lid toward the back of the roof, about a third
  of them) and antennas (a mast and a soft red light, about a fifth).
- **Windows** glow in five warm tones (lamp, candle, warm white, rosy, pale gold), each window its
  own, drifting slowly (a 0.14 swell over about 25 seconds), never flashing.
- **Wires tangle** from roof to roof: to the next house along the terrace (six in ten), up to a
  roof on the terrace above (a third), now and then a long one two terraces up. Each sags
  between its ends: about 5,500 wires, faint, light to fly through.
- **Stairways wind.** The four a hill now swing round the hill and back as they climb (±0.22 rad,
  a slow wave from foot to top). Houses keep clear of them across their whole depth.
- Light strings hang along every third terrace (was every other), so the wires read.
- **Collision matches the drawing.** The houses' height over the slope is 8.8 (was 8.5), and the
  height field reaches 1.5 past a hill's foot, so every drawn edge, tank and wire is inside the
  walls (tested site by site). Only the antennas' tips stand over it.
- About 5,700 houses (some gave their ground to the stairs and the cable car's pylons). The rows
  are a little lighter (weight 1.05, was 1.3) because lines need more grains than dots did.

**Cable cars in the city** (`lib/city-cable-cars.ts`, new). Three lines of gondolas on cables
between tall lattice pylons.

- **West and East lines, laid for perspective.** Each runs straight down a long street one column
  in from the strip's edge streets (x −130 and 130), from row 1 to row 21: the length of the first
  three bands, ending well before the river and its Heights–Golden bridges. A pylon stands at every
  fourth cross street (136 apart), a station at each end, so flying down either street the pylons
  recede in an even row and the ropes scallop between them toward the vanishing point. The West
  line starts at row 9, past Chinatown: its street is Chinatown's low West lane window, kept clear
  of anything solid. The East line is 680 long; each line has 20 cabins.
- **The Favela line** climbs from the city to the Favela: from a station on the strip's east side,
  along cross street 27, over the edge road, past a pylon at the first hill's foot and one on its
  slope, to a summit station over the houses (116 long, 3 cabins). The hill's houses keep clear of
  its pylons (`FAVELA_PYLONS`, 4.5 round each).
- **Heights.** The city lines' ropes run at 66 over the street, sagging to about 62 mid-span. That
  is over the street channels (to 35), the loop metro (35 to 45; where the West and East lines
  cross the rail the cabins pass well over it, 12 or more from the rail's line), the boulevards' flying cars (44) and the
  corridors' upper lane (48). It is under the tube (80 and up, and 20 or more away), the barge
  (96) and the express lanes (112, 120). The Favela line rises from 56 to 71; its cabins pass 3 or
  more over the hill's houses' height. All of it keeps off the avenue (30 or more), the racing
  corridors (20 or more past their walls), the darters' lines, the great arch, the Saturn Tower and
  the landmarks.
- **Pylons.** Each is a lattice column of four legs tapering up, a zigzag brace on two faces, an
  arm from its top over the street to the ropes' head, a crossbar carrying the two ropes, and a
  lamp breathing on top. Each stands at a street corner, off the car lanes, its column clear of
  every wall. A station adds a deck where the cabins turn, a roof, the bullwheel and warm lamps.
  The pylons are walls, like the tube's pillars: `cablePylonHolds` in `blocked` is sixteen quick
  distance checks, before the annex's height field, so the favela pylons hold too. The ropes,
  cabins, arms, decks and roofs are light: the ship flies through them.
- **Cabins.** Out along one rope, round the end station's bullwheel (a half circle, no jump), back
  along the other, at 2.6 a second, evenly spaced: a formula of the time, nothing kept. Each is a
  framed box in its line's tint (rose, turquoise, saffron, toward ivory) on a hanger and grip, with
  four warm windows a side, drifting slowly.

**Map.** The six stations are named marks of kind `cable`, beside the Mountain quarter's.

**Cost.** Ropes are drawn a span at a time (a grain every 1.4 on each rope), pylons and stations
120 and 176 sites, cabins 44, out to 600, at the tile copy nearest the eye. The renderer thins them
by distance like everything else, so far down a street the pylons and ropes become a dotted
receding line. No allocation per grain.

**Acceptance** (`lib/city-favela.test.ts`, `lib/city-cable-cars.test.ts`, `lib/city-annex.test.ts`):
- Every house is a closed roof rim at its roof (no gap over 1.3), a slab rim at its top storey's
  floor, and plumb corner edges.
- Top storeys are shifted (over 15%) or jutting out (over 5%, two-storey houses only), and houses
  are turned.
- Every house site but the antennas, and every wire, is under the collision's height.
- Windows are warm, in at least four tones, and drift by under 0.03 in half a second.
- Wires: over 0.6 a house, a fifth climbing a terrace, every one sagging.
- Stairways wind (over 0.15 rad) and stay clear of houses; no house stands on a pylon's ground.
- The cable lines are three, with stations at the ends; the city lines run straight down a street
  with pylons at even steps.
- Clear of the avenue, the corridors, the darters' lines, the tube, the rail, every current and big
  ship's line, the arch, Saturn and the landmarks. Cabins never touch a wall, and pass over the
  favela's houses.
- Pylons stand at corners off the car lanes, their columns clear, and block in every tile;
  everything else is light.
- Cabins move smoothly at their pace with no jump at the stations, evenly spaced.
- Every site is finite and mellow (under 0.7), within budget and sight, the nearest tile copy
  drawn; the stations are named on the map.

**Still rough.** Not yet seen in a browser. The cable lines are not drawn as lines on the minimap,
and there is no fast travel to their stations. Cabins do not pause at the stations. The favela's
collision is still the hill's smooth height field, not each box, and the stairs and alleys are
not open to fly into.

### Still rough, and next

- The Matrix quarter's running lights brighten as the ship comes close but do not speed up (the
  speed is fixed per tower, so a head never jumps). The market's bridges are light, not solid.

- The wider streets (2026-11-14) leave two kinds of narrow gap as they were: the short cross
  streets between the avenue's own towers (6.6 to 9, the avenue kept as designed) and the slits
  between the Neon Canyon's wall blocks (6, no boards in them). The round, open and one-off
  buildings (the twenty, pyramids, embassies) keep their places, so a boulevard beside one is
  only widened from the other side.
- Atlantis's tunnels are drawn thin in grains, so from the Plan they read as faint lines; up close
  the helices read as dotted spirals. Nobody walks them yet. The Atlantis buildings piece does not
  have the towers, factories or complexes yet.
- The Studio's domes, minarets and spires on the box towers are light: you fly through them (the
  towers, pyramids, the twenty and the code towers hold you). Sky bridges, the metro and the tube's
  glass are light too (only the tube's seven pillars hold you). So are the landmarks' tall crowns, the big squares, the fifteen new buildings and the
  Studio's buildings on the blocks (2026-11-14).
- The Grand Avenue's bridges, galleries, roofs and gateways are light: nothing to land on, no
  race through its gateways yet; its designs repeat in every turn of the plan (the towers differ).
  The side streets have not had their own round yet.
- The flying stations are light: you dock in their middles (no pads, no rooms inside, nothing
  to walk), and every tile copy of a station warms while you are docked at one. The parcours'
  best is a run in a row, not a time; there is no lap or timed run of it yet. On a phone two sky
  marks can sit close enough that a tap between them picks either.
- The Canals and the Neon market still have no landmark of their own; the big squares are only in
  the landmarks' columns; the Studio's meshes are stretched upward rather than redrawn tall.
- The Deep Line has no race of its own yet (the tracks are one a quarter), and no side branches.
- The Matrix quarter's towers have no tunnels, docks or race; the code's glyphs do not change.
- The opening road's boards and gates are only on the Ship's first stretch; Chinatown's avenue
  keeps its own signs.
- Sky lanterns and portals are only near the avenue; the Sky Island Loop and four other tracks are
  drafts (gates only); the sky island itself is the platform station, still small.
- The quarter ships in the street channels are nine grains each (a street ship's share), so they
  read as small clusters in their quarter's colours; the drones show the designs best. The high
  currents and big ships are not on the minimap, and you cannot dock with a big ship yet.
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

**Keys** (Ship, Game side): V cockpit view, M map, N Design menu, [ and ] hop between the
quarters' starts (2026-11-14); the rest as before. A tap on a name in the map flies there
("Quarter starts and fast travel").

**Acceptance (ships, cockpits, map)**

- The map's data comes from the plan and is the same every time; every district, one block per
  plot, every landmark and race start; the metro a closed loop; flat from above, raised when tilted.
- Five ships; the Ring racer cruises fastest and the Hauler slowest, the Manta turns furthest in a
  second; every ship's grains finite and close round it.
- The Crosswing (2026-11-15: "create an x wing kind of spaceship that i can use"): a fighter of
  our own, not a copy of any film's. A long slim nose to a raised cockpit, four tapering wings
  spread in an X from the tail (22 degrees above and below the level), a needle along each wing's
  tip and an engine at each root, in a warm red glow; quick and keen (pace 1.15, turn 1.15, boost
  1.1, climb 1.1); the Lines instruments and a ribbed fighter's bubble for its canopy. Chosen from
  the Ship menu like the others.
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
"You · 52 m" (your height) always sits beside your pointer, and names in its way give way to it. Where you are reads at once (2026-11-14: "make it clear on the map where I am"): a larger pointer, two gold rings spreading slowly from it, and faint gold lines across the map through it. A district
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
