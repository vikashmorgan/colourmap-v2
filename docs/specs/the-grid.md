# The Grid

> Martin (2026-10-25): "ideas for overall organisation of my cbrain app. something cyberpunk like tech networks. to organise the overview. not just menus on top. as an alternative from a central menu" · "can be combined with the tree. as two opposite options." · "imagine for the apps I have now how system of networks would look like a videogame cool menu kind of thing" · "build when done planning"

## What it is

`/grid` is a full-screen central menu: every page the app has today, drawn as a network you move through like a game menu. It is the opposite figure to the tree (`lib/branches.ts`, drawn by `LatticeTree` in the bottom band). The tree is a picture of a life, much of it with no pages yet. The Grid shows only what exists.

It is a prototype next to the top menu, not a replacement yet. It is reached from the Colourmap title menu ("The Grid").

## Shape

- **The core, You,** in the middle: Focus, Journey, Progress road, Profile.
- **Seven hubs** round it, clockwise from the top: Sound, Mind, Learn, Engine room, Play, Body, Studio. Each has its own small glow colour; gold stays the main colour.
- **Satellites:** Chill Machine and TunnelSurfer are separate apps. They sit outside the ring, joined to Sound by a dashed bridge, and open in a new tab.
- **Signals:** light pulses run along the spokes and along five links that carry something real (Body → You, Mind → Learn, Studio → Sound, Play → Studio, Mind → You).

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
