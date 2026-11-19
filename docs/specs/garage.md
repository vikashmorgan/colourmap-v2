# Garage

Asked for 2026-11-19: "a space to design your car or spaceship, like a dope space garage, with a
circle raised in the middle of the room and the spaceship or car or bike on top; you can rotate the
circle and check your ride." Also "user-pickable colours, chrome and gold included". Step 2 of the
unity plan: one saved ride, the same in every place.

Route: `/geometry-field/garage` (on the map under Play, and the tree's Worlds limb). Reached from
Drive's Design panel ("Open the Garage ›") and the shared tab.

## The room (components/garage/scene.ts)

- A dark hangar in the gold-dots-on-dark look: a near-black polished floor, a raised dark metal
  platform with a ring of gold light round its rim, fine gold rings on its top (turning with it, so
  the turn reads), rings of softly breathing gold dots on the floor round it, tall strips of warm
  light round the walls (a cool one every fourth), a halo ring overhead.
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

All take the hull, the fire and the speed flames like the others.

## Next

Reactors on the side or on top, cockpit bubbles and cores for the ship.
