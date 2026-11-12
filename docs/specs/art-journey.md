# Journey — after the Big Bang

Art's seventh pill, right after **Big Bang**: one continuous trip of light,
from the first life to a tree and down into its roots, with words.

## Why

> 2026-11-09: "think deeply about a deep journey into the tree. from bacteria to
> cells to living creatures in swarms like fish. to trees to pulses and currents
> to roots. and a deep journey that takes us across all these transformations
> using some of the different visual tools u have created and create a journey
> in art after big bang."
>
> Then: "think how this can mix with words and philosophy and organisation and
> meaning. as a journey that reflects on nature technology and what is sacred.
> and why this is a pivotal moment for humanity."

The Big Bang trip ends on cells, microbes and shoals, and then one point of
light. The Journey starts there and goes deeper.

## The idea

**The same grains of light all the way.** Every grain keeps its identity from
the first step to the last. A grain that is part of a bacterium is later
part of a cell, a fish, the sap of the tree, a pulse, a root tip and the
seed. Nothing cuts: each grain pours from one form to the next at its own
moment (the Big Bang's golden-ratio stagger). What the picture says is what
the words say: it is one life, organised in more and more ways.

**Each step is a way of organising.** Nature organised itself long before we
did, in ways our technology is only now copying: votes in chemistry, networks
with no centre, cooperation that makes a body, swarms with no leader,
forests that share. The words read each picture that way. They end on why
now is pivotal: one species can now edit life and build minds that learn,
so for the first time what grows next depends on what we put in.

## Steps

| # | Step | What you see | Thread | Tool it borrows |
|---|------|--------------|--------|-----------------|
| 1 | Warm sea | Light cools into a sea; grains drift on currents | Nature | Silk Wind's curl flow |
| 2 | Bacteria | Rods swim, tumble and split in two | Organisation | — |
| 3 | Veins | The swimmers stream into a branching network | Organisation | Mycelium |
| 4 | Cells | One cell divides 2, 4, 8, 16 … into a hollow ball | Sacred | Big Bang cells, Fibonacci sphere |
| 5 | Swarm | Every cell becomes a fish; the school turns, splits, spirals | Organisation | — |
| 6 | Tree | The school dives and climbs back up as a tree | Nature | Star Tree (lib/star-tree.ts) |
| 7 | Pulses | Into the trunk: water climbs, sugar falls, a slow heartbeat every 5 seconds, each surge the same size. The crown is round all the way, as in step 6 (2026-11-10: "pulsing too fast and only half of the symmetry") | Technology | Life tree pulse |
| 8 | Roots | Below ground, roots meet other trees' roots | Sacred | Star Tree's grow() |
| 9 | Seed | All the light runs into one seed, and it opens again | Now | — |

The trip loops: the seed opens into the warm sea.

**The camera travels.** It is close and microscopic for the sea and the
bacteria. It turns round the embryo, and pulls back for the school. It
stands back from the whole tree, then flies into the trunk and up it. It
goes below the ground for the roots, and closes in on the seed.

## Words

Each step has a name, a line saying what you see, a thread (Nature,
Organisation, Technology, Sacred or Now) and a short reflection of two or
three lines. The reflection fades in a line at a time over the picture,
after the step has formed, and fades out before the next. A **Words** key
turns it off and on, and the choice is remembered in this browser.

The facts the words rest on are real and kept plain:
- quorum sensing in bacteria
- the slime mould that redrew Tokyo's rail map
- endosymbiosis (mitochondria)
- schools with no leader
- water lifted by leaves, not by a pump
- trees sharing through fungi
- trees as world-pictures in many cultures

## Player

The Big Bang's player (step bar, play and pause, previous and next, speed,
the controls that hide when idle, Space and arrow keys) becomes shared by
both trips (components/TripPlayer.tsx). The Journey adds a moving camera and
the words. The Big Bang is unchanged.

### Design menu, Game · Studio, phone controls (2026-11-12)

> "think how all buttons can be in a design menu tab so on phone they dont take all the screen
> space. and find a way to move and navigate when on phone."
>
> "for all the ocean vegetal city. u have all the test elements and the 3d videogame as two
> components. u can open the test elements to play with designs. aim is to have interface with
> less noise over time. specially for phone."

**Design menu.** Every control of a trip page lives in one menu: the Art tabs, Game · Studio,
the piece pills, a piece's own rows (variants, scenes), play and pause, Journey, Words, Full
screen, Reset view, the background, Steer, switches and cycles, the dots' ↑ / ↓ and the speeds. Shut, only
the picture, the piece's name (`4 / 17 City`) and one small **Design** button (low on the right;
dimmed when idle, still tappable) are on screen. While a game is played its bar and count stay
on screen too, with its dials.

- Opens on the button or **M**; shuts on **Esc**, the ✕, **M**, or a tap anywhere outside it
  (that tap does nothing else). It stays open while you pick pieces.
- A wide screen: a sheet anchored above the button. A phone (≤ 640px): a sheet rising from the
  bottom, 8px from the edges, at most 64% of the height, scrolling inside. Both lifted with the
  "sheet on top" shadow (docs/specs/visual-identity.md).
- `role="dialog"`; the button carries `aria-expanded`; the sheet takes the focus when it opens,
  and Esc or ✕ hands it back to the button. The other keys (Space, arrows, F) work as before.
- The controls never hide on idle while the menu is open.

**Game · Studio.** A world with a game (Vegetal's Bird Sim, Ocean's Shark Sim, City's Ship) has
two sides: the **Game**, the pieces where `pieces.game.has` is true, and the **Studio**, every
other piece, to play with designs. A **Game · Studio** switch heads the menu's pieces; the
pills show only the side you are on (none on the Game side when it has one piece). Going back
to the Studio returns to the studio piece you left. The side is remembered per world on the
device (`colourmap:trip-mode:<page>`) and the world opens on it. Nothing is named or numbered:
new pieces fall to the Studio unless `game.has` claims them. A world with no game, the Journey
and the Big Bang have no switch.

**On a phone** (pointer: coarse, or from the first touch anywhere on the page):

- A game piece shows a stick under the left thumb and a round button per key the game claims
  under the right: Space is named by the game's bar (**Boost**) or **Jump** without one, **B**
  is **Bite**. The stick holds the arrow keys (left/right turn, up climbs or walks on, down
  dives or steps back; a middle third holds nothing) in the same set of held keys the keyboard
  fills, so no game changes. A thumb on the stick or a button after Esc takes the controls back.
  The name and the Design button move to the top, the bar and count above the thumbs.
- Two small held pills above the round buttons, **Slower** (X) and **Faster** (Shift): the
  keys all three games read for pace.
- On any other piece a quick sideways flick on the picture (under 0.4 s) goes to the next piece
  (flick left) or the previous one (right), the little turn of the view it made undone; in the
  Studio it skips the game. A tap is a click (it turns the cursor guide off and on where a piece
  has one). The picture takes every finger: no page scroll or browser zoom over it.
- Full screen: the browser's own where it has one; where it has none (an iPhone) the controls
  hide all the same and Esc or the ✕ brings them back. Game controls stay in full screen.
- Safe areas: the name, the Design button, the sheet, the stick, the buttons and the exit all
  keep clear of the notch and the home bar (`env(safe-area-inset-*)`; the app's viewport is
  `viewport-fit: cover`).
- On a game, the open sheet never covers the dials: on a tablet the dials sit on the left under
  the name and the sheet keeps to the right (at most the width less 320px); on a phone the sheet
  rises from the bottom and stops short of the dials at the top.

**Your own view** (2026-11-12, "do all that"). On top of every piece's own camera path, without
changing a piece:

- **Zoom:** pinch with two fingers, or the mouse wheel over the picture: the eye's distance from
  what it looks at, ×0.5 to ×2.5. On a game too (the chase camera comes nearer or stands back).
- **Orbit:** drag with one finger or the mouse: round what the eye looks at, the climb kept short
  of straight above or below (77°). Not on a game, where the stick steers.
- **Home:** four seconds after the last touch the view eases back to the path, slowly; **Reset
  view** in the Design menu brings it back quickly. Each piece opens on its own path's view.
- **A piece that flies on its own** (the Cell corridor, the Canyon; any piece whose camera's
  target moves more than 3 in its first 6 seconds, found from the camera, never by name) gets
  the stick on a phone: up flies 2.5 times as fast, down at 0.3, left and right drift across the
  line of sight (up to 0.4 of the eye's distance), eased back like the rest when let go.

## Acceptance

- `/geometry-field/journey` plays the nine steps and loops. The step bar
  jumps to any step.
- The pills read Stars · Geometry · Tunnels · Oils · Big Bang · Journey ·
  Experiment, on the Art panel, the Big Bang page and the Journey page.
- Each step's grains arrive where the next step begins (no cut). The tree,
  pulses and roots use the Star Tree's routes, and the roots stay below the
  ground.
- Words on by default, one key to hide them, remembered. With reduced
  motion the words appear without fading; the trip plays as the Big Bang
  does.
- Each step finishes forming by about halfway through, before its grains
  start pouring into the next one.
- The seed is a dim shell with a small tree glowing inside it.
- No new dependencies, no data stored beyond the Words choice.
