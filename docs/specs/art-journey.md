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
| 7 | Pulses | Into the trunk: water climbs, sugar falls, a heartbeat | Technology | Life tree pulse |
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
