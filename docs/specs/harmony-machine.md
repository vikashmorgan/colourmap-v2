# Harmony Machine

**Status:** first prototype, 2026-11-19. Route `/harmony`, listed in the Grid under Sound as a prototype.

Asked for 2026-11-19: "create those wheels, those turning planets, connected to the sound machine...
the lines, the gradients where you swipe left, right to make the sounds change. Create a machine of
harmony that runs on autopilot and you navigate it." Two moods: chill (birds, binaural, ambient) and
soft pianos with really soft pads. Later it becomes a journey where travelling makes the music.

This is step 3 of [`universe-wheel.md`](universe-wheel.md) ("the instrument"), built first as a
standalone toy so it can be felt before it reads schedule data.

## What it is

One 3D planet with four rings, in a night cockpit.

- **The rings are records.** Each ring carries a few lights. A golden needle sits at the front of the
  ring plane. When a light passes the needle it sings one note.
- **Rings set the register.** The inner ring is high and fast; the outer ring is low and slow.
- **Notes come from the current chord**, so nothing clashes. Chords change every 9 seconds (11 in
  piano mood) and the pads crossfade over about 5 seconds.

## Controls

| Gesture | Effect |
|---|---|
| Swipe left or right across a ring | Spins that ring; a fast flick plays a fast run, then the ring eases back to its own speed |
| Swipe the dusk–dawn gradient (or empty space) | Moves the colour of the sound: dusk (minor), day (major), dawn (lydian). Also brightens the pads and recolours the planet |
| Swipe up or down on empty space | Tilts the planet |
| Chill / Piano | Crossfades the mood over a few seconds |
| Autopilot | On by default. After 6 seconds without input the machine flies itself: colour wanders, ring speeds breathe, the view drifts. Any touch hands control back |

Arrow keys move the gradient when it has focus.

## Moods

- **Chill:** bells on the rings, a binaural drone (6 Hz beat between ears, carrier follows the chord
  root), brown-noise wind, occasional synthesised birds, sine pads.
- **Piano:** soft piano notes on the rings, a low piano root on each chord change, very soft
  low-passed saw pads, a long delay.

All sound is synthesised with Web Audio; no samples, no network.

## Rules

- **Sound starts only from Begin** (browsers require a tap).
- **No scoreboard.** Nothing is counted or ranked; the readout shows only mood, colour, chord, spin
  and who is flying.
- **Other artists' work stays out.** The reference images (be.of.dao "Ring", the Wheel of Life
  thangka) inspired the mood only and are not in this repo.

## Next

1. **The road.** Leave the planet and travel: a road or tunnel whose curves, gates and colours make
   the music the same way the rings do (lights passing a needle become gates passing the ship). This
   is where TunnelSurfer and the golden roads reconnect.
2. **The schedule wheel on the rings** (universe-wheel step 2): ring segments from agenda blocks.
3. **More planets** (Art, Admin, Energy), each with its own voice.

## Acceptance

- `/harmony` loads, shows the planet and a Begin screen; after Begin, sound fades in over 3 seconds.
- Swiping a ring changes its speed and the rate of notes; the ring returns to its home speed.
- The gradient changes chord family at the next chord change and the pad brightness at once.
- Chill and Piano crossfade without clicks.
- Left alone, it keeps playing and changing for as long as the tab is open.
- Without WebGL, the Begin screen says so and the sound still plays.
