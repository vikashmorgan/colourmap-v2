# Garage

Asked for 2026-11-19: "a space to design your car or spaceship, like a dope space garage, with a
circle raised in the middle of the room and the spaceship or car or bike on top; you can rotate the
circle and check your ride." Also "user-pickable colours, chrome and gold included". Step 2 of the
unity plan: one saved ride, the same in every place.

Route: `/geometry-field/garage` (on the map under Play, and the tree's Worlds limb). Reached from
Drive's Design panel ("Open the Garage ›") and the shared tab.

## The room (components/garage/scene.ts)

- A pad in the gold-dots-on-dark look: a near-black polished floor 12 m across, edged with a thin
  line of light, a raised dark metal platform with a ring of gold light round its rim, fine gold
  rings on its top (turning with it, so the turn reads), rings of softly breathing gold dots round
  it, short warm beacons round its edge (a cool one every fourth).
- **Mars around it** (2026-11-23: "make garage have the mars context around"): rust regolith to the
  horizon under the Drive world's Mars dusk (butterscotch low down, dusty rose, a dark umber
  overhead, a small white sun in a blue halo, Phobos), low dunes, flat-topped mesas in a broken
  ring on the horizon, an old rusty lattice mast with a steady warm lamp, a rusted tank lying on
  its side; fog the colour of the dust; a low warm sun and a rose sky light. A gradient dome and
  plain meshes, so it stays cheap. The same room shows in Drive's menu under Garage.
- Light: a soft key spot from above with soft shadows, a cool rim light set high (lower, its gleam
  glared across the floor), a dim fill. The room environment lends the chrome and gold their
  reflections; the floor takes only a faint sheen of it.
- The ride is the one Drive builds (components/drive/vehicles.ts), centred on the platform.

## Moving it (lib/art/garage.ts)

- Drag sideways turns the platform; let go and it carries the fling, easing back to a slow idle
  spin the same way round (never dead still). A drag that had stopped before letting go is not a
  fling. Drag up and down tilts the view (0.04–0.7 rad); the wheel zooms (7–18 m).

## The panel (components/Garage.tsx)

- **Ride**: Car or Hover ship. Picked here, it is the ride in every world (`rideEverywhere`).
- **Hull**: Chrome, Gold (new), Rust, Red, or Paint: your own colour from a picker, a glossy
  clear-coated paint (`Design.paint`, `hullOf`).
- **Fire**, **Flames**, **Speedo**, **Mode**: the same choices as Drive's Design panel.
- **Hold to rev**: the fire and the speed flames at full while held.
- **Drive ›** takes the ride out.

Everything is the one saved design (lib/art/drive-design.ts), so Drive and the Garage always agree.

## Bodies (components/drive/bodies.ts)

Asked: "also a motorbike", "make cars inspired by the 50s Ferrari GTO, and then the same but
futuristic". The car's **Body** row (Garage and Drive's Design panel; `Design.body`). The physics
stay the car's; no badges, names or logos.

- **Wedge**: the car as it was.
- **Classic GT**: a long rounded bonnet over a low oval mouth with a thin chrome lip, faired
  headlamps, wings swelling over wheels set out at the sides, three vents behind the front wheel,
  a fastback to a short cut-off tail with two round lamps each side, chrome bumper blades, four
  exhausts, wire wheels.
- **Future GT**: the same stance drawn sharp: a blade nose with a light line across it, a glass
  canopy, wing blades floating over the wheels, covered wheels with rims of light, a cyan line down
  each side, a full-width bar of light across the tail, two glowing outlets for the flames.
- **Motorbike**: two wheels, the tank, fairing and the rider's helmet in the paint, a rider tucked
  over the tank, one exhaust; it leans hard into turns (up to 0.6 rad).
- **Light Cycle** (2026-11-22: "make tron bikes"): an original neon racing bike. A long low shell
  in the paint swept over two big wheels; dark discs ringed in light; a line of light along the
  spine and round the nose; a rider lying flat along it in a dark suit traced with light. Every
  light takes the hull's own colour. Two of the rivals ride one.

**Light trail** (2026-11-22: "cars leave colour trail behind them, bikes as well"): every car and
bike on a track leaves a wall of light 1.1 m tall in its own colour (yours the hull's), fading over
2.4 s. On by default; a Light trail row (On / Off) in the garage and the game menu turns it off.

All take the hull, the fire and the speed flames like the others.

## The spaceship creator (the ship's parts)

Asked: "a spaceship creator with different reactors I can place on the side or above, different
bubbles for the cockpit and different cores; the aim is that they match well with each other, and
that I can change and pick their colours, chrome and gold included". In the Garage when the ride is
the hover ship (`Design.reactors`, `bubble`, `core`; components/drive/vehicles.ts `buildShip`).

- **Reactors**: Twin side (as it was), One on top (a single bigger reactor on a pylon over the
  tail), Four (two low at the sides, two smaller ones high behind the cockpit). Each on a strut
  to the hull, each with its fan, its fire and the speed flames.
- **Cockpit**: Dome (as it was), Racing canopy (long and low, drawn back), Twin bubbles (two
  pilots side by side), Visor (a low wide wraparound band at the front).
- **Core**: None, Light ring (round the hull's waist), Orb (a glowing sphere in a glass shell on a
  cradle behind the cockpit), Crystal (a slowly turning crystal there).
- They match by construction: every part takes the hull's paint (chrome, gold, rust, red or your
  own colour) and the core glows in the fire's colour, changing with it.
