# Drive: menus, the track ring and the race intro

Asked 2026-11-21: "awesome menus. start of race start lines when you see ships aligned and track
in an awesome animation before it begins, with click to start … cool menu for selecting your
track, like a 3D circle of screens and the track shape below the screen". Follows
`docs/specs/drive-design-language.md`; reads `lib/art/track-registry.ts`.

## The flow

Title → Track ring → (Garage) → Race intro → Grid → Countdown → Race → Results → Ring or again.
Esc goes back one step; in a race it pauses.

## Title

- Your current vehicle idling in the world you raced last, the camera turning slowly round it.
- "Colour Drive" (working title) in the display serif, one line: "Click to enter".
- Any key or click opens the ring, on the track raced last (`drive.lastTrack`). A `?world=` link
  skips the title and the ring. (Built 2026-11-22, `components/drive/GameSheets.tsx`.)

## The track ring

- Nine screens stand on a slow ring in the dark, facing out, the selected one nearest and
  largest, the others receding round the circle, dimmer and smaller (built 2026-11-22,
  `components/drive/TrackRing.tsx`).
- The chosen screen is a window onto its world: the game runs that world live behind the ring,
  holding still with the camera slowly turning round your vehicle (the Design preview); the world
  follows 0.42 s after the ring settles. The other screens are tinted glass in their track's colour
  with their road's outline drawn small. (Stills rendered per world may replace the glass later.)
- The ring is the game's first screen; a link with `?world=` drives straight in. "Track ring ›" at
  the top of the menu's Tracks opens it again. The ring's keys (arrows, A D, Enter, Space, Esc, 1–9)
  never reach the car.
- ← → (or swipe, or click a screen) turns the ring; it eases round in 450 ms.
- Under the ring: the selected track's **map** (`lib/art/track-map.ts`), its road drawn as a glowing line in its colour,
  seen from above at a slight tilt so the rises show, turned to lie along its longest spread. The line draws itself from the start gate
  round the track in 1.2 s, then a light dot runs a lap on it, for ever, slowly. Marks on the line:
  the start/finish, banked bends (the line thickens), jumps (a gap), gates (ticks).
- Beside the map: the name, the tagline, the run label ("4.8 km course"), difficulty as three
  marks, your best time, and the rivals' colours if they race there.
- Enter or "Race" starts the intro; "Garage +" opens the garage on top of the ring.
- The endless tracks show the first 6 km of road on the map.

## The race intro

1. **Flyover (about 4 s):** the camera flies along the track 60–120 m up, sweeping through its best
   moments (on the Golden Track the city and a banked bend; on the Canyon the arches), the track's
   name fading in, then out.
2. **Down to the grid (about 1.5 s):** the camera comes down behind the start line.
3. **The grid:** the six racers in their slots, two by three, engines idling, fires breathing, a
   gantry of lights over the line in the track's colour. Each rival's name floats once over it.
4. **Click to start:** a soft pulse under the gantry. Any click or key.
5. **Countdown:** three lights go red one by one (3 · 2 · 1, 0.8 s each), then all turn the
   track's colour: GO. The racers launch together.
- Skippable: any key during the flyover jumps to the grid. A restart goes straight to the grid.
- Built 2026-11-22 (`lib/art/race-intro.ts`, `components/drive/RaceIntro.tsx`, the engine's
  `startIntro`, `skipIntro`, `launch`): the drone flies 150 m to 1,300 m up the road at 70 m,
  drifting across it, with film letterbox bars and the name; the crane comes down from 30 m to
  4.2 m, 30 m behind the line. The gantry (on every road, 6 m past the start) has edges of light in
  the track's colour and three lamps that light red one by one, then all turn the track's colour.
  Nobody moves until GO: your controls are held and the rivals launch with you. Holding ↑ at the
  grid starts the countdown and is still held at GO.
- The plains (Salt Flat, Mars) have no grid: the flyover ends behind your vehicle at the mile's
  start, then "Click to start".

## In the race

- HUD: the speedometer (your chosen style), place ("P2 / 6"), lap or km, time, the boost meter.
- Esc pauses: the frame freezes and blurs behind a lifted sheet: Resume, Restart, Tracks, Garage,
  Leave (Esc or Enter resumes, R restarts at the grid). Esc during the intro goes back to the ring.
  Leaving the game is in the pause sheet now, not a second Esc.

## Results

- When a course race ends (the Canyon, for now; laps when roads close): your place in words, your
  time, "new best" in gold or your best, everyone in order with their colour (the top three
  larger), "Race again" (Enter or R, straight to the grid) or "Tracks" (Esc). Built from
  `lib/art/race-result.ts`; the engine's `onFinish`.
- On endless roads, results open from the pause menu: best km, top speed.

## Data

- Best times per track and vehicle stay where they are (localStorage keys in drive-game.md).
- The ring remembers the last track chosen.
