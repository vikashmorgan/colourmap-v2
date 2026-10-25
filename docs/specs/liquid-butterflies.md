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
| Glitch | Vertical streaks through the middle (the eclipse reference) |
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
