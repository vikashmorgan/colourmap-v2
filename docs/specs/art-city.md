# City — the future city's chapter

**Status:** Building
**Date:** 2026-11-12
**Where:** `/geometry-field/city`, the **City** pill after Ocean ·
`lib/city.ts` · `lib/golden-city.ts` (the golden city: its plan from φ, the
city rising, its heart) · `lib/golden-buildings.ts` (temples, factories,
domes) · `lib/city-buildings.ts` (twenty buildings, one to a pill) · `lib/grain-mesh.ts` (buildings drawn as grains on lines, faces and
dots) · `lib/city-plans.ts` (the night cities from above) ·
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
steam and motes rising and fading, lights flowing along a line, a lattice
turning and breathing, a slow orbit.

## The fifteen pieces

| # | Piece | What you see | Camera |
|---|-------|--------------|--------|
| 1 | Golden plan | The plan from above, revealed ring by ring from the centre outward: the heart's florets on the golden angle (a sunflower), ring roads and streets, terraces, towers as points of light, lit blocks thicker toward the heart, woods and fields in the ring of nature, canals with their banks and shimmering water, arched bridges, twelve boulevards with travellers walking slowly in toward the heart and out | High above, a slow orbit, drawing a little nearer |
| 2 | Rising | The same plan, flat as a map at first, rises in 3D ring by ring from the heart: walls, roofs and edges of every block between the boulevards, the towers, the terraces, woods staying low, canals flat; a small open sphere of light over the heart | From nearly straight above, tilting slowly down to an oblique three-quarter view as it orbits |
| 3 | The heart | The centre up close (the plan five times larger): an open golden sphere, a lattice of light (twelve meridians over the twelve boulevards, parallels at ±1/φ² and ±1/φ, nodes of light), not a solid ball, not a palace, floating over a round garden of florets where all twelve boulevards meet, a round basin in the middle; four low terraces stepping down to the inner canal, bridges over it, the first towers of the ring of knowledge beyond. The sphere turns slowly and breathes light (9 s a breath); motes rise from the garden; ships pass slowly far above. It belongs to no one: open, light | A slow orbit, a little above the garden |
| 4 | Temples | Five golden temples on pills (**Rotunda**, **Ziggurat**, **Ring**, **Pyramid**, **Lotus**, below) | A slow orbit, a little above |
| 5 | Factories | Five works of the ring of making on pills (**Sawtooth**, **Foundry**, **Assembly**, **Workshops**, **Solar**, below): industrial and hopeful, with gentle signs of work, slow furnaces, a conveyor of light, soft steam | A slow orbit, a little above |
| 6 | Domes | Golden glasshouses ("serres") on pills (**Geodesic**, **Bubbles**, **Palm house**, **Lattice**, **Garden**, below): glass a faint veil of grains, struts dense and bright, green-gold plants glowing inside | A slow orbit, a little above |
| 7 | From above | Five night cities seen from far above, moved here from Vegetal (below): **Grid**, **Star**, **River**, **Bay**, **Canals** on pills | Drifting slowly over the city, looking a little ahead and down |
| 8 | Towers | Twenty-five towers on a five-by-five grid of blocks, taller toward the middle, rise floor by floor from the ground, the middle first. Each is the Cell's box stacked: its four corners and a ring at every floor, the rim being built glowing warm. Windows on every face, two rows a floor, warm or cool, now and then one going out or coming on over seconds. Block outlines on the ground, stars overhead | Slowly round the city, above its roofs |
| 9 | Sky lanes | The grown city, dimmer; ships, each a bright head and a short fading trail, stream along lanes in the streets at four heights, crossing grids, both ways in every street: white lights one way, red the other | Round the city, at the height of the lanes |
| 10 | Neon | Each tower wears bands of neon (two to four ribbons), a tall blade sign of glowing dots on some, a spire with a slow beacon on all; coloured light pools on the street; a few ships. Every light drifts slowly round cyan, magenta, amber and violet, each tower on its own beat | Lower and closer, looking up |
| 11 | Chinatown | A red gate (four pillars, two beams, three roofs turned up at the ends, a plaque reading 中華街, Chinatown) at the mouth of a narrow street. Tall signs hang down the street side of the towers, standing out into the street, in real Chinese and Japanese characters: ラーメン ramen, 茶 tea, 龍 dragon, 酒 wine, 夢 dream, 麺 noodles, 福 good fortune, 喫茶 café; a 夜市 night-market banner across the street and a small 喫茶 sign over a doorway. Lantern red and gold mixed with cyan and magenta. Rows of round red lanterns strung across the street, swaying a little | Walking pace through the gate and down the street |
| 12 | Bridges and docks | Sky bridges (tubes of four edges and ribs, lights along the floor) join neighbouring towers high above the street; landing platforms stand out from the faces of the taller towers, lights chasing slowly round their rims. Ships come in on a curve, settle on a deck, rest, lift off and leave the other way | Round the city, from above the bridges |
| 13 | Canyon | Flying down the middle of an endless street: towers either side (only the faces the street sees are drawn, so every grain shows), feet below the eye and roofs above it; traffic in lanes above and below the eye, all flying forward, one colour per height (amber, cyan, white, violet); high above, one-way cross streets carry ships left to right or right to left, each in its own colour (2026-11-12: "the canyon make it only with lights going forward … each road has one colour of spaceship to keep it coherent"); every third tower carries a tall Chinatown sign, flown past. Towers and ships that pass behind come round to the far end, so the street never ends and no grain is added | Down the middle of the street |
| 14 | Ship | A game, keys only, as the Shark Sim: you pilot a small ship (a flat arrowhead, a raised spine, two cyan engines streaming light) down an endless avenue of solid, lit towers, with side streets to turn into; every eight blocks the avenue passes through a Chinatown stretch (see **Ship, round two**). **A** / **D** turn (the ship banks into the turn), **W** / **S** climb and dive, **E** or Shift faster, **Q** or X slower, **Space** boosts to three times the cruise while the bar lasts; the bar fills again while you cruise. Towers' walls hold you: you slide along them. Traffic above and below you. Two dials read height and speed. With no one at the controls (the Journey, or before you steer) the ship flies down the avenue; let go with Esc and it carries on from where you were, back to the avenue | Behind the ship and a little above, looking past it |
| 15 | Buildings | Twenty buildings from the quarters of the city on pills (**Buildings**, below): stair temples, a pagoda, a domed hall with minarets, twisted, rounded and faceted towers, each on its plinth with curvy walkways of dotted light winding round it | A slow orbit, a little above, drawn back to see each one whole |

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
- **Garden**: five geodesic domes on a ring of radius 13, radii 4.5·φ^(−k/2)
  for k = 0…4, a sixth √φ larger in the middle, paths between them.

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

## Game · Studio, and the phone

(2026-11-12; the shared player, [art-journey.md](art-journey.md#design-menu-game--studio-phone-controls-2026-11-12).)
Every control sits in the **Design** menu. The Ship is the **Game** side, every other piece the
**Studio** (found by `game.has`, so new pieces join the Studio on their own); the page reopens
on the side last used. On a phone the Ship has a stick (turn, climb, dive) and a round
**Boost** button (Space).

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
- Temples, Factories and Domes each have five pills; every building stands on the ground (no grain
  below it), within 40 of the centre, most grains lit, no two alike; the stated ratios hold
  (pyramid height² = φ · half-base², ziggurat and bubbles by φ, workshops by φ^(1/4), mirror rings
  by √φ).
- From above: five cities on pills, each distinct; all grains on the plane; denser and brighter in
  the centre than at the edge; no block or centre light on the water; car lights move; the same
  city every time.
- Every piece keeps the fixed grain budget (9,000, or 5,200 on small screens). Frame cost, 9,000
  grains (bun, the build machine, offline): Golden plan 12 ms, Rising 9, The heart 8, temples,
  factories and domes 5–7, From above 8–11, against 5–9 for the neon pieces in the same run.
- Towers rise from the ground, the middle first; no grain goes below the ground.
- No ship in the sky lanes is ever inside a tower; lanes run both ways at four heights.
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
  fills the bar again; it never flies into a tower, through the ground or past the sky; two dials
  read height and speed.
- The same moment always gives the same picture.
- No new dependencies.

## Next components

For the long-term fly-through of a future neon city:

1. **Free flight in the canyon:** begun in Ship, round two (the avenue, side streets, Chinatown);
   still to come: traffic you weave through, and near misses that ruffle the trail.
2. **Districts:** the field of towers in kinds (Chinatown, a harbour of docks, a tall business
   heart, a market under bridges), flown from one into the next.
3. **Layers of the city:** a dim undercity of pipes and steam below the street, the lit middle, and
   gardens on the roofs high above.
4. **Traffic that turns:** ships changing lanes and turning at crossings, the Cell's pulses again,
   and a landing you can make on a dock.
5. **Weather:** slow rain streaks that catch the neon, mist that softens the far towers.
6. **Signs that speak:** more words, and signs the user writes, rasterised the same way.
7. **Arrival:** a sky-port at the edge of the city where the flight begins and ends.
