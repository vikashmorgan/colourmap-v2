/**
 * More bodies for the car (docs/specs/garage.md, "Bodies"). Asked for 2026-11-19: "a motorbike",
 * "cars inspired by the 50s Ferrari GTO, and then the same but futuristic". The physics stay the
 * car's (lib/art/vehicle.ts); only the shape changes. No badges, names or logos: a generic
 * front-engined grand tourer of that era, and a future one on the same lines.
 *
 * - Classic GT: a long rounded bonnet over a low oval mouth, faired-in headlamps, swelling front
 *   wings with three vents; behind them (redrawn 2026-11-23) full rear haunches, a narrower
 *   glasshouse with a long fastback, a Kamm tail with a ducktail lip and twin round lamps in chrome
 *   bezels, cross-laced wire wheels with knock-offs.
 * - Future GT: the same stance drawn sharp: a blade nose with a light line across it, a glass
 *   canopy, wheel covers with rims of light, a full-width bar of light across the tail.
 * - Motorbike: two wheels, a tank in the paint, a seat, a rider tucked over the tank; it leans
 *   hard into turns.
 *
 * - UFO Classic: a 1950s flying saucer with a glass dome and a softly breathing ring of rim lamps.
 * - Garbage Ride: an original junkyard flying car bolted from scrap, with a taped-up thruster.
 *   Both float on the car's physics (no wheels), bobbing a little.
 *
 * Frame as the other vehicles: x across (right +), y up, z forward, the tail at z = 0.
 */

import * as THREE from 'three';

import {
  applyHull,
  applyRim,
  fireMaterial,
  glowSprite,
  glowTexture,
  groundBlob,
  hullMaterial,
  rimMaterial,
  type VehicleView,
} from '@/components/drive/vehicles';
import type { BodyId, Fire, Hull } from '@/lib/art/drive-design';

interface Parts {
  group: THREE.Group;
  body: THREE.Group;
  paint: THREE.MeshPhysicalMaterial;
  wheels: THREE.Object3D[];
  wheelR: number;
  flames: THREE.Mesh[];
  feet: THREE.Vector3[];
  /** How much of the physics' roll the body shows (the bike leans far more). */
  lean: number;
  /** Rim metal that follows the hull (the leopard's gold), and its colour without one. */
  rim?: { m: THREE.MeshStandardMaterial; off: RimOff };
  /** Light lines that follow the hull (the Space Racer's), and how they take its colour. */
  lights?: { mats: THREE.MeshBasicMaterial[]; colour: (h: Hull) => THREE.Color };
  /** Each frame's own motion (the hovering bodies' bob, lamps and smoke). */
  tick?: (t: number, dt: number) => void;
}

type RimOff = { color: number; metalness: number; roughness: number };
const CHROME_OFF: RimOff = { color: 0xe8e8ee, metalness: 1, roughness: 0.12 };

/** The Space Racer's light: the hull's own colour (its rim metal when it has one), lit past white. */
function racerLight(h: Hull): THREE.Color {
  return new THREE.Color(h.rim ?? h.colour).multiplyScalar(2.4);
}

const tyreMat = () => new THREE.MeshStandardMaterial({ color: 0x0b0b0b, roughness: 0.9 });
const chromeMat = (env: THREE.Texture | null) =>
  new THREE.MeshStandardMaterial({ color: 0xe8e8ee, metalness: 1, roughness: 0.12, envMap: env });
const glassMat = (env: THREE.Texture | null) =>
  new THREE.MeshPhysicalMaterial({
    color: 0x07080b,
    roughness: 0.04,
    metalness: 0.2,
    clearcoat: 1,
    envMap: env,
    transparent: true,
    opacity: 0.88,
  });
const lampMat = (r: number, g: number, b: number) =>
  new THREE.MeshBasicMaterial({ color: new THREE.Color(r, g, b), toneMapped: false });

/** A side profile (shape x → car z, y → height) extruded across `width`, centred. */
function profile(shape: THREE.Shape, width: number, bevel: number, segs = 6): THREE.BufferGeometry {
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.01, width - 2 * bevel),
    bevelEnabled: true,
    bevelThickness: bevel,
    bevelSize: bevel,
    bevelSegments: segs,
    curveSegments: 24,
  });
  geo.rotateY(-Math.PI / 2);
  geo.translate(width / 2 - bevel, 0, 0);
  return geo;
}

/** Exhaust flames pointing back from (x, y, z), hidden until the speed calls. */
function exhaustFlames(body: THREE.Group, fire: Fire, at: [number, number, number][], rad: number) {
  const out: THREE.Mesh[] = [];
  for (const [x, y, z] of at)
    for (const [r, lenK, seed] of [
      [rad, 1, x * 7 + 1],
      [rad * 0.5, 0.55, x * 13 + 2],
    ] as const) {
      const flame = new THREE.Mesh(
        new THREE.ConeGeometry(r, 1, 16, 4, true),
        fireMaterial(fire, seed),
      );
      flame.userData.lenK = lenK;
      flame.rotation.x = -Math.PI / 2;
      flame.position.set(x, y, z);
      flame.renderOrder = 6;
      flame.visible = false;
      body.add(flame);
      out.push(flame);
    }
  return out;
}

/**
 * A wire wheel: a fat tyre, a deep chrome rim with an inner lip, cross-laced spokes in two rows
 * meeting a long hub, and a three-eared knock-off on the outer face (side: -1 left, 1 right).
 */
function wireWheel(r: number, w: number, chrome: THREE.Material, side = 1): THREE.Group {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, r * 0.2, 12, 32), tyreMat());
  tyre.rotation.y = Math.PI / 2;
  tyre.scale.set(1, 1, w / (r * 0.4));
  g.add(tyre);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.62, r * 0.05, 8, 36), chrome);
  rim.rotation.y = Math.PI / 2;
  rim.position.x = side * w * 0.12;
  g.add(rim);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(r * 0.58, r * 0.03, 6, 36), chrome);
  lip.rotation.y = Math.PI / 2;
  lip.position.x = -side * w * 0.2;
  g.add(lip);
  // Two rows of spokes, laced across each other: the outer row leans one way, the inner the other.
  const spokeGeo = new THREE.CylinderGeometry(0.005, 0.005, r * 0.6, 4);
  spokeGeo.translate(0, r * 0.3, 0);
  for (let i = 0; i < 24; i++) {
    const outer = i % 2 === 0;
    const spoke = new THREE.Mesh(spokeGeo, chrome);
    spoke.rotation.order = 'XZY';
    spoke.rotation.x = (i / 24) * Math.PI * 2;
    spoke.rotation.z = (outer ? -0.16 : 0.16) * side;
    spoke.position.x = (outer ? 0.14 : -0.12) * w * side;
    g.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.13, r * 0.16, w * 0.9, 14), chrome);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  // The knock-off: a cap and three ears.
  const cap = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.1, r * 0.12, 0.05, 12), chrome);
  cap.rotation.z = Math.PI / 2;
  cap.position.x = side * w * 0.47;
  g.add(cap);
  for (let k = 0; k < 3; k++) {
    const ear = new THREE.Mesh(new THREE.BoxGeometry(0.02, r * 0.34, 0.035), chrome);
    ear.geometry.translate(0, r * 0.12, 0);
    ear.rotation.x = (k / 3) * Math.PI * 2;
    ear.position.x = side * w * 0.5;
    g.add(ear);
  }
  return g;
}

/** A covered wheel: dark tyre, a smooth disc in the paint, a rim of light. */
function lightWheel(
  r: number,
  w: number,
  paint: THREE.Material,
  light: THREE.Material,
): THREE.Group {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 28), tyreMat());
  tyre.rotation.z = Math.PI / 2;
  g.add(tyre);
  for (const side of [-1, 1]) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r * 0.78, 28), paint);
    disc.rotation.y = (side * Math.PI) / 2;
    disc.position.x = (side * w) / 2 + side * 0.002;
    g.add(disc);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, 0.012, 6, 40), light);
    ring.rotation.y = Math.PI / 2;
    ring.position.x = (side * w) / 2 + side * 0.004;
    g.add(ring);
    // A notch so the spin reads.
    const notch = new THREE.Mesh(new THREE.BoxGeometry(0.004, r * 0.5, 0.03), light);
    notch.position.set((side * w) / 2 + side * 0.005, r * 0.45, 0);
    g.add(notch);
  }
  return g;
}

/* ── Classic GT ───────────────────────────────────────────── */

type P2 = [number, number];

/** A point on a quadratic curve (side-profile coordinates: x → car z, y → height). */
const quad = (a: P2, c: P2, b: P2, t: number): P2 => {
  const u = 1 - t;
  return [
    u * u * a[0] + 2 * u * t * c[0] + t * t * b[0],
    u * u * a[1] + 2 * u * t * c[1] + t * t * b[1],
  ];
};

/** Samples of a quadratic curve from t0 to t1. */
const samples = (a: P2, c: P2, b: P2, t0: number, t1: number, n: number): P2[] =>
  Array.from({ length: n + 1 }, (_, i) => quad(a, c, b, t0 + ((t1 - t0) * i) / n));

/**
 * A thin band lying along a line of points, lifted off it by `off` on its upper side (a pane of
 * glass laid on a bevelled roof), `thick` deep.
 */
function band(pts: P2[], off: number, thick: number): THREE.Shape {
  const normal = (i: number): P2 => {
    const a = pts[Math.max(0, i - 1)];
    const b = pts[Math.min(pts.length - 1, i + 1)];
    let nx = -(b[1] - a[1]);
    let ny = b[0] - a[0];
    if (ny < 0) {
      nx = -nx;
      ny = -ny;
    }
    const l = Math.hypot(nx, ny) || 1;
    return [nx / l, ny / l];
  };
  const out = pts.map((p, i) => {
    const n = normal(i);
    return [p[0] + n[0] * off, p[1] + n[1] * off] as P2;
  });
  const inn = pts.map((p, i) => {
    const n = normal(i);
    return [p[0] + n[0] * (off - thick), p[1] + n[1] * (off - thick)] as P2;
  });
  const s = new THREE.Shape();
  s.moveTo(...out[0]);
  for (const p of out.slice(1)) s.lineTo(...p);
  for (const p of inn.reverse()) s.lineTo(...p);
  s.closePath();
  return s;
}

/** Thin chrome trim along a line of side-profile points, at x across. */
function trim(body: THREE.Group, pts: P2[], x: number, mat: THREE.Material, t = 0.014) {
  for (let i = 0; i < pts.length - 1; i++) {
    const [z0, y0] = pts[i];
    const [z1, y1] = pts[i + 1];
    const len = Math.hypot(z1 - z0, y1 - y0);
    const bar = new THREE.Mesh(new THREE.BoxGeometry(t, t, len + 0.004), mat);
    bar.position.set(x, (y0 + y1) / 2, (z0 + z1) / 2);
    bar.rotation.x = -Math.atan2(y1 - y0, z1 - z0);
    body.add(bar);
  }
}

/**
 * The Classic GT. Its front (2026-11-23: "the front is good") stays as it was: the long bonnet over
 * the low oval mouth, faired headlamps, swelling front wings with three vents. Behind it, redrawn
 * as a 1960s grand tourer of no maker in particular ("improve classic gt design … you can do
 * better"): a body that runs low and level at the waist, then swells into full haunches over the
 * rear wheels; a narrower glasshouse set on the shoulders (tumblehome), its roof sweeping in one
 * long fastback down to a Kamm tail cut off square with a little ducktail lip; twin round lamps in
 * chrome bezels each side, split chrome bumpers either side of a plate recess, four tailpipes; a
 * chrome drip rail and quarter-window divider, door shuts and handles, a fuel cap on the deck;
 * cross-laced wire wheels with knock-offs, the rear track a touch wider for the stance.
 */
function classicGT(hull: Hull, fire: Fire, env: THREE.Texture | null): Parts {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const paint = hullMaterial(hull, env);
  const chrome = chromeMat(env);
  const dark = new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.7 });
  const W = 1.38;
  const R = 0.3;
  // The shell's bevel: every surface stands this far off its drawn profile.
  const BV = 0.15;
  const REAR_Z = 1.0;

  // The lower body: a Kamm tail cut off square with a little ducktail lip, the rear deck running
  // low and level at the waist to the windscreen's foot; from there forward the front as it was.
  const s = new THREE.Shape();
  s.moveTo(0.04, 0.3);
  s.lineTo(0.0, 0.64); // the Kamm tail
  s.quadraticCurveTo(-0.02, 0.78, 0.12, 0.83); // the ducktail lip
  s.quadraticCurveTo(0.5, 0.78, 0.95, 0.8); // the rear deck
  s.quadraticCurveTo(1.8, 0.81, 2.55, 0.86); // the waist, rising gently to the windscreen
  s.quadraticCurveTo(3.6, 0.82, 4.15, 0.66); // the long bonnet
  s.quadraticCurveTo(4.42, 0.56, 4.4, 0.4); // the rounded nose
  s.quadraticCurveTo(4.36, 0.3, 4.1, 0.28);
  s.lineTo(0.3, 0.28);
  s.closePath();
  body.add(new THREE.Mesh(profile(s, W, BV, 6), paint));

  // The glasshouse: narrower than the body, sitting on its shoulders. One long fastback from the
  // deck to the roof's crown, the windscreen down to the bonnet.
  const WC = 1.14;
  const CB = 0.12;
  const back: [P2, P2, P2] = [
    [0.55, 0.8],
    [1.0, 0.84],
    [1.45, 1.1],
  ];
  const roof: [P2, P2, P2] = [
    [1.45, 1.1],
    [1.75, 1.2],
    [2.15, 1.1],
  ];
  const screen: [P2, P2, P2] = [
    [2.15, 1.1],
    [2.35, 0.96],
    [2.55, 0.86],
  ];
  const cab = new THREE.Shape();
  cab.moveTo(0.5, 0.7);
  cab.lineTo(...back[0]);
  cab.quadraticCurveTo(...back[1], ...back[2]);
  cab.quadraticCurveTo(...roof[1], ...roof[2]);
  cab.quadraticCurveTo(...screen[1], ...screen[2]);
  cab.lineTo(2.62, 0.72);
  cab.closePath();
  body.add(new THREE.Mesh(profile(cab, WC, CB, 5), paint));

  // The glass: the windscreen and the long rear window laid on the roof's bevel, and the side
  // windows let into the glasshouse's flanks.
  const glass = glassMat(env);
  const paneW = WC - 2 * CB - 0.06;
  body.add(
    new THREE.Mesh(
      profile(band(samples(...screen, 0.06, 0.94, 8), CB + 0.006, 0.014), paneW, 0.004, 1),
      glass,
    ),
    new THREE.Mesh(
      profile(band(samples(...back, 0.32, 0.95, 10), CB + 0.006, 0.014), paneW, 0.004, 1),
      glass,
    ),
  );
  const top = [
    ...samples(...back, 0.5, 1, 5),
    ...samples(...roof, 0.2, 1, 6),
    ...samples(...screen, 0.2, 0.8, 4),
  ].map(([z, y]) => [z, y - 0.07] as P2);
  const dlo = top.filter(([, y]) => y > 0.93);
  const flank = new THREE.Shape();
  flank.moveTo(dlo[0][0], 0.9);
  for (const p of dlo) flank.lineTo(...p);
  flank.lineTo(dlo[dlo.length - 1][0], 0.9);
  flank.closePath();
  body.add(new THREE.Mesh(profile(flank, WC + 0.02, 0.004, 1), glass));

  // Swelling wings: the front ones as they were; the rear haunches fuller and longer, flowing
  // back from the door into the tail.
  for (const side of [-1, 1]) {
    const front = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), paint);
    front.scale.set(0.17, 0.2, 0.78);
    front.position.set(side * 0.66, 0.55, 3.45);
    body.add(front);
    const haunch = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 18), paint);
    haunch.scale.set(0.2, 0.25, 1.02);
    haunch.position.set(side * 0.65, 0.57, REAR_Z - 0.02);
    haunch.rotation.x = 0.05;
    body.add(haunch);
    // The hip: the swell begins at the door and gathers into the haunch.
    const hip = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 14), paint);
    hip.scale.set(0.12, 0.17, 0.85);
    hip.position.set(side * 0.66, 0.64, REAR_Z + 0.55);
    body.add(hip);
  }

  // The low oval mouth, its chrome lip, and the faired headlamps.
  const mouth = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 10), dark);
  mouth.scale.set(0.42, 0.1, 0.08);
  mouth.position.set(0, 0.42, 4.53);
  body.add(mouth);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 6, 40), chrome);
  lip.scale.set(0.42, 0.11, 1);
  lip.position.set(0, 0.42, 4.55);
  body.add(lip);

  const tailZ = -BV - 0.012;
  for (const side of [-1, 1]) {
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 10), lampMat(1.6, 1.5, 1.2));
    lamp.position.set(side * 0.44, 0.66, 4.3);
    body.add(lamp);
    const cover = new THREE.Mesh(new THREE.SphereGeometry(0.13, 16, 10), glassMat(env));
    cover.scale.set(1, 0.8, 1.4);
    cover.position.copy(lamp.position);
    body.add(cover);
    // Three vents behind the front wheel.
    for (let i = 0; i < 3; i++) {
      const vent = new THREE.Mesh(
        new THREE.BoxGeometry(0.02, 0.18, 0.05),
        new THREE.MeshStandardMaterial({ color: 0x050505 }),
      );
      vent.position.set(side * (W / 2 + 0.01), 0.58, 2.7 - i * 0.12);
      vent.rotation.x = -0.35;
      body.add(vent);
    }

    // Twin round tail lamps in chrome bezels on the Kamm tail, the inner a shade smaller.
    for (const [dx, r] of [
      [0.3, 0.06],
      [0.47, 0.068],
    ] as const) {
      const tail = new THREE.Mesh(new THREE.CircleGeometry(r, 20), lampMat(3, 0.12, 0.05));
      tail.rotation.y = Math.PI;
      tail.position.set(side * dx, 0.6, tailZ - 0.004);
      body.add(tail);
      const bezel = new THREE.Mesh(new THREE.TorusGeometry(r + 0.006, 0.01, 6, 24), chrome);
      bezel.position.set(side * dx, 0.6, tailZ - 0.006);
      body.add(bezel);
    }
    // Split rear bumpers, wrapping the corners.
    const quarter = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.04, 0.05), chrome);
    quarter.position.set(side * 0.4, 0.4, tailZ - 0.03);
    body.add(quarter);
    const wrap = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.04, 0.22), chrome);
    wrap.position.set(side * 0.62, 0.4, tailZ + 0.07);
    wrap.rotation.y = side * 0.5;
    body.add(wrap);

    const x = side * (W / 2 + 0.004);
    // Door shuts and a chrome handle; a chrome sill between the wheels.
    for (const z of [1.62, 2.5]) {
      const shut = new THREE.Mesh(new THREE.BoxGeometry(0.006, 0.42, 0.008), dark);
      shut.position.set(x, 0.56, z);
      body.add(shut);
    }
    const handle = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.022, 0.12), chrome);
    handle.position.set(side * (W / 2 + 0.01), 0.72, 1.76);
    body.add(handle);
    const sill = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.022, 1.5), chrome);
    sill.position.set(x, 0.24, 2.22);
    body.add(sill);

    // The drip rail over the side windows and the quarter-window divider.
    const cx = side * (WC / 2 + 0.012);
    trim(
      body,
      dlo.map(([z, y]) => [z, y + 0.025] as P2),
      cx,
      chrome,
    );
    const divider = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.2, 0.016), chrome);
    divider.position.set(cx, 1.0, 1.64);
    divider.rotation.x = 0.35;
    body.add(divider);
  }

  // A plate recess between the bumpers (no plate, no badge) and a chrome fuel cap on the deck.
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.12, 0.02), dark);
  plate.position.set(0, 0.42, tailZ);
  body.add(plate);
  const fuel = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.02, 16), chrome);
  fuel.position.set(-0.42, 0.95, 0.42);
  body.add(fuel);

  const tailGlow = glowSprite(0xff1a08, 1.4, 0.3);
  tailGlow.scale.set(1.8, 0.4, 1);
  tailGlow.position.set(0, 0.6, tailZ - 0.1);
  body.add(tailGlow);
  // The front bumper blade, as it was.
  const blade = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.035, 0.05), chrome);
  blade.position.set(0, 0.3, 4.36);
  body.add(blade);

  // Four tailpipes in two pairs under the bumpers.
  const pipes: [number, number, number][] = [-0.36, -0.25, 0.25, 0.36].map((x) => [
    x,
    0.25,
    tailZ - 0.08,
  ]);
  for (const [x, y, z] of pipes) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.032, 0.036, 0.22, 12), chrome);
    p.rotation.x = Math.PI / 2;
    p.position.set(x, y, z + 0.09);
    body.add(p);
  }
  const flames = exhaustFlames(body, fire, pipes, 0.05);

  const wheels: THREE.Object3D[] = [];
  const rim = rimMaterial(hull, CHROME_OFF, env);
  for (const [x, z] of [
    [-0.72, REAR_Z],
    [0.72, REAR_Z],
    [-0.7, 3.45],
    [0.7, 3.45],
  ]) {
    const w = wireWheel(R, 0.2, rim, Math.sign(x));
    w.position.set(x, R, z);
    group.add(w);
    wheels.push(w);
  }
  return {
    group,
    body,
    paint,
    wheels,
    wheelR: R,
    flames,
    feet: [new THREE.Vector3(-0.74, 0, REAR_Z), new THREE.Vector3(0.74, 0, REAR_Z)],
    lean: 0.6,
    rim: { m: rim, off: CHROME_OFF },
  };
}

/* ── Future GT ────────────────────────────────────────────── */

/**
 * The Future GT; as the Space Racer (racer) its light lines take the hull's own colour and more of
 * them trace the body: along the shoulders, round the wing blades and up the canopy's spine.
 */
function futureGT(hull: Hull, fire: Fire, env: THREE.Texture | null, racer = false): Parts {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const paint = hullMaterial(hull, env);
  const W = 1.7;
  const R = 0.32;
  const CYAN = new THREE.Color(0.5, 1.6, 2.2);
  const lightColour = (h: Hull) => (racer ? racerLight(h) : h.rim ? racerLight(h) : CYAN.clone());
  const light = new THREE.MeshBasicMaterial({ color: lightColour(hull), toneMapped: false });

  // The same lines as the classic, drawn straight and sharp.
  const s = new THREE.Shape();
  s.moveTo(0, 0.3);
  s.lineTo(0, 0.76);
  s.lineTo(0.5, 0.8);
  s.lineTo(1.5, 1.08);
  s.lineTo(2.2, 1.06);
  s.lineTo(2.65, 0.84);
  s.lineTo(4.2, 0.6);
  s.lineTo(4.62, 0.36);
  s.lineTo(4.4, 0.26);
  s.lineTo(0.2, 0.26);
  s.closePath();
  body.add(new THREE.Mesh(profile(s, W, 0.07, 2), paint));

  // A glass canopy: a long lens over the cabin.
  const canopy = new THREE.Mesh(new THREE.SphereGeometry(1, 32, 16), glassMat(env));
  canopy.scale.set(0.62, 0.3, 1.05);
  canopy.position.set(0, 0.92, 1.95);
  body.add(canopy);

  // Wing blades over the wheels, floating off the body.
  for (const z of [0.95, 3.5])
    for (const side of [-1, 1]) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.06, 1.0), paint);
      blade.position.set(side * (W / 2 + 0.02), 0.74, z);
      blade.rotation.z = side * 0.25;
      body.add(blade);
    }

  // Light: a line across the nose, a full-width bar across the tail, a thin line down each side.
  const noseLine = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.8, 0.025, 0.03),
    lampMat(1.8, 1.9, 2.2),
  );
  noseLine.position.set(0, 0.48, 4.5);
  noseLine.rotation.x = -0.5;
  body.add(noseLine);
  const tailBar = new THREE.Mesh(
    new THREE.BoxGeometry(W * 0.95, 0.05, 0.03),
    lampMat(3, 0.1, 0.06),
  );
  tailBar.position.set(0, 0.66, -0.02);
  body.add(tailBar);
  const tailGlow = glowSprite(0xff1a08, 1.6, 0.35);
  tailGlow.scale.set(2.6, 0.45, 1);
  tailGlow.position.set(0, 0.66, -0.1);
  body.add(tailGlow);
  for (const side of [-1, 1]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.012, 3.2), light);
    line.position.set(side * (W / 2 + 0.005), 0.42, 2.2);
    body.add(line);
  }
  if (racer) {
    // The Space Racer's extra lines: the shoulders, the blades' outer edges, the canopy's spine.
    for (const side of [-1, 1]) {
      const shoulder = new THREE.Mesh(new THREE.BoxGeometry(0.014, 0.014, 3.9), light);
      shoulder.position.set(side * (W / 2 + 0.006), 0.66, 2.35);
      body.add(shoulder);
      for (const z of [0.95, 3.5]) {
        const edge = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 1.02), light);
        edge.position.set(side * (W / 2 + 0.1), 0.72 - 0.02, z);
        edge.rotation.z = side * 0.25;
        body.add(edge);
      }
    }
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 1.9), light);
    spine.position.set(0, 1.21, 1.95);
    body.add(spine);
  }

  // Two big outlets in the tail for the flames.
  const outlets: [number, number, number][] = [
    [-0.42, 0.4, -0.02],
    [0.42, 0.4, -0.02],
  ];
  for (const [x, y, z] of outlets) {
    const o = new THREE.Mesh(new THREE.TorusGeometry(0.07, 0.015, 6, 20), light);
    o.position.set(x, y, z);
    body.add(o);
  }
  const flames = exhaustFlames(body, fire, outlets, 0.08);

  const wheels: THREE.Object3D[] = [];
  for (const [x, z] of [
    [-0.76, 0.95],
    [0.76, 0.95],
    [-0.76, 3.5],
    [0.76, 3.5],
  ]) {
    const w = lightWheel(R, 0.26, paint, light);
    w.position.set(x, R, z);
    group.add(w);
    wheels.push(w);
  }
  return {
    group,
    body,
    paint,
    wheels,
    wheelR: R,
    flames,
    feet: [new THREE.Vector3(-0.76, 0, 0.95), new THREE.Vector3(0.76, 0, 0.95)],
    lean: 0.6,
    lights: { mats: [light], colour: lightColour },
  };
}

/* ── Motorbike ────────────────────────────────────────────── */

function motorbike(hull: Hull, fire: Fire, env: THREE.Texture | null): Parts {
  const group = new THREE.Group();
  // The whole bike leans, wheels and all, so the body holds everything.
  const body = new THREE.Group();
  group.add(body);
  const paint = hullMaterial(hull, env);
  const dark = new THREE.MeshStandardMaterial({ color: 0x111114, roughness: 0.5, metalness: 0.6 });
  const R = 0.33;

  const wheels: THREE.Object3D[] = [];
  const rim = rimMaterial(hull, CHROME_OFF, env);
  for (const z of [0.4, 1.85]) {
    const w = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(R * 0.82, R * 0.18, 12, 32), tyreMat());
    tyre.rotation.y = Math.PI / 2;
    w.add(tyre);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.6, R * 0.6, 0.05, 24), dark);
    disc.rotation.z = Math.PI / 2;
    w.add(disc);
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.03, R * 1.3, 0.04), rim);
      spoke.rotation.x = (i / 5) * Math.PI;
      w.add(spoke);
    }
    w.position.set(0, R, z);
    body.add(w);
    wheels.push(w);
  }

  // The frame: a spine from the rear axle up over the engine to the steering head.
  const spine = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1.4, 8), dark);
  spine.rotation.x = Math.PI / 2 - 0.25;
  spine.position.set(0, 0.62, 1.1);
  body.add(spine);
  const fork = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.75, 8), chromeMat(env));
  fork.rotation.x = -0.45;
  fork.position.set(0, 0.62, 1.72);
  body.add(fork);
  // The engine block, the tank in the paint, the seat, a fairing over the front.
  const engine = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.5), dark);
  engine.position.set(0, 0.42, 1.05);
  body.add(engine);
  const tank = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), paint);
  tank.scale.set(0.22, 0.16, 0.36);
  tank.position.set(0, 0.86, 1.3);
  body.add(tank);
  const fairing = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), paint);
  fairing.scale.set(0.24, 0.24, 0.32);
  fairing.position.set(0, 0.88, 1.78);
  body.add(fairing);
  const screen = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 10), glassMat(env));
  screen.scale.set(0.17, 0.14, 0.12);
  screen.position.set(0, 1.1, 1.72);
  body.add(screen);
  const seat = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.07, 0.55), dark);
  seat.position.set(0, 0.82, 0.78);
  body.add(seat);
  const tailPiece = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.12, 0.4), paint);
  tailPiece.position.set(0, 0.84, 0.36);
  tailPiece.rotation.x = 0.25;
  body.add(tailPiece);
  const head = new THREE.Mesh(new THREE.CircleGeometry(0.07, 16), lampMat(1.8, 1.7, 1.4));
  head.position.set(0, 0.9, 2.1);
  body.add(head);
  const tailLamp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.03, 0.02), lampMat(3, 0.1, 0.05));
  tailLamp.position.set(0, 0.86, 0.15);
  body.add(tailLamp);
  const tailGlow = glowSprite(0xff1a08, 0.8, 0.3);
  tailGlow.position.set(0, 0.86, 0.1);
  body.add(tailGlow);

  // The rider, tucked low over the tank: a dark suit and a helmet.
  const suit = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.7 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.42, 4, 10), suit);
  torso.rotation.x = 1.1;
  torso.position.set(0, 1.08, 1.05);
  body.add(torso);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.14, 18, 12), paint);
  helmet.position.set(0, 1.28, 1.42);
  body.add(helmet);
  const visor = new THREE.Mesh(
    new THREE.SphereGeometry(0.145, 18, 12, 0, Math.PI, 0, Math.PI / 2),
    glassMat(env),
  );
  visor.rotation.x = Math.PI / 2 + 0.3;
  visor.position.copy(helmet.position);
  body.add(visor);
  for (const side of [-1, 1]) {
    const thigh = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.36, 4, 8), suit);
    thigh.rotation.x = 1.3;
    thigh.position.set(side * 0.17, 0.86, 0.95);
    body.add(thigh);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.4, 4, 8), suit);
    arm.rotation.x = 0.9;
    arm.position.set(side * 0.2, 1.1, 1.5);
    body.add(arm);
  }

  // One exhaust up under the tail, on the right.
  const pipe: [number, number, number] = [0.14, 0.62, 0.2];
  const can = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.06, 0.45, 12), chromeMat(env));
  can.rotation.x = Math.PI / 2 - 0.3;
  can.position.set(pipe[0], pipe[1] - 0.05, pipe[2] + 0.22);
  body.add(can);
  const flames = exhaustFlames(body, fire, [pipe], 0.07);

  return {
    group,
    body,
    paint,
    wheels,
    wheelR: R,
    flames,
    // The engine takes two (dust and tyre marks): the rear wheel's two edges.
    feet: [new THREE.Vector3(-0.05, 0, 0.4), new THREE.Vector3(0.05, 0, 0.4)],
    lean: 4.5,
    rim: { m: rim, off: CHROME_OFF },
  };
}

/* ── Light cycle ──────────────────────────────────────────── */

/**
 * The light cycle (2026-11-22: "make tron bikes"): an original take on the neon racing bike. A
 * long low shell in the paint swept over two big wheels, the wheels dark discs ringed in light, a
 * line of light along its spine and round its nose, and a rider lying flat along it in a dark suit
 * traced with light. Every light takes the hull's own colour, as the Space Racer's do.
 */
function lightCycle(hull: Hull, fire: Fire, env: THREE.Texture | null): Parts {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const paint = hullMaterial(hull, env);
  const dark = new THREE.MeshStandardMaterial({ color: 0x07070a, roughness: 0.35, metalness: 0.8 });
  const light = new THREE.MeshBasicMaterial({ color: racerLight(hull), toneMapped: false });
  const R = 0.42;

  // The wheels: dark discs, a tyre, a ring of light round the rim and a smaller one at the hub.
  const wheels: THREE.Object3D[] = [];
  for (const z of [0.45, 2.15]) {
    const w = new THREE.Group();
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.86, R * 0.86, 0.18, 32), dark);
    disc.rotation.z = Math.PI / 2;
    w.add(disc);
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(R * 0.9, R * 0.12, 10, 40), tyreMat());
    tyre.rotation.y = Math.PI / 2;
    w.add(tyre);
    for (const side of [-1, 1]) {
      const ring = new THREE.Mesh(new THREE.TorusGeometry(R * 0.72, 0.018, 6, 40), light);
      ring.rotation.y = Math.PI / 2;
      ring.position.x = side * 0.095;
      w.add(ring);
      const hub = new THREE.Mesh(new THREE.TorusGeometry(R * 0.25, 0.014, 6, 24), light);
      hub.rotation.y = Math.PI / 2;
      hub.position.x = side * 0.095;
      w.add(hub);
      // A notch in the ring, so you see the wheels turn.
      const tick = new THREE.Mesh(new THREE.BoxGeometry(0.02, R * 0.4, 0.03), light);
      tick.position.set(side * 0.096, R * 0.48, 0);
      w.add(tick);
    }
    w.position.set(0, R, z);
    body.add(w);
    wheels.push(w);
  }

  // The shell: one long low capsule over both wheels, a dark skirt beneath it.
  const shell = new THREE.Mesh(new THREE.CapsuleGeometry(0.24, 1.9, 8, 20), paint);
  shell.rotation.x = Math.PI / 2;
  shell.scale.set(1, 1, 0.9);
  shell.position.set(0, 0.72, 1.3);
  body.add(shell);
  const skirt = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.16, 1.35), dark);
  skirt.position.set(0, 0.5, 1.3);
  body.add(skirt);
  // The nose dips toward the road, the tail rises over the rear wheel.
  const nose = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), paint);
  nose.scale.set(0.22, 0.2, 0.42);
  nose.position.set(0, 0.6, 2.45);
  body.add(nose);
  const tail = new THREE.Mesh(new THREE.SphereGeometry(1, 20, 12), paint);
  tail.scale.set(0.22, 0.26, 0.45);
  tail.position.set(0, 0.86, 0.3);
  body.add(tail);
  // Lines of light: along the spine both sides, and round the nose.
  for (const side of [-1, 1]) {
    const line = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.025, 2.5), light);
    line.position.set(side * 0.235, 0.72, 1.35);
    body.add(line);
    const low = new THREE.Mesh(new THREE.BoxGeometry(0.015, 0.02, 1.2), light);
    low.position.set(side * 0.16, 0.44, 1.3);
    body.add(low);
  }
  const brow = new THREE.Mesh(new THREE.TorusGeometry(0.2, 0.015, 6, 24, Math.PI), light);
  brow.position.set(0, 0.62, 2.82);
  body.add(brow);
  const tailBar = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.03, 0.02), light);
  tailBar.position.set(0, 0.9, -0.14);
  body.add(tailBar);

  // The rider, flat along the shell: a dark suit traced with light, a smooth helmet.
  const suit = new THREE.MeshStandardMaterial({ color: 0x0c0c10, roughness: 0.45, metalness: 0.3 });
  const torso = new THREE.Mesh(new THREE.CapsuleGeometry(0.15, 0.55, 4, 10), suit);
  torso.rotation.x = Math.PI / 2 - 0.12;
  torso.position.set(0, 1.05, 1.25);
  body.add(torso);
  const spineLight = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.02, 0.7), light);
  spineLight.position.set(0, 1.2, 1.22);
  spineLight.rotation.x = -0.12;
  body.add(spineLight);
  const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.15, 20, 14), suit);
  helmet.scale.set(1, 0.95, 1.2);
  helmet.position.set(0, 1.12, 1.78);
  body.add(helmet);
  const visorLine = new THREE.Mesh(new THREE.TorusGeometry(0.152, 0.01, 6, 24, Math.PI), light);
  visorLine.rotation.set(Math.PI / 2, 0, 0);
  visorLine.position.set(0, 1.12, 1.8);
  body.add(visorLine);
  for (const side of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(0.07, 0.6, 4, 8), suit);
    leg.rotation.x = Math.PI / 2 + 0.15;
    leg.position.set(side * 0.16, 0.92, 0.6);
    body.add(leg);
    const legLight = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.012, 0.55), light);
    legLight.position.set(side * 0.23, 0.92, 0.6);
    body.add(legLight);
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.05, 0.45, 4, 8), suit);
    arm.rotation.x = Math.PI / 2 - 0.5;
    arm.position.set(side * 0.2, 0.95, 1.9);
    body.add(arm);
  }

  // The fire comes out under the tail.
  const flames = exhaustFlames(body, fire, [[0, 0.62, -0.05]], 0.08);

  return {
    group,
    body,
    paint,
    wheels,
    wheelR: R,
    flames,
    feet: [new THREE.Vector3(-0.06, 0, 0.45), new THREE.Vector3(0.06, 0, 0.45)],
    lean: 4,
    lights: { mats: [light], colour: racerLight },
  };
}

/* ── Hovering bodies ─────────────────────────────────────── */

/** How high the hovering bodies float, and their gentle bob and wobble (body-local). */
function hoverTick(body: THREE.Group, height: number, bob: number, wobble: number, rate: number) {
  return (t: number) => {
    body.position.y = height + bob * Math.sin(t * rate);
    body.rotation.x = wobble * Math.sin(t * rate * 0.7 + 1.1);
    body.rotation.z += wobble * Math.sin(t * rate * 0.9);
  };
}

/**
 * UFO Classic (2026-11-23: "one of the cars is UFO classic saucer"): a 1950s flying saucer. A
 * wide disc in the hull's finish, thicker in the middle, with a band of darker metal round its
 * waist; a glass dome on top with a faint pilot inside; a ring of round lamps round the rim that
 * glow softly and breathe slowly in a wave, never blink; a warm glow beneath. It floats on the
 * car's physics, bobbing and wobbling a little. Two small thrusters at the back carry the fire.
 */
function ufoClassic(hull: Hull, fire: Fire, env: THREE.Texture | null): Parts {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const paint = hullMaterial(hull, env);
  // The trim (the dome's ring, the thrusters) in the hull's rim metal when it has one.
  const rim = rimMaterial(hull, CHROME_OFF, env);
  const RAD = 1.3;
  const CZ = RAD + 0.05;
  const H = 0.55;

  // The disc: a lathe of the saucer's section, thin at the rim, swelling to the middle.
  const pts = [
    new THREE.Vector2(0.001, -0.2),
    new THREE.Vector2(0.45, -0.18),
    new THREE.Vector2(0.95, -0.1),
    new THREE.Vector2(RAD, -0.01),
    new THREE.Vector2(RAD + 0.02, 0.02),
    new THREE.Vector2(RAD, 0.05),
    new THREE.Vector2(0.95, 0.15),
    new THREE.Vector2(0.55, 0.24),
    new THREE.Vector2(0.001, 0.26),
  ];
  const disc = new THREE.Mesh(new THREE.LatheGeometry(pts, 48), paint);
  disc.position.set(0, 0, CZ);
  body.add(disc);
  const band = new THREE.Mesh(
    new THREE.CylinderGeometry(RAD * 0.86, RAD * 0.9, 0.08, 48, 1, true),
    new THREE.MeshStandardMaterial({
      color: 0x2a2a30,
      metalness: 0.9,
      roughness: 0.35,
      envMap: env,
      side: THREE.DoubleSide,
    }),
  );
  band.position.set(0, -0.1, CZ);
  body.add(band);

  // The dome and the pilot inside.
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(0.52, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2),
    glassMat(env),
  );
  dome.scale.set(1, 0.85, 1);
  dome.position.set(0, 0.22, CZ);
  body.add(dome);
  const domeRing = new THREE.Mesh(new THREE.TorusGeometry(0.53, 0.025, 8, 40), rim);
  domeRing.rotation.x = Math.PI / 2;
  domeRing.position.set(0, 0.23, CZ);
  body.add(domeRing);
  const suit = new THREE.MeshStandardMaterial({ color: 0x1a1a1f, roughness: 0.6 });
  const pilot = new THREE.Mesh(new THREE.CapsuleGeometry(0.11, 0.14, 4, 10), suit);
  pilot.position.set(0, 0.38, CZ - 0.05);
  body.add(pilot);
  const head = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 10), suit);
  head.position.set(0, 0.58, CZ - 0.02);
  body.add(head);

  // The rim lamps: a warm ring that breathes in a slow wave round the saucer.
  const lamps: THREE.MeshBasicMaterial[] = [];
  const N = 16;
  for (let i = 0; i < N; i++) {
    const a = (i / N) * Math.PI * 2;
    const m = lampMat(1.6, 1.15, 0.55);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), m);
    lamp.position.set(Math.cos(a) * (RAD - 0.02), 0.05, CZ + Math.sin(a) * (RAD - 0.02));
    body.add(lamp);
    lamps.push(m);
  }
  const under = glowSprite(0xffb060, 1.6, 0.35);
  under.position.set(0, -0.3, CZ);
  body.add(under);

  // Two small thrusters at the back.
  const nozzles: [number, number, number][] = [
    [-0.3, -0.02, 0.06],
    [0.3, -0.02, 0.06],
  ];
  for (const [x, y, z] of nozzles) {
    const n = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.08, 0.16, 14), rim);
    n.rotation.x = Math.PI / 2;
    n.position.set(x, y, z + 0.06);
    body.add(n);
  }
  const flames = exhaustFlames(body, fire, nozzles, 0.06);

  const float = hoverTick(body, H, 0.05, 0.025, 1.6);
  const warm = new THREE.Color(1.6, 1.15, 0.55);
  return {
    group,
    body,
    paint,
    wheels: [],
    wheelR: 1,
    flames,
    feet: [new THREE.Vector3(-0.5, 0, CZ), new THREE.Vector3(0.5, 0, CZ)],
    lean: 0.5,
    rim: { m: rim, off: CHROME_OFF },
    tick(t) {
      float(t);
      // A slow wave of brightness round the rim: never off, never a flash.
      for (let i = 0; i < N; i++)
        lamps[i].color.copy(warm).multiplyScalar(0.75 + 0.25 * Math.sin(t * 1.2 - (i / N) * 6.283));
    },
  };
}

/**
 * The Garbage Ride (2026-11-23: "make it the rick and morty spaceship. call it the garbage ride"):
 * not that ship, but an original junkyard flying car in its spirit. An open tub bolted together
 * from scrap: the main hull in your paint, dented and patched with panels in other colours
 * (primer grey, faded olive, mustard, rust), bolts round them; an open cockpit with a bubble
 * windscreen, a bench seat and a wheel; pipes running along the flanks; a big thruster at the back
 * bound with tape; two odd headlamps glowing warm and steady; a tail fin on the skew; a little
 * exhaust stack that coughs out a puff of smoke every so often. It floats, bobbing like a wreck
 * that should not fly.
 */
function garbageRide(hull: Hull, fire: Fire, env: THREE.Texture | null): Parts {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const paint = hullMaterial(hull, env);
  const scrap = (color: number, metalness = 0.4, roughness = 0.75) =>
    new THREE.MeshStandardMaterial({ color, metalness, roughness, envMap: env });
  const primer = scrap(0x6d6a64);
  const olive = scrap(0x5d6233);
  const mustard = scrap(0xa88a34);
  const rusty = scrap(0x7a3f1f, 0.5, 0.85);
  const dark = scrap(0x1c1c1e, 0.6, 0.5);
  const tape = new THREE.MeshStandardMaterial({ color: 0xb8b4aa, roughness: 0.95 });
  // The windscreen frame and the pipes in the hull's rim metal when it has one.
  const rim = rimMaterial(hull, CHROME_OFF, env);
  const H = 0.62;

  // The tub: a boxy hull, its nose cut at a slant; the cockpit opened in the middle.
  const tub = new THREE.Shape();
  tub.moveTo(0.1, 0.0);
  tub.lineTo(0.0, 0.5);
  tub.lineTo(1.05, 0.55); // behind the cockpit
  tub.lineTo(1.1, 0.32);
  tub.lineTo(2.05, 0.32); // the cockpit floor
  tub.lineTo(2.15, 0.5);
  tub.lineTo(3.0, 0.42);
  tub.lineTo(3.45, 0.22); // the slanted nose
  tub.lineTo(3.3, -0.02);
  tub.closePath();
  body.add(new THREE.Mesh(profile(tub, 1.5, 0.06, 2), paint));

  // Patches on the flanks and the deck, set a little askew: dents and repairs.
  const patch = (
    m: THREE.Material,
    size: [number, number, number],
    at: [number, number, number],
    rot: [number, number, number],
  ) => {
    const p = new THREE.Mesh(new THREE.BoxGeometry(...size), m);
    p.position.set(...at);
    p.rotation.set(...rot);
    body.add(p);
    return p;
  };
  patch(primer, [0.02, 0.28, 0.6], [0.77, 0.22, 2.6], [0, 0, 0.04]);
  patch(olive, [0.02, 0.24, 0.5], [-0.77, 0.28, 0.6], [0.08, 0, -0.03]);
  patch(mustard, [0.02, 0.2, 0.36], [-0.77, 0.18, 2.75], [-0.1, 0, 0]);
  patch(rusty, [0.02, 0.3, 0.42], [0.77, 0.2, 0.75], [0.05, 0, 0.02]);
  patch(primer, [0.5, 0.02, 0.4], [-0.25, 0.53, 0.45], [0.03, 0.12, 0.02]);
  patch(rusty, [0.55, 0.02, 0.35], [0.2, 0.47, 2.65], [-0.12, -0.08, 0.03]);
  // A dent: a dark hollow pressed into the right flank.
  const dent = new THREE.Mesh(new THREE.SphereGeometry(1, 14, 10), dark);
  dent.scale.set(0.03, 0.09, 0.16);
  dent.position.set(0.76, 0.3, 1.6);
  body.add(dent);
  // Bolts round the patches.
  const boltGeo = new THREE.SphereGeometry(0.018, 6, 4);
  for (const side of [-1, 1])
    for (let i = 0; i < 9; i++) {
      const b = new THREE.Mesh(boltGeo, dark);
      b.position.set(side * 0.785, 0.42, 0.25 + i * 0.36);
      body.add(b);
    }

  // The cockpit: a bench seat, a wheel on a column, a bubble windscreen.
  const leather = scrap(0x4a2a1c, 0.1, 0.9);
  patch(leather, [1.1, 0.12, 0.36], [0, 0.42, 1.3], [0, 0, 0]);
  patch(leather, [1.1, 0.4, 0.1], [0, 0.6, 1.1], [-0.2, 0, 0]);
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.4, 6), dark);
  column.position.set(-0.3, 0.6, 1.85);
  column.rotation.x = -0.6;
  body.add(column);
  const wheel = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.018, 6, 20), dark);
  wheel.position.set(-0.3, 0.76, 1.74);
  wheel.rotation.x = -0.6;
  body.add(wheel);
  const bubble = new THREE.Mesh(
    new THREE.SphereGeometry(0.62, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2),
    glassMat(env),
  );
  bubble.scale.set(1.05, 0.55, 0.5);
  bubble.position.set(0, 0.5, 2.1);
  bubble.rotation.x = 0.25;
  body.add(bubble);
  const frame = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.02, 6, 28, Math.PI), rim);
  frame.scale.set(1.05, 0.55, 1);
  frame.position.set(0, 0.5, 2.1);
  body.add(frame);

  // Pipes along the flanks, bending up into the thruster.
  for (const side of [-1, 1]) {
    const pipe = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 2.4, 8), rim);
    pipe.rotation.x = Math.PI / 2;
    pipe.position.set(side * 0.82, 0.08, 1.6);
    body.add(pipe);
    const elbow = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.035, 6, 12, Math.PI / 2), rim);
    elbow.rotation.y = Math.PI / 2;
    elbow.position.set(side * 0.82, 0.24, 0.4);
    body.add(elbow);
  }

  // The thruster: a big drum at the back, bound with tape; the fire comes out of it.
  const drum = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.34, 0.7, 20), primer);
  drum.rotation.x = Math.PI / 2;
  drum.position.set(0, 0.42, 0.05);
  body.add(drum);
  const mouth = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.02, 20), dark);
  mouth.rotation.x = Math.PI / 2;
  mouth.position.set(0, 0.42, -0.31);
  body.add(mouth);
  for (const [z, tilt] of [
    [0.22, 0.08],
    [-0.05, -0.12],
    [-0.18, 0.05],
  ] as const) {
    const wrap = new THREE.Mesh(new THREE.CylinderGeometry(0.335, 0.345, 0.08, 20), tape);
    wrap.rotation.set(Math.PI / 2 + tilt, 0, 0);
    wrap.position.set(0, 0.42, z);
    body.add(wrap);
  }
  // A crooked tail fin.
  patch(mustard, [0.04, 0.45, 0.5], [0.15, 0.85, 0.35], [0.2, 0, 0.18]);

  // Two odd headlamps, warm and steady.
  for (const [x, r] of [
    [-0.42, 0.1],
    [0.45, 0.075],
  ] as const) {
    const lamp = new THREE.Mesh(new THREE.CircleGeometry(r, 16), lampMat(1.7, 1.25, 0.6));
    lamp.position.set(x, 0.3, 3.4);
    lamp.rotation.x = -0.4;
    body.add(lamp);
    const ring = new THREE.Mesh(new THREE.TorusGeometry(r + 0.01, 0.015, 6, 16), dark);
    ring.position.copy(lamp.position);
    ring.rotation.x = -0.4;
    body.add(ring);
  }
  const tailLamp = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.06, 0.02), lampMat(2.4, 0.4, 0.1));
  tailLamp.position.set(-0.55, 0.42, -0.07);
  body.add(tailLamp);
  const glow = glowSprite(0xffa050, 1.4, 0.28);
  glow.position.set(0, -0.25, 1.6);
  body.add(glow);

  // The exhaust stack, and its puffs of smoke.
  const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.05, 0.4, 8), dark);
  stack.position.set(0.55, 0.72, 0.35);
  stack.rotation.x = -0.25;
  body.add(stack);
  const puffs: THREE.Sprite[] = [];
  for (let i = 0; i < 3; i++) {
    const puff = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glowTexture(),
        color: 0x9a948c,
        transparent: true,
        opacity: 0,
        depthWrite: false,
      }),
    );
    body.add(puff);
    puffs.push(puff);
  }

  const flames = exhaustFlames(body, fire, [[0, 0.42, -0.32]], 0.16);
  const float = hoverTick(body, H, 0.06, 0.035, 2.1);
  return {
    group,
    body,
    paint,
    wheels: [],
    wheelR: 1,
    flames,
    feet: [new THREE.Vector3(-0.5, 0, 1.6), new THREE.Vector3(0.5, 0, 1.6)],
    lean: 0.7,
    rim: { m: rim, off: CHROME_OFF },
    tick(t) {
      float(t);
      // A cough every 1.6 s: each puff rises out of the stack, swells and fades.
      for (let i = 0; i < puffs.length; i++) {
        const k = (t / 1.6 + i / puffs.length) % 1;
        const p = puffs[i];
        p.position.set(0.55 + 0.05 * k, 0.95 + 0.5 * k, 0.3 - 0.35 * k);
        p.scale.setScalar(0.12 + 0.4 * k);
        (p.material as THREE.SpriteMaterial).opacity = 0.55 * (1 - k) * Math.min(1, k * 8);
      }
    },
  };
}

/** One of the extra bodies, as a VehicleView like the others. */
export function buildBody(
  id: Exclude<BodyId, 'wedge'>,
  hull: Hull,
  fire: Fire,
  env: THREE.Texture | null,
): VehicleView {
  const p =
    id === 'classic'
      ? classicGT(hull, fire, env)
      : id === 'future' || id === 'racer'
        ? futureGT(hull, fire, env, id === 'racer')
        : id === 'cycle'
          ? lightCycle(hull, fire, env)
          : id === 'ufo'
            ? ufoClassic(hull, fire, env)
            : id === 'garbage'
              ? garbageRide(hull, fire, env)
              : motorbike(hull, fire, env);
  const twoWheels = id === 'bike' || id === 'cycle';
  // The ground shadow: width, length, and where its centre lies along the body.
  const [sw, sl, sz] =
    id === 'ufo'
      ? [2.4, 2.4, 1.35]
      : id === 'garbage'
        ? [1.7, 3.2, 1.6]
        : twoWheels
          ? [0.9, id === 'bike' ? 2.6 : 3.2, 1.2]
          : [2.4, 5.4, 2.2];
  const shadow = groundBlob(0x000000, sw, sl, false, 0.5);
  shadow.position.set(0, 0.02, sz);
  p.group.add(shadow);
  let spin = 0;
  return {
    group: p.group,
    nozzles: [],
    feet: p.feet,
    update(v, t, dt, _power, _speedN, flame = 0) {
      spin += (v.vLong / p.wheelR) * dt;
      for (const w of p.wheels) w.rotation.x = spin;
      // The bike leans hard into the turn (as far as 0.6 rad); the cars only sway.
      p.body.rotation.z = Math.max(-0.6, Math.min(0.6, -v.roll * p.lean));
      p.tick?.(t, dt);
      shadow.visible = !v.air || v.airTime < 0.05;
      for (const f of p.flames) {
        f.visible = flame > 0.02;
        if (!f.visible) continue;
        const m = f.material as THREE.ShaderMaterial;
        m.uniforms.uTime.value = t;
        m.uniforms.uPower.value = 0.5 + 0.9 * flame;
        m.uniforms.uLenK.value = (0.4 + 2.4 * flame) * f.userData.lenK;
      }
    },
    setHull(h, e) {
      applyHull(p.paint, h, e);
      if (p.rim) applyRim(p.rim.m, h, p.rim.off);
      if (p.lights) for (const m of p.lights.mats) m.color.copy(p.lights.colour(h));
    },
    setFire(f) {
      for (const fl of p.flames) {
        const u = (fl.material as THREE.ShaderMaterial).uniforms;
        u.uS0.value.setRGB(...f.stops[0]);
        u.uS1.value.setRGB(...f.stops[1]);
        u.uS2.value.setRGB(...f.stops[2]);
      }
    },
    dispose() {
      p.group.traverse((o) => {
        if (o instanceof THREE.Mesh || o instanceof THREE.Sprite) {
          o.geometry.dispose();
          const mats = Array.isArray(o.material) ? o.material : [o.material];
          for (const m of mats) if (m !== p.paint) m.dispose();
        }
      });
      p.paint.dispose();
    },
  };
}
