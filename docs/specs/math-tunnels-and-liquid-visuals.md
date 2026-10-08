# Math Tunnels & Liquid Visuals

> Two new Geometry Field families: **Tunnels** (math series you dive into, soft edges) and **Liquid** (oil-projector, psychedelic, flowing colour), built cheaply from a few formulas and one shared full-screen shader pass.

## Context

Geometry Field already has ~80 modes, all built from three.js lines and points (`build*` / `update*` pairs in `components/GeometryField.tsx`). The Big Bang journey (`JOURNEYS`, id 4) uses `burst → clifford → golden → kaleidoscope → warp`. What is missing:

- A real **dive-in** feeling: the existing `tunnel`, `warp` and `linetunnel3d` modes move forward, but their elements cut off hard at the screen edge.
- **Continuous-colour fields**: `liquid`, `lava`, `plasma` and `nebula` are point/line based. The app has no per-pixel shader yet (no `ShaderMaterial` in the file), so oil, ink and marbling looks are out of reach.

## Reference platforms (what's out there)

| Platform | What it is | What to take from it |
|---|---|---|
| [Shadertoy](https://www.shadertoy.com) | The reference library of browser GLSL fragment shaders since 2009 | Tunnel, domain-warp and fluid techniques; the single full-screen-quad model |
| The Book of Shaders / Inigo Quilez articles | Learning resources for shader math (noise, fbm, domain warping, cosine palettes) | The formulas used below |
| [Hydra](https://hydra.ojack.xyz) | Live-coding video synth, modelled on analog modular video | Chained feedback (`modulate`, `kaleid`, `feedback`): the oil-projector look with very little code |
| cables.gl / TouchDesigner | Node-based real-time visual patching ([TouchDesigner](https://gitnux.org/best/generative-art-software/)) | The idea of exposing sliders as patch parameters; VJ and projection workflow |
| [KodeLife](https://alternativeto.net/software/kodelife) / ShaderLab | Live shader IDEs (desktop and browser) | Instant-recompile loop for tuning |
| Butterchurn (MilkDrop in WebGL) | Audio-reactive feedback presets | Feedback-warp loop and preset morphing, close to our journey crossfade |
| Strudel / Tidal | Live-coded music patterns | Later: drive visual parameters from the same pattern as the groove machine |
| [ShaderGPT](https://www.abduzeedo.com/shadergpt-ai-shader-generator-14islands), [vibe-curator](https://www.toolcenter.ai/en/tools/vibe-curator), [AI Co-Artist](https://arxiv.org/html/2512.08951v1) | Text-to-GLSL and AI-evolved shader art (vibe-coding visuals) | Future: "describe a vibe → new preset". The vibe-curator self-healing compile loop with Claude is the pattern to copy |
| twigl / Dwitter / Turtletoy | Tiny-code art communities (≤140 characters to a few lines) | Proof that one formula is enough; good inspiration for presets |

Our position: none of these connect visuals to *your emotional state, journeys and rituals*. We borrow their techniques and keep our own framing (journeys, palettes, breath speed).

## Behavior

### Family A — Tunnels (math series)

All tunnels share one recycling-depth loop and one fade:

- Element `k` sits at depth `z = ((k − t·speed) mod N)`, and its screen radius is `R0 / (z + ε)`.
- **Edge fade** = `birth(z) · death(z) · rim(r)`:
  - `birth`: smoothstep in from the far end.
  - `death`: smoothstep out before the element reaches the camera.
  - `rim`: `1 − smoothstep(0.65R, R, r)`.
- The fade is multiplied into the **HDR colour**, not only the opacity, so bloom fades with it.
- A global radial vignette overlay sits on top.
- Hue of element `k` is `fract(k · 0.618)` (golden-ratio colour that never repeats).

Modes, in order of value for effort:

1. **Geometric Zoom (Droste).** Rings at `r0 · φ^(k+t)`, wrapped every 1.0, so the zoom loops forever with no seam.
2. **Twisted Gate.** n-gon rings (`symmetry`) rotated `k · golden angle + t·ω`; the vertices form spiral arms.
3. **Golden Seed Tunnel.** Point `n` at angle `n · 137.508°`, depth `n · dz`.
4. **Fourier Tube.** `r(θ) = 1 + Σ_{j=1..3} (a/j²) · sin(jθ + j·0.3z + ω_j t)`; the walls breathe.
5. **Superformula Rings.** Gielis `m` grows with depth: triangles near, stars far.
6. **Curved Flight.** A modifier, not a mode: the ring centre is offset by `C(z) − C(z_cam)`, with `C` a Lissajous curve. Available as a toggle on modes 1–5 and on the existing `tunnel`, `warp` and `linetunnel3d`.
7. **Shader Tunnel.** Full-screen quad with `u = atan(p)/2π`, `v = k/|p| + t`, and the pattern any periodic `f(u, v)`. Needs the shared shader pass (see below).
8. **Log-Polar Spiral (Escher wormhole).** Shader tunnel with rotated `(log r, θ)` coordinates.

### Family B — Liquid (psychedelic oil)

All Liquid modes are fragment shaders on the shared full-screen pass. Cheapest first:

1. **Oil Warp (domain warping).** `f(p + fbm(p + fbm(p + t)))` (Quilez), coloured with a cosine palette `a + b·cos(2π(c·x + d))` taken from the active `PAL` preset. It looks like a 1960s oil projector. Sliders: complexity = octaves, breathSpeed = flow, glow = contrast.
2. **Sine Ripple Fold.** Iteratively `p += 0.6/i · sin(i·p.yx + t)` for i = 1..8. About 5 lines, a liquid-marble effect.
3. **Thin-Film Iridescence.** Soap bubble / oil slick: hue = `fract(thickness(p) · k)`, where thickness is an fbm field. Rainbow interference bands.
4. **Two-Oil Projector.** Two immiscible coloured fields (two warped fbm layers) slowly rotating against each other, as in a real two-chamber oil projector: blend with `smoothstep` at the boundary and add a lens vignette.
5. **Metaball Lava.** Sum of `r²/|p−c_i|²` over 6–10 moving centres, then threshold and soft edge. A true lava lamp, replacing the visual gap in point-based `lava`.
6. **Feedback Smear (Hydra / MilkDrop style).** Render the last frame into a texture, sample it slightly zoomed and rotated, then add a new seed shape. Infinite psychedelic trails. Needs 2 render targets (ping-pong).
7. **Reaction–Diffusion (Gray-Scott).** Coral, zebra and cell patterns that grow over time. Ping-pong buffers, several steps per frame. Heavier.
8. **Stable Fluid (ink in water).** Navier–Stokes on the GPU (Pavel Dobryakov's WebGL-Fluid-Simulation is the reference). Touch stirs the ink. The heaviest option and the most magical one; it fits the existing "touch to begin" preset.

9. **Rorschach Oils (symmetric).** The plane is folded before the ink is drawn: **Mirrors = 2** is the classic inkblot (left mirrors right), more mirrors fold it into a kaleidoscope (**Mirror Oils**). Ink pools toward the fold like paint pressed between paper and keeps flowing, so the blot breathes. Built in V1.

### Builder categories

Tunnels and Oils are separate categories in the Builder preset list, each under its own header (**Tunnels**, **Oils**), placed after Good Ones and before In Progress.

### Shared shader pass (new infrastructure)

- One `ShaderMaterial` on a full-screen quad, added as a group like any other mode, so the existing build/update, crossfade and bloom keep working.
- Uniforms: `uTime`, `uRes`, `uPalette[4]` (cosine-palette coefficients derived from `PAL`), and `uSym`, `uComplexity`, `uGlow`, `uBreath`, `uIntensity` mapped from `Cfg`.
- One fragment string per mode; the vertex shader is shared.
- The Liquid 6–8 modes add a ping-pong render-target helper.

### Big Bang journey (revised arc)

| Stage | Mode |
|---|---|
| Singularity | Shader Tunnel, centre fade inverted (bright core, black rim) |
| Inflation | Geometric Zoom with exponential speed-up (Hubble `v = H·r`) |
| Plasma Era | Oil Warp, hot palette |
| First Stars | Golden Seed Tunnel |
| Galaxies | Twisted Gate → Log-Polar Spiral |
| Cosmic Drift | Existing `warp` + Curved Flight |

A new **Oil Projector** journey: Oil Warp → Thin Film → Two Oils → Ripple Fold → Lava Lamp → Rorschach → Mirror Oils → back to Oil Warp (seamless loop). Feedback Smear joins it once built.

## States & Edge Cases

- **Crossfade between a shader mode and a line mode:** both groups render during the transition; the shader quad's alpha follows the journey's crossfade weight.
- **Low-end phones:** the shader renders at 0.5–0.75 device-pixel ratio into a target, then upscales; fbm octaves are capped by a perf tier. Reaction–Diffusion and Stable Fluid are hidden on low tier.
- **Bloom over full-screen colour:** shader modes lower the bloom strength so the whole frame doesn't wash out to white.
- **Loop seams:** tunnels use modular depth and Liquid uses periodic time in `uTime` (or slow enough drift), so long journeys never jump.
- **Reduced motion:** speed is clamped low; no flashing above 3 Hz (photosensitivity) in any mode, which matters for psychedelic palettes.
- **Context loss:** render targets are rebuilt on `webglcontextrestored`.

## Done When

- Tunnel modes 1–5 exist with the shared edge fade; no visible hard cut at the rim or at the vanishing point.
- Curved Flight works on the new tunnels (Curve slider). Retrofitting it onto `tunnel`, `warp` and `linetunnel3d` is still open.
- The shared shader pass exists, and Shader Tunnel plus Oil Warp, Sine Ripple Fold, Thin-Film and Two-Oil Projector run at 60 fps on a mid-range phone.
- The Big Bang journey uses the revised arc; the Oil Projector journey exists; both are reachable from the Journeys tab.
- Each new mode's sliders map to visible changes, and presets pull colour from `PAL`.
- Tests cover the pure math helpers (depth wrap, fade, superformula, cosine-palette derivation).

## Later

- Feedback Smear, Reaction–Diffusion, Stable Fluid (touch-stirred ink).
- **Vibe prompt:** describe a visual in words, and Claude writes a fragment shader into the shared pass, compile-checks it, self-heals on error and saves it as a preset (vibe-curator pattern).
- Audio-reactive uniforms from the BPM-listening spec (`festival-visuals-backlog.md`).

## Dependencies

- `docs/specs/geometry-field.md` (mode system, Forward Journey Presets)
- `docs/specs/festival-visuals-backlog.md` (BPM reactive, perf on projection)

## Magnetic Sands (cymatics) and sand fixes (2026-10-08)

A **Magnetic Sands** category holds four cymatic visuals. Sand on a vibrating plate is shaken where the plate moves and comes to rest on its still (nodal) lines; the plate slowly changes mode and the sand flows to the new figure, in an endless loop.

- **Cymatic Sands 1**: circular drum modes (Bessel rings and petals), 2D, the figure slowly turning.
- **Cymatic Sands 2**: square Chladni figures inside a circle, the figure turning so the sand swirls after it.
- **Cymatic Sands 3**: the circular plate in 3D, tilting and precessing; loose sand is lifted by the wave.
- **Cymatic Sands 4**: sand on a vibrating sphere (spherical harmonics), rotating on a nodding axis.

Sliders: Frequency, Loop Speed, Rainbow, Light, Sand, Grain Size, Stars. Sand gathers on the lines within ~4 seconds and stays there through each change.

Fixes to existing sands:

- **Magnetic Sands 2** dropped its horizontal sine "sand waves" act (it broke the circular flow). Rose rings and the seed of life (seven whole circles) replace it, its eddies sit evenly on one circle and its drift only breathes in and out, so rings stay round and whole (no C shapes).
- **Gravity** now flows like the original Magnetic Sand: along the circles of two magnetic poles (its hollow cores), which slowly orbit each other.
- **Magnetic Sand** (the original) is unchanged in motion; its grain is 2px instead of 1.55px so its slow drift glides instead of stepping.

## Waves (2026-10-08)

A **Waves** category draws the sea as thin parallel lines and bends them with twirls (a rotation that fades with distance from a centre), so lines curl into breaking lips the way Hokusai drew them.

- **Rolling Wave** (freestyle): Waves sets how many twirls ride an organic swell. Each curls up, travels, crashes into foam and lets go, with its size, strength, height and timing drawn fresh every cycle: it never repeats.
- **Fractal Wave** (Hokusai and sacred numbers): the water is rings inside an invisible circle that only sets where the sea ends. Claws roll around the circle; each carries smaller claws placed by the golden angle and shrinking by the golden ratio (Depth sets how many).

## Thangka (2026-10-08)

**Thangka** (Oils tab) is a generated Tibetan mandala with liquid oil moving inside its geometry. From the rim in: a ring of flames, a ring of vajras, a ring of lotus petals, a courtyard, the square palace with a **T-shaped gate on each side** and nested walls, split into quadrants by its diagonals, an inner lotus, and an **empty centre** (no centre symbol). Each compartment flows on its own; colour is set **per ring, never per quadrant**, so the mandala stays balanced. Fine gold lines sit on every border. It does not pulse.

**New thangka** (on the sliders view) rolls a new design within the rules: flame count (16/24/32), vajras (24/36/48), outer petals (8/16/32), inner petals (8/16), palace size, gate shape, two to four walls, and the order of colours. Sliders: Detail (oil detail), Flow, Rainbow, Light, Gold (line weight), Bloom, Stars. Presets: Thangka (gold), Thangka Lapis, Thangka Crimson.
