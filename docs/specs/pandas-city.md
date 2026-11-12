# Pandas city: the lessons as cities seen from above

**Status:** Active
**Date:** 2026-11-12
**Route:** `/pandas/city` (signed-in only; linked from the `/pandas` header as *City*, and back)

## Purpose

A memory palace (the method of loci) for the Pandas class. Asked for on 2026-11-12:

> "turn the panda lessons (from school) into a city I can navigate in and see the different blocks and lessons in different parts of the city so I learn to orient myself. There can be a city for each lesson. 8 lessons in total."

Then, the same day:

> "do this with cities seen from above for now. aim is to use geometry to help memorise the lessons because they all have a placement. can use blocks circles octagons triangles. pop up boxes etc.... diff levels (deep more info) another level more minimal just the core teachings. then more info. so the lecture blocks have parts and each part a panel. use a system of depth for the panels. etc... cool design meets lessons."

The look follows the circle city of *Veins* in Vegetal: roads branch like veins from a glowing centre, crossed by ring roads.

## The look: the City of Dreams

Asked for on 2026-11-12: "make the pandas thing as an actual city like the city video game in terms of aesthetics." The map is drawn like the City chapter's golden city from above (`lib/golden-city.ts`, `/geometry-field/city`):

- The sky is the City player's **Dawn** gradient, `#080a24 → #141638 → #2a2240 → #3d2a3a`, scattered with grains of light; each lit city has its own grains, denser toward its heart.
- Every line (roads, ring roads, octagons, blocks, fountains, the shelf) is **glowing dotted light**: a row of round dots over a soft halo, in the city's deep saturated gold (`[1, 0.5, 0.12]`, `#FF801F`) through ivory gold to warm white. Each city's accent stays in that family.
- The plaza and each heart are a small **Nova-like lattice star** (an eight-pointed star drawn as one line, eight spokes, an inner octagon) with a white-hot core.
- **Lit cards** are solid warm-white squares with a glow; begun cards are faintly filled; unmarked cards are dotted outlines. Lessons to come are faint dotted outlines.
- **Slow motion**: a pulse of warm light runs out from the plaza along the region's roads, then from each heart along its avenue and lanes (7 s); the hearts, the plaza and the lit glows breathe (9 s, opacity only). Both stop when the viewer asks for reduced motion.
- No SVG filters: the glow is a wide faint stroke under each dotted line, and radial gradients for the hearts, so it stays fast at phone width. Dot size and spacing are in screen pixels and stay the same at every zoom.
- Labels stay crisp: SVG text with a dark rim and a soft shadow, at a constant size on screen.
- The top-bar pills and the minimap use the game's quiet pill (dark glass, ivory hairline). The sheets stay paper for reading, framed like the game's menu: a thin dark rim and an ivory hairline around the paper, with the lifted shadow.

## The region

- Eight lesson cities stand on one great ring, in course order **clockwise from the top**. The centre is a golden plaza, **DataFrame**, where all roads meet; a vein-like road runs from it to every city, and a ring road joins neighbours.
- Lessons 1 to 3 are lit. Lessons 4 to 8 are dim empty plots labelled *Lesson n · to come*. A new lesson in `content/pandas/index.html` lights its city on its own.

## Every city has the same bones

So that orientation learned in one lesson carries over to the next:

| Place | Where | Shape | What it holds |
| --- | --- | --- | --- |
| Heart | centre | circle with a star | *To remember* (the lesson's "In one breath" lines) |
| Gate | south | a gate | where the lesson begins; opens the lesson sheet |
| Avenue | gate → north | the midrib vein | |
| Parts | around the heart, **clockwise from the gate** | octagons | the card groups, in course order |
| Cards | inside their part | squares, bigger when the card holds more | one per card |
| Watch out | top-right corner of a card | small triangle | the card has a *watch out* line |
| Practice | north end of the avenue | hexagons (fountains) | one per exercise |
| Cheat sheet | east edge | a long rectangle with one line per entry | that lesson's cheat-sheet entries |

Each city has one accent colour (its character); the bones never change. Faint construction circles at golden-ratio radii sit behind each city. The roads are veins: a trunk curves from the heart to each part and forks into side veins toward the edge, twigs run to each card, and two ring roads cross them. All placements are fixed by rule, so the same lesson always draws the same city. A *?* button shows the legend.

## Depths

Three levels, by zooming or by the pills **Core · Parts · Detail**:

1. **Core**: the region. Each lit city shows its number and short title; when there is room, its parts' first words. A tap on a city pops up a box with its *To remember* lines and *Enter the city*.
2. **Parts**: one city. Octagons with their names, the card squares with their numbers (3.5), the practice fountains and the cheat sheet.
3. **Detail**: one part close up.

## Sheets: a system of depth

A tap opens paper sheets on top (beige and brown, the lifted "sheet on top" shadow). Each depth holds one sheet, and each deeper sheet sits higher with a deeper shadow, the ones below peeking out:

- depth 1, **lesson**: lede, *To remember*, the parts in order, Practice, Cheat sheet, *Open Lesson n* (`/pandas#s-n`);
- depth 2, **part** (every card with its first sentence), **Practice** (the exercises, each opening `/pandas#c-n-ex-<id>`), or **Cheat sheet** (name, meaning, example);
- depth 3, **card**: its first paragraph, the first three lines of code, the *watch out*, *More*, and *Open in lesson* (`/pandas#c-n-<id>`);
- depth 4, **More**: the whole explanation and all the code.

A breadcrumb names the path (*Pandas › Lesson 3 › Missing values › NaN marks an empty cell…*); *‹* and Esc go back one sheet, × closes them all. Tapping a card on the map opens its part underneath it.

## Light = progress

A card's square lights gold when it is marked *Got it* on `/pandas`, and glows faintly for the other marks. Marks are read only: this device's copy (`pandas-marks`) and then `GET /api/coding/marks` (`pandas|` keys). Signed out or offline, everything is drawn unlit and nothing breaks. The city never writes a mark.

## Moving

Drag to pan, the wheel or a pinch to zoom, the arrows or W A S D to move, + and − (keys or buttons) to zoom. Esc closes the top sheet, then the pop-up, then steps back out a depth. A mouse hover names what is under it. The top bar says where you are (*Lesson 3 · Data quality › Missing values*), and a small ring minimap in the corner shows a *you are here* dot. Works at phone width (sheets become a bottom sheet) and on desktop (sheets on the right).

## Deep links on /pandas

The class page now follows `#s-3` (opens Lecture 3) and `#c-3-nan` (opens the card, or `#c-3-ex-l3-e1` an exercise), on load and on hash change.

## The engine

The map is a reusable, data-driven engine, with Pandas as its first source. Nothing in the engine knows about Pandas.

- `lib/city-map.ts` (pure):
  - `MapData = { id, title, centre: { name, blurb }, words, slots: (MapCity | null)[] }`, where `MapCity = { id, title, short, core: string[], districts: { id, name, buildings: { id, name, tag, weight, flag }[] }[], spots: { id, name }[], shelf: number }`. `words` names the kinds in the source's own language (*Lesson*, *part*, *card*, *Practice*, *Cheat sheet*, *To remember*). A `null` slot is a plot to come.
  - `layoutMap(data) → MapPlan`: every city, district, block, spot, gate and shelf placed. `SHAPES` is the shape vocabulary.
  - `cityVeins(city)`, `regionVeins(plan)`, `ringRoads(plan)`: the roads.
  - Light: `circlePath`, `polygonPath`, `lattice(x, y, r)` (the heart's star) and `grains(seed, count, x, y, r)` (deterministic grains, denser toward the centre).
  - Panels: `Panel` (`city` 1, `district` / `spots` / `shelf` 2, `building` 3, `more` 4), `pushPanel`, `popPanel`, `panelChain`, `openPanel`, `panelTitle`, `breadcrumb`.
- `components/city-map/CityMap.tsx`: the view. Props: `data`, `back: { href, label }`, `litOf(n, buildingId) → 'full' | 'half' | undefined`, and `renderPanel(panel, open)` for the sheets' content (the engine draws the sheet, breadcrumb, back and close).
- `components/city-map/ui.tsx`: the palette (`DAWN`, the golds), the framed paper sheet, the game pill, glyphs, `Inline` text with `code` spans, for adapters' sheets.

The Pandas adapter:

- `lib/pandas-city.ts`: `parsePandasCourse(html)` reads `SESSIONS` and `REF` out of `content/pandas/index.html` with a small literal reader (strings, templates, nested brackets), with no evaluation of the page's code: sessions → groups → cards (id, name, explanation, code, watch-out), exercises, "In one breath" lines, and each lesson's cheat-sheet entries. `pandasMap(lessons)` turns that into `MapData` on a ring of 8.
- `app/pandas/city/page.tsx` (server) reads the file at request time; `components/PandasCity.tsx` (client) supplies the marks and the sheets.

Later sources, not built yet: a city for the second brain (the app's districts from `lib/grid.ts`) and one for the art organisation; then the cities connect.

## Not yet

- Keyboard focus cannot reach single buildings on the map; the sheets' lists can.
- Card names on the map show only when zoomed in a lot; otherwise hover, tap, or read the part sheet.
- No day mode; no remembered last view.
