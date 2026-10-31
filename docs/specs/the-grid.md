# The Grid

> Martin (2026-10-25): "ideas for overall organisation of my cbrain app. something cyberpunk like tech networks. to organise the overview. not just menus on top. as an alternative from a central menu" · "can be combined with the tree. as two opposite options." · "imagine for the apps I have now how system of networks would look like a videogame cool menu kind of thing" · "build when done planning"

## What it is

`/grid` is a full-screen central menu: every page the app has today, drawn as a network you move through like a game menu. It is the opposite figure to the tree (`lib/branches.ts`, drawn by `LatticeTree` in the bottom band). The tree is a picture of a life, much of it with no pages yet. The Grid shows only what exists.

It is a prototype next to the top menu, not a replacement yet. It is reached from the Colourmap title menu ("The Grid").

## Shape

- **The core, You,** in the middle: Focus, Journey, Progress road, Profile.
- **Seven hubs** round it, clockwise from the top: Sound, Mind, Learn, Engine room, Play, Body, Art (called Studio until 2026-10-26: "the categories in circle G menu should be Art instead of Studio"). Each has its own small glow colour; gold stays the main colour.
- **Satellites:** Chill Machine and TunnelSurfer are separate apps. They sit outside the ring, joined to Sound by a dashed bridge, and open in a new tab.
- **Signals:** light pulses run along the spokes and along five links that carry something real (Body → You, Mind → Learn, Art → Sound, Play → Art, Mind → You).

Hubs, pages and signals live in `lib/grid.ts`. A test fails if any page in it points at a route that does not exist.

## Nodes say only facts

| State | Meaning | Look |
|---|---|---|
| Online | Opened in the last 7 days | Bright, slow breathing glow |
| Idle | Not opened lately, or never | Dim, still there |
| Prototype | The page is still a sketch | Dashed outline |
| Satellite | A separate app | Diamond, outside the ring |

No counts, no scores, no ranking. Visits are kept in this browser only (`localStorage` key `cb-grid-visits`), written by `AppShell` on every page and by the Grid when it opens one.

## How it plays

- Click a hub to zoom in: its pages spread round it, the rest of the grid stays faint behind. Click the centre, "← GRID" or press Esc to go back out.
- Hover or focus anything for its scan panel: name, one line, online/idle, when it was last opened.
- Arrow keys move to the nearest item in that direction, Enter opens, Esc goes back.
- Opening a page "jacks in": a line runs from the core to the node with a short flash (380 ms), then the page opens. Ctrl/Cmd-click opens in a new tab as usual.
- The first visit in a session plays a 2-second boot (lines draw, nodes light one by one). Any key or click skips it.

## Accessibility and motion

- Every hub is a button and every page a real link, at least 44 px.
- With reduced motion asked for: no boot, no pulses, no drifting floor, no jack-in.
- Text stays horizontal. On phones the scan panel moves to the bottom and the key hint hides.

## Later

- A quick wheel: hold a key on any page to pop the hubs up in a circle.
- A Tree ◐ Grid switch, once the tree's branches have real pages.
- Soft hover/click blips from the Chill Machine sounds, off by default.
- Making the Grid the home page, if it earns it.

## The quick menu — 2026-10-25

> Martin: "i cant access the new menu cyberpunk network radial wheel. or cyberpunk matrix terminal (but without typing more like a menu)"

The Grid page was only reachable from the title popup. Now every page has a **GRID** button in the header's left slot, and the **G** key (or backtick) opens the same menu, except while typing in a field. `components/GridMenu.tsx`.

Two looks, switched at the top and remembered in this browser (`cb-grid-menu-mode`):

- **Wheel:** the eight hubs in a ring, like a game's weapon wheel. Pick a hub and its pages take the ring; the centre goes back. With no hub picked, the centre opens the full Grid map.
- **Terminal:** a green phosphor screen. Hubs in one column, the chosen hub's pages in the next as `[ON ]`, `[IDL]` or `[EXT]` with their line and when they were last opened. Nothing is typed. The last line opens the full map.

Keys: on the wheel, arrows go round. In the terminal, up and down move, right goes into a hub and left comes back out. Enter opens; Esc goes back, then closes.


2026-10-26. Martin: "take off the part where a circle behind it moves out. un cercle en traits tirés qui se décale derrière. crée confusion. no need." The wheel's rotating dashed ring is gone; the wheel keeps only its still outer circle and the centre disc.

## The life tree — 2026-10-30

Martin: "build it on brain when I press G as organising visual language. For
now all in one colour. With pulse from center and three trees moving from the
center root as my life tree." Then: "each branch opens into its evolution with
the pages it connects to", and "I want the first tree to stay branchy and full".

- G now opens on a third look, **Tree** (before Wheel and Terminal). The
  remembered look moved to a new key, so everyone lands on the tree once.
- **The figure.** You at the root, a ring pulsing out of it every few seconds,
  and three Star Trees (lib/star-tree.ts, without their own roots) growing out
  of it: Art up, Admin lower right, Energy lower left -- the three branches of
  lib/branches.ts. A current of stars runs from the root to every tip and
  surges as each pulse leaves. Gold only.
- **The top.** All three trees full and equal; their names beyond the crowns,
  YOU at the root.
- **Into a branch.** That tree evolves: it grows half as large again, the root
  slides away to give it room, the other two shrink back but stay. Its areas
  hang from its own branch tips, spread round the crown. An area with several
  pages opens them the same way; one page opens directly. An area with nothing
  built yet is shown dim and does nothing.
- **YOU** opens the pages about how you are, round the root.
- Arrows move, Enter opens, Esc steps back out and then closes.

### Design II, and the design tab — 2026-10-30

Martin, asked how the G menu's organisation could be better: "do it as a
second tree so I can combine both versions", then "with a design tab to go
from one tree to the next, and a disintegration of the light currents and
tree when you do the switch: it disintegrates and rebuilds in 2 seconds".

- A **DESIGN I / II** tab at the top left of the tree, remembered. Switching
  scatters the stars outward in a swirl for one second and streams them back
  into the trees in the next; the names fade out and the new design's come in
  at the turn.
- **Design I** is unchanged: lib/branches.ts, areas then pages.
- **Design II** (lib/life-tree-2.ts) places every page the Grid knows -- a test
  fails if one is left off. Opening a tree shows it in one view: the areas
  named along its limbs, every page hanging from the tips of its own limb, so
  any page is two taps from G. Names are nudged apart so none overlap.
- **Use shows (design II).** Pages opened this week glow; a tree shines up to
  a third brighter by the share of its pages opened this week. Your last three
  pages sit just below YOU.
- **Type to find (design II).** Letters typed in the tree list matching pages
  above the line; Enter opens the first, Backspace edits, Esc clears.

### The root as a ball of stars, the power quote, the star wheel — 2026-10-30

- **No YOU pill and no pulse rings at the centre** ("it denatures the tree").
  The root is a ball of star dots turning slowly, the trunks leaving from
  inside it; tapping it (or Enter on it) still opens your own pages. The beat
  is kept only as the current's surge.
- **A power quote** sits under the tree on its first view: one of fifty
  (lib/power-quotes.ts) -- Kerouac, Jack London, painters, musicians, fighters
  -- kept to lines on the record as theirs, no lyrics. A new one each time G
  opens, then every half minute, fading.
- **The wheel has two designs** too, on the same DESIGN tab. **I** is the star
  wheel (components/StarWheel.tsx, lib/star-wheel.ts): the same ball of stars
  at the centre, a current of stars along a bowed spoke to each hub, each hub
  a small ball of stars, the whole held by a slow ring of stars -- the context
  circle. **II** is the wheel as it was. Moving between Tree and Wheel, the
  new look's stars stream together, so the two read as one style changing
  shape.

### An opened tree grows to its own pages — 2026-10-31

Martin: "want individual trees to connect to their segments in a unique, non
generic and more precise way once you click on one of the 3 branches that
open bigger."

- At the top the three trees stay full Star Trees. **Opened, a tree is
  regrown from its data** (lib/branch-tree.ts): the trunk forks into exactly
  one limb per area, thicker for fuller areas and given more of the crown;
  each limb forks into exactly one twig per page. An area with nothing built
  is a short bare stub with its name on the end. The shape is the map: count
  the limbs and you have counted the areas.
- **Every name sits on its own branch.** An area's name is on its limb below
  the twigs; a page's pill has its near edge on the tip of its own twig, and
  the stars run from the root to exactly that point.
- **Each tree grows in its own manner**, so the three are not one template:
  Art flows (limbs sway in an S from one crown, twigs curl), Admin is angular
  (a ladder of limbs up the trunk, each bent once at an elbow, long and short
  in turn, twigs at a fixed angle), Energy rises (limbs leave low and turn
  upward like a flame).
- **The chosen name's path lights up.** Moving through names brightens the
  current from the root along that limb to that twig; the rest of the tree
  steps back. In design I, inside an area, the whole limb stays lit.
- Opening comes apart and re-forms, a quicker version of the design switch:
  the full tree scatters, the grown one gathers. Stepping back out does the
  reverse. Both designs use it; they differ only in which areas they read.

### Use on the twigs, three tints, the path line, stubs that ask, twigs on the wheel — 2026-10-31

Martin, on how the G menu could be better: "ok do all that."

- **Use shows on the twigs.** On an opened tree, the current along a twig
  runs bright when its page was opened this week, as it is when opened this
  month, and thins to a faint thread when left longer or never opened (lib/
  branch-tree.ts twigUse). Read from the Grid's last-opened times; no counts.
  Both designs.
- **One gold, three tints.** At the top all three trees are gold. Opened, a
  tree leans to its own tint -- Art an ember, Admin parchment, Energy a green
  gold -- and leans back to gold as you step out (lib/life-tree.ts tint).
  Never blue.
- **The path line.** Under an opened tree, where you stand is said in full --
  ART › VISUAL › FIGURES -- following the chosen name, so Esc always steps
  back one name.
- **A bare stub asks for something.** Tapping an area with nothing built
  (Money, Papers, Habits…) says so and offers PLANT A SPARK FOR IT; a second
  tap plants a private, no-rush spark in /sparks named for the area, and the
  line says it is planted. Nothing is written without that second tap.
- **Twigs on the wheel.** On the star wheel, each hub's ball grows one short
  twig per page inside it, fanned into its name, so the wheel shows how full
  a hub is before it opens. Inside a hub the pages have no twigs.
