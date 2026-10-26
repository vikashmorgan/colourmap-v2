# Liquid Butterflies

> Martin (2026-10-25): "i want a collection of almost liquid butterfly in constant change and transformation. with symmetry. and psychedelic echo effects or slices like a constantly flowing evolving pool of colour around the butterfly theme." Later, adding the eclipse and iridescent-drop references: "okay".

An Art collection at `/art/butterflies` (Grid → Studio → Butterflies). It follows the rule in `docs/specs/visual-references.md`: built and tested here first, then it can pass to the Chill Machine.

## What a piece is

A butterfly drawn live by a WebGL 1 fragment shader (`components/ButterflyCanvas.tsx`), always mirrored left to right, never still. Its settings (`lib/art/butterflies.ts`):

| Setting | What it does |
|---|---|
| Liquid | Slow noise warps the space, so the wings move like liquid |
| Flap | The wings fold toward you and open again |
| Morph | The wings swell and change shape |
| Slices | Strips from the centre out, each a moment later (the time-slice pins) |
| Slice delay | How far apart in time the strips are |
| Echoes | Rings of colour that keep leaving the wings |
| Colour drift | The colours travel through the palette |
| Pool | A flowing pool of colour behind |
| Kaleido | 1 is the mirror only; 2 to 8 folds it round |
| Size, Glow, Speed, Grain | As named |
| Iridescence | Soap-film colour on the wings (the iridescent-drop reference) |
| Embers | Sparks drifting off the rim (the eclipse reference) |

A palette is two background colours and a six-stop ramp, from the core of the shape out through its rim and glow: Thermal, Neon, Acid, Pearl, Gold, Eclipse, Opal, Deep sea.

## The pieces

Thermal Monarch, Neon Psyche, Acid Morpho, Pearl Moth, Golden Swallowtail, Deep Kaleido, Eclipse, Opal Drop.

## The page

- A wall of live cards. Cards draw at a low resolution and only move while on screen.
- Tap a card to open it full screen: every setting as a slider, all palettes, Pause, Reset, Save PNG (`liquid-butterfly-<piece>[-<palette>].png`), and a Controls toggle. Esc closes it.
- With reduced motion asked for, every piece holds still.
- Without WebGL, each piece says "This piece needs WebGL."

## Later

- Saved presets of your own tunings.
- The Chill Machine version: notes start echoes and add slices, and the pads choose the palette.
- A true 3D iridescent wing material (raymarched), once the 2D version has proven itself.

## In the Geometry Builder, and saved tunings — 2026-10-26

> Martin: "add all these new butterflies as a new category in the stars geometry part art" · "also make that u can save presets for the butterfly"

- **Stars tab → Liquid Butterflies:** all eight pieces, as their own category before Work in Progress. They use mode `liquidbutterfly`, drawn in three.js by the same shader (`lib/art/butterfly-shader.ts`, used by both). The builder's sliders lay over the piece's settings: Speed, Liquid (Glow), Morph (Light), Slices (Complexity), Echoes (Particles), Kaleido (Symmetry), Bloom. Eclipse is named **Eclipse Butterfly** there, since the builder already has an Eclipse. No stars unless asked for, and the bloom is the soft one used for full-screen shaders.
- The builder's **Saved** row works for them too, and remembers which butterfly a look belongs to.
- **In the collection's viewer, Save preset** keeps every setting and the palette ("Eclipse 1", "Eclipse 2"…). Saved tunings show first, under **My butterflies**; tap one to open it, × to delete it. Reset in a saved tuning returns to that tuning. Kept in this browser (`colourmap:butterfly-saved`).

## Liquid Forms, the colour wheel and a warm Thermal — 2026-10-26

> Martin: "I want a warm background for the first preset Thermal Monarch" · "imagine flower designs. other option than the butterfly" · "a selection. flower. volcano. mountains. butterfly. heart as different core designs" · "also a tangka one … where it plays with geometry and the liquid echoes" · "work on background colours … a beautiful trippy circle of colour with a bit of an echo effect to select your colour" · "also put it as a category in the stars geometry"

- **Core designs.** Every piece is built on one of six designs, set by `form` and chosen with buttons in the viewer: **Butterfly, Flower, Heart, Volcano, Mountains, Thangka**. Each is a signed distance in the same shader, so slices, echoes, flow, the pool, iridescence and embers work on all of them.
  - Flower: an outer and an inner ring of petals that open and close.
  - Heart: it beats.
  - Volcano: lava rises out of the crater in slow blobs.
  - Mountains: a ridge, with a high peak in the middle.
  - Thangka: a mandala drawn as lines of light, with rings, a square palace with four gates, a turning lotus ring and a seed at the heart.
  - **Petals** (3–16) is a slider for the flower and the thangka only.
- **Liquid Forms:** six new pieces in their own row, built on the other designs: Thermal Lotus, Opal Bloom, Liquid Heart, Volcano, Golden Peaks and Thangka, plus a new Thangka palette (red, gold, blue, green on dark maroon).
- **Thermal is warm:** its ground runs amber to wine (`#f4b26a` → `#9c2f45`) instead of mint to purple.
- **Background on the colour wheel.** In the viewer, tap the Top or Bottom swatch to open the wheel (`components/ColourWheel.tsx`):
  - Hue runs round the circle and saturation from the centre out; a Light slider sets brightness.
  - Echo rings ripple slowly out through the wheel and out of the chosen colour.
  - It works by drag, tap or arrow keys. It holds still with reduced motion.
  - The picked background lays over the palette. "Palette's own" or choosing a palette clears it, and Save preset keeps it (`bg` on the saved tuning).
- **Geometry Builder:** a new **Liquid Forms** category in the Stars tab, after Liquid Butterflies. Volcano and Thangka are named **Liquid Volcano** and **Liquid Thangka** there, since those names were taken.

## Circle, Sacred, Island, Digital — 2026-10-26

> Martin: "1 is this psychedelic circle … 2 is this sacred geometry of colour … 3 is this digital mountains … flying island volcano stuff" (references 7–10 in `visual-references.md`)

- Four more designs, ten in all:
  - **Circle:** a breathing disc.
  - **Sacred:** the flower of life in lines of light, turning slowly.
  - **Island:** a floating rock with a volcano and two drifting stones.
  - **Digital:** the mountain ridge as an outline with rising strata lines.
- New Liquid Forms pieces: **Psychedelic Circle** (Acid), **Sacred Geometry** (Thangka), **Floating Island** (Thermal) and **Digital Peaks** (Deep sea). They show in the Liquid Forms row and the builder's Liquid Forms category.

## Lens, Diamond, Portal, Orb — 2026-10-26, night

> Martin: "just took a bunch of screenshots to develop a butterfly type of visual. but a different preset of it" · "check em. round psych colourshapes." (reference 12)

- Four more designs, fourteen in all:
  - **Lens:** a fan of wing petals opening upward, a teardrop and two round lower wings, inside a lens rim.
  - **Diamond:** a breathing rhombus; with slices, each strip is a moment later.
  - **Portal:** doorways inside doorways, always drawing further in, held in a disc.
  - **Orb:** a thin rim round a sphere of clouds, mirrored on a horizon line, with four-point star glints on the rim.
- New palettes:
  - **Lens:** navy-black cores, red, orange and peach on a dark warm-brown ground. The outer glow falls to dark, so the gaps stay dark and only the edges and echoes carry colour.
  - **Dream:** pink and lavender pastels.
- New pieces: **Lens Butterfly**, **Sliced Diamond**, **Portal** and **Dream Orb**. They show in the Liquid Forms row, the builder's Liquid Forms category and the Chill Machine's Butterflies.

## Categories, Brain and the figures — 2026-10-26, late

> Martin: "so butterfly. enlighten. eclipse and mountain are categories. and each of these then have different presets for starting stuff" · "an enlightenment figure for the butterfly type of visuals, with a man meditating. u can slide to add arms. or make him be standing up.. centered. also arms praying." · "a few brains … another starting point than butterfly" (references 13 and 14)

- Four more designs, eighteen in all:
  - **Brain:** a top-down brain, its folds carved by shifting grooves.
  - **Meditate**, **Pray** and **Stand:** a centred figure of liquid light. Its Petals slider is called **Arms** and adds pairs of arms, up to four pairs, that fan up and sway with Morph.
- `categoryOf(form)` sorts the designs:
  - **Butterfly:** butterfly and lens
  - **Enlightenment:** the figures
  - **Mountains:** volcano, mountains, island and digital
  - **Forms:** everything else
- On /art/butterflies, the rows follow those categories: Butterflies, Enlightenment, Mountains, Liquid Forms.
- In the builder's Stars tab, after Tunnels and Big Bang, the categories run in this order:
  - **Butterfly**
  - **Enlightenment:** the Light Bodies figures, then the liquid figures
  - **Eclipse:** every eclipse style
  - **Mountains**
  - **Liquid Forms**
- Light Bubble stays where it was.
- New pieces:
  - Colour Brain
  - Meditating Light, Praying Light, Standing Light, Rainbow Body, Golden Sphere
  - Prism Wings
  - Data Peak, Wire Peaks
