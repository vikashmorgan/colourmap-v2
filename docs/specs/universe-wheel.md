# Universe Wheel

**Status:** vision, not built. Written 2026-11-19.

The schedule becomes a wheel, and the wheel becomes a planet. This spec keeps the inspiration in
one place so it is not lost, and names the first small piece worth building.

Asked for 2026-11-19: "we need to keep all that inspiration for the wheels... these planets become
like the new app for the universe."

Companion to [`colour-brain.md`](colour-brain.md) (branches) and
[`day-map.md`](day-map.md) (agenda blocks the wheel reads from).

---

## Two references

The screenshots were shared privately and are not committed: they are other artists' work and this
repo is public. They are described here, with credit, so the direction survives.

### 1. The Wheel of Life, animated (schedule wheel)

An animated Tibetan thangka of the Wheel of Life (*bhavacakra*), seen on Instagram
(`enlightenment.thangka`). A round wheel held by a fierce guardian, divided into illustrated
pizza-slice realms, with a small circle at the centre. Captions: "the source of time and the space."

What it gives Colour Brain:

- **It already looks like an app.** A painted interface: centre, ring, segments, a frame around it.
- **Slices, each a world.** Every part of the week (sculpture, Albert, admin, music, boxing, rest,
  Milan nights) is a slice with its own illustration, not a coloured bar.
- **A still centre.** The circle in the middle is the check-in, how you are, with a Buddha figure.
  This matches the branch model: the centre is not a branch.
- **Animation as breath.** The wheel turns slowly; today's slice glows. Movement is felt, not
  scored.

### 2. The Ring music machine (planet layer)

`be.of.dao`'s "Ring" prototype, seen on Instagram. Planets with rings in a dark instrument panel,
readouts and dials around them; the rings and orbits play sound ("It's a song", "Decodable vinyl").

What it gives Colour Brain:

- **Saturn is where the wheel lives.** The schedule wheel becomes the rings of a planet. Each ring
  is a rhythm (day, week, season); each segment on a ring is a slice of the wheel.
- **Rotation makes music.** Turning a ring, or a slider on it, changes sound. The week can be heard.
- **A cockpit, not a dashboard.** Instrument-panel readouts frame the planet, in the same spirit as
  the paper cockpit, in a night version.

---

## The long arc

1. **The wheel (schedule).** A 2D Tibetan-style wheel on the Day page: slices from agenda blocks,
   check-in at the centre, today glowing. Reads existing data, adds no table.
2. **The planet.** The same wheel drawn as rings around a 3D planet (three.js is already a
   dependency). Rings rotate with the week.
3. **The instrument.** Rings and sliders play sound; each slice has a voice. Shares ground with
   Colour Sound.
4. **The universe.** Several planets (Art, Admin, Energy), spaceships that travel between them,
   space races. Art, music and game in one connected world: Colour Studio territory.

Each step must be useful on its own. Step 1 is a schedule; it does not wait for the universe.

---

## Rules carried over

- **Computed, never stored.** The wheel is a view over agenda blocks and check-ins, like the
  branches.
- **No scoreboard.** A slice can glow, recede or wait. It never ranks or counts.
- **Rest is a slice.** Rest days and a full day off appear on the wheel as worlds of their own, not
  gaps.
- **Private stays private.** Names, contacts and money never appear in this repo.

---

## Not decided

- Whether the wheel replaces the Day Map's list view or sits beside it.
- Illustration source: commissioned, hand-drawn by the owner, or generated, and whose style.
- Where steps 2 to 4 live: here, or in Colour Studio once it is extracted.
