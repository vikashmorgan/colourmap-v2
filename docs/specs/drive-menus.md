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
- Over it, full screen, a painted key art (2026-11-24, `components/drive/title-art.ts`): the
  hover ship boosting through a banked golden bend at sunset, rolled into the turn, both boosters
  firing with a gear ring just broken, burners along both edges and the sun where the road ends.
  Drawn on a 2D canvas, the road projected from the ground so the bank keeps its shape; only the
  fire, the dashes and the sparks move, and nothing moves when motion is reduced.
- "Colour Drive" (working title) in the display serif, one line: "Click to enter".
- Any key or click opens the ring, on the track raced last (`drive.lastTrack`). A `?world=` link
  skips the title and the ring. (Built 2026-11-22, `components/drive/GameSheets.tsx`.)

## The standalone site

- The game is also a website of its own (2026-11-25: "deploy the drive game on vercel as a
  website on its own? no accounts or login for now. and hover one is default").
- On its own domain (`colour-drive.vercel.app`, more through the `DRIVE_HOSTS` variable) every
  page is the game at `/play`: the proxy rewrites any page there, skips the Supabase session and
  never asks for a login. Files and `/_next` pass through. On the app's own domain `/play` is a
  plain public page too. (`lib/drive-site.ts`, `proxy.ts`, `app/play/page.tsx`.)
- Every world starts in the hover ship; a vehicle picked in the menu is still remembered.

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
6. **Stage fire** (2026-11-22: "a 3 2 1 go with big fire shooting on all sides in spectacular
   fashion. symmetric and well designed stage fire works"): four burner pairs stand mirrored on
   both edges, from beside the grid up the road. On 3 the nearest pair fires a column of flame, on
   2 the next, on 1 the next, so the fire runs away up the road with the count; on GO all eight
   roar at once, taller, the farthest tallest, and gold sparks (the track's colour) arc in from
   both sides to cross over the road. Plan: `lib/art/stage-fire.ts`; drawn as GPU particles on the
   gantry (`components/drive/stage-fire.ts`).
7. **The start arch** (2026-11-22: "a real big semicircle with fires, not a bad square
   rectangle door"): the gantry is a half circle of dark metal spanning the road, its feet on both
   edges, edged with rings of light in the track's colour. The three lamps hang under the crown.
   Burners stand along it in mirror pairs. The fire climbs it with the count: the feet on 3,
   halfway on 2, near the crown on 1. On GO the whole arch roars, the crown tallest with sparks.
   (`archJets`, `archPoint` in `lib/art/stage-fire.ts`.)
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
- Esc pauses: the game holds still and the camera turns slowly round your vehicle, in full view
  (2026-11-22: "when paused I need to see the image … static but with moving camera is awesome"):
  no veil or blur, only a slim bar at the foot (Paused · Resume · Restart · Tracks · Garage ·
  Leave) that fades back to a whisper after three seconds and returns on hover. Esc or Enter
  resumes, R restarts at the grid. Esc during the intro goes back to the ring.
  Leaving the game is in the pause sheet now, not a second Esc.

## Results

- When a course race ends (the Canyon, for now; laps when roads close): your place in words, your
  time, "new best" in gold or your best, everyone in order with their colour (the top three
  larger), "Race again" (Enter or R, straight to the grid) or "Tracks" (Esc). Built from
  `lib/art/race-result.ts`; the engine's `onFinish`.
- On endless roads, results open from the pause menu: best km, top speed.

## Found tracks (2026-11-25)

Asked: "BUT IT IS ALL THE SAME WORLD. SO WE BUILD IT AS RACETRACKS THAT KEEP ON EXPANDING… THE MORE U
KNOW THE MORE U DISCOVER." Some tracks are found in another world rather than given
(`lib/art/drive-unlocks.ts`, `SECRET_TRACKS`):

- **Water City** is found through the seven portals of light on the lake behind Chinatown Run's
  start (docs/specs/drive-tracks.md, "The lake behind the start").
- Until found, a secret track is in no menu, no ring and no number key; nothing hints at it.
- Found, it is remembered on this device (`drive.found`, a list of track ids; storage that fails or
  holds rubbish reads as nothing found) and joins the ring, the menu's Tracks and the keys from
  then on. The moment it is found its name comes up over the picture, quietly (the ZoneTitle card,
  水城 · found · now in the ring).

## Data

- Best times per track and vehicle stay where they are (localStorage keys in drive-game.md).
- The ring remembers the last track chosen.

## The menu (2026-11-23)

Asked: "make the right hand menu better. like a proper menu that opens with garage a proper
category in itself." Built in `components/drive/DriveMenu.tsx`; replaces the menu column.

- The button at the top right still names the track. It slides a sheet in from the right: a sheet
  lifted over the game with a soft shadow on its left edge, rounded on that side, the game held
  still behind it (the Design preview). On a phone the sheet rises from the bottom instead, over
  the lower half.
- Four categories along its top, named in the display serif, the chosen one underlined in gold:
  - **Tracks**: the nine worlds with their keys (the current one lit), and "Track ring ›".
  - **Garage**: Vehicle (car or hover ship, for this world), then Body for the car or Reactors,
    Cockpit and Core for the ship, Colour (the hulls, with a colour picker under Paint), Fire and
    Flames, and "Full garage ›" to the Garage page. Choosing Garage puts your ride big on the
    Garage's turntable, on Mars (components/garage/scene.ts), filling the screen beside the sheet:
    drag to turn it, scroll to look closer, "Hold to rev" for the fire at full. Every pick rebuilds
    the ride on the turntable at once. The game rests (its loop stopped) while the Garage shows,
    and wakes when you leave it.
  - **World**: Weather, Light trail, Racers (5 rivals or alone).
  - **Settings**: Mode, Speedo; the game's sound joins here when it lands.
- Each choice is a small label over its options in the serif; the chosen one is warm white with a
  gold dot and a fine gold edge.
- Keyboard first: the sheet opens with its current category focused; ← → change category, ↑ ↓
  move through the choices, Enter picks, Esc closes. The arrows never reach the car while it is
  open. A quiet line at the foot names the keys.
- The menu reopens on the category used last (`drive.menuTab`). Everything chosen is the same saved
  design as before (`drive.design`).
