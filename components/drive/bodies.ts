/**
 * More bodies for the car (docs/specs/garage.md, "Bodies"). Asked for 2026-11-19: "a motorbike",
 * "cars inspired by the 50s Ferrari GTO, and then the same but futuristic". The physics stay the
 * car's (lib/art/vehicle.ts); only the shape changes. No badges, names or logos: a generic
 * front-engined grand tourer of that era, and a future one on the same lines.
 *
 * - Classic GT: a long rounded bonnet over a low oval mouth, faired-in headlamps, swelling front
 *   wings with three vents, a fastback cabin, a short cut-off tail with round lamps, wire wheels.
 * - Future GT: the same stance drawn sharp: a blade nose with a light line across it, a glass
 *   canopy, wheel covers with rims of light, a full-width bar of light across the tail.
 * - Motorbike: two wheels, a tank in the paint, a seat, a rider tucked over the tank; it leans
 *   hard into turns.
 *
 * Frame as the other vehicles: x across (right +), y up, z forward, the tail at z = 0.
 */

import * as THREE from 'three';

import {
  applyHull,
  fireMaterial,
  glowSprite,
  groundBlob,
  hullMaterial,
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

/** A wire wheel: tyre, chrome rim, spokes, a knock-off hub. */
function wireWheel(r: number, w: number, env: THREE.Texture | null): THREE.Group {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.TorusGeometry(r * 0.8, r * 0.2, 12, 32), tyreMat());
  tyre.rotation.y = Math.PI / 2;
  tyre.scale.set(1, 1, w / (r * 0.4));
  g.add(tyre);
  const chrome = chromeMat(env);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(r * 0.6, r * 0.05, 8, 32), chrome);
  rim.rotation.y = Math.PI / 2;
  g.add(rim);
  for (let i = 0; i < 16; i++) {
    const spoke = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, r * 1.2, 4), chrome);
    spoke.rotation.x = (i / 16) * Math.PI;
    spoke.position.x = (i % 2 ? 1 : -1) * w * 0.12;
    g.add(spoke);
  }
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(r * 0.16, r * 0.16, w * 0.9, 12), chrome);
  hub.rotation.z = Math.PI / 2;
  g.add(hub);
  return g;
}

/** A covered wheel: dark tyre, a smooth disc in the paint, a rim of light. */
function lightWheel(r: number, w: number, paint: THREE.Material, glow: THREE.Color): THREE.Group {
  const g = new THREE.Group();
  const tyre = new THREE.Mesh(new THREE.CylinderGeometry(r, r, w, 28), tyreMat());
  tyre.rotation.z = Math.PI / 2;
  g.add(tyre);
  for (const side of [-1, 1]) {
    const disc = new THREE.Mesh(new THREE.CircleGeometry(r * 0.78, 28), paint);
    disc.rotation.y = (side * Math.PI) / 2;
    disc.position.x = (side * w) / 2 + side * 0.002;
    g.add(disc);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(r * 0.8, 0.012, 6, 40),
      new THREE.MeshBasicMaterial({ color: glow, toneMapped: false }),
    );
    ring.rotation.y = Math.PI / 2;
    ring.position.x = (side * w) / 2 + side * 0.004;
    g.add(ring);
    // A notch so the spin reads.
    const notch = new THREE.Mesh(
      new THREE.BoxGeometry(0.004, r * 0.5, 0.03),
      new THREE.MeshBasicMaterial({ color: glow, toneMapped: false }),
    );
    notch.position.set((side * w) / 2 + side * 0.005, r * 0.45, 0);
    g.add(notch);
  }
  return g;
}

/* ── Classic GT ───────────────────────────────────────────── */

function classicGT(hull: Hull, fire: Fire, env: THREE.Texture | null): Parts {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const paint = hullMaterial(hull, env);
  const W = 1.38;
  const R = 0.3;

  // The side: a short tail cut off square, the roof sweeping down to it, a long bonnet curving
  // down to a low rounded nose.
  const s = new THREE.Shape();
  s.moveTo(0.02, 0.3);
  s.lineTo(0.0, 0.72);
  s.quadraticCurveTo(0.05, 0.8, 0.4, 0.82);
  s.quadraticCurveTo(1.0, 0.86, 1.45, 1.12); // the fastback
  s.quadraticCurveTo(1.75, 1.22, 2.15, 1.1); // the roof's crown
  s.quadraticCurveTo(2.35, 0.96, 2.55, 0.86); // the windscreen's foot
  s.quadraticCurveTo(3.6, 0.82, 4.15, 0.66); // the long bonnet
  s.quadraticCurveTo(4.42, 0.56, 4.4, 0.4); // the rounded nose
  s.quadraticCurveTo(4.36, 0.3, 4.1, 0.28);
  s.lineTo(0.3, 0.28);
  s.closePath();
  const shell = new THREE.Mesh(profile(s, W, 0.15, 6), paint);
  body.add(shell);

  // The cabin glass, set into the shell.
  const g = new THREE.Shape();
  g.moveTo(1.45, 1.1);
  g.quadraticCurveTo(1.75, 1.2, 2.12, 1.09);
  g.quadraticCurveTo(2.3, 0.98, 2.5, 0.88);
  g.lineTo(1.25, 0.98);
  g.closePath();
  body.add(new THREE.Mesh(profile(g, W - 0.12, 0.06, 3), glassMat(env)));

  // Swelling wings over the front and rear wheels.
  // Each wing sits over its wheel (set out past the body), its lower half sunk into the body.
  for (const [z, sx, sy, sz] of [
    [3.45, 0.17, 0.2, 0.78],
    [0.95, 0.19, 0.22, 0.74],
  ] as const)
    for (const side of [-1, 1]) {
      const wing = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 16), paint);
      wing.scale.set(sx, sy, sz);
      wing.position.set(side * 0.66, 0.55, z);
      body.add(wing);
    }

  // The low oval mouth, its chrome lip, and the faired headlamps.
  const mouth = new THREE.Mesh(
    new THREE.SphereGeometry(1, 20, 10),
    new THREE.MeshStandardMaterial({ color: 0x050505, roughness: 0.7 }),
  );
  mouth.scale.set(0.42, 0.1, 0.08);
  mouth.position.set(0, 0.42, 4.53);
  body.add(mouth);
  const lip = new THREE.Mesh(new THREE.TorusGeometry(1, 0.025, 6, 40), chromeMat(env));
  lip.scale.set(0.42, 0.11, 1);
  lip.position.set(0, 0.42, 4.55);
  body.add(lip);
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
    // Round tail lamps, two each side.
    for (const dx of [0.34, 0.52]) {
      const tail = new THREE.Mesh(new THREE.CircleGeometry(0.06, 16), lampMat(3, 0.12, 0.05));
      tail.rotation.y = Math.PI;
      tail.position.set(side * dx, 0.62, -0.035);
      body.add(tail);
    }
  }
  const tailGlow = glowSprite(0xff1a08, 1.4, 0.3);
  tailGlow.scale.set(1.8, 0.4, 1);
  tailGlow.position.set(0, 0.62, -0.1);
  body.add(tailGlow);
  // Chrome bumper blades front and back.
  for (const z of [-0.04, 4.36]) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(W * 0.86, 0.035, 0.05), chromeMat(env));
    blade.position.set(0, z < 0 ? 0.42 : 0.3, z);
    body.add(blade);
  }

  // Four exhaust pipes under the tail.
  const pipes: [number, number, number][] = [-0.5, -0.38, 0.38, 0.5].map((x) => [x, 0.3, -0.06]);
  for (const [x, y, z] of pipes) {
    const p = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.18, 10), chromeMat(env));
    p.rotation.x = Math.PI / 2;
    p.position.set(x, y, z + 0.05);
    body.add(p);
  }
  const flames = exhaustFlames(body, fire, pipes, 0.05);

  const wheels: THREE.Object3D[] = [];
  for (const [x, z] of [
    [-0.7, 0.95],
    [0.7, 0.95],
    [-0.7, 3.45],
    [0.7, 3.45],
  ]) {
    const w = wireWheel(R, 0.2, env);
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
    feet: [new THREE.Vector3(-0.72, 0, 0.95), new THREE.Vector3(0.72, 0, 0.95)],
    lean: 0.6,
  };
}

/* ── Future GT ────────────────────────────────────────────── */

function futureGT(hull: Hull, fire: Fire, env: THREE.Texture | null): Parts {
  const group = new THREE.Group();
  const body = new THREE.Group();
  group.add(body);
  const paint = hullMaterial(hull, env);
  const W = 1.7;
  const R = 0.32;
  const cyan = new THREE.Color(0.5, 1.6, 2.2);

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
    const line = new THREE.Mesh(
      new THREE.BoxGeometry(0.01, 0.012, 3.2),
      new THREE.MeshBasicMaterial({ color: cyan, toneMapped: false }),
    );
    line.position.set(side * (W / 2 + 0.005), 0.42, 2.2);
    body.add(line);
  }

  // Two big outlets in the tail for the flames.
  const outlets: [number, number, number][] = [
    [-0.42, 0.4, -0.02],
    [0.42, 0.4, -0.02],
  ];
  for (const [x, y, z] of outlets) {
    const o = new THREE.Mesh(
      new THREE.TorusGeometry(0.07, 0.015, 6, 20),
      new THREE.MeshBasicMaterial({ color: cyan, toneMapped: false }),
    );
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
    const w = lightWheel(R, 0.26, paint, cyan);
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
  for (const z of [0.4, 1.85]) {
    const w = new THREE.Group();
    const tyre = new THREE.Mesh(new THREE.TorusGeometry(R * 0.82, R * 0.18, 12, 32), tyreMat());
    tyre.rotation.y = Math.PI / 2;
    w.add(tyre);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.6, R * 0.6, 0.05, 24), dark);
    disc.rotation.z = Math.PI / 2;
    w.add(disc);
    for (let i = 0; i < 5; i++) {
      const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.03, R * 1.3, 0.04), chromeMat(env));
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
      : id === 'future'
        ? futureGT(hull, fire, env)
        : motorbike(hull, fire, env);
  const shadow = groundBlob(
    0x000000,
    id === 'bike' ? 0.9 : 2.4,
    id === 'bike' ? 2.6 : 5.4,
    false,
    0.5,
  );
  shadow.position.set(0, 0.02, id === 'bike' ? 1.1 : 2.2);
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
