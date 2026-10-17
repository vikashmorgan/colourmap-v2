'use client';

/*
 * THE GALLERY ROOM — walk through the AI Sculptures · Flow collection in 3D
 * (asked for 2026-10-16: "build the 3D room for me"). The layout and the
 * materials are in lib/art/gallery-room.ts.
 *
 * TWO LAYERS. The pictures live in the owner's private Google Drive, and Drive
 * does not let a WebGL canvas read them (no CORS), so they cannot be textures.
 * They are real <img> elements instead, placed in 3D by a CSS3D renderer that
 * sits *behind* a transparent WebGL canvas. Where a frame hangs, the canvas
 * draws a "window" (a plane that writes transparent pixels), so the picture
 * shows through, and anything standing in front of it (a sculpture, a column)
 * still hides it, as it should. Signed in to Google, the pictures appear; if
 * not, each frame shows its title.
 *
 * The sculptures are real 3D: five forms of the collection's themes in marble,
 * bronze, gold or glass (choose per piece), on plinths under spotlights, slowly
 * turning; and your own models (.glb, e.g. from Tripo or Meshy) dropped onto
 * the page take the empty plinths, in the material you choose.
 *
 * Walk: W A S D or the arrows, drag to look, the wheel to glide; on a phone,
 * drag to look and hold the arrows. Tap a picture to see it large, a
 * sculpture to change its material.
 */

import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { CSS3DObject, CSS3DRenderer } from 'three/examples/jsm/renderers/CSS3DRenderer.js';

import {
  CIRCLE_SERIES,
  CIRCLES,
  DOOR,
  type Form,
  framePlaces,
  HALL,
  MATERIALS,
  type Material,
  PROJECTIONS,
  plinthPlaces,
  projectionUrl,
  ROOM_FEELS,
  ROUND_ROOM,
  type RoomFeel,
  ringRecipe,
  rooms,
  roundRoomPlaces,
  step,
} from '@/lib/art/gallery-room';

/** A picture for the walls: where to load it for the wall, large, and where to open it. */
export type GalleryPicture = { title: string; src: string; large: string; href?: string };
const EYE = 1.65;

type Piece = {
  id: string;
  name: string;
  line: string;
  material: Material | 'own';
  group: THREE.Group;
  /** The meshes whose material follows the choice. */
  meshes: THREE.Mesh[];
  /** A dropped model's own materials, kept for "Own colours". */
  own?: Map<THREE.Mesh, THREE.Material | THREE.Material[]>;
};

/* ── materials ─────────────────────────────────────────────── */

let veinTexture: THREE.CanvasTexture | null = null;
/** A white marble with soft grey veins, painted once on a canvas. */
function marbleVeins(): THREE.CanvasTexture {
  if (veinTexture) return veinTexture;
  const c = document.createElement('canvas');
  c.width = 1024;
  c.height = 1024;
  const g = c.getContext('2d') as CanvasRenderingContext2D;
  g.fillStyle = '#f3efe7';
  g.fillRect(0, 0, 1024, 1024);
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  for (let v = 0; v < 26; v++) {
    g.strokeStyle = `rgba(${110 + rand() * 40}, ${110 + rand() * 40}, ${115 + rand() * 40}, ${0.12 + rand() * 0.3})`;
    g.lineWidth = 0.6 + rand() * 3.5;
    g.filter = `blur(${rand() * 2}px)`;
    g.beginPath();
    let x = rand() * 1024;
    let y = -20;
    g.moveTo(x, y);
    while (y < 1044) {
      x += (rand() - 0.5) * 90;
      y += 30 + rand() * 60;
      g.quadraticCurveTo(x + (rand() - 0.5) * 80, y - 20, x, y);
    }
    g.stroke();
  }
  veinTexture = new THREE.CanvasTexture(c);
  veinTexture.colorSpace = THREE.SRGBColorSpace;
  veinTexture.wrapS = THREE.RepeatWrapping;
  veinTexture.wrapT = THREE.RepeatWrapping;
  return veinTexture;
}

function makeMaterial(m: Material): THREE.MeshPhysicalMaterial {
  const spec = MATERIALS[m];
  const mat = new THREE.MeshPhysicalMaterial({
    color: spec.color,
    metalness: spec.metalness,
    roughness: spec.roughness,
    clearcoat: spec.clearcoat ?? 0,
    clearcoatRoughness: 0.25,
  });
  if (spec.veins) mat.map = marbleVeins();
  if (spec.transmission) {
    mat.transmission = spec.transmission;
    mat.thickness = 0.6;
    mat.ior = 1.5;
    mat.attenuationColor = new THREE.Color('#cfe6ff');
    mat.attenuationDistance = 2.5;
  }
  return mat;
}

/* ── the forms ─────────────────────────────────────────────── */

/** "Total fracture": a figure curled into a ball, made of glass shards slightly apart, with a few fallen around it. */
function fractureGeometry(): THREE.BufferGeometry {
  const base = new THREE.IcosahedronGeometry(0.75, 3).toNonIndexed();
  const pos = base.getAttribute('position') as THREE.BufferAttribute;
  const out: number[] = [];
  let seed = 3;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const push = (a: THREE.Vector3, b: THREE.Vector3, c: THREE.Vector3) =>
    out.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z);
  for (let i = 0; i < pos.count; i += 3) {
    const v = [0, 1, 2].map((k) => new THREE.Vector3().fromBufferAttribute(pos, i + k));
    // The curl: a hunched back (flattened, stretched, bowed forward), head tucked low.
    for (const p of v) {
      p.set(p.x * 1.25, p.y * 0.78, p.z * 1.05);
      if (p.z < 0) p.y += 0.18 * Math.cos(p.x * 1.6);
      if (p.y < -0.35) p.y = -0.35 - (p.y + 0.35) * 0.25;
    }
    const centre = v[0]!
      .clone()
      .add(v[1]!)
      .add(v[2]!)
      .multiplyScalar(1 / 3);
    const n = centre.clone().normalize();
    const push2 = 0.02 + rand() * 0.07;
    const shrink = 0.86 + rand() * 0.1;
    const shard = v.map((p) =>
      p.clone().sub(centre).multiplyScalar(shrink).add(centre).addScaledVector(n, push2),
    );
    // A thin slab: front and back faces.
    const back = shard.map((p) => p.clone().addScaledVector(n, -0.035));
    push(shard[0]!, shard[1]!, shard[2]!);
    push(back[0]!, back[2]!, back[1]!);
  }
  // Shards fallen on the plinth around it.
  for (let k = 0; k < 40; k++) {
    const a = rand() * Math.PI * 2;
    const r = 0.85 + rand() * 0.25;
    const c = new THREE.Vector3(Math.cos(a) * r, -0.42, Math.sin(a) * r);
    const s = 0.04 + rand() * 0.07;
    const t = rand() * Math.PI;
    push(
      c.clone().add(new THREE.Vector3(Math.cos(t) * s, 0.01, Math.sin(t) * s)),
      c.clone().add(new THREE.Vector3(Math.cos(t + 2.2) * s, 0.01, Math.sin(t + 2.2) * s)),
      c
        .clone()
        .add(new THREE.Vector3(Math.cos(t + 4.1) * s, 0.02 + rand() * 0.03, Math.sin(t + 4.1) * s)),
    );
  }
  base.dispose();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(out, 3));
  geo.computeVertexNormals();
  return geo;
}

/** One gold ring: radius, tube, and an optional spin (radians a second, about its own x, y or z). */
function ring(
  r: number,
  tube: number,
  spin?: { axis: 'x' | 'y' | 'z'; speed: number },
): THREE.Mesh {
  const m = new THREE.Mesh(new THREE.TorusGeometry(r, tube, 24, 120));
  if (spin) m.userData.spin = spin;
  return m;
}

/** The seven circles: variations on Ascension's rings. */
function circleMeshes(variant: number): THREE.Mesh[] {
  const out: THREE.Mesh[] = [];
  const at = (m: THREE.Mesh, x: number, y: number, z: number, rx = 0, ry = 0, rz = 0) => {
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    out.push(m);
    return m;
  };
  switch (variant) {
    case 0: {
      // Orbit: three great circles round a small sun.
      at(ring(0.72, 0.045, { axis: 'y', speed: 0.25 }), 0, 1.05, 0, Math.PI / 2);
      at(ring(0.72, 0.045, { axis: 'y', speed: -0.18 }), 0, 1.05, 0, 0.5, 0, 0.3);
      at(ring(0.72, 0.045, { axis: 'y', speed: 0.12 }), 0, 1.05, 0, -0.6, 0.9, 0);
      at(new THREE.Mesh(new THREE.SphereGeometry(0.17, 32, 20)), 0, 1.05, 0);
      break;
    }
    case 1: {
      // Spiral: rings climbing a helix.
      for (let i = 0; i < 9; i++) {
        const a = i * 0.72;
        at(
          ring(0.3, 0.045),
          Math.cos(a) * 0.32,
          0.22 + i * 0.21,
          Math.sin(a) * 0.32,
          Math.PI / 2 + 0.25,
          a,
          0,
        );
      }
      break;
    }
    case 2: {
      // Cascade: rings falling and tilting.
      for (let i = 0; i < 6; i++) {
        const r = 0.55 - i * 0.065;
        at(
          ring(r, 0.05),
          (i % 2 ? 1 : -1) * i * 0.06,
          1.85 - i * 0.3,
          i * 0.05,
          Math.PI / 2 - i * 0.22,
          0,
          i * 0.15,
        );
      }
      break;
    }
    case 3: {
      // Gyroscope: a ring in a ring in a ring, each on its own axis.
      at(ring(0.78, 0.05, { axis: 'y', speed: 0.3 }), 0, 1.05, 0);
      at(ring(0.58, 0.045, { axis: 'x', speed: 0.55 }), 0, 1.05, 0, 0, Math.PI / 2);
      at(ring(0.38, 0.04, { axis: 'z', speed: 0.9 }), 0, 1.05, 0, Math.PI / 2);
      at(new THREE.Mesh(new THREE.SphereGeometry(0.1, 24, 16)), 0, 1.05, 0);
      // Its stand.
      at(new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.06, 0.27, 16)), 0, 0.135, 0);
      break;
    }
    case 4: {
      // Chain: five linked rings, rising.
      for (let i = 0; i < 5; i++)
        at(ring(0.27, 0.06), 0, 0.33 + i * 0.4, 0, 0, i % 2 ? Math.PI / 2 : 0, 0);
      break;
    }
    case 5: {
      // Bloom: eight rings round one axis, opening outward like petals.
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI;
        const m = at(ring(0.5, 0.035), Math.cos(a) * 0.08, 0.98, Math.sin(a) * 0.08, 0, a, 0);
        m.rotateX(0.18);
      }
      break;
    }
    default: {
      // Infinity: a figure-eight of two rings, a thin third turning round them.
      at(ring(0.42, 0.055), -0.4, 1.05, 0, 0, 0, 0.25);
      at(ring(0.42, 0.055), 0.4, 1.05, 0, 0, 0, -0.25);
      at(ring(0.95, 0.018, { axis: 'z', speed: 0.35 }), 0, 1.05, 0, Math.PI / 2 - 0.25);
      break;
    }
  }
  return out;
}

/**
 * The thirty and the small studies: ten families of ring sculpture, each drawn
 * from a seed (lib/art/gallery-room.ts, ringRecipe), so every piece differs.
 * Lighter rings than the seven (fewer segments): there are fifty-four of them.
 */
function ringsMeshes(seed: number): THREE.Mesh[] {
  const r = ringRecipe(seed);
  const out: THREE.Mesh[] = [];
  const add = (
    radius: number,
    x: number,
    y: number,
    z: number,
    rx: number,
    ry: number,
    rz: number,
    spin?: 'x' | 'y' | 'z',
  ) => {
    const m = new THREE.Mesh(new THREE.TorusGeometry(radius, r.tube, 12, 64));
    m.position.set(x, y, z);
    m.rotation.set(rx, ry, rz);
    if (spin && r.spin) m.userData.spin = { axis: spin, speed: r.spin * (out.length % 2 ? -1 : 1) };
    out.push(m);
  };
  const n = r.count;
  switch (r.family) {
    case 0: // a tilted stack
      for (let i = 0; i < n; i++)
        add(
          r.radius * (1 - i * 0.06),
          0,
          0.3 + i * 0.26,
          0,
          Math.PI / 2 + Math.sin(i * r.twist) * r.tilt,
          i * r.twist,
          0,
        );
      break;
    case 1: // a helix
      for (let i = 0; i < n + 3; i++) {
        const a = i * r.twist;
        add(
          r.radius * 0.6,
          Math.cos(a) * r.radius * 0.6,
          0.25 + i * 0.18,
          Math.sin(a) * r.radius * 0.6,
          Math.PI / 2 + r.tilt * 0.3,
          a,
          0,
        );
      }
      break;
    case 2: // nested, each on its own axis
      for (let i = 0; i < Math.min(n, 5); i++)
        add(
          r.radius * 1.3 * (1 - i * 0.18),
          0,
          1,
          0,
          (i * Math.PI) / 3,
          (i * Math.PI) / 4,
          0,
          (['x', 'y', 'z'] as const)[i % 3],
        );
      break;
    case 3: // a chain
      for (let i = 0; i < Math.min(n, 6); i++)
        add(
          r.radius * 0.5,
          Math.sin(i * r.tilt) * 0.12,
          0.3 + i * r.radius * 0.75,
          0,
          0,
          i % 2 ? Math.PI / 2 : 0,
          0,
        );
      break;
    case 4: // a bloom round one axis
      for (let i = 0; i < n + 2; i++) {
        const a = (i / (n + 2)) * Math.PI;
        add(r.radius, Math.cos(a) * 0.06, 1, Math.sin(a) * 0.06, r.tilt * 0.3, a, 0);
      }
      break;
    case 5: // an orbit of great circles
      for (let i = 0; i < Math.min(n, 4); i++)
        add(r.radius * 1.2, 0, 1, 0, Math.PI / 2 + i * r.twist, i * 0.8, i * 0.4, 'y');
      break;
    case 6: // a cascade
      for (let i = 0; i < n; i++)
        add(
          r.radius * (1 - i * 0.08),
          (i % 2 ? 1 : -1) * i * 0.05,
          1.8 - i * (1.5 / n),
          i * 0.04,
          Math.PI / 2 - i * r.tilt * 0.4,
          0,
          i * 0.12,
        );
      break;
    case 7: // standing in a row, smaller and smaller
      for (let i = 0; i < Math.min(n, 5); i++) {
        const rr = r.radius * (1 - i * 0.15);
        add(rr, -0.5 + i * 0.28, rr + 0.05, 0, 0, Math.PI / 2 + i * r.tilt * 0.3, 0);
      }
      break;
    case 8: // a pagoda of flat rings
      for (let i = 0; i < n; i++)
        add(
          r.radius * (i % 2 ? 0.55 : 1) * (1 - i * 0.05),
          0,
          0.25 + i * 0.22,
          0,
          Math.PI / 2,
          0,
          Math.sin(i) * r.tilt * 0.2,
        );
      break;
    default: // a ring of rings
      for (let i = 0; i < n + 3; i++) {
        const a = (i / (n + 3)) * Math.PI * 2;
        add(
          r.radius * 0.35,
          Math.cos(a) * r.radius,
          1 + Math.sin(a) * r.radius,
          0,
          0,
          Math.PI / 2 + r.tilt * 0.5,
          a,
        );
      }
      break;
  }
  return out;
}

function formMeshes(form: Form, variant = 0, seed = 0): THREE.Mesh[] {
  if (form === 'circles') return circleMeshes(variant);
  if (form === 'rings') return ringsMeshes(seed);
  const mesh = (g: THREE.BufferGeometry) => new THREE.Mesh(g);
  switch (form) {
    case 'flow': {
      const m = mesh(new THREE.TorusKnotGeometry(0.55, 0.17, 260, 36, 2, 3));
      m.position.y = 0.95;
      m.rotation.x = 0.4;
      return [m];
    }
    case 'wave': {
      const pts = Array.from({ length: 40 }, (_, i) => {
        const t = i / 39;
        return new THREE.Vector3(
          Math.sin(t * Math.PI * 3) * 0.45,
          0.1 + t * 1.8,
          Math.cos(t * Math.PI * 2) * 0.3,
        );
      });
      const tube = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 200, 0.13, 24, false);
      const m = mesh(tube);
      m.scale.set(1, 1, 0.55);
      return [m];
    }
    case 'fracture': {
      const m = mesh(fractureGeometry());
      m.position.y = 0.45;
      return [m];
    }
    case 'ascension': {
      return Array.from({ length: 6 }, (_, i) => {
        const m = mesh(new THREE.TorusGeometry(0.62 - i * 0.07, 0.06, 20, 90));
        m.position.y = 0.25 + i * 0.32;
        m.rotation.set(Math.PI / 2 + Math.sin(i * 1.3) * 0.5, i * 0.6, Math.cos(i) * 0.3);
        return m;
      });
    }
    case 'lotus': {
      const petals: THREE.Mesh[] = [];
      for (let ring = 0; ring < 2; ring++) {
        const n = ring ? 6 : 8;
        for (let i = 0; i < n; i++) {
          const m = mesh(new THREE.SphereGeometry(0.5, 32, 20));
          const a = (i / n) * Math.PI * 2 + ring * 0.4;
          m.scale.set(0.22, 0.55 - ring * 0.12, 0.08);
          m.position.set(
            Math.cos(a) * (0.32 - ring * 0.14),
            0.42 + ring * 0.12,
            Math.sin(a) * (0.32 - ring * 0.14),
          );
          m.rotation.set(0, -a + Math.PI / 2, 0);
          m.rotateX(-0.55 + ring * 0.25);
          petals.push(m);
        }
      }
      const heart = mesh(new THREE.SphereGeometry(0.13, 24, 16));
      heart.position.y = 0.42;
      petals.push(heart);
      return petals;
    }
  }
}

/* ── the room ──────────────────────────────────────────────── */

type Look = {
  wall: string;
  wallRough: number;
  wallMetal: number;
  floor: string;
  floorRough: number;
  marbleFloor?: boolean;
  ceiling: string;
  frame: string;
  plinth: string;
  ambient: number;
  hemiSky: string;
  hemiGround: string;
  spot: number;
  columns?: boolean;
  motes?: boolean;
  back: string;
};

const LOOKS: Record<RoomFeel, Look> = {
  white: {
    wall: '#f4f2ee',
    wallRough: 0.95,
    wallMetal: 0,
    floor: '#c8b393',
    floorRough: 0.6,
    ceiling: '#fbfaf8',
    frame: '#e9e4da',
    plinth: '#f7f5f1',
    ambient: 0.55,
    hemiSky: '#ffffff',
    hemiGround: '#d8cfc0',
    spot: 38,
    back: '#f4f2ee',
  },
  temple: {
    wall: '#b98d45',
    wallRough: 0.55,
    wallMetal: 0.35,
    floor: '#efe9df',
    floorRough: 0.25,
    marbleFloor: true,
    ceiling: '#5c3f1c',
    frame: '#d4a64a',
    plinth: '#efe9df',
    ambient: 0.35,
    hemiSky: '#ffe7b8',
    hemiGround: '#5c3f1c',
    spot: 55,
    columns: true,
    back: '#3a2810',
  },
  dark: {
    wall: '#0c0b10',
    wallRough: 0.9,
    wallMetal: 0,
    floor: '#08080b',
    floorRough: 0.35,
    ceiling: '#050507',
    frame: '#2a2830',
    plinth: '#16151c',
    ambient: 0.06,
    hemiSky: '#3a3550',
    hemiGround: '#000000',
    spot: 90,
    motes: true,
    back: '#000000',
  },
};

export default function GalleryRoom({
  title,
  back,
  images,
}: {
  title: string;
  back: { href: string; label: string };
  images: GalleryPicture[];
}) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [feel, setFeel] = useState<RoomFeel>('white');
  const [selected, setSelected] = useState<{
    id: string;
    name: string;
    line: string;
    material: Material | 'own';
    dropped: boolean;
  } | null>(null);
  const [picture, setPicture] = useState<GalleryPicture | null>(null);
  const [note, setNote] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  // The scene's controls, reached from the React side.
  const api = useRef<{
    setFeel: (f: RoomFeel) => void;
    setMaterial: (id: string, m: Material | 'own') => void;
    drop: (file: File) => void;
    move: (fwd: number) => void;
    jump: (room: 'corridor' | 'round' | 'projection') => void;
  } | null>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const W = () => mount.clientWidth;
    const H = () => mount.clientHeight;

    // The three rooms: the corridor, the circle room, the projection room.
    const layout = rooms(images.length);
    const hall = layout.corridor;
    const length = layout.length;
    const roundCentre = layout.roundCentre;
    const frames = framePlaces(images.length, hall);
    const row = plinthPlaces(CIRCLES.length, hall);
    const ring = roundRoomPlaces(CIRCLE_SERIES.length, roundCentre);
    // The centre of the circle room: the plinth for your own model.
    const centre = { x: 0, z: roundCentre, size: 1.5 };
    const plinths: { x: number; z: number; size?: number }[] = [...row, ...ring, centre];

    // The picture layer, behind.
    const css = new CSS3DRenderer();
    css.setSize(W(), H());
    Object.assign(css.domElement.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '0',
      pointerEvents: 'none',
    });
    mount.appendChild(css.domElement);

    // The room, in front, transparent where the pictures are.
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    // Sharp, but not every pixel of a phone's dense screen: the rooms stay smooth.
    renderer.setPixelRatio(Math.min(window.innerWidth < 700 ? 1.5 : 2, window.devicePixelRatio));
    renderer.setSize(W(), H());
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.05;
    Object.assign(renderer.domElement.style, {
      position: 'absolute',
      inset: '0',
      zIndex: '1',
      touchAction: 'none',
    });
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    const cssScene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const envTex = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = envTex;

    const camera = new THREE.PerspectiveCamera(62, W() / H(), 0.05, 200);
    let px = 0;
    // ?at=circles opens the gallery at the door of the circle room; ?at=projections, of the projection room.
    const at = new URLSearchParams(window.location.search).get('at');
    let pz =
      at === 'circles' ? layout.round - 1 : at === 'projections' ? layout.projection - 1 : 1.6;
    let yaw = 0; // 0 looks down the hall (+z)
    let pitch = -0.04;

    /* The pictures: an <img> each, in the CSS layer; a window and a frame each, in the room. */
    const windows: THREE.Mesh[] = [];
    const frameMeshes: THREE.Mesh[] = [];
    const frameMat = new THREE.MeshStandardMaterial({
      color: '#e9e4da',
      roughness: 0.5,
      metalness: 0.2,
    });
    const hole = new THREE.MeshBasicMaterial({
      color: 0x000000,
      opacity: 0,
      blending: THREE.NoBlending,
      side: THREE.DoubleSide,
    });
    const PX = 100; // css pixels per metre
    images.forEach((img, i) => {
      const f = frames[i]!;
      const el = document.createElement('div');
      Object.assign(el.style, {
        width: `${HALL.frameW * PX}px`,
        height: `${HALL.frameH * PX}px`,
        background: '#1c1a17',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#d9cdb8',
        font: '14px Georgia, serif',
        textAlign: 'center',
        overflow: 'hidden',
      });
      const caption = document.createElement('span');
      caption.textContent = img.title;
      caption.style.padding = '18px';
      const im = document.createElement('img');
      im.src = img.src;
      im.referrerPolicy = 'no-referrer';
      im.alt = img.title;
      Object.assign(im.style, {
        width: '100%',
        height: '100%',
        objectFit: 'cover',
        display: 'block',
      });
      im.onerror = () => {
        im.remove();
        el.appendChild(caption);
      };
      el.appendChild(im);
      const obj = new CSS3DObject(el);
      obj.position.set(f.x, f.y, f.z);
      obj.rotation.y = (f.facing * Math.PI) / 2;
      obj.scale.setScalar(1 / PX);
      cssScene.add(obj);

      const win = new THREE.Mesh(new THREE.PlaneGeometry(HALL.frameW, HALL.frameH), hole);
      win.position.set(f.x, f.y, f.z);
      win.rotation.y = (f.facing * Math.PI) / 2;
      win.userData.picture = i;
      scene.add(win);
      windows.push(win);
      // The frame: four bars around the window.
      const t = 0.09;
      for (const [w, h, dy, dz] of [
        [HALL.frameW + 2 * t, t, HALL.frameH / 2 + t / 2, 0],
        [HALL.frameW + 2 * t, t, -HALL.frameH / 2 - t / 2, 0],
        [t, HALL.frameH, 0, HALL.frameW / 2 + t / 2],
        [t, HALL.frameH, 0, -HALL.frameW / 2 - t / 2],
      ] as [number, number, number, number][]) {
        const bar = new THREE.Mesh(new THREE.BoxGeometry(0.06, h, w === t ? t : w), frameMat);
        if (w === t) bar.geometry = new THREE.BoxGeometry(0.06, h, t);
        bar.position.set(f.x + f.facing * 0.02, f.y + dy, f.z + dz);
        bar.userData.picture = i;
        scene.add(bar);
        frameMeshes.push(bar);
      }
    });

    /* The room shell, rebuilt per mood. */
    let shell = new THREE.Group();
    scene.add(shell);
    const ambient = new THREE.AmbientLight('#ffffff', 0.5);
    const hemi = new THREE.HemisphereLight('#ffffff', '#cccccc', 0.6);
    scene.add(ambient, hemi);
    const spots: THREE.SpotLight[] = [];
    const plinthMeshes: THREE.Mesh[] = [];
    const plinthMat = new THREE.MeshStandardMaterial({ color: '#f7f5f1', roughness: 0.7 });
    for (const p of plinths) {
      const big = p === centre;
      const w = big ? 1.8 : 1.2;
      const plinth = new THREE.Mesh(
        big
          ? new THREE.CylinderGeometry(0.9, 0.95, HALL.plinthH, 48)
          : new THREE.BoxGeometry(w, HALL.plinthH, w),
        plinthMat,
      );
      plinth.position.set(p.x, HALL.plinthH / 2, p.z);
      scene.add(plinth);
      plinthMeshes.push(plinth);
    }
    /*
     * Few lights, each covering several pieces: every light is worked out for
     * every pixel, so seven broad ones keep the rooms smooth even on a phone.
     * Three down the corridor, four over the circle room.
     */
    for (let k = 0; k < 3; k++) {
      const z = (hall / 3) * (k + 0.5);
      const spot = new THREE.SpotLight('#fff1d6', 55, 22, 0.75, 0.55, 1.3);
      spot.position.set(0, HALL.height - 0.2, z - 1);
      spot.target.position.set(0, HALL.plinthH, z + 1);
      scene.add(spot, spot.target);
      spots.push(spot);
    }
    // The circle room: three golden lights from the centre of the ceiling onto the ring, one on the centre.
    for (let k = 0; k < 3; k++) {
      const a = (k / 3) * Math.PI * 2;
      const spot = new THREE.SpotLight('#ffe2a8', 90, 20, 1.0, 0.6, 1.3);
      spot.position.set(Math.sin(a) * 3, HALL.height - 0.3, roundCentre - Math.cos(a) * 3);
      spot.target.position.set(
        Math.sin(a) * ROUND_ROOM.ring,
        HALL.plinthH + 0.6,
        roundCentre - Math.cos(a) * ROUND_ROOM.ring,
      );
      scene.add(spot, spot.target);
      spots.push(spot);
    }
    {
      const spot = new THREE.SpotLight('#fff4e0', 60, 10, 0.35, 0.5, 1.4);
      spot.position.set(0, HALL.height - 0.2, roundCentre - 0.5);
      spot.target.position.set(0, HALL.plinthH, roundCentre);
      scene.add(spot, spot.target);
      spots.push(spot);
    }
    let motes: THREE.Points | null = null;

    function buildShell(f: RoomFeel) {
      const look = LOOKS[f];
      scene.remove(shell);
      shell.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      shell = new THREE.Group();
      const wallMat = new THREE.MeshStandardMaterial({
        color: look.wall,
        roughness: look.wallRough,
        metalness: look.wallMetal,
      });
      const floorMat = new THREE.MeshStandardMaterial({
        color: look.floor,
        roughness: look.floorRough,
      });
      if (look.marbleFloor) {
        const tex = marbleVeins().clone();
        tex.repeat.set(3, length / 4);
        tex.needsUpdate = true;
        floorMat.map = tex;
      }
      const ceilMat = new THREE.MeshStandardMaterial({ color: look.ceiling, roughness: 0.9 });
      const box = (
        z0: number,
        z1: number,
        floorM: THREE.Material,
        wallM: THREE.Material,
        ceilM: THREE.Material,
      ) => {
        const depth = z1 - z0;
        const mid = (z0 + z1) / 2;
        const floor = new THREE.Mesh(new THREE.PlaneGeometry(HALL.width, depth), floorM);
        floor.rotation.x = -Math.PI / 2;
        floor.position.set(0, 0, mid);
        const ceil = new THREE.Mesh(new THREE.PlaneGeometry(HALL.width, depth), ceilM);
        ceil.rotation.x = Math.PI / 2;
        ceil.position.set(0, HALL.height, mid);
        shell.add(floor, ceil);
        for (const side of [-1, 1]) {
          const wall = new THREE.Mesh(new THREE.PlaneGeometry(depth, HALL.height), wallM);
          wall.rotation.y = side === -1 ? Math.PI / 2 : -Math.PI / 2;
          wall.position.set((side * HALL.width) / 2, HALL.height / 2, mid);
          shell.add(wall);
        }
      };
      // A wall across the building at z with a doorway; `facing` +1 faces +z.
      const doorWall = (z: number, facing: 1 | -1, wallM: THREE.Material) => {
        const side = (HALL.width - DOOR) / 2;
        for (const sx of [-1, 1]) {
          const part = new THREE.Mesh(new THREE.PlaneGeometry(side, HALL.height), wallM);
          part.position.set(sx * (DOOR / 2 + side / 2), HALL.height / 2, z);
          if (facing === -1) part.rotation.y = Math.PI;
          shell.add(part);
        }
        const lintel = new THREE.Mesh(new THREE.PlaneGeometry(DOOR, HALL.height - 3.4), wallM);
        lintel.position.set(0, 3.4 + (HALL.height - 3.4) / 2, z);
        if (facing === -1) lintel.rotation.y = Math.PI;
        shell.add(lintel);
      };
      // The corridor.
      box(0, hall, floorMat, wallMat, ceilMat);
      const start = new THREE.Mesh(new THREE.PlaneGeometry(HALL.width, HALL.height), wallMat);
      start.position.set(0, HALL.height / 2, 0);
      shell.add(start);
      doorWall(hall - 0.01, -1, wallMat);
      // The circle room: round, its wall curving all the way, broken only by the two doorways.
      {
        const R = ROUND_ROOM.radius;
        const gap = Math.asin(DOOR / 2 / R);
        const roundWall = (t0: number, t1: number, y0: number, y1: number) => {
          const g = new THREE.CylinderGeometry(R, R, y1 - y0, 96, 1, true, t0, t1 - t0);
          const m = new THREE.Mesh(g, wallMat);
          m.material = wallMat.clone();
          (m.material as THREE.MeshStandardMaterial).side = THREE.BackSide;
          m.position.set(0, (y0 + y1) / 2, roundCentre);
          shell.add(m);
        };
        // Three.js measures the angle from +z toward +x: the doorways are at π (the corridor) and 0 (the projections).
        roundWall(gap, Math.PI - gap, 0, HALL.height);
        roundWall(Math.PI + gap, 2 * Math.PI - gap, 0, HALL.height);
        roundWall(-gap, gap, 3.4, HALL.height);
        roundWall(Math.PI - gap, Math.PI + gap, 3.4, HALL.height);
        const rf = new THREE.Mesh(new THREE.CircleGeometry(R, 96), floorMat);
        rf.rotation.x = -Math.PI / 2;
        rf.position.set(0, 0.002, roundCentre);
        const rc = new THREE.Mesh(new THREE.CircleGeometry(R, 96), ceilMat);
        rc.rotation.x = Math.PI / 2;
        rc.position.set(0, HALL.height, roundCentre);
        shell.add(rf, rc);
        // A gold ring inlaid in the floor, inside the twenty-four.
        const inlay = new THREE.Mesh(
          new THREE.RingGeometry(ROUND_ROOM.ring - 1.6, ROUND_ROOM.ring - 1.48, 128),
          new THREE.MeshStandardMaterial({ color: '#d4a64a', metalness: 1, roughness: 0.3 }),
        );
        inlay.rotation.x = -Math.PI / 2;
        inlay.position.set(0, 0.006, roundCentre);
        shell.add(inlay);
      }
      // The projection room: black from floor to ceiling, so the projections glow.
      {
        // Unlit: no room light reaches it, whatever the mood, so it stays truly black.
        const black = new THREE.MeshBasicMaterial({ color: '#030205' });
        box(layout.projection, length, black, black, black);
        doorWall(layout.projection + 0.01, 1, black);
        const end = new THREE.Mesh(new THREE.PlaneGeometry(HALL.width, HALL.height), black);
        end.rotation.y = Math.PI;
        end.position.set(0, HALL.height / 2, length);
        shell.add(end);
      }
      if (look.columns) {
        const colMat = new THREE.MeshStandardMaterial({
          color: '#efe6d4',
          roughness: 0.35,
          map: marbleVeins(),
        });
        const capMat = new THREE.MeshStandardMaterial({
          color: '#d4a64a',
          metalness: 1,
          roughness: 0.3,
        });
        for (let z = HALL.frameGap / 2 + 1.2; z < hall - 1; z += HALL.frameGap) {
          for (const side of [-1, 1]) {
            const col = new THREE.Mesh(
              new THREE.CylinderGeometry(0.28, 0.32, HALL.height, 24),
              colMat,
            );
            col.position.set(side * (HALL.width / 2 - 0.45), HALL.height / 2, z);
            const cap = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.25, 0.8), capMat);
            cap.position.set(col.position.x, HALL.height - 0.12, z);
            const foot = cap.clone();
            foot.position.y = 0.12;
            shell.add(col, cap, foot);
          }
        }
      }
      // Lights along the ceiling (white cube), or none (the dark space lives on its spots).
      if (f === 'white') {
        const panelMat = new THREE.MeshBasicMaterial({ color: '#ffffff' });
        for (let z = 3; z < hall; z += 6) {
          const panel = new THREE.Mesh(new THREE.PlaneGeometry(HALL.width * 0.6, 0.5), panelMat);
          panel.rotation.x = Math.PI / 2;
          panel.position.set(0, HALL.height - 0.01, z);
          shell.add(panel);
        }
      }
      scene.add(shell);
      if (motes) {
        scene.remove(motes);
        motes.geometry.dispose();
        motes = null;
      }
      if (look.motes) {
        const n = 900;
        const p = new Float32Array(n * 3);
        for (let i = 0; i < n; i++) {
          p[i * 3] = (Math.random() - 0.5) * HALL.width;
          p[i * 3 + 1] = Math.random() * HALL.height;
          p[i * 3 + 2] = Math.random() * length;
        }
        const g = new THREE.BufferGeometry();
        g.setAttribute('position', new THREE.BufferAttribute(p, 3));
        motes = new THREE.Points(
          g,
          new THREE.PointsMaterial({
            color: '#ffe6b0',
            size: 0.03,
            transparent: true,
            opacity: 0.8,
            depthWrite: false,
          }),
        );
        scene.add(motes);
      }
      ambient.intensity = look.ambient;
      hemi.color.set(look.hemiSky);
      hemi.groundColor.set(look.hemiGround);
      hemi.intensity = look.ambient * 1.2;
      for (const s of spots) s.intensity = look.spot;
      frameMat.color.set(look.frame);
      frameMat.metalness = f === 'temple' ? 1 : 0.2;
      plinthMat.color.set(look.plinth);
      if (look.marbleFloor || f === 'white') plinthMat.map = f === 'temple' ? marbleVeins() : null;
      plinthMat.needsUpdate = true;
      renderer.toneMappingExposure = f === 'dark' ? 1.25 : 1.05;
      mount!.style.background = look.back;
    }

    /* The sculptures. */
    const pieces: Piece[] = [];
    const materials = new Map<Material, THREE.MeshPhysicalMaterial>();
    const matFor = (m: Material) => {
      let mat = materials.get(m);
      if (!mat) {
        mat = makeMaterial(m);
        materials.set(m, mat);
      }
      return mat;
    };
    const placed: [(typeof CIRCLES)[number], { x: number; z: number }][] = [
      ...CIRCLES.map(
        (s, i) => [s, row[i]!] as [(typeof CIRCLES)[number], { x: number; z: number }],
      ),
      ...CIRCLE_SERIES.map(
        (s, i) => [s, ring[i]!] as [(typeof CIRCLES)[number], { x: number; z: number }],
      ),
    ];
    placed.forEach(([s, p]) => {
      const group = new THREE.Group();
      const meshes = formMeshes(s.form, s.variant, s.seed);
      for (const m of meshes) {
        m.material = matFor(s.material);
        m.userData.piece = s.id;
        group.add(m);
      }
      group.position.set(p.x, HALL.plinthH, p.z);
      scene.add(group);
      pieces.push({ id: s.id, name: s.name, line: s.line, material: s.material, group, meshes });
    });

    /* The projection room: three screens of the Geometry Builder, live, only while you are near. */
    const screens: { win: THREE.Mesh; frame: HTMLIFrameElement; at: number }[] = [];
    const SCREENS = [
      { w: 10, h: 5.625, x: 0, z: length - 0.06, ry: Math.PI },
      { w: 8, h: 4.5, x: -HALL.width / 2 + 0.06, z: layout.projection + 11, ry: Math.PI / 2 },
      { w: 8, h: 4.5, x: HALL.width / 2 - 0.06, z: layout.projection + 11, ry: -Math.PI / 2 },
    ];
    SCREENS.forEach((sc, i) => {
      const SPX = 128;
      const frame = document.createElement('iframe');
      frame.title = PROJECTIONS[i] as string;
      frame.allow = 'autoplay; fullscreen';
      Object.assign(frame.style, {
        width: `${sc.w * SPX}px`,
        height: `${sc.h * SPX}px`,
        border: '0',
        background: '#000',
      });
      const obj = new CSS3DObject(frame);
      obj.position.set(sc.x, 3, sc.z);
      obj.rotation.y = sc.ry;
      obj.scale.setScalar(1 / SPX);
      cssScene.add(obj);
      const win = new THREE.Mesh(new THREE.PlaneGeometry(sc.w, sc.h), hole);
      win.position.set(sc.x, 3, sc.z);
      win.rotation.y = sc.ry;
      win.userData.screen = i;
      scene.add(win);
      screens.push({ win, frame, at: i });
    });
    let screensOn = false;
    const switchScreens = (on: boolean) => {
      if (on === screensOn) return;
      screensOn = on;
      for (const sc of screens)
        sc.frame.src = on
          ? projectionUrl(PROJECTIONS[sc.at % PROJECTIONS.length] as string)
          : 'about:blank';
    };

    // The centre plinth says it is waiting for your model.
    const waiting = new THREE.Mesh(
      new THREE.RingGeometry(0.62, 0.68, 64),
      new THREE.MeshBasicMaterial({ color: '#d4a64a', transparent: true, opacity: 0.7 }),
    );
    waiting.rotation.x = -Math.PI / 2;
    waiting.position.set(centre.x, HALL.plinthH + 0.005, centre.z);
    scene.add(waiting);
    let yours: Piece | null = null;

    function setMaterial(id: string, m: Material | 'own') {
      const piece = pieces.find((p) => p.id === id);
      if (!piece) return;
      piece.material = m;
      for (const mesh of piece.meshes) {
        if (m === 'own') mesh.material = piece.own?.get(mesh) ?? matFor('marble');
        else mesh.material = matFor(m);
      }
    }

    /* Your own models, dropped in. */
    const loader = new GLTFLoader();
    function drop(file: File) {
      // Your model stands on the centre plinth of the circle room (a new one replaces the last).
      const free = centre;
      const url = URL.createObjectURL(file);
      setNote(`Placing ${file.name}…`);
      loader.load(
        url,
        (gltf) => {
          URL.revokeObjectURL(url);
          const model = gltf.scene;
          // Stand it on the plinth, about 1.8 m tall, centred.
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const k = 1.8 / Math.max(size.y, size.x * 0.8, size.z * 0.8, 1e-3);
          model.scale.setScalar(k);
          const box2 = new THREE.Box3().setFromObject(model);
          const centre = box2.getCenter(new THREE.Vector3());
          model.position.set(-centre.x, -box2.min.y, -centre.z);
          const group = new THREE.Group();
          group.add(model);
          group.position.set(free.x, HALL.plinthH, free.z);
          const id = `yours-${pieces.length}`;
          const meshes: THREE.Mesh[] = [];
          const own = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>();
          model.traverse((o) => {
            const m = o as THREE.Mesh;
            if (!m.isMesh) return;
            own.set(m, m.material);
            m.userData.piece = id;
            meshes.push(m);
          });
          if (yours) {
            scene.remove(yours.group);
            pieces.splice(pieces.indexOf(yours), 1);
          }
          scene.add(group);
          waiting.visible = false;
          const name = file.name.replace(/\.(glb|gltf)$/i, '');
          yours = {
            id,
            name,
            line: 'Your model, in the centre of the circle room for this visit.',
            material: 'marble',
            group,
            meshes,
            own,
          };
          pieces.push(yours);
          setMaterial(id, 'marble');
          setNote(
            `${name} stands in the centre of the circle room, in marble. Tap it to change the material.`,
          );
          // Walk the visitor to look at it.
          pz = free.z - 5;
          px = 0;
          yaw = 0;
        },
        undefined,
        () => {
          URL.revokeObjectURL(url);
          setNote(
            `Could not read ${file.name}. Use a .glb file (Tripo and Meshy both export one).`,
          );
        },
      );
    }

    /* Walking and looking. */
    const keys = new Set<string>();
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (
        [
          'ArrowUp',
          'ArrowDown',
          'ArrowLeft',
          'ArrowRight',
          'KeyW',
          'KeyA',
          'KeyS',
          'KeyD',
        ].includes(e.code)
      ) {
        e.preventDefault();
        if (e.type === 'keydown') keys.add(e.code);
        else keys.delete(e.code);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    let held = 0; // the phone's arrows
    let drag: { x: number; y: number; moved: number } | null = null;
    const el = renderer.domElement;
    const onDown = (e: PointerEvent) => {
      drag = { x: e.clientX, y: e.clientY, moved: 0 };
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      drag.moved += Math.abs(dx) + Math.abs(dy);
      drag.x = e.clientX;
      drag.y = e.clientY;
      yaw -= dx * 0.0042;
      pitch = Math.max(-0.9, Math.min(0.7, pitch - dy * 0.0036));
    };
    const ray = new THREE.Raycaster();
    const onUp = (e: PointerEvent) => {
      const tapped = drag && drag.moved < 8;
      drag = null;
      if (!tapped) return;
      const r = el.getBoundingClientRect();
      ray.setFromCamera(
        new THREE.Vector2(
          ((e.clientX - r.left) / r.width) * 2 - 1,
          -((e.clientY - r.top) / r.height) * 2 + 1,
        ),
        camera,
      );
      const hit = ray.intersectObjects(
        [
          ...windows,
          ...frameMeshes,
          ...screens.map((sc) => sc.win),
          ...pieces.flatMap((p) => p.meshes),
          ...plinthMeshes,
        ],
        false,
      )[0];
      if (!hit) return;
      const screen = hit.object.userData.screen as number | undefined;
      if (screen !== undefined) {
        const sc = screens[screen]!;
        sc.at += SCREENS.length;
        const name = PROJECTIONS[sc.at % PROJECTIONS.length] as string;
        sc.frame.src = projectionUrl(name);
        setNote(`Now projecting ${name}.`);
        return;
      }
      const pic = hit.object.userData.picture as number | undefined;
      if (pic !== undefined) {
        setPicture(images[pic] ?? null);
        return;
      }
      const id = hit.object.userData.piece as string | undefined;
      const piece = pieces.find((p) => p.id === id);
      if (piece)
        setSelected({
          id: piece.id,
          name: piece.name,
          line: piece.line,
          material: piece.material,
          dropped: !!piece.own,
        });
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const step = -e.deltaY * 0.004;
      px += Math.sin(yaw) * step;
      pz += Math.cos(yaw) * step;
    };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    const onResize = () => {
      camera.aspect = W() / H();
      camera.updateProjectionMatrix();
      renderer.setSize(W(), H());
      css.setSize(W(), H());
    };
    window.addEventListener('resize', onResize);

    buildShell('white');
    api.current = {
      setFeel: buildShell,
      setMaterial,
      drop,
      move: (f: number) => {
        held = f;
      },
      jump: (room) => {
        // Stand just inside the room, looking in.
        pz =
          room === 'corridor'
            ? 1.6
            : room === 'round'
              ? layout.round + 1.2
              : layout.projection + 1.4;
        px = 0;
        prev.x = px;
        prev.z = pz;
        yaw = 0;
        pitch = room === 'projection' ? 0.08 : -0.04;
      },
    };

    const prev = { x: px, z: pz };
    let last = performance.now();
    let raf = 0;
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      // Walk: forward/back along the look, sideways across it.
      let fwd = held;
      let side = 0;
      if (keys.has('KeyW') || keys.has('ArrowUp')) fwd += 1;
      if (keys.has('KeyS') || keys.has('ArrowDown')) fwd -= 1;
      if (keys.has('KeyA')) side -= 1;
      if (keys.has('KeyD')) side += 1;
      if (keys.has('ArrowLeft')) yaw += dt * 1.6;
      if (keys.has('ArrowRight')) yaw -= dt * 1.6;
      const speed = 3.6 * dt;
      px += (Math.sin(yaw) * fwd - Math.cos(yaw) * side) * speed;
      pz += (Math.cos(yaw) * fwd + Math.sin(yaw) * side) * speed;
      const ok = step(prev, { x: px, z: pz }, layout, plinths);
      px = ok.x;
      pz = ok.z;
      prev.x = px;
      prev.z = pz;
      switchScreens(pz > layout.projection - 8);
      camera.position.set(px, EYE + Math.sin(now * 0.0016) * 0.008, pz);
      camera.lookAt(
        px + Math.sin(yaw) * Math.cos(pitch),
        EYE + Math.sin(pitch),
        pz + Math.cos(yaw) * Math.cos(pitch),
      );
      // The sculptures turn, slowly.
      for (const p of pieces) {
        p.group.rotation.y += dt * 0.12;
        // Rings that spin on their own axis (the circles).
        for (const m of p.meshes) {
          const spin = m.userData.spin as { axis: 'x' | 'y' | 'z'; speed: number } | undefined;
          if (spin) m.rotation[spin.axis] += dt * spin.speed;
        }
      }
      if (motes) motes.rotation.y = Math.sin(now * 0.00005) * 0.02;
      renderer.render(scene, camera);
      css.render(cssScene, camera);
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
      window.removeEventListener('resize', onResize);
      el.removeEventListener('wheel', onWheel);
      api.current = null;
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.geometry) m.geometry.dispose();
      });
      for (const m of materials.values()) m.dispose();
      envTex.dispose();
      pmrem.dispose();
      renderer.dispose();
      mount.innerHTML = '';
    };
  }, [images]);

  const chooseFeel = (f: RoomFeel) => {
    setFeel(f);
    api.current?.setFeel(f);
  };
  const chooseMaterial = (m: Material | 'own') => {
    if (!selected) return;
    api.current?.setMaterial(selected.id, m);
    setSelected({ ...selected, material: m });
  };

  const glass: React.CSSProperties = {
    background: 'rgba(20,16,12,0.62)',
    color: '#f3ead8',
    backdropFilter: 'blur(8px)',
    border: '1px solid rgba(255,220,160,0.25)',
    borderRadius: 14,
  };
  const chip = (on: boolean): React.CSSProperties => ({
    font: '600 12px system-ui, sans-serif',
    padding: '7px 12px',
    borderRadius: 999,
    border: `1px solid ${on ? '#d4a64a' : 'rgba(255,220,160,0.3)'}`,
    background: on ? '#d4a64a' : 'transparent',
    color: on ? '#1a140c' : '#f3ead8',
    cursor: 'pointer',
    minHeight: 34,
  });

  return (
    <div
      style={{ position: 'fixed', inset: 0, zIndex: 60, overflow: 'hidden', background: '#f4f2ee' }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        for (const file of Array.from(e.dataTransfer.files))
          if (/\.(glb|gltf)$/i.test(file.name)) api.current?.drop(file);
      }}
    >
      <div ref={mountRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Top: back, title, the room's mood. */}
      <div
        style={{
          position: 'absolute',
          top: 12,
          left: 12,
          right: 12,
          display: 'flex',
          flexWrap: 'wrap',
          gap: 10,
          alignItems: 'center',
          justifyContent: 'space-between',
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <div style={{ ...glass, padding: '8px 14px', pointerEvents: 'auto' }}>
          <a
            href={back.href}
            style={{
              color: '#d4a64a',
              font: '600 13px system-ui, sans-serif',
              textDecoration: 'none',
            }}
          >
            ← {back.label}
          </a>
          <div style={{ font: '600 18px Georgia, serif' }}>{title}</div>
        </div>
        <fieldset
          style={{
            ...glass,
            padding: 6,
            margin: 0,
            minWidth: 0,
            display: 'flex',
            gap: 4,
            pointerEvents: 'auto',
            flexWrap: 'wrap',
          }}
          aria-label="The room"
        >
          {(
            [
              ['corridor', 'Corridor'],
              ['round', 'Circle room'],
              ['projection', 'Projections'],
            ] as const
          ).map(([room, label]) => (
            <button
              key={room}
              type="button"
              onClick={() => api.current?.jump(room)}
              style={{ ...chip(false), borderStyle: 'dashed' }}
            >
              {label}
            </button>
          ))}
          {ROOM_FEELS.map((f) => (
            <button
              key={f.id}
              type="button"
              title={f.line}
              aria-pressed={feel === f.id}
              onClick={() => chooseFeel(f.id)}
              style={chip(feel === f.id)}
            >
              {f.name}
            </button>
          ))}
        </fieldset>
      </div>

      {/* Bottom: how to move; the phone's arrows; dropping a model. */}
      <div
        style={{
          position: 'absolute',
          bottom: 12,
          left: 12,
          right: 12,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'space-between',
          gap: 10,
          zIndex: 2,
          pointerEvents: 'none',
        }}
      >
        <div
          style={{
            ...glass,
            padding: '8px 12px',
            font: '12px/1.45 system-ui, sans-serif',
            maxWidth: 420,
          }}
        >
          W A S D or arrows to walk · drag to look · tap a picture to see it large, a sculpture to
          change its material · drop a <b>.glb</b> (Tripo, Meshy) anywhere to place your own piece
          {note ? <div style={{ color: '#d4a64a', marginTop: 4 }}>{note}</div> : null}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, pointerEvents: 'auto' }}>
          {[
            ['▲', 1, 'Walk forward'],
            ['▼', -1, 'Walk back'],
          ].map(([label, dir, aria]) => (
            <button
              key={String(label)}
              type="button"
              aria-label={String(aria)}
              onPointerDown={() => api.current?.move(Number(dir))}
              onPointerUp={() => api.current?.move(0)}
              onPointerLeave={() => api.current?.move(0)}
              style={{
                ...glass,
                width: 52,
                height: 52,
                fontSize: 18,
                cursor: 'pointer',
                touchAction: 'none',
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* A sculpture, chosen. */}
      {selected ? (
        <div
          style={{
            ...glass,
            position: 'absolute',
            zIndex: 3,
            top: 90,
            right: 12,
            width: 'min(320px, calc(100vw - 24px))',
            padding: 14,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ font: '600 18px Georgia, serif' }}>{selected.name}</div>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setSelected(null)}
              style={{ ...chip(false), padding: '2px 10px' }}
            >
              ×
            </button>
          </div>
          <p
            style={{
              font: 'italic 14px/1.4 Georgia, serif',
              margin: '6px 0 10px',
              color: '#e8d9bb',
            }}
          >
            {selected.line}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {(Object.keys(MATERIALS) as Material[]).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={selected.material === m}
                onClick={() => chooseMaterial(m)}
                style={chip(selected.material === m)}
              >
                {MATERIALS[m].name}
              </button>
            ))}
            {selected.dropped ? (
              <button
                type="button"
                aria-pressed={selected.material === 'own'}
                onClick={() => chooseMaterial('own')}
                style={chip(selected.material === 'own')}
              >
                Own colours
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {/* A picture, large. */}
      {picture ? (
        <div
          role="dialog"
          aria-label={picture.title}
          onClick={() => setPicture(null)}
          onKeyDown={(e) => e.key === 'Escape' && setPicture(null)}
          style={{
            position: 'absolute',
            inset: 0,
            zIndex: 4,
            background: 'rgba(8,6,4,0.86)',
            display: 'grid',
            placeItems: 'center',
            padding: 20,
          }}
        >
          <div style={{ display: 'grid', gap: 10, justifyItems: 'center' }}>
            <img
              src={picture.large}
              alt={picture.title}
              referrerPolicy="no-referrer"
              style={{
                maxWidth: '92vw',
                maxHeight: '80vh',
                borderRadius: 8,
                boxShadow: '0 20px 60px rgba(0,0,0,0.6)',
              }}
            />
            {picture.href ? (
              <a
                href={picture.href}
                target="_blank"
                rel="noreferrer"
                onClick={(e) => e.stopPropagation()}
                style={{ color: '#d4a64a', font: '600 13px system-ui, sans-serif' }}
              >
                Open the original ↗
              </a>
            ) : null}
          </div>
        </div>
      ) : null}

      {dragging ? (
        <div
          style={{
            position: 'absolute',
            inset: 16,
            zIndex: 5,
            border: '2px dashed #d4a64a',
            borderRadius: 18,
            display: 'grid',
            placeItems: 'center',
            background: 'rgba(20,16,12,0.35)',
            color: '#f3ead8',
            font: '600 18px Georgia, serif',
            pointerEvents: 'none',
          }}
        >
          Drop your .glb to place it on a plinth
        </div>
      ) : null}
    </div>
  );
}
