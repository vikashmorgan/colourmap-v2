# Light Bodies

> Martin (2026-10-26): "same with the other new presets … not the buttefly but the eclipse and enlightement and light coour bubble stuff"

An Art collection at `/art/light` (on the Grid under Studio → Light). It holds three bodies of light from the night's references (`docs/specs/visual-references.md` 2, 4 and 5), each drawn live by its own shader. Art first: once these hold up here, they go to the Geometry Builder's Stars tab and to the Chill Machine, as the butterflies did.

## The pieces

| Kind | Pieces | What it is |
|---|---|---|
| Eclipse | Burning Ring, Blue Corona, Blood Moon | A black sun inside a ring of fire painted with a brush. Flares reach out and embers drift off. |
| Enlightenment | Enlightenment, Night Prayer, Dance of Light | A seated figure of light filaments with six arms. Light at the heart and crown, a vertical beam, halo rings and a flower of life, and two orbits of numbers. It meditates, prays and dances. |
| Light Bubble | Opal Bubble, Night Bubble | A wobbling drop of liquid light. Its skin is a soap film whose colour keeps moving, small drops orbit and melt into it, and it has sharp highlights and a bright rim. |

## Behaviour

- The wall shows one row per kind. Cards draw at a low resolution and only move while on screen.
- Tap a piece to open it full screen. The viewer has:
  - only that kind's sliders, some under its own names: Ring, Fire and Flares for the eclipse; Pose, Move on, Filaments and Halo for the figure; Wobble, Film and Drops for the bubble.
  - any of the eight palettes.
  - Pause, Reset, Save PNG and Save preset.
- **Enlightenment stays centred and still** (Martin, 2026-10-26: "keep him centered so it stays present … without hovering left right"). Only the arms move. On narrow screens it scales down so it stays whole.
- **No glitch** (Martin, 2026-10-26: "the glitch effect and sliders can be taken off from all the new visuals. not needed"). The vertical streaks and their slider are gone from Light Bodies and Liquid Butterflies.
- **Pose** runs 0–2: Meditating, Praying, Dancing. The slider's label names the current pose, and positions in between blend. **Move on** carries the figure through all three poses over time; at 0 it holds the pose.
- **Save preset** keeps the tuning (settings and palette) in this browser (`colourmap:light-saved`). Saved tunings appear in a "My light" row above the collection, named "<piece> n", and can be reopened or deleted. Reset goes back to the tuning you opened.
- **Reduced motion:** every piece holds still.
- **Without WebGL:** each card says "This piece needs WebGL."

## Where it lives

- `lib/art/light.ts`: the pieces, palettes, limits, the sliders for each kind, and saved tunings.
- `lib/art/light-shaders.ts`: the three fragment shaders (GLSL ES 1.0). They declare the same uniforms, so three.js can take them later.
- `components/LightCanvas.tsx` draws a piece; `components/LightBodies.tsx` is the page.

## Next

- Geometry Builder: a "Light Bodies" category in the Stars tab, as with the butterflies.
- Chill Machine: Light visual modes. A hit makes the flares; a note turns the colours (`uShift` is already in the shaders); the bubble wobbles on each note.
- The figure as the centre of the Grid menu.

## Eclipse styles — 2026-10-26

> Martin: "another mode for burning ring where the fire pulses out above and below" · "energy goes out in rayons like a pulse. different types for this eclipse preset"

- The eclipse has a **Style**, chosen with buttons in the viewer (`style`, `ECLIPSE_STYLES`). The circle stays still in every style:
  - **Ring:** as before.
  - **Jets:** fire pulses out of the top and bottom in two flickering columns that widen as they go. Flares sets their reach.
  - **Rays:** sharp spikes of every length, each growing out and fading on its own clock. Flares sets their reach.
- New pieces: **Twin Jets** (Jets, fire) and **Sun Rays** (Rays, a new Navy palette after the painted eclipse reference).
- The glitch is gone from every piece (see above).
