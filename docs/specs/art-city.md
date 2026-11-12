# City — the future city's chapter

**Status:** Building
**Date:** 2026-11-12
**Where:** `/geometry-field/city`, the **City** pill after Ocean ·
`lib/city.ts` · `lib/golden-city.ts` (the golden city: its plan from φ, the
city rising, its heart, the colour presets) · `lib/golden-buildings.ts` (temples, factories,
domes) · `lib/golden-quarters.ts` (each from the element to the quarter) ·
`lib/golden-plans.ts` (ten more plans) · `lib/nova-cores.ts` (the Nova Cores) ·
`lib/grain-mesh.ts` (buildings drawn as grains on lines, faces and
dots) · `lib/city-plans.ts` (the night cities from above) · the Ship's
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

## The fifteen pieces

| # | Piece | What you see | Camera |
|---|-------|--------------|--------|
| 1 | Golden plan | The plan from above, revealed ring by ring from the centre outward: the heart's florets on the golden angle (a sunflower), ring roads and streets, terraces, towers as points of light, lit blocks thicker toward the heart, woods and fields in the ring of nature, canals with their banks and shimmering water, arched bridges, twelve boulevards with travellers walking slowly in toward the heart and out. Pills: **Golden** and the ten plans below (**Ten golden plans**) | High above, a slow orbit, drawing a little nearer |
| 2 | Rising | The same plan, flat as a map at first, rises in 3D ring by ring from the heart: walls, roofs and edges of every block between the boulevards, the towers, the terraces, woods staying low, canals flat; a small open sphere of light over the heart | From nearly straight above, tilting slowly down to an oblique three-quarter view as it orbits |
| 3 | The heart | The centre up close (the plan five times larger): an open golden sphere, a lattice of light (twelve meridians over the twelve boulevards, parallels at ±1/φ² and ±1/φ, nodes of light), not a solid ball, not a palace, floating over a round garden of florets where all twelve boulevards meet, a round basin in the middle; four low terraces stepping down to the inner canal, bridges over it, the first towers of the ring of knowledge beyond. The sphere turns slowly and breathes light (9 s a breath); motes rise from the garden; ships pass slowly far above. It belongs to no one: open, light | A slow orbit, a little above the garden |
| 4 | Nova Cores | Eight power sources in the heart's style on pills (below): an open lattice of light floating over a round plaza of florets, each from its own rule, breathing slowly, energy running out along its conduits on the ground | A slow orbit, a little above the plaza |
| 5 | Temples | Golden temples from the single building to the quarter on pills (**Rotunda**, **Ziggurat**, **Ring**, **Pyramid**, **Lotus**, then **Temple court**, **Sacred complex**, **Temple quarter**; see **Evolutions**) | A slow orbit, a little above; further back and higher for the bigger rungs |
| 6 | Factories | Works of the ring of making (**Sawtooth**, **Foundry**, **Assembly**, **Workshops**, **Solar**, **Cement works**, **Kilns**, then **Factory group**, **Industrial complex**, **Industrial quarter**): industrial and hopeful, with gentle signs of work, slow furnaces, a conveyor of light, soft steam | As the temples |
| 7 | Domes | Golden glasshouses ("serres"): **Geodesic**, **Bubbles**, **Palm house**, **Lattice**, then **Group of domes** (the former Garden), **Dome complex**, **Dome quarter**: glass a faint veil of grains, struts dense and bright, green-gold plants glowing inside | As the temples |
| 8 | From above | Five night cities seen from far above, moved here from Vegetal (below): **Grid**, **Star**, **River**, **Bay**, **Canals** on pills | Drifting slowly over the city, looking a little ahead and down |
| 9 | Towers | Twenty-five towers on a five-by-five grid of blocks, taller toward the middle, rise floor by floor from the ground, the middle from the first moment, all up within about ten seconds (see **Towers and sky lanes, round two**). Each is the Cell's box stacked: its corners and a line at every floor on the faces toward the eye, the rim being built glowing warm. Windows on those faces, two rows a floor, warm or cool, now and then one going out or coming on over seconds. Block outlines on the ground, stars overhead | Slowly round the city, above its roofs |
| 10 | Sky lanes | The grown city, dimmer, its faces toward the eye; ships, each a bright head and a short fading trail, already streaming as the piece opens, along lanes in the streets at four heights, crossing grids, both ways in every street: white lights one way, red the other | Round the city, at the height of the lanes |
| 11 | Neon | Each tower wears bands of neon (two to four ribbons), a tall blade sign of glowing dots on some, a spire with a slow beacon on all; coloured light pools on the street; a few ships. Every light drifts slowly round cyan, magenta, amber and violet, each tower on its own beat | Lower and closer, looking up |
| 12 | Chinatown | A red gate (four pillars, two beams, three roofs turned up at the ends, a plaque reading 中華街, Chinatown) at the mouth of a narrow street. Tall signs hang down the street side of the towers, standing out into the street, in real Chinese and Japanese characters: ラーメン ramen, 茶 tea, 龍 dragon, 酒 wine, 夢 dream, 麺 noodles, 福 good fortune, 喫茶 café; a 夜市 night-market banner across the street and a small 喫茶 sign over a doorway. Lantern red and gold mixed with cyan and magenta. Rows of round red lanterns strung across the street, swaying a little | Walking pace through the gate and down the street |
| 13 | Bridges and docks | Sky bridges (tubes of four edges and ribs, lights along the floor) join neighbouring towers high above the street; landing platforms stand out from the faces of the taller towers, lights chasing slowly round their rims. Ships come in on a curve, settle on a deck, rest, lift off and leave the other way | Round the city, from above the bridges |
| 14 | Canyon | Flying down the middle of an endless street: towers either side (only the faces the street sees are drawn, so every grain shows), feet below the eye and roofs above it; traffic in lanes above and below the eye, all flying forward, one colour per height (amber, cyan, white, violet); high above, one-way cross streets carry ships left to right or right to left, each in its own colour (2026-11-12: "the canyon make it only with lights going forward … each road has one colour of spaceship to keep it coherent"); every third tower carries a tall Chinatown sign, flown past. Towers and ships that pass behind come round to the far end, so the street never ends and no grain is added | Down the middle of the street |
| 15 | Ship | A game, keys only, as the Shark Sim: you pilot a small ship (a flat arrowhead, a raised spine, two cyan engines streaming light) down an endless avenue of solid, lit towers, with side streets to turn into; the avenue runs through the districts of the City of Dreams, Chinatown first (see **Ship, round two** and **Ship, round three**). **A** / **D** turn (the ship banks into the turn), **W** / **S** climb and dive, **E** or Shift faster, **Q** or X slower, **Space** boosts to three times the cruise while the bar lasts; the bar fills again while you cruise; **Space** with **W** climbs on into the stratosphere; **L** slows to look down; **Enter** starts a race at its start. Towers' walls hold you: you slide along them. Traffic above and below you. Two dials read height and speed. With no one at the controls (the Journey, or before you steer) the ship flies down the avenue; let go with Esc and it carries on from where you were, back to the avenue | Behind the ship and a little above, looking past it |

The page opens on one piece alone, picked by name, as Ocean's do: it starts
at its beginning with no ball of stars and loops, each grain gliding back to
where the piece began; the canyon and the ship fly on, so their loops do not show.
The golden plan lights again ring by ring on each loop, and Rising rises again
from its map. From above, on its own, is lit from the start and stands still,
so it needs no glide back. **Journey** plays the fifteen as one trip: between
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

A tile of 12 blocks across and 48 along (312 × 1632), repeating every way so the city never ends.
The avenue runs down its middle; six bands of eight blocks lie along it, a district each side:

| Band | Left of the avenue | Right of the avenue |
|------|--------------------|---------------------|
| 0 | **Chinatown**: lower towers with Chinese roofs (eaves turned up at two floors, a three-roofed pagoda on top), red and gold; tall signs at three heights on both street walls of every tower, on every street; red lanterns strung across the side streets at three heights and across the avenue high up; sky lanterns rising; landmark the **Pagoda of nine roofs** | **Chinatown** too: the **race plaza** (a ring of moon gates, a RACE sign), start of the Lantern Loop |
| 1 | **Indian quarter**: low towers crowned by curved temple spires (shikhara: ribs and rings up the curve, a flat stone ring and finial) or four chhatris; Diwali lamps strung across the streets at three heights, twinkling slowly; landmark the **Temple of the curved spire** (a tall shikhara, four small ones, a chhatri, stepped plinth) | **Istanbul**: towers with domes and slender minarets; landmark the **Mosque of the four minarets** (square hall, great dome on its drum with sixteen ribs, four half domes, four minarets with balconies) |
| 2 | **The Heights**: tall towers (70–128), sky bridges between them at the height both reach (upper streets between the tops), more tunnels; over the avenue a long **tube** whose rings pulse ahead of you, and two **portals** | **The Canals**: the undercity: three cross streets are canals 14 deep under the street, their walls lit with pipes and lamps, water shimmering, arches of pulsing light over them so each reads as a tunnel; you can fly down into them |
| 3 | **Golden gardens**: golden towers, golden domes, parks of golden trees (gold-leaf crowns shimmering); landmark the **golden spire** (190 high, rings of light, an open sphere of light on top, eight golden trees round it), seen from everywhere | **Temple quarter**: the Studio's temples (lib/golden-buildings.ts, read-only) on blocks; landmark the Studio's **ziggurat**, stairs on every side, 1.7 times its Studio size |
| 4 | **Industrial quarter**: the Studio's five factories on blocks; landmark the Studio's **foundry**, its chimneys breathing steam | **Solarpunk domes**: the Studio's glasshouses and parks of golden trees; landmark the Studio's **garden of domes** |
| 5 | **Egyptian quarter**: pyramids on the blocks (the golden slope, courses marked, a light at every apex; they hold you like walls, on their slope), obelisks on the avenue's low towers; landmark the **great pyramid** with a lying sphinx-like figure and two obelisks (our own simple shapes) | **Neon market**: word signs in a small Latin pixel font (BANK, BAR, HOTEL, CAFE, NOODLES, CINEMA, TEA, DREAMS) |

Every district's name is written over its mouth on the avenue's walls. Where the plan begins again
a great panel over the avenue reads **WELCOME TO THE CITY OF DREAMS**. Now and then a word sign
lights a tower elsewhere too.

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

### Still rough, and next

- The Studio's buildings, domes, minarets and spires are light: you fly through them (only towers
  and pyramids hold you). Sky bridges and the metro are light too.
- Sky lanterns and portals are only near the avenue; the Sky Island Loop and four other tracks are
  drafts (gates only); the sky island itself is the platform station, still small.
- Traffic does not yet move in platoons on the beat; the beat does not yet travel out from a heart
  (the Nova Cores, another round).
- Queued from the user, not in this round: rain over a river and its ripples; a business district
  of twisting towers with docks; docking the ship and cyberpunk rooms the Dot Walker walks through,
  with panoramas; cars on the ground; Embassies of Happiness with a Shark Simulator cabinet;
  ultraboost ring portals high in the sky into hyperspace and other solar systems.

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
- **Journey** plays the fifteen pieces as one trip and loops; each piece opens as a wide ball of
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
