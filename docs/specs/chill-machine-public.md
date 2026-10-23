# Chill Machine — Public

> Let anyone play the Chill Machine: as a guest with no sign-up, or with an email account that keeps their mixes and recordings. Everyone can tell Martin what to improve.

## Context

The Chill Machine (`components/BinauralTuner.tsx`) lives inside the Sound Lab, behind the Google-only login. That login unlocks Martin's whole personal cockpit, so it can't be opened to other people. This feature gives the Chill Machine its own public page with its own light shell. Accounts made there unlock the Chill Machine only, never the rest of the app.

## Routes

- `/chill` — public page. Added to `VISITOR_PATHS` in `lib/auth/visitor.ts`. Own layout: Chill Machine, palette picker, record button, a small `+` for feedback and account. No app nav.
- `/chill/login` — email sign-in (magic link, no password).
- The existing Sound Lab tab keeps working as before and gains the palette picker and recorder too.

## Modes

| | Guest | Signed in (email) |
|---|---|---|
| Play every layer and preset | yes | yes |
| Pad colour palettes | yes (choice kept in this browser) | yes (saved to account) |
| Record and download audio | yes | yes |
| Saved mixes (layers, volumes, palette) | no | yes, across devices |
| Saved recordings in the cloud | no | yes |
| Send feedback | yes, name optional | yes, tied to their email |

A guest never sees a sign-up wall. Signing in is offered once, quietly, after a first download: "Keep your mixes and recordings — sign in with email".

## Pad colours and palettes

Each pad (layer card) gets its own colour, not just its category's colour. A palette is an ordered list of colours. Pads take colours from it in order across the whole grid, so neighbouring pads differ.

Palettes for v1:

- **Earth** — today's beige, brown, sage and clay (the default, so nothing changes for current users)
- **Rainbow** — saturated full spectrum
- **Warm** — amber, coral, rose, gold
- **Cool** — teal, indigo, ice blue, violet
- **Pastel** — soft, low-saturation spectrum
- **Night** — deep jewel tones on dark pads

Picker: one small row of swatch dots above the pads, no labels until hover or long-press. Category titles take the colour of their first pad. A pad that is off shows its colour faintly, and a pad that is on shows it fully. Text on pads must keep WCAG AA contrast in every palette, in light and dark themes.

## Layout — Sound, then Visuals

Today the studio view is one long column of separate sections: Controls, Harmonics, Sacred Melodies, Melodies, Voices, Layers, Genres, Brain States, Daily Note. The visualizer isn't in the Chill Machine at all (it lives in the Sound Lab's Visuals tab). The new layout keeps everything that makes sound together, then everything you see, then the song tools.

```
[ ● rec 00:00 ]   [ ▶ play ]   [ palette dots ]          ← always-visible top bar

▾ SOUND
   ▸ Pads         layers grid + softness          (open by default)
   ▸ Beats        BPM, 6 core loops, custom grid  (closed; see below)
   ▸ Tone         tone, rate, reverb, wave, volume
   ▸ Melodies     generative + sacred melodies
   ▸ Harmonics
   ▸ Voices
▾ VISUALS
   ▸ Look         mode, colour, shape sliders
   ▸ Echo         echo types + per-type sliders
▾ SONG
   ▸ Sections     intro / build / drop / break / outro timeline
▸ +               feedback notepad, saved mixes, genres, brain states, daily note
```

- Two levels of folding: a group header (SOUND, VISUALS, SONG) folds the whole group, and each module inside folds on its own. They use the same closable pill style as today's sections, with no new visual language.
- Each module's header shows a one-word summary when closed, so you can tell what's on without opening it (Beats `124 · Monolink`, Echo `ripple + bubble`).
- Open and closed state is remembered per module in localStorage.
- Simple mode is unchanged: genres and volume only.
- On phones the top bar stays pinned, so record and play are always one tap away.

## Feedback notepad

Feedback is a notepad, not a form. It opens from `+` → **Notes for Martin** as a sheet sliding up from the bottom, styled like a paper notebook page (beige, ruled lines, serif).

- One large text area where people write freely. It autosaves a draft in the browser while they type, so closing the sheet loses nothing.
- **Name (optional)** sits as a small line at the bottom, and only guests see it.
- Two buttons: **Send to Martin** and **Keep writing** (closes the sheet and keeps the draft).
- After sending, the page shows "Sent — thank you" and clears, ready for the next note. A small "your sent notes" list below shows what this browser has sent (signed-in users see all of theirs).
- Same API, limits and table as in the Feedback section below.

## Beats module

A module inside SOUND that adds a beat on top of the pads. The idea: you prepare an ambient bed with the pads, then open Beats and lay a groove under it. It's simple and sounds like real electronic music: Monolink-style melodic techno, minimal, tropical house.

### Engine

- Reuses the Groove Machine's synthesised voices (`triggerKick`, `triggerSnare`, `triggerHihat`, `triggerClap`, `triggerPerc`, `triggerBass`, `triggerSubPulse`), moved into a shared `lib/drum-voices.ts` so both machines use one copy.
- A lookahead scheduler (Web Audio clock, 16th-note steps, schedules 100 ms ahead) for tight timing. `setInterval` drifts too much for techno.
- Beats run into the Chill Machine's master bus, so the recorder captures them and the echoes react to them (each kick can fire an echo).
- **BPM**: a slider from 90 to 140, plus a tap-tempo button. Each core loop sets its own default BPM.
- **Swing**: one slider from 0 to 60%. Tropical loops start with some swing.
- **Sync to pads**: the beat starts on the next bar and fades in over one bar, so it never cuts in mid-phrase.

### Simple mode — 6 core loops

Six big cards, one tap each. Each card is a full 1-bar pattern (kick, hats, clap or snare, perc, bass line) with a BPM, a short description, and its own colour from the active palette.

| Loop | BPM | Feel |
|---|---|---|
| **Melodic** (Monolink-style) | 120 | Deep rolling kick, offbeat open hat, hypnotic bassline, sparse shaker |
| **Minimal** | 126 | Dry kick, clicky closed hats, rimshot on the off-16th, almost no bass |
| **Deep House** | 122 | Warm kick, clap on 2 and 4, shuffled hats, round sub bass |
| **Tropical** | 110 | Soft kick, marimba-like perc, swung shaker, bouncy plucked bass |
| **Organic / Afro** | 118 | Kick plus djembe and conga (reusing the Djembe sample), tambourine 16ths |
| **Hypnotic Techno** | 130 | Driving 4/4, ride on the offbeat, rumbling sub tail, no clap |

Per loop there are only four controls: **Volume**, **Fill** (adds or removes hits for more or less energy), **Low cut** (thins the beat for a break), and **Mute kick** (the classic pre-drop move). That's enough to perform with, and nothing to learn.

### Custom mode

A **Customise** button turns the current loop into an editable grid:

- 16 steps × 6 rows (Kick, Clap, Closed hat, Open hat, Perc, Bass). Tap a step to toggle it, long-press for an accent.
- The bass row has a note picker per step, limited to the current pad scale so it always fits.
- Per-row volume plus a mute and solo dot.
- Pattern length of 1, 2 or 4 bars.
- **Reset to loop** goes back to the core pattern.
- Custom patterns save with the mix (in the browser for guests, in the account when signed in).

## Song sections

Once beats are running you're building a track, and you need to know where you are in it. The SONG group adds a simple arrangement timeline.

- A horizontal strip of **sections**. Each is a block with a name and a length in bars.
- Starting template: **Intro 16 · Build 8 · Drop 16 · Break 8 · Drop 16 · Outro 8**. You can add, remove, drag to reorder, rename (free text or quick picks: Intro, Build, Drop, Break, Breakdown, Outro), and change the length (4, 8, 16 or 32 bars).
- A **playhead** moves across the strip in time with the beat. The current section glows in its palette colour, and the top bar shows `DROP · bar 5/16`.
- **What a section changes**: each section can hold a small snapshot (which pads are on, their volumes, whether the beat plays, its Fill and Low-cut and Mute-kick). At the start of a section the machine crossfades to that snapshot over one bar. "Take snapshot" saves whatever is playing now into the selected section.
- **Loop section**: hold the playhead on one section while you work on it.
- When recording, section names and times go into the file name and into a `.txt` cue sheet next to the download (`00:00 Intro, 00:32 Build…`). Signed-in saves keep them with the recording.
- Sections save with the mix.

## Visuals and Echo

The controls under the canvas are grouped into two categories, each a small closable section like the layer groups.

### Visuals — what you see

- **Mode**: today's 13 modes (atom, fibonacci, wave, galaxy…), plus more added over time.
- **Colour**: the same palettes as the pads, plus **Match pads** (the default), which follows the pad palette. The dots take their colours from the chosen palette, and the background tint follows the palette's darkest tone.
- **Shape sliders**: today's speed, density, size, opacity and depth, unchanged.

### Echo — how sound marks the visuals

An echo is what a sound event does to the canvas. Today the Chill Machine sends no sound to the visuals. This step connects its master output to the visualizer through an analyser and an event bus.

**Triggers**: each melody note, a pad switched on, and beat peaks above a loudness threshold. An echo appears where the note sits (pitch maps to height, and the pad's position in the grid maps to left and right), coloured by the pad that made it.

**Echo types** (each can be on or off, and several can run at once):

| Type | What it does |
|---|---|
| **Ripple** | Rings spread out from the hit point and push dots as they pass |
| **Bubble** | A bubble of empty space opens and clears the dots away, then slowly closes |
| **Burst** | Dots near the hit fly outward, then drift home |
| **Glow** | A soft colour flash blooms and fades |
| **Trail** | Dots leave fading tails for a moment |

**Sliders per echo type** (each type keeps its own values):

- **Size**: how far the echo reaches (bubble radius, ripple reach, burst spread)
- **Speed**: how fast it travels and fades (slide down for slow-motion echoes)
- **Strength**: how hard it pushes the dots
- **Sensitivity**: how many sound events trigger it (only notes ↔ every beat)

Defaults: Ripple on at mid values and the rest off, so the first look stays calm. Echo and visual settings are saved like the palette: in the browser for guests, and in the saved mix for signed-in users.

**Performance**: at most 24 echoes alive at once (the oldest is dropped), reusing the existing frame loop. The target is 60 fps on a mid-range phone at the default dot count.

## Recording

- One round record button. Press to start, press again to stop. No length limit.
- While recording: a thin red dot and a running timer. Nothing else changes.
- Captures the Chill Machine's master output only (an audio tap on the master gain, so no mic and no permission prompt).
- Format: `MediaRecorder` with `audio/mp4` (AAC) when the browser supports it (Chrome, Edge, Safari) → `.m4a`. Otherwise `audio/webm;codecs=opus` → `.webm` (Firefox).
- On stop: an inline card with play, rename, **Download**, and (signed in) **Save**. Filename: `chill-<palette>-<yyyy-mm-dd-hhmm>.m4a`.
- Guest recordings live in memory only. Leaving the page asks "You have an unsaved recording" if one wasn't downloaded.
- Signed-in saves go to the existing private `recordings` Storage bucket under `chill/{user_id}/`, with signed URLs for playback.

## Feedback

- Opened from the `+` → "Suggest an improvement".
- Fields: message (required, up to 2000 characters) and name (optional, guests only; signed-in users show their email).
- Sent through `POST /api/chill/feedback`. Guests are rate-limited per IP (5 per hour) and the form has a honeypot field.
- Confirmation: "Thanks — Martin reads every one."
- Martin reads feedback in a simple list on a private page, `/chill/feedback`, visible only to his account.

## Data model

```
chill_feedback
  id          uuid PK
  user_id     uuid nullable      — null for guests
  name        text nullable      — guest's optional name
  message     text NOT NULL
  palette     text               — context: what they were using
  created_at  timestamptz

chill_mixes
  id          uuid PK
  user_id     uuid NOT NULL
  title       text NOT NULL
  layers      jsonb NOT NULL     — { layerId: volume }
  palette     text NOT NULL
  created_at  timestamptz
  updated_at  timestamptz

chill_recordings
  id            uuid PK
  user_id       uuid NOT NULL
  title         text NOT NULL
  storage_path  text NOT NULL
  mime_type     text NOT NULL
  duration_secs integer
  palette       text
  created_at    timestamptz
```

RLS: users read and write only their own mixes and recordings. Inserts into `chill_feedback` go through the API route (service role). Only Martin's account can read them.

## Account scope

A Chill account is a normal Supabase user. To stop such a user from reaching the cockpit, the app layout allows only Martin's account (an allowlist in env), and every other signed-in user is sent to `/chill`. This also locks down today's setup, where any Google account could sign in.

## Setup (one-time, Martin)

- Supabase → Auth → Providers → enable **Email** (magic link) and set the email template and redirect URL to `/auth/callback?next=/chill`.
- Set `COCKPIT_OWNER_EMAILS` in Vercel.
- Apply the migration for the three tables, after an explicit OK.

## Edge cases

- Audio not started yet (no user gesture): the record button is disabled until something plays.
- Tab hidden while recording: keep recording. The Chill Machine already keeps playing in the background.
- Very long recordings: chunk `MediaRecorder` data every 10 s so memory stays flat. Signed-in uploads above 200 MB are refused with a clear message.
- Magic link opened on another device: falls back to the normal login error copy.
- Palette changes while recording: allowed, since it's visual only.

## Build order

1. ~~**Pad palettes**~~: shipped in PR #358.
2. **Layout regroup**: SOUND / VISUALS / SONG groups with two-level folding, a pinned top bar, the rest behind `+`. The visualizer comes back into the Chill Machine under VISUALS → Look. No new features, just the new home for them.
3. **Visual colours**: the visualizer takes the palette, with Match pads and its own choice.
4. **Echo**: connect the sound to the visuals, send note, pad and kick events, add the five echo types with per-type sliders.
5. **Beats, simple**: shared `lib/drum-voices.ts`, lookahead scheduler, BPM, tap and swing, the 6 core loops with their 4 performance controls.
6. **Beats, custom**: 16-step grid, bass notes in scale, 1/2/4 bars.
7. **Song sections**: timeline, playhead, snapshots, section loop.
8. **Public `/chill` + recording + feedback notepad**: visitor route, light shell, record and download with cue sheet, notepad (migration: `chill_feedback`).
9. **Email accounts**: magic link, owner allowlist, saved mixes (palette, visuals, echo, beats, sections) and recordings (migration: `chill_mixes`, `chill_recordings`).

## Out of scope (v1)

- Video or MP4 with visuals (audio only for now. A plain coloured still frame can be added later if posting to Instagram or TikTok matters).
- Sharing recordings by public link.
- Replying to feedback from inside the app.
