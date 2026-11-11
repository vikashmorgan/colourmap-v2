# Three Worlds — the art quest

**Status:** Direction, building in phases
**Date:** 2026-11-09
**Where:** Art (`/geometry-field`), growing from Stars, Big Bang and the Journey

## Why

> 2026-11-09: "use all these visuals to create a series of organic environments
> (that later connect) from stars, big bang, galaxy language to underwater
> language with swarms of fish and cells, and they are programmed to move
> around and find energy and nutriment. and then tree roots, fungi, leaves,
> fruits etc… vegetal world. these are three languages I want to keep
> exploring. and develop visually almost like a video game on top of the
> visuals."
>
> Then: "of course concert visuals remain a big part of expos and the art
> experiment part."

The Art section has grown many looks: the Stars, Geometry, Tunnels, Oils,
the Big Bang, the Grid's Star Tree and the Journey. This spec gathers them
into three visual languages, turns each into a living world, and points
them at what the art is for: concerts, exhibitions, pieces, and the
community around them.

The user's personal goals behind the quest stay in their account, not in
this public repo.

## The three languages

| World | Language | Already built | Lives in it |
|-------|----------|---------------|-------------|
| **Cosmos** | Stars, Big Bang, galaxies, sacred geometry | Stars, Geometry, Tunnels, Big Bang | Stars, dust clouds, comets |
| **Ocean** | Currents, cells, swarms | Journey: sea, bacteria, veins, cells, swarm | Microbes, cells, fish schools |
| **Vegetal** | Trees, roots, fungi, leaves, fruit | Star Tree (Grid); Journey: tree, pulses, roots, seed | Roots, fungal threads, leaves, fruit, seeds |

Each world keeps the house look: grains of light on dark, additive glow,
earthy and warm colours, nothing that looks like a dashboard.

## One rule for all three: energy flows

**Living things seek energy, and what they leave behind feeds the next
world.**

- **Cosmos.** Stars forge elements and scatter them as dust.
- **Ocean.** The dust settles as nutrients. Microbes and cells sense them,
  swim toward them, eat, grow and divide. Fish school, hunt and scatter.
  What dies sinks and feeds the soil.
- **Vegetal.** Roots grow toward water and food. Fungal threads pass food
  between trees. Leaves catch light. Fruit ripens and falls, and its seed
  carries the energy on.

The worlds loop, as the Journey does: the seed opens into the sea, and the
sea's light rises back to the stars.

## Living rules (the "programmed" part)

Every creature is a small agent with a few rules and no script:

- **Energy.** It has a store. Moving costs a little; eating fills it.
- **Sense.** It feels food nearby and turns toward it, and feels its
  neighbours.
- **Move.** Microbes run and tumble; fish keep apart, align and stay close
  (schooling with no leader); roots extend tip by tip toward what they
  sense.
- **Grow and divide.** When full, it grows, divides or fruits.
- **Fade.** When empty, it dims and sinks, and becomes food.

The picture comes from the rules, so no two runs are the same. Rules run in
plain TypeScript with tests, separate from the drawing, like `lib/journey.ts`.

## The game on top

You play a **force of nature**, not a hero.

- **Ocean:** steer the current, drop nutrients, warm or cool the water.
- **Vegetal:** bring rain, sun or shade, wind that carries seeds.
- **Cosmos:** gather dust into a star, let one burst.

The creatures answer, but you never control one directly. You set the
conditions they grow in.

- **No losing.** A world can thin out and come back. The aim is balance and
  beauty, not a score.
- **Gentle goals.** A world can ask for something ("feed the school until it
  spirals", "let the roots of two trees meet"). Reaching one opens the path
  to the next world.
- **Controls.** Mouse, touch and keys, the Art panel's quiet keys, the same
  sliders as now. Later, phones in a room, where each guest is one drop of
  rain or one current (see [collective-immersive-music.md](collective-immersive-music.md)).

## Connections between worlds

The worlds join through the transitions the Journey already does: the same
grains pour from one form into the next, with no cut. A world opens the next
when its goal is reached, or freely in show mode.

## Concert visuals stay central

The worlds are also the concert visuals.

- **Show mode.** Each world can play unattended for a set: the game layer
  hidden, the creatures living on their own, long and slow like the festival
  journeys ([festival-visual-journeys.md](festival-visual-journeys.md)).
- **Driven by sound.** Following [visual-references.md](visual-references.md)
  (art first, then music), a world that holds up in Art passes to the Chill
  Machine. Bass can become current, pads light, beats a pulse.
- **Operator keys.** Jump between worlds, hold one, bring the next one in on
  a drop. The keys stay hidden from the audience.

## Exhibitions and pieces

The quest is an art experiment that aims at exhibitions around Europe.

- **Installations.** A world on a wall or a floor, with sound (for example
  Omnisphere), that visitors play with their hands or phones.
- **Prints and stills.** High-resolution captures of moments a world made
  on its own.
- **Sculpture.** Forms the worlds grow (a root system, a school, a seed) as
  starting points for 3D prints and casts (see
  [art-gallery-room.md](art-gallery-room.md)).
- **Videos.** Recorded runs, cut for social media and for proposals.

## Real missions

Later, each world links to real work in the user's account: a piece to make,
a gathering to host, a post to publish, a venue to write to. What the user
writes there stays private. Only the mechanics are in the repo.

## Build order

1. **Ocean world.** Microbes, cells and fish with energy, sensing, schooling,
   division and fading; nutrients on the Journey's currents; you steer the
   current and drop food. Show mode from the start.
2. **Vegetal world.** Roots that grow toward water, fungal links that share
   food, leaves, fruit that falls; rain, sun and wind.
3. **Cosmos world.** Dust that gathers into stars, bursts, and falls toward
   the sea.
4. **Links.** Energy and grains flow from one world to the next; goals open
   the path.
5. **Shows.** Sound-driven show mode, operator keys, captures and video.
6. **Missions.** Each world links to the user's own missions.

Each phase gets its own section here, with acceptance, when it starts.

## Not in scope yet

- Accounts or scores for players.
- Phones controlling a world in a room (after the worlds hold up alone).
- New dependencies: the worlds use three.js as Art does now.
