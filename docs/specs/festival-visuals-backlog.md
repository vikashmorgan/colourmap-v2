# Festival Visuals — Backlog (Reconnect, Gstaad)

**Status:** Living backlog from the live design session (2026-06). Captures every
idea so none are lost; build in priority order. Surfaces involved:
- **Geometry builder** — `components/GeometryField.tsx`, route `/geometry-field`
- **Figures viewer** — `app/(app)/figures/page.tsx`, GLB models in `/public/models/`

---

## 0. DONE — in PR #213 (`feature/festival-journeys`)
- Three 20-minute looping journeys: **Cathedral of Light**, **Cosmos Drift**,
  **Desert Temple**. Spec: `festival-visual-journeys.md`.
- **Journey tab made reachable** — it had no tab button; added a "Journeys" pill.
- **Journey picker wraps** instead of hidden horizontal scroll (only the first
  pill was visible before). *(both UI fixes pending commit until visually confirmed)*

---

## 1. Rotation on/off toggle — CONCRETE, ready to build
3D modes auto-spin in the render loop (`GeometryField.tsx:16824`,
`l3dRotRef.current.y += 0.003`, gated only by drag + motion mode). Add an
independent **rotate on/off** toggle so the figure can sit still while still
breathing/animating (distinct from the existing Animate/Static motion mode,
which freezes *all* time).
- New `rotate3d` state + ref; gate the auto-spin on it; toggle pill in builder.
- Default: **on** (keep current behaviour) unless STATIC Series overrides it.

## 2. Appearance defaults + colour control — NEEDS DECISION
Requested defaults: **glow 0.5**, **light 35**, **saturation 70**, "that **orange**
colour next to the white and blue".
- `glow` exists (0–10 slider; it drives colour saturation/rainbow per
  `GeometryField.tsx:8494`). glow 0.5 = nearly monochrome palette colour. ✅ maps.
- **No** global Hue / Saturation / Lightness / colour-swatch control exists.
  "light 35 / saturation 70 / orange-near-white-and-blue" implies one.
- **Open decision:** either (a) **build Hue + Saturation + Lightness sliders**
  (a global colour override on top of the palette), defaulting to orange hue /
  sat 70 / light 35 / glow 0.5; or (b) the user is pointing at an existing
  **palette swatch** (screenshot needed). (a) is a sizeable, cross-cutting change
  because 137 modes compute their own colours today.

## 3. STATIC Series — NEEDS DECISION
A meditative counterpart to Desert Temple: figures (**Buddha Boy**,
**Golden God**) **enter into the starfield / 3D geometry**, in **still mode** —
**no rotation, no BPM/sound vibration** — on the calm palette from §2.
- Existing hooks: `buddhaboycurrents` mode; `walkingfigure`; the dance system
  (`danceMove`, `danceBpm`, `danceAmount`) — set `danceMove: 'still'` and don't
  feed audio to remove BPM vibration; rotation off from §1; high `stars`.
- **Open decisions:**
  - **"Golden God"** — is it an existing builder mode, or the **Golden God OBJ
    asset** the user owns (with Kid Lotus / Spirit) that needs importing into the
    geometry field? (Import is a much bigger job than a preset.)
  - Ship as new **Journeys** (timed programs) or new **Presets** (single looks)?
  - Confirm the figure roster and entry behaviour ("enter into stars").

## 4. Animated soldier — dance "one way or the other" — NEEDS DECISION
The soldier is a GLB on the **Figures** page (`ANIMATED_FIGURES`,
`/models/soldier.glb`), separate from the geometry builder.
- "Dance one way or the other" → play/select among the model's baked animation
  clips, and/or mirror it left/right.
- **Open decisions:** which clips does `soldier.glb` contain? Is "dance" a clip
  that exists, or does the model need new animation? Should the figure also
  appear *inside* the geometry starfield (ties to §3), or stay on the Figures page?

## 5. Phone-mic sound input — DIRECTION CHOSEN (single-device)
Use one device's microphone for sound-reactivity (simplest; removes the
two-machine control→projection journey sync entirely — that change is on hold).
- **Gotcha:** `getUserMedia` only works on **HTTPS or `localhost`**. A phone
  hitting the laptop's `http://<LAN-ip>:3000` will be denied the mic. Phone-mic
  therefore requires the **deployed HTTPS** build, or running on the phone's own
  localhost. Laptop-into-projector works locally right now.

---

## Suggested build order
1. Commit the §0 journey-visibility fixes (festival-critical). ← do first
2. §1 rotation toggle (small, unblocks STATIC Series).
3. Decide §2 colour approach → implement.
4. §3 STATIC Series presets/journeys on top of §1+§2.
5. §4 soldier dance.

---

## Builder curation log

Festival prep trimmed the builder's preset/mode surface and made it more
readable:

- **Enlarged index numbers** across the builder — preset (9→13px), mode
  (8→11px), and journey-phase (9→12px) numbers, at higher opacity.
- **Removed from the builder tab row:** Arena and Figure Stars pills.
- **Removed from FEATURED_PRESETS:** Mode Sun (registry kept — used by
  ArchetypeBridge / BuildLab), Deep Gaze (fully removed), Line Tunnel 3D,
  Walking Figure (#40), presets 4–8 (Buddha Boy Currents, Scriptures,
  Vertical Scriptures, Eclipse, Yin Yang), and Brain Topography.
- **Atomic Explosion toned down** — glow 8.2→5, luminous 4.2→2.8, intensity
  9.4→7, so it reads as fine points rather than big blown-out dots, matching
  the other presets' light. Kept in the featured list.
- **Trip Number 4** (journey id 15) — a ~8-minute looping trip combining
  Prism Bloom, Prism3D Core, Ocean Drift, Cyclone Tiles and Dot Heart, enriched
  with kaleidoscope blends, a storm-attractor surge and a crazy burst, looping
  seamlessly back to the opening prism.

- **No lines below the dot walkers** — removed the walker trail lines from
  `buildDotWalker` (for the base walker they rendered as a ground line under
  the feet).
- **Trip Number 5** (journey id 16) — the dot-walker loop. All `dotwalker`,
  sweeping `symmetry` (1–5 = the five walker shapes) and toggling `stars`
  (1↔3 = solo/trio): each walker enters solo, blends to three, then morphs to
  the next shape; ~7.5-minute seamless loop. (Walker shape = `cfg.symmetry`,
  count = `cfg.stars`, so the existing journey engine drives it directly.)
- **Trip Number 1** (journey id 17) — the golden trip developed into a smooth
  ~9.5-minute loop: `tripnumber1` spine with new elements between (swirl-dot
  tunnel, Fibonacci drift, golden mandala, alchemical sun, orbital calm), long
  stages for gentle transitions, looping back to the opening trip.
- **Trip Number 3** (journey id 18) — the triangle trip with more
  transformations: `tripnumber3` gates evolving through yantra-3D, hypercube,
  prism core, chaos triangles, a line temple and kaleido-yantra; ~7.5-minute
  seamless loop.
- **Long Trip** (journey id 19) — the whole set woven into one ~15-minute loop:
  golden trip → swirl → Fibonacci → prism → ocean → triangle/yantra/hypercube/
  line-temple → dot-walkers (solo + trio) → dot heart → crazy burst → desert
  drop → dust vortex → home. Kept *in addition* to the individual trips.

### Trip fixes
- **`linetunnel3d` removed from all journeys** (it wasn't rendering): "Desert
  Cut" → `swirldottunnel`, "Line Temple" → `tknot3d` (renamed "Knot Temple").
  Still present as a registry preset + mode-picker button.
- **Violet-Portal "Crazy Burst" removed** from Trip 4 and Long Trip.
- **Trip Number 2 (drop pulse) slowed** — preset default `breathSpeed` 1.18 →
  0.20, and a dedicated `tripnumber2` speed slider capped to **0.10–0.30**
  (the default 0.05–1.5 ran far too fast).
- **Finger distortion now affects the pulse rings** (`updatePulse`) for both
  `pulse` and `tripnumber2`.

### Curation + new trips (session 2)
- **Removed from FEATURED_PRESETS:** Chrysalis Rings, and featured #57–63
  (Music Entropy, Music Nebula, Groove Lattice, Nebula Veil, Nebula Bloom,
  Dot Galaxy, Emotion Field).
- **Cathedral Glass + Prism Seed** moved up next to the Prism family.
- **Yantra Colour** toned down (glow 7→4, intensity 9→6) — too bright on open.
- **Swirl Dot Tunnel** vanish point pushed planet-size: "Vanish Point" slider
  max 10→20, preset glow→20, forward speed default 0.68→0.13.
- **New journeys:** Trip Number 6 (id 20, 4D-crystal evolution), Trip Number 7
  (id 21, orbital/torus/rose/helix line weave), Mega Trip (id 22, sacred
  psychedelia: dots→orbits→cells→prism→glass→mandala), Magnetic Sands (id 23,
  continuous current-texture trip — scales, cyclones, eddies, gravity,
  revolutions). All slow, continuous, seamlessly looping.

### Deep work (mode-level)
- **Atomic Explosion dots — DONE.** It's a canvas-2D mode; the dots were flat
  1px discs. Now drawn as a soft radial-gradient sprite with additive
  (`lighter`) blending, sized by `luminous` — luminous like the Three.js point
  modes.
- **Swirl Dot Tunnel transformative pass — DONE (first pass).** `swirldottunnel`
  now has magnetic-sand scale banding (a drifting radial pattern) and a gravity
  element orbiting on an ellipse that nearby dots swirl around — so it evolves
  and loops. Vanish point already pushed planet-size (glow→20).
- **`flowfield` continuous-transformation mode — DONE (first version).** New
  mode `flowfield` (`buildFlowField`/`updateFlowField`, ~5200 persistent
  velocity-carrying particles). Forces: gravity wells orbiting on ellipses
  (revolutions), curl/flow drift, magnetic-sand scale banding, sound-reactive
  bloom + soft containment. An internal movement cycle (calm → vortex → scales
  → bloom → return) runs continuously so one preset transforms for minutes with
  no snap. Finger-distortion + mic reactive. Preset "Flow Field" (Cosmic Indigo)
  in the featured list; soft additive `circlePtsMat` dots. Tunable via
  symmetry (well count), complexity (turbulence + scale bands), particles
  (density), luminous (size), glow/intensity (colour).
- **Touch Preset light — DONE.** Same soft-additive-sprite treatment as Atomic
  Explosion, so its dots glow like the other presets.
- **Atomic Explosion** removed from the featured list (still not landing for the
  show, per request); mode + registry kept.

### Flowfield — deep development (DONE)
- **Per-particle hue drift** across the radius + over the cycle (vertex colours).
- **Formation morphing + movement state machine** — `flowFormation` library
  (disk, sunflower, rings, lattice, spiral) + `FLOW_MOVEMENTS`; six movements
  crossfade ~75s each, particles spring to the morphing formation so density is
  preserved through every shape.
- **Two more flow fields** sharing the engine via `flowFormationFor` /
  `flowMovementsFor`:
  - **Flow Walkers** (`flowwalkers`) — formations are walker silhouettes
    (designs 1–5); the field morphs from one walking figure into the next.
  - **Flow Sacred** (`flowsacred`) — rose, star polygon, flower-of-life,
    lissajous formations; psychedelic-sacred.

### Flowfield — further depth (future)
- GPU/GPGPU rewrite for 50k–200k particles + curl-noise.
- Wire into a journey (keep symmetry/complexity fixed per stage — rebuild
  resets velocities).
- Trails / motion-blur feedback for an optional streak look.

### Resolved / flow-field tuning
- **Random Burst** moved to the bottom of the good preset list.
- **Flow Speed slider** range extended to **0.05–8** (fast-forward to preview
  the transformation quickly); dedicated panels added for Flow Walkers/Sacred.
- **Speed is now continuous** — the phase + movement clock accumulate per-frame
  (`dt × speed`), so changing Flow Speed only changes the rate going forward.
  It no longer restarts/jumps the program; the continuum is kept.

### Requested next (deep, particle-evolution engine)
- **Develop Flow Walkers + Flow Sacred much further** — animate the walkers
  (walk cycle), more sacred formations.
- **Magnetic Sands 2** — a mega-deep, long-evolving variant for ambient
  surprise over a long set.
- **Dot Brain Loop** mega-develop — the two-figures-merge-and-move relation.
- **Dance Walkers — DONE** (`flowdance`, preset "Dance Walkers"): a flow mode
  where the particles split into two walker figures that drift apart → converge
  → merge → dance/bloom → divide → and resolve into a **heart**, looping
  continuously on the flow engine. Heart is a parametric curve fill; the two
  figures are the left/right halves of the particles with a per-movement
  separation. (Also covers the Dot Brain Loop "two figures merge and move".)
- **Trip Number 1** — remove the hard mode-cut so it evolves flowy like
  Magnetic Sands (journeys snap at mode swaps; true flow wants the flow-field
  approach).

### Flow-engine deepening — DONE (this batch)
- **Magnetic Sands 2** (`flowsands`, preset "Magnetic Sands 2", Amber Dust): a
  long **12-act (~15 min)** sandy game of chaos↔order — dots melt from waves →
  ripple rings → vortex → **figure-8 dunes (double loop)** → dust and re-form.
  High `wob` gives the grainy banding; two lemniscate acts give the double loop.
- **Flow field — longer + double loops**: base movement table grown to **10
  acts (~12.5 min)**, keeping every original formation and folding in two new
  ones — a **Gerono-lemniscate figure-8** (nested ribbons) and a **double
  spiral** (two counter-rotating arms), so the Magnetic-Sands double-loop motif
  now lives in the base field too.
- **Walk cycle animated**: the time phase is threaded into the walker
  formations, so Flow Walkers / Dance Walkers now **step and sway** instead of
  holding a frozen pose (`walkPh = ph × 20–22` drives the limbs).
- **Walker context halo**: ~1-in-5 (walkers) / 1-in-6 (dance) particles ring the
  figure with a slow 6-fold sacred halo, so the walker reads against a circle of
  context (closer to the dot-walker framing).
- **Flow Sacred — more forms**: added **hexagram, spiral galaxy, yantra
  (nested triangles), focus arc** (mono) and lissajous; movement table grown to
  9 acts opening on the calm focus arc.
- **Trip Number 1 — slice fixed**: the sliced kaleidoscope "Golden Mandala" act
  is replaced by a flowy **"Golden Sands"** (`flowsands`) act, so the trip
  evolves continuously like Magnetic Sands instead of cutting to wedges.
- **Preset list cleanup**: removed Golden Clock / Atom Light / Orbital Dance
  (weak); moved **Starflow Galaxy** to the bottom of the good list; added
  **Magnetic Sands 2** + **Golden Flow** to the FLOW group.

### Batch 2 — trips + butterfly — DONE
- **Butterfly** (`flowbutterfly` mode + preset, Rose Quartz): the Brain-Loop
  two-figures idea grown into a butterfly — dots fill Fay's butterfly curve,
  the **wings flap** (time phase), open wide, **spin/dance**, **split into two
  wings** that orbit apart, then reunite. Slow revolution (revRate 0.06) + a
  sacred context halo. 6-act continuous cycle.
- **Prism Mega Trip** (journey id 24): featured presets 10–13 — Prism Core
  (prism3d) → Prism Bloom → Stained Seed → Cathedral Light (prism) → Sacred
  Weave (flowsacred) → Rose Prism → Golden Sands (flowsands) → Prism Return.
  Colourful sacred-glass, seamless loop.
- **Butterfly Trip** (journey id 25): Butterfly → Two Dancers (flowdance) →
  Wing Spin → Sacred Halo (flowsacred) → Butterfly Return. Seamless loop.
- **Magnetic Sands 2 — circles inside chaos**: ~1-in-4 particles now hold a
  persistent concentric-ring order, so circle patterns keep emerging inside the
  chaos whichever sand act is playing (user: "love chaos but with the circle
  patterns remaining inside").
- **Featured order**: **Magnetic Sand → #1**, **Dot Walker → #2** (the two
  reference presets pinned to the top); **Butterfly** added to the FLOW group.

### Batch 3 — star-sand lines, walker crispness, Trip 1 deepening — DONE
- **Star Sand Lines** (`flowlines` mode + preset + journey id 26): shifting
  star-sand that **draws the great line-works out of dots** — torus knot, rose,
  orbital rings, helix — morphing one into the next, threaded with golden sand
  and sacred flow. Five parallel strands give the lines body; high spring
  (~0.14) holds them crisp; slow revolution.
- **Flow Walkers crispness**: walker movement table retuned — **spring 0.1 → 0.2,
  flow ~0.45 → ~0.2, swirl down** — so the silhouette holds and reads as a
  figure instead of blurring away. (Interim; the full trail rebuild below is
  still the real fix.)
- **Trip Number 1 deepened three acts further**: added **Golden Lines**
  (flowlines), **Golden Butterfly** (flowbutterfly) and **Sacred Gold**
  (flowsacred) woven through the golden arc — now an 11-act, fully continuous
  ~12-minute loop (no kaleidoscope slice anywhere).

### Batch 4 — deepen the trips + Liquid slider — DONE
- **Deepened Trips 3, 4, 6, 7 and Mega** — each gets three woven flow continuity
  acts before its return, themed to the trip's own palettes (so seams stay
  valid): Trip 3 → Yantra Flow / Triangle Lines / Triangle Sands; Trip 4 →
  Prism Sands / Prism Lines / Prism Butterfly; Trip 6 → Crystal Lines / Crystal
  Sands / Crystal Sacred; Trip 7 → Sand Knot / Rose Sand Lines / Sacred Orbit;
  Mega → Pearl Sands / Heart Butterfly / Sacred Lines.
- **Liquid slider** — the flow modes' `complexity` slider is now labelled
  **"Liquid"** on Flow Walkers / Dance Walkers / Butterfly, and complexity now
  drives the velocity damping (`liquidDamp` 0.82 → 0.93): higher = more momentum,
  so particles trail and stream like liquid. Reads well from ~4 up, matching the
  classic Dot Walker "Liquid" control (which maps to `complexity` too).

### Still open
- **Flow Walkers full rebuild** — the crisp-hold tune + Liquid damping help, but
  to truly match the **classic Dot Walker** (`buildDotWalker`, mode `dotwalker`)
  it wants the **`dotWalkerTrail` thick-lines-from-dots** rendering, not plain
  points sprung to a silhouette. Best done after a look on localhost.
- **Deepen festival trips 12–14** (Cathedral / Cosmos / Desert) — weave flow
  acts while keeping each inside the 19–21 min duration test (trim other acts to
  compensate).

### Batch 5 — Diaporama, Trip 3 evolution, Liquid fix — DONE
- **Diaporama — Play All** (journey, generated): a synthetic `Journey` built at
  module load from `FEATURED_PRESETS` (name entries, skipping headers), capped at
  **#76**, each slide carrying that preset's own config (palette + mode + numeric
  fields), 14 s a slide, **looping forever** with the engine's crossfade. Pushed
  onto `JOURNEYS` (id = length+1) so it shows in the Journeys tab; the builder's
  sliders adapt to each stage's mode as it plays. Self-colouring modes
  (fire/gravity) are included even though their palette isn't a PAL key.
- **Trip Number 3 — fully evolved** (16 acts, ~16 min, seamless): One Triangle
  (flowsacred, minimal) → Triangles Wake → Triangle Gate (tripnumber3) → Moving
  Lines (flowlines) → Triangles 3D → Yantra Lift (yantra3d) → **Sacred Pyramid**
  (pyramid3d) → Hypercube → Prism Core → Tri Sphere Blend → **Destructure**
  (flowsands) → Knot Reform (tknot3d) → Yantra Flow → Triangle Storm → Lines
  Settle → Return to One. Minimal→complex→destructure→loop, anchored in the
  triangle, bookended in flowsacred for a smooth seam; no kaleidoscope slice.
- **Liquid slider — now actually works on Flow Walkers**: complexity drives both
  the damping (0.82→0.93) **and** loosens the spring (`liquidSpring` 1→~0.35), so
  higher Liquid visibly makes the figure lag and smear even on the crisp
  high-spring walker modes. Good from ~4 up.

### Spec — BPM-listening reactive mode (requested, feasibility = yes)
A mode where the visuals lock to the **live BPM heard through the mic**, with no
DJ cable — the laptop just listens to the room.
- **Feasible today.** The audio path already exists: the mic analyser feeds
  `_musicBpm` / `_musicPulse` / `_musicBass` globals that the trip/tunnel modes
  read. BPM-from-mic is standard: run the analyser's energy/flux through onset
  detection, autocorrelate the onset envelope over a few seconds to estimate
  tempo, and phase-lock a beat clock. Latency ~2–4 s to lock, then it tracks.
- **Mode behaviour:** drive the flow `breathSpeed` / movement clock and pulse
  scaling from the locked beat clock instead of wall-time, so formations breathe
  and revolve *on the beat*; accent transitions on downbeats.
- **Caveats:** room noise, reverb and crowd sound reduce accuracy vs a line
  feed; works best with a clear 4/4 kick. Add a manual tap-tempo + BPM lock
  fallback for when the estimate drifts. A line-in/cable remains the most
  reliable, but mic-only is good enough for an ambient, beat-aware set.

### Batch 6 — display polish + curation — DONE
- **Full-screen display zoom**: when the controls panel is closed (display
  mode), the canvas + overlay scale to **+10%** so the visual fills more of the
  screen. The "Geometry Field" title and the Full button hide; the prominent
  "▲ Controls" pill becomes a **tiny discrete ◤ arrow, bottom-right**, so
  there's almost nothing on screen while projecting.
- **Magnetic Sand** (classic) default Flow Speed **0.35 → 0.10**.
- **Removed presets**: Flow Walkers + Dance Walkers dropped from the featured
  list (the silhouette-spring figures never matched the classic Dot Walker; the
  modes remain for the journeys that use them).
- **Removed the "Projection" category pill** from the builder tab row (next to
  Figures); projection is still reachable via `?projection=1`.

### Still open / requested
- **Presets fill more (some ~2×)**: each mode sets its own radius as roughly
  `Math.min(W, H) × 0.38–0.48`, so on wide screens they leave margin. The +10%
  display zoom is a global CSS scale on top; a true "fill the screen" / 2× needs
  raising that per-mode factor (or threading a global fill multiplier into the
  render). Best tuned per preset with eyes on localhost.
- **Figures page full view**: same treatment as the geometry display — strip all
  chrome to just the model, with a tiny bottom-right control to reopen the
  sliders/menu. (Separate surface: `app/(app)/figures/`.)

### Batch 7 — projection removed, finger toggle, stars-by-default — DONE
- **Projection mode deleted**: `?projection=1` no longer enters a separate
  projection live-mode (the display mode — closing the controls — replaces it).
  The Projection tab pill was already removed; now the mode itself is unreachable.
- **Finger touch is a click-toggle**: with finger distortion enabled, one click
  latches it on (and it follows the pointer), another click turns it off —
  instead of press-and-hold / move-to-activate. Touch-preset placement unchanged.
- **Stars by default**: every preset now shows a background starfield — the star
  count is floored (`Math.max(3, cfg.stars)`) at build, so even `stars: 0`
  presets keep a gentle field; the slider still adds more above the floor.

- **Diaporama pacing**: each slide now holds **~60s (a minute)** and every slide
  is capped to breathSpeed **0.18**, so it drifts by calmly rather than
  flickering past. A small skip list keeps the loop on the good ones —
  Sacred Sin Morph (also removed from the featured list), Chaos Sin Morph,
  Drift Field and Sacred Pyramid are excluded from the diaporama.
