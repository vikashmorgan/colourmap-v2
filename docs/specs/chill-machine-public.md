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

1. **Pad palettes**: per-pad colours, palette picker, choice saved in localStorage. Inside the Sound Lab, no auth.
2. **Visual colours**: the visualizer takes the palette, with Match pads and its own choice, and the controls are grouped under Visuals.
3. **Echo**: connect the sound to the visuals, send note and pad events, add the five echo types with per-type sliders.
4. **Public `/chill` + guest recording**: visitor route, light shell, record and download, guest feedback (migration: `chill_feedback`).
5. **Email accounts**: magic link, owner allowlist, saved mixes (including palette, visual and echo settings) and recordings (migration: `chill_mixes`, `chill_recordings`).

## Out of scope (v1)

- Video or MP4 with visuals (audio only for now. A plain coloured still frame can be added later if posting to Instagram or TikTok matters).
- Sharing recordings by public link.
- Replying to feedback from inside the app.
