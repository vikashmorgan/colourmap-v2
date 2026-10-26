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
