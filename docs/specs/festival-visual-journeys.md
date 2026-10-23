# Festival Visual Journeys — 20-minute projection programs

**Status:** Shipped (PR #213).
**Surface:** geometry builder (`components/GeometryField.tsx`, route `/geometry-field`).
**First use:** Reconnect Festival, Gstaad — live visuals projected during a DJ set.

## Purpose

Give a VJ ready-to-run, long-form visual sets that play unattended for a full
20 minutes and flow from one geometry look to the next without manual preset
switching. Three curated programs cover three moods of a night so the operator
can pick by energy and let it run.

## The three programs

Each is a `Journey` appended to the `JOURNEYS` registry. All run **~20 minutes**
(1200s) across 9–10 acts of roughly two minutes, so every look has time to
breathe before it morphs into the next.

| Program | Mood | Arc |
|---|---|---|
| **Cathedral of Light** | Sacred, meditative | Fibonacci seed → flower of life → rose window → cathedral → Islamic court → yantra → golden mandala → crystal → return to source |
| **Cosmos Drift** | Psychedelic space | Stargate → wormhole → strange attractor → wave field → galaxy spiral → nebula → chaos bloom → 4D fold → deep drift |
| **Desert Temple** | Festival drop, sound-reactive | Amber pulse → violin heat → dust vortex → fire walk → triangle gate → yantra lift → desert cut → sacred drop → tunnel → return |

## How it works

Built entirely on the existing journey engine — no engine changes.

- **Data model:** a `Journey` is `{ id, name, icon, desc, stages: JourneyStage[] }`.
  A `JourneyStage` names a `preset` (palette), a `mode` (geometry), a `duration`
  in seconds, and optional per-stage overrides (`symmetry`, `complexity`, `glow`,
  `breathSpeed`, `intensity`, `particles`, `luminous`, `stars`).
- **Seamless loop:** the playback loop computes `loopTime = elapsed % totalDur`
  and cross-fades each stage into the next via `journeyLerpCfg` (smoothstep on
  every numeric parameter; mode/palette swap at the midpoint). The final stage
  morphs back into the first (`stages[(i + 1) % length]`), so a program loops
  forever with a smooth seam — no restart flash.
- **Indexing invariant:** the engine resolves the active program with
  `JOURNEYS[id - 1]`, so ids must stay contiguous and aligned with array order.
  These three are ids 12–14.
- **Palette resolution:** colour comes from `PAL[stage.preset]`. A stage `preset`
  must be a real `PAL` key, otherwise it silently falls back to the warm "Calm
  Field" palette. (Numeric defaults come from `PRESETS[stage.preset]`, but every
  stage here sets its numeric fields explicitly.)

## Sound-reactivity

The reactive input is the **live DJ set picked up via the mic input**, not
colourmap's internal audio. The Web Audio analyser drives bass / drums / pads /
keys / BPM globals that the trip/tunnel modes respond to. **Desert Temple** is
the program tuned to ride it; **Cathedral of Light** and **Cosmos Drift** are
designed to stand alone without audio.

## Running the show

- Venue projector: open `/geometry-field?projection=1` fullscreen.
- Operator laptop: open `/geometry-field?control=1` → **Journeys** tab → pick a
  program → **Play**. The picker shows "20m0s total" and a clickable phase list.
- For Desert Temple, enable the mic/Voice input so the DJ set pushes the visuals.

### Navigation

The **Journeys** tab is selected via the "Journeys" pill in the builder's tab
row (alongside Builder / Music Visuals / Projection). The journey picker
wraps onto multiple rows so every program is visible — including the three
festival programs at the end of the list.

## Testing

`components/GeometryField.journeys.test.ts` locks the contracts that matter for a
live set (requires `JOURNEYS` + `PAL` to be exported from `GeometryField`):

- each festival program runs 19–21 minutes;
- ids stay aligned with array index (`JOURNEYS[id - 1]`);
- every stage resolves to a real `PAL` palette (guards the silent fallback —
  this caught a wrong-colour `'Nebula Veil'` stage during development, fixed to
  `'Cosmic Indigo'`);
- each program has ≥ 8 acts.

## Future

- Optional chaining of programs into a multi-hour set.
- A VJ "playlist" surface to queue programs.
- Per-program intensity ceiling so the mic reactivity can be dialled for the room.
