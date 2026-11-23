/**
 * The Golden Track's design space, drawn (docs/specs/drive-tracks.md, "Design space"): the element
 * chosen in lib/art/design-space.ts, laid along the real track in chunks ahead of you as the
 * autopilot drives, in the track's own world. Structures are gold lines with grains of light along
 * them (the City's language), dark faces where they are solid; fire, sparks and fireworks are one
 * pool of glowing points. Placed through twistPose, so everything sits on the road as drawn
 * (banking, rises, the dive); skipped where the road twists, loops, jumps or runs a deck.
 */

import * as THREE from 'three';

import { CATEGORIES, MARKING, type Pos, SURFACE_STYLE } from '@/lib/art/design-space';
import { WORLD_CFG } from '@/lib/art/drive-worlds';
import { frameAt, heightAt, pointAt, project, type Track, twistPose } from '@/lib/art/track';
import { GATE_STYLES, type GateStyle } from '@/lib/art/track-data';
import { buildGate } from './gates-view';

type V3 = [number, number, number];
const PHI = (1 + Math.sqrt(5)) / 2;
const rnd = (a = 1) => (Math.random() * 2 - 1) * a;
const norm = (v: V3): V3 => {
  const n = Math.hypot(v[0], v[1], v[2]) || 1;
  return [v[0] / n, v[1] / n, v[2] / n];
};

/** Chunk length (m), how far behind a chunk is dropped and how far ahead they are built. */
export const DS_CHUNK = { LEN: 150, BEHIND: 200, AHEAD: 1300 };

/* ── the road frame, in three's axes (x, z up → three y, −y → three z) ── */

function pose(tr: Track, s: number, u: number, h: number): V3 {
  const p = twistPose(tr, s, u, h);
  return [p.x, p.z, -p.y];
}
function ground(tr: Track, s: number, u: number, h = 0): V3 {
  const p = pointAt(tr, s, u);
  return [p.x, h, -p.y];
}
/** A direction: du to the left, dh up, dt forward. */
function dir(tr: Track, s: number, du: number, dh: number, dt: number): V3 {
  const h = frameAt(tr, s).h;
  const c = Math.cos(h);
  const sn = Math.sin(h);
  return norm([-sn * du + c * dt, dh, -c * du - sn * dt]);
}
/** Plain road here: no twist, loop, jump or deck. */
function plain(tr: Track, s: number): boolean {
  const d = tr.def;
  return !(d.twist?.(s) ?? 0) && !d.gap?.(s) && !(d.deck?.(s) ?? 0);
}
function plainSpan(tr: Track, s0: number, s1: number): boolean {
  for (let s = s0; s <= s1; s += 4) if (!plain(tr, s)) return false;
  return plain(tr, s1);
}
/** Far enough from every stretch of road near here (a building beside the road, not on it). */
function clearOfRoad(tr: Track, s: number, x: number, y: number, r: number): boolean {
  for (const hint of [s - 600, s, s + 600]) {
    const q = project(tr, x, y, Math.max(0, hint));
    if (Math.abs(q.u) < tr.def.half(Math.max(0, q.s)) + r) return false;
  }
  return true;
}

/* ── a kit of lines, faces and lamps ── */

const C = {
  gold: [1, 0.62, 0.18] as V3,
  deep: [0.8, 0.42, 0.1] as V3,
  warm: [1, 0.85, 0.6] as V3,
  blue: [0.35, 0.6, 1] as V3,
  red: [1, 0.18, 0.08] as V3,
  canal: [0.35, 0.7, 0.85] as V3,
};

class Kit {
  L: number[] = [];
  LC: number[] = [];
  LF: number[] = [];
  F: number[] = [];
  dots: { p: V3; c: V3; b: number; size: number }[] = [];
  line(a: V3, b: V3, col = C.gold, br = 1, flow = -1) {
    this.L.push(...a, ...b);
    this.LC.push(col[0] * br, col[1] * br, col[2] * br);
    this.LF.push(flow);
  }
  poly(pts: V3[], closed: boolean, col = C.gold, br = 1, flow = -1) {
    for (let i = 0; i < pts.length - (closed ? 0 : 1); i++)
      this.line(pts[i], pts[(i + 1) % pts.length], col, br, flow);
  }
  tri(a: V3, b: V3, c: V3) {
    this.F.push(...a, ...b, ...c);
  }
  quad(a: V3, b: V3, c: V3, d: V3) {
    this.tri(a, b, c);
    this.tri(a, c, d);
  }
  dot(p: V3, c = C.warm, b = 1.5, size = 1.4) {
    this.dots.push({ p, c, b, size });
  }
}

const FOG_D = 0.0012;

const grainMat = new THREE.ShaderMaterial({
  uniforms: { uScale: { value: 900 }, uTime: { value: 0 } },
  transparent: true,
  depthWrite: false,
  blending: THREE.AdditiveBlending,
  vertexShader: `attribute vec3 aCol; attribute float aSize; attribute float aFlow;
    uniform float uScale; uniform float uTime; varying vec3 vC; varying float vA;
    void main(){ vec4 mv = modelViewMatrix*vec4(position,1.0); float d = -mv.z;
      float b = aFlow < 0.0 ? 1.0 : 0.35 + 1.4*pow(0.5+0.5*sin(aFlow*0.05 - uTime*4.0), 8.0);
      vC = aCol*b; float f = d*${FOG_D}; vA = exp(-f*f);
      gl_PointSize = min(14.0, max(1.5, aSize*uScale/max(d,1.0))); gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `varying vec3 vC; varying float vA;
    void main(){ vec2 p = gl_PointCoord-0.5; float a = exp(-dot(p,p)*12.0)*vA*0.7; if (a < 0.004) discard;
      gl_FragColor = vec4(vC*a, a); }`,
});
const lineMat = new THREE.LineBasicMaterial({
  vertexColors: true,
  transparent: true,
  opacity: 0.6,
  blending: THREE.AdditiveBlending,
  depthWrite: false,
});
const faceMat = new THREE.MeshBasicMaterial({
  color: 0x0d0a08,
  side: THREE.DoubleSide,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});

function kitToGroup(k: Kit, g: THREE.Group) {
  const n = k.L.length / 6;
  if (n) {
    const geo = new THREE.BufferGeometry();
    const col: number[] = [];
    for (let i = 0; i < n; i++) {
      const c = [k.LC[i * 3] * 0.5, k.LC[i * 3 + 1] * 0.5, k.LC[i * 3 + 2] * 0.5];
      col.push(...c, ...c);
    }
    geo.setAttribute('position', new THREE.Float32BufferAttribute(k.L, 3));
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    g.add(new THREE.LineSegments(geo, lineMat));
  }
  if (k.F.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(k.F, 3));
    g.add(new THREE.Mesh(geo, faceMat));
  }
  let total = 0;
  const lenOf = (o: number) =>
    Math.hypot(k.L[o + 3] - k.L[o], k.L[o + 4] - k.L[o + 1], k.L[o + 5] - k.L[o + 2]);
  for (let i = 0; i < n; i++) total += lenOf(i * 6);
  const sp = Math.max(0.9, total / 9000);
  const pos: number[] = [];
  const col: number[] = [];
  const size: number[] = [];
  const flow: number[] = [];
  for (let i = 0; i < n; i++) {
    const o = i * 6;
    const m = Math.max(1, Math.round(lenOf(o) / sp));
    for (let j = 0; j < m; j++) {
      const t = (j + Math.random()) / m;
      pos.push(
        k.L[o] + (k.L[o + 3] - k.L[o]) * t,
        k.L[o + 1] + (k.L[o + 4] - k.L[o + 1]) * t,
        k.L[o + 2] + (k.L[o + 5] - k.L[o + 2]) * t,
      );
      col.push(k.LC[i * 3], k.LC[i * 3 + 1], k.LC[i * 3 + 2]);
      size.push(0.6);
      flow.push(k.LF[i]);
    }
  }
  for (const d of k.dots) {
    pos.push(...d.p);
    col.push(d.c[0] * d.b, d.c[1] * d.b, d.c[2] * d.b);
    size.push(d.size);
    flow.push(-1);
  }
  if (pos.length) {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    geo.setAttribute('aCol', new THREE.Float32BufferAttribute(col, 3));
    geo.setAttribute('aSize', new THREE.Float32BufferAttribute(size, 1));
    geo.setAttribute('aFlow', new THREE.Float32BufferAttribute(flow, 1));
    g.add(new THREE.Points(geo, grainMat));
  }
  g.traverse((o) => {
    o.frustumCulled = false;
  });
}

/* ── the road's new skin: a ribbon over the real road, its look in the shader ── */

const surfaceMat = new THREE.ShaderMaterial({
  uniforms: {
    uTime: { value: 0 },
    uStyle: { value: 0 },
    uMark: { value: 0 },
    uHalf: { value: 18 },
  },
  polygonOffset: true,
  polygonOffsetFactor: -2,
  polygonOffsetUnits: -2,
  vertexShader: `varying vec2 vUv; varying float vD;
    void main(){ vUv = uv; vec4 mv = modelViewMatrix*vec4(position,1.0); vD = -mv.z; gl_Position = projectionMatrix*mv; }`,
  fragmentShader: `uniform float uTime; uniform int uStyle; uniform int uMark; uniform float uHalf;
    varying vec2 vUv; varying float vD;
    const vec3 G = vec3(1.0,0.62,0.18);
    float hexD(vec2 p){ p = abs(p); return max(dot(p, normalize(vec2(1.0,1.732))), p.x); }
    float hexEdge(vec2 uv){ vec2 r = vec2(1.0,1.732), h = r*0.5; vec2 a = mod(uv,r)-h, b = mod(uv-h,r)-h;
      vec2 gv = dot(a,a)<dot(b,b)?a:b; return 0.5-hexD(gv); }
    float line(float v, float w){ float f = fract(v); return 1.0 - smoothstep(0.0, w, min(f, 1.0-f)); }
    void main(){
      float u = vUv.x, s = vUv.y, x = u*uHalf, au = abs(u);
      vec3 c = vec3(0.03,0.025,0.02); float edge = smoothstep(0.95,1.0,au);
      if (uStyle == 0) { vec2 g = fract(vec2(x/1.6, s/1.6))-0.5; c += G*smoothstep(0.2,0.05,length(g))*0.7 + G*edge; }
      else if (uStyle == 1) { c = vec3(0.02,0.028,0.045); float band = pow(0.5+0.5*sin(s*0.06-uTime*5.0),6.0);
        c += G*(0.08+0.5*band)*(1.0-au*0.6) + vec3(0.4,0.6,1.0)*line(x/3.0,0.03)*0.12 + G*edge; }
      else if (uStyle == 2) { c += G*smoothstep(0.05,0.0,hexEdge(vec2(x,s)/2.6))*0.75 + G*edge; }
      else if (uStyle == 3) { float rail = smoothstep(0.86,0.89,au)*(1.0-smoothstep(0.96,0.99,au));
        c = vec3(0.012,0.011,0.012) + G*(rail*1.3 + line(s/8.0,0.02)*step(au,0.9)*0.5); }
      else if (uStyle == 4) { c = vec3(0.075,0.065,0.06); float centre = step(abs(abs(x)-0.4),0.14);
        float kerb = step(0.9,au); float k = step(0.5,fract(s/4.0));
        c += G*centre*0.9; c = mix(c, mix(vec3(0.75,0.08,0.05), vec3(0.9,0.85,0.75), k), kerb); }
      else { c = vec3(0.012,0.012,0.018); float streak = pow(0.5+0.5*sin(x*1.3+sin(s*0.02)),24.0)*0.35;
        c += G*(streak*(0.5+0.5*sin(s*0.05-uTime*2.0)) + exp(-au*2.0)*0.06) + G*edge*0.9; }
      if (uMark == 1) { float q = fract((s+abs(x)*0.8)/9.0 - uTime*1.5);
        c += G*smoothstep(0.0,0.04,q)*(1.0-smoothstep(0.1,0.17,q))*step(au,0.75)*1.3; }
      else if (uMark == 2) { c += G*step(abs(x),0.3)*step(fract((s-uTime*40.0)/8.0),0.45)*1.5;
        c += G*step(abs(abs(x)-uHalf*0.5),0.15)*step(fract((s-uTime*90.0)/14.0),0.25)*0.9; }
      else if (uMark == 3) { float kerb = step(0.86,au)*step(au,0.98); float k = step(0.5,fract(s/3.0));
        c = mix(c, mix(vec3(0.85,0.1,0.05), G*1.2, k), kerb); }
      else if (uMark == 4) { c += G*pow(0.5+0.5*sin((s-uTime*60.0)*0.08),40.0)*1.3; }
      else if (uMark == 5) { c += G*max(line(x/3.0,0.04), line(s/3.0,0.03))*0.5 + vec3(0.3,0.75,0.9)*edge*0.8; }
      else if (uMark == 6) { float ax = (au-0.75)/0.09; float q = fract((s+abs(ax)*1.6)/6.0 - uTime*2.4);
        c += G*step(abs(ax),1.0)*smoothstep(0.0,0.04,q)*(1.0-smoothstep(0.14,0.22,q))*1.4; }
      float f = vD*${FOG_D};
      gl_FragColor = vec4(mix(vec3(0.03,0.03,0.05), c, exp(-f*f)), 1.0); }`,
});

/** The pattern repeats every 840 m (every period divides it), so the shader keeps its precision. */
const PATTERN = 840;

function surface(tr: Track, s0: number, s1: number, g: THREE.Group) {
  const pos: number[] = [];
  const uv: number[] = [];
  const idx: number[] = [];
  const across = 9;
  const rows = Math.round((s1 - s0) / 2);
  for (let i = 0; i <= rows; i++) {
    const s = s0 + ((s1 - s0) * i) / rows;
    const half = tr.def.half(s);
    for (let j = 0; j < across; j++) {
      const u = -1 + (2 * j) / (across - 1);
      pos.push(...pose(tr, s, u * half, 0.06));
      uv.push(u, ((s % PATTERN) + PATTERN) % PATTERN);
    }
    if (i < rows)
      for (let j = 0; j < across - 1; j++) {
        const a = i * across + j;
        idx.push(a, a + across, a + 1, a + 1, a + across, a + across + 1);
      }
  }
  // Where the pattern wraps, a row would smear from 840 back to 0: those quads are left out.
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  const keep: number[] = [];
  for (let q = 0; q < idx.length; q += 3) {
    const v = [idx[q], idx[q + 1], idx[q + 2]].map((k) => uv[k * 2 + 1]);
    if (Math.max(...v) - Math.min(...v) < PATTERN / 2) keep.push(idx[q], idx[q + 1], idx[q + 2]);
  }
  geo.setIndex(keep);
  const m = new THREE.Mesh(geo, surfaceMat);
  m.frustumCulled = false;
  g.add(m);
}

/* ── glowing points: fire, sparks, fireworks, ships' trails ── */

/** Palettes root to tip (0 fire, 1 red, 2 blue, 3 gold sparks, 4 white-hot); 5 is its own colour. */
const PALS: [number, number, number, number][][] = [
  [
    [0, 1, 0.95, 0.75],
    [0.18, 1, 0.72, 0.25],
    [0.5, 1, 0.38, 0.06],
    [0.85, 0.55, 0.08, 0.02],
    [1, 0.2, 0.02, 0.01],
  ],
  [
    [0, 1, 0.7, 0.5],
    [0.2, 1, 0.25, 0.08],
    [0.6, 0.85, 0.05, 0.03],
    [1, 0.3, 0.01, 0.02],
  ],
  [
    [0, 0.85, 0.95, 1],
    [0.25, 0.3, 0.6, 1],
    [0.65, 0.3, 0.2, 0.9],
    [1, 0.15, 0.05, 0.4],
  ],
  [
    [0, 1, 0.97, 0.8],
    [0.3, 1, 0.75, 0.3],
    [0.75, 0.9, 0.4, 0.08],
    [1, 0.5, 0.15, 0.02],
  ],
  [
    [0, 1, 1, 1],
    [0.35, 1, 0.88, 0.65],
    [0.75, 1, 0.5, 0.15],
    [1, 0.5, 0.12, 0.03],
  ],
];

export const MAX_SPARKS = 24000;

class Sparks {
  P = new Float32Array(MAX_SPARKS * 3);
  V = new Float32Array(MAX_SPARKS * 3);
  age = new Float32Array(MAX_SPARKS);
  life = new Float32Array(MAX_SPARKS);
  size = new Float32Array(MAX_SPARKS);
  drag = new Float32Array(MAX_SPARKS);
  grav = new Float32Array(MAX_SPARKS);
  pal = new Uint8Array(MAX_SPARKS);
  grow = new Uint8Array(MAX_SPARKS);
  own = new Float32Array(MAX_SPARKS * 3);
  aCol = new Float32Array(MAX_SPARKS * 3);
  aAlpha = new Float32Array(MAX_SPARKS);
  aSize = new Float32Array(MAX_SPARKS);
  head = 0;
  geo = new THREE.BufferGeometry();
  mat = new THREE.ShaderMaterial({
    uniforms: { uScale: { value: 900 } },
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    vertexShader: `attribute vec3 aCol; attribute float aAlpha; attribute float aSize; uniform float uScale;
      varying vec3 vC; varying float vA;
      void main(){ vC = aCol; vec4 mv = modelViewMatrix*vec4(position,1.0); float d = -mv.z; float f = d*${FOG_D};
        vA = aAlpha*exp(-f*f);
        gl_PointSize = vA <= 0.0 ? 0.0 : min(110.0, aSize*uScale/max(d,1.0)); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `varying vec3 vC; varying float vA;
      void main(){ vec2 p = gl_PointCoord-0.5; float a = exp(-dot(p,p)*14.0)*vA; if (a < 0.003) discard;
        gl_FragColor = vec4(vC*a, a); }`,
  });
  points: THREE.Points;
  constructor() {
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.P, 3));
    this.geo.setAttribute('aCol', new THREE.BufferAttribute(this.aCol, 3));
    this.geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.aAlpha, 1));
    this.geo.setAttribute('aSize', new THREE.BufferAttribute(this.aSize, 1));
    this.points = new THREE.Points(this.geo, this.mat);
    this.points.frustumCulled = false;
  }
  spawn(
    p: V3,
    v: V3,
    life: number,
    pal: number,
    size: number,
    drag = 1.4,
    grav = 3,
    grow = 1,
    own?: V3,
  ) {
    const i = this.head;
    this.head = (this.head + 1) % MAX_SPARKS;
    this.P.set(p, i * 3);
    this.V.set(v, i * 3);
    this.age[i] = 0;
    this.life[i] = life;
    this.size[i] = size;
    this.drag[i] = drag;
    this.grav[i] = grav;
    this.pal[i] = pal;
    this.grow[i] = grow;
    if (own) this.own.set(own, i * 3);
  }
  clear() {
    this.life.fill(0);
    this.aAlpha.fill(0);
  }
  step(dt: number) {
    for (let i = 0; i < MAX_SPARKS; i++) {
      if (this.life[i] <= 0) {
        this.aAlpha[i] = 0;
        continue;
      }
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) {
        this.life[i] = 0;
        this.aAlpha[i] = 0;
        continue;
      }
      const o = i * 3;
      const k = Math.exp(-this.drag[i] * dt);
      this.V[o] *= k;
      this.V[o + 1] = this.V[o + 1] * k + this.grav[i] * dt;
      this.V[o + 2] *= k;
      this.P[o] += this.V[o] * dt;
      this.P[o + 1] += this.V[o + 1] * dt;
      this.P[o + 2] += this.V[o + 2] * dt;
      const f = this.age[i] / this.life[i];
      if (this.pal[i] === 5) {
        const w = Math.max(0, 1 - f * 4) * 0.6;
        this.aCol[o] = this.own[o] + w;
        this.aCol[o + 1] = this.own[o + 1] + w;
        this.aCol[o + 2] = this.own[o + 2] + w;
      } else {
        const st = PALS[this.pal[i]];
        let j = 0;
        while (j < st.length - 2 && f > st[j + 1][0]) j++;
        const a = st[j];
        const b = st[j + 1];
        const t = Math.min(1, Math.max(0, (f - a[0]) / (b[0] - a[0])));
        this.aCol[o] = a[1] + (b[1] - a[1]) * t;
        this.aCol[o + 1] = a[2] + (b[2] - a[2]) * t;
        this.aCol[o + 2] = a[3] + (b[3] - a[3]) * t;
      }
      this.aAlpha[i] = Math.min(1, f / 0.08) * (1 - f) ** 1.3 * (this.grow[i] ? 0.5 : 0.9);
      this.aSize[i] = this.size[i] * (this.grow[i] ? 0.5 + 1.4 * f : 1 - 0.5 * f);
    }
    for (const n of ['position', 'aCol', 'aAlpha', 'aSize'])
      (this.geo.attributes[n] as THREE.BufferAttribute).needsUpdate = true;
  }
}

/* ── emitters: a burner placed at s, lit while you are near it ── */

interface Burner {
  s: number;
  w0: number;
  w1: number;
  acc: number;
  pos: V3;
  dir: V3;
  rate: number;
  speed: number;
  life: number;
  pal: number;
  size: number;
  spread: number;
  drag: number;
  buoy: number;
  grow: number;
  /** Lit only when this says so (taking turns). */
  gate?: (t: number) => boolean;
}
type BurnerOpts = Partial<Omit<Burner, 's' | 'pos' | 'dir' | 'acc'>> &
  Pick<Burner, 'rate' | 'speed' | 'life' | 'pal' | 'size'>;
function burner(s: number, pos: V3, d: V3, o: BurnerOpts): Burner {
  return {
    s,
    pos,
    dir: d,
    acc: Math.random(),
    w0: -40,
    w1: 420,
    spread: 0.12,
    drag: 1.4,
    buoy: 3,
    grow: 1,
    ...o,
  };
}

interface Rocket {
  p: V3;
  v: V3;
  pat: string;
}

const FW: V3[] = [
  [1, 0.62, 0.18],
  [1, 0.25, 0.12],
  [1, 0.9, 0.7],
  [1, 0.45, 0.55],
  [0.55, 0.75, 1],
];
const sphere = (): V3 => {
  const u = Math.random() * 2 - 1;
  const a = Math.random() * Math.PI * 2;
  const q = Math.sqrt(1 - u * u);
  return [q * Math.cos(a), u, q * Math.sin(a)];
};

/* ── shared structure builders ── */

function along(
  k: Kit,
  tr: Track,
  s0: number,
  s1: number,
  step: number,
  fu: (s: number) => number,
  fh: (s: number) => number,
  col: V3,
  br: number,
  flow = false,
) {
  let prev: V3 | null = null;
  for (let s = s0; s <= s1 + 1e-6; s += step) {
    const p = pose(tr, s, fu(s), fh(s));
    if (prev) k.line(prev, p, col, br, flow ? s : -1);
    prev = p;
  }
}
/** A square column from the ground (or from h0 over the road) up to h1 over the road. */
function column(
  k: Kit,
  tr: Track,
  s: number,
  u: number,
  w: number,
  h1: number,
  col = C.deep,
  br = 0.6,
  h0?: number,
) {
  const corners: [number, number][] = [
    [u - w, -w],
    [u + w, -w],
    [u + w, w],
    [u - w, w],
  ];
  const hi = corners.map(([uu, t]) => pose(tr, s + t, uu, h1));
  const lo = corners.map(
    ([uu, t], i): V3 => (h0 === undefined ? [hi[i][0], 0, hi[i][2]] : pose(tr, s + t, uu, h0)),
  );
  k.poly(lo, true, col, br);
  k.poly(hi, true, col, br);
  for (let i = 0; i < 4; i++) {
    k.line(lo[i], hi[i], col, br);
    k.quad(lo[i], lo[(i + 1) % 4], hi[(i + 1) % 4], hi[i]);
  }
}
function box(
  k: Kit,
  cx: number,
  cz: number,
  y0: number,
  w: number,
  d: number,
  h: number,
  rot = 0,
  floors = 0,
  col = C.gold,
  br = 1,
) {
  const cs = Math.cos(rot);
  const sn = Math.sin(rot);
  const c = [
    [-w, -d],
    [w, -d],
    [w, d],
    [-w, d],
  ].map(([x, z]) => [cx + x * cs - z * sn, cz + x * sn + z * cs]);
  const lo = c.map(([x, z]): V3 => [x, y0, z]);
  const hi = c.map(([x, z]): V3 => [x, y0 + h, z]);
  k.poly(lo, true, col, br * 0.6);
  k.poly(hi, true, col, br);
  for (let i = 0; i < 4; i++) {
    k.line(lo[i], hi[i], col, br);
    k.quad(lo[i], lo[(i + 1) % 4], hi[(i + 1) % 4], hi[i]);
  }
  k.quad(hi[0], hi[1], hi[2], hi[3]);
  if (floors > 0)
    for (let y = y0 + floors; y < y0 + h - 0.5; y += floors)
      k.poly(
        c.map(([x, z]): V3 => [x, y, z]),
        true,
        col,
        br * 0.35,
      );
}
function ringXZ(cx: number, y: number, cz: number, r: number, n = 48): V3[] {
  return Array.from({ length: n }, (_, i): V3 => {
    const a = (i / n) * Math.PI * 2;
    return [cx + Math.cos(a) * r, y, cz + Math.sin(a) * r];
  });
}
function geodesic(r: number, levels: number) {
  const t = PHI;
  let V: V3[] = (
    [
      [-1, t, 0],
      [1, t, 0],
      [-1, -t, 0],
      [1, -t, 0],
      [0, -1, t],
      [0, 1, t],
      [0, -1, -t],
      [0, 1, -t],
      [t, 0, -1],
      [t, 0, 1],
      [-t, 0, -1],
      [-t, 0, 1],
    ] as V3[]
  ).map(norm);
  let F: [number, number, number][] = [
    [0, 11, 5],
    [0, 5, 1],
    [0, 1, 7],
    [0, 7, 10],
    [0, 10, 11],
    [1, 5, 9],
    [5, 11, 4],
    [11, 10, 2],
    [10, 7, 6],
    [7, 1, 8],
    [3, 9, 4],
    [3, 4, 2],
    [3, 2, 6],
    [3, 6, 8],
    [3, 8, 9],
    [4, 9, 5],
    [2, 4, 11],
    [6, 2, 10],
    [8, 6, 7],
    [9, 8, 1],
  ];
  for (let l = 0; l < levels; l++) {
    const mid = new Map<string, number>();
    const m = (a: number, b: number) => {
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      let i = mid.get(key);
      if (i === undefined) {
        V.push(norm([(V[a][0] + V[b][0]) / 2, (V[a][1] + V[b][1]) / 2, (V[a][2] + V[b][2]) / 2]));
        i = V.length - 1;
        mid.set(key, i);
      }
      return i;
    };
    const NF: [number, number, number][] = [];
    for (const [a, b, c] of F) {
      const ab = m(a, b);
      const bc = m(b, c);
      const ca = m(c, a);
      NF.push([a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]);
    }
    F = NF;
  }
  V = V.map((p) => [p[0] * r, p[1] * r, p[2] * r]);
  return { V, F };
}
function dome(k: Kit, cx: number, cz: number, r: number, levels = 2) {
  const { V, F } = geodesic(r, levels);
  const seen = new Set<string>();
  for (const f of F) {
    if (!f.every((i) => V[i][1] >= -0.01)) continue;
    const pts = f.map((i): V3 => [cx + V[i][0], V[i][1], cz + V[i][2]]) as [V3, V3, V3];
    k.tri(...pts);
    for (let e = 0; e < 3; e++) {
      const a = f[e];
      const b = f[(e + 1) % 3];
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (seen.has(key)) continue;
      seen.add(key);
      k.line(pts[e], pts[(e + 1) % 3], C.gold, 0.9);
    }
  }
  k.dot([cx, r * 0.35, cz], C.warm, 2.2, 6);
}
/** Grid positions of period p (offset o) inside [s0, s1). */
function every(s0: number, s1: number, p: number, o = 0): number[] {
  const out: number[] = [];
  for (let s = Math.ceil((s0 - o) / p) * p + o; s < s1; s += p) if (s >= 0) out.push(s);
  return out;
}

/* ── Chinatown and the Neon District (the City's pieces, adapted to the road) ── */

/** The City's neon: cyan, magenta, amber, violet. */
const NEON: V3[] = [
  [0.3, 0.9, 1],
  [1, 0.25, 0.8],
  [1, 0.6, 0.15],
  [0.6, 0.35, 1],
];
/** Chinatown's words (the City's signs): ramen, tea, dragon, wine, dream, noodles, good fortune, café. */
export const CT_WORDS = ['ラーメン', '茶', '龍', '酒', '夢', '麺', '福', '喫茶'];
/** The Neon District's blade signs. */
export const NEON_WORDS = ['夢', 'NEON', 'ラーメン', 'DREAM', 'CITY', 'バー', 'HOTEL', '酒'];

const texCache = new Map<string, THREE.Texture | null>();
/** A word on a dark board, drawn once (null without a canvas, as in tests). */
function wordTexture(
  word: string,
  ink: string,
  bg: string,
  vertical: boolean,
): THREE.Texture | null {
  const key = `${word}|${ink}|${bg}|${vertical}`;
  if (texCache.has(key)) return texCache.get(key) ?? null;
  let tex: THREE.Texture | null = null;
  if (typeof document !== 'undefined') {
    const cv = document.createElement('canvas');
    cv.width = vertical ? 128 : 512;
    cv.height = vertical ? 512 : 128;
    const g = cv.getContext('2d');
    if (g) {
      g.fillStyle = bg;
      g.fillRect(0, 0, cv.width, cv.height);
      g.strokeStyle = ink;
      g.lineWidth = 6;
      g.strokeRect(6, 6, cv.width - 12, cv.height - 12);
      g.fillStyle = ink;
      g.textAlign = 'center';
      g.textBaseline = 'middle';
      const chars = [...word];
      if (vertical) {
        const step = (cv.height - 40) / chars.length;
        g.font = `bold ${Math.min(96, step * 0.85)}px "Noto Sans JP", "Yu Gothic", "Microsoft YaHei", sans-serif`;
        chars.forEach((c, i) => {
          g.fillText(c, cv.width / 2, 20 + step * (i + 0.5));
        });
      } else {
        g.font = 'bold 84px "Noto Serif SC", "Yu Mincho", "SimSun", serif';
        g.fillText(word, cv.width / 2, cv.height / 2 + 4);
      }
      tex = new THREE.CanvasTexture(cv);
      tex.colorSpace = THREE.SRGBColorSpace;
    }
  }
  texCache.set(key, tex);
  return tex;
}
const css = (c: V3) =>
  `rgb(${Math.round(c[0] * 255)},${Math.round(c[1] * 255)},${Math.round(c[2] * 255)})`;

/** A board standing out into the street at s: u0 to u1 across, h0 to h1 up, facing along. */
function board(
  g: THREE.Group,
  tr: Track,
  s: number,
  u0: number,
  u1: number,
  h0: number,
  h1: number,
  tex: THREE.Texture | null,
  glow = 1.6,
) {
  if (!tex) return;
  const pts = [pose(tr, s, u0, h0), pose(tr, s, u1, h0), pose(tr, s, u1, h1), pose(tr, s, u0, h1)];
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pts.flat(), 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute([0, 0, 1, 0, 1, 1, 0, 1], 2));
  geo.setIndex([0, 1, 2, 0, 2, 3]);
  const mat = new THREE.MeshBasicMaterial({
    map: tex,
    side: THREE.DoubleSide,
    toneMapped: false,
    transparent: true,
  });
  mat.color.setScalar(glow);
  const m = new THREE.Mesh(geo, mat);
  m.userData.ownMaterial = true;
  m.frustumCulled = false;
  g.add(m);
}

/** A roof with its ends turned up, across the road at s: centred at uc, half-width a, eaves at h. */
function upturnedRoof(
  k: Kit,
  tr: Track,
  s: number,
  uc: number,
  a: number,
  h: number,
  depth: number,
) {
  for (const t of [-depth, depth])
    k.poly(
      [
        pose(tr, s + t, uc - a - 1.8, h + 1.1),
        pose(tr, s + t, uc - a, h),
        pose(tr, s + t, uc + a, h),
        pose(tr, s + t, uc + a + 1.8, h + 1.1),
      ],
      false,
      C.gold,
      1.2,
    );
  const ridgeL = pose(tr, s, uc - a * 0.75, h + 1.8);
  const ridgeR = pose(tr, s, uc + a * 0.75, h + 1.8);
  k.line(ridgeL, ridgeR, C.gold, 1.3);
  for (const t of [-depth, depth]) {
    k.line(pose(tr, s + t, uc - a, h), ridgeL, C.deep, 0.8);
    k.line(pose(tr, s + t, uc + a, h), ridgeR, C.deep, 0.8);
    k.quad(pose(tr, s + t, uc - a, h), pose(tr, s + t, uc + a, h), ridgeR, ridgeL);
  }
}

function chinatown(k: Kit, g: THREE.Group, tr: Track, id: string, s0: number, s1: number) {
  const half = (s: number) => tr.def.half(s);
  if (id === 'gate') {
    for (const s of every(s0, s1, 400, 200)) {
      if (!plainSpan(tr, s - 6, s + 6)) continue;
      const hw = half(s);
      for (const u of [-(hw + 1.5), -hw * 0.45, hw * 0.45, hw + 1.5])
        column(k, tr, s, u, 0.7, Math.abs(u) > hw ? 10 : 12, C.red, 1, 0);
      k.line(pose(tr, s, -hw - 2.5, 9), pose(tr, s, hw + 2.5, 9), C.red, 1.1);
      k.line(pose(tr, s, -hw * 0.5, 11), pose(tr, s, hw * 0.5, 11), C.red, 1.1);
      upturnedRoof(k, tr, s, 0, hw * 0.5, 12.5, 1.6);
      const side = (hw * 0.55 + 1.5) / 2;
      for (const sd of [-1, 1]) upturnedRoof(k, tr, s, sd * (hw * 0.45 + side), side, 10.3, 1.3);
      board(
        g,
        tr,
        s,
        -3.2,
        3.2,
        9.3,
        10.8,
        wordTexture('中華街', '#ffcc66', '#7a0c06', false),
        1.4,
      );
      for (const u of [-hw * 0.45, hw * 0.45]) k.dot(pose(tr, s, u, 8), [1, 0.2, 0.08], 2.2, 3.5);
    }
  } else if (id === 'lanterns') {
    for (const s of every(s0, s1, 28, 14)) {
      if (!plainSpan(tr, s - 2, s + 2)) continue;
      const w = half(s) + 3;
      const pts: V3[] = [];
      for (let i = 0; i <= 16; i++) {
        const f = i / 16;
        pts.push(pose(tr, s, -w + 2 * w * f, 12 - 2.6 * Math.sin(Math.PI * f)));
      }
      k.poly(pts, false, C.deep, 0.6);
      for (let i = 2; i <= 14; i += 2) {
        const p = pts[i];
        k.dot([p[0], p[1] - 1.2, p[2]], [1, 0.16, 0.06], 2.4, 3.2);
        k.dot([p[0], p[1] - 2.4, p[2]], C.gold, 1.2, 0.8);
      }
    }
  } else if (id === 'signs') {
    for (const s of every(s0, s1, 22, 6)) {
      if (!plainSpan(tr, s - 2, s + 2)) continue;
      const i = Math.round(s / 22);
      const sd = i % 2 ? 1 : -1;
      const hw = half(s);
      const word = CT_WORDS[i % CT_WORDS.length];
      const ink = i % 3 ? '#ffd27a' : '#ff6a3a';
      const top = 5 + 2.2 * [...word].length + 1.5;
      board(
        g,
        tr,
        s,
        sd * (hw + 5),
        sd * (hw + 1.8),
        5,
        top,
        wordTexture(word, ink, '#2a0604', true),
      );
      k.line(pose(tr, s, sd * (hw + 6), 5), pose(tr, s, sd * (hw + 6), top + 1), C.deep, 0.6);
    }
  } else if (id === 'pagodas') {
    for (const s of every(s0, s1, 320, 90)) {
      const i = Math.round(s / 320);
      const sd = i % 2 ? 1 : -1;
      const p = pointAt(tr, s, sd * (half(s) + 55 + (i % 3) * 25));
      if (!clearOfRoad(tr, s, p.x, p.y, 30)) continue;
      const cx = p.x;
      const cz = -p.y;
      const rot = -frameAt(tr, s).h;
      const cs = Math.cos(rot);
      const sn = Math.sin(rot);
      let y = 0;
      for (let t = 0; t < 5; t++) {
        const w = 10 * 0.82 ** t;
        box(k, cx, cz, y, w, w, 5.5, rot, 0, C.red, 0.8);
        y += 5.5;
        const ring = [
          [-1, -1],
          [1, -1],
          [1, 1],
          [-1, 1],
        ].map(([a, b]): V3 => {
          const x = a * (w + 2.4);
          const z = b * (w + 2.4);
          return [cx + x * cs - z * sn, y + 1.2, cz + x * sn + z * cs];
        });
        const eave = ring.map((q): V3 => [cx + (q[0] - cx) * 0.9, y, cz + (q[2] - cz) * 0.9]);
        k.poly(eave, true, C.gold, 1.1);
        ring.forEach((q, j) => {
          k.line(eave[j], q, C.gold, 1.2);
        });
        k.dot([cx, y - 2, cz], [1, 0.3, 0.1], 1.4, 2);
      }
      k.line([cx, y, cz], [cx, y + 9, cz], C.gold, 1.2);
      k.dot([cx, y + 9.5, cz], C.warm, 2.5, 4);
    }
  }
  // 'dragon' and 'sky' move, so they are drawn each frame (dragonFly, skyLantern).
}

/** The dragon of light flying just ahead of you over the road, undulating. */
function dragonFly(sp: Sparks, tr: Track, s: number, t: number) {
  const N = 70;
  for (let j = 0; j < N; j++) {
    const q = s + 70 + j * 2.4;
    if (!plain(tr, q)) continue;
    const hw = tr.def.half(q);
    const u = Math.sin(t * 0.7 - j * 0.16) * hw * 0.6;
    const h = 13 + 3 * Math.sin(t * 1.1 - j * 0.22);
    const head = j === 0;
    const col: V3 = head ? [1, 0.8, 0.3] : j % 4 === 0 ? [1, 0.62, 0.18] : [0.95, 0.15, 0.06];
    sp.spawn(
      pose(tr, q, u, h),
      [0, 0, 0],
      0.06,
      5,
      head ? 4.5 : 2.6 * (1 - j / N) + 0.8,
      0,
      0,
      0,
      col,
    );
    if (j % 6 === 3)
      sp.spawn(pose(tr, q, u, h + 1.6), [0, 0, 0], 0.06, 5, 1.1, 0, 0, 0, [1, 0.7, 0.25]);
  }
}

/** One sky lantern rising beside the road ahead. */
function skyLantern(sp: Sparks, tr: Track, s: number) {
  const q = s + 80 + Math.random() * 600;
  const u = (Math.random() < 0.5 ? 1 : -1) * (tr.def.half(q) + 8 + Math.random() * 90);
  sp.spawn(
    ground(tr, q, u, 2),
    [rnd(0.4), 2.2 + Math.random(), rnd(0.4)],
    16,
    5,
    2.2,
    0,
    0,
    0,
    [1, 0.42, 0.1],
  );
}

function neon(k: Kit, g: THREE.Group, tr: Track, id: string, s0: number, s1: number) {
  const half = (s: number) => tr.def.half(s);
  const steel: V3 = [0.35, 0.3, 0.45];
  if (id === 'towers') {
    for (const s of every(s0, s1, 45)) {
      const rot = -frameAt(tr, s).h;
      const cs = Math.cos(rot);
      const sn = Math.sin(rot);
      for (const sd of [-1, 1]) {
        const i = Math.round(s / 45) + (sd > 0 ? 7 : 0);
        const p = pointAt(tr, s, sd * (half(s) + 22 + (i % 3) * 10));
        if (!clearOfRoad(tr, s, p.x, p.y, 12)) continue;
        const h = 50 + (i % 5) * 22;
        box(k, p.x, -p.y, 0, 8, 8, h, rot, 0, steel, 0.5);
        for (let b = 0; b < 2 + (i % 3); b++) {
          const y = h * (0.25 + 0.22 * b);
          const c = NEON[(i + b) % 4];
          const ring = [
            [-1, -1],
            [1, -1],
            [1, 1],
            [-1, 1],
          ].map(
            ([a, bb]): V3 => [
              p.x + a * 8.3 * cs - bb * 8.3 * sn,
              y,
              -p.y + a * 8.3 * sn + bb * 8.3 * cs,
            ],
          );
          k.poly(ring, true, c, 1.6);
          k.poly(
            ring.map((q): V3 => [q[0], y + 0.8, q[2]]),
            true,
            c,
            1.2,
          );
        }
        k.line([p.x, h, -p.y], [p.x, h + 12, -p.y], NEON[i % 4], 1);
        k.dot([p.x, h + 12.5, -p.y], NEON[(i + 1) % 4], 2.2, 3.5);
      }
    }
  } else if (id === 'blades') {
    for (const s of every(s0, s1, 35, 10)) {
      if (!plainSpan(tr, s - 2, s + 2)) continue;
      const i = Math.round(s / 35);
      const sd = i % 2 ? 1 : -1;
      const hw = half(s);
      const word = NEON_WORDS[i % NEON_WORDS.length];
      const c = NEON[i % 4];
      const top = 7 + 2.6 * [...word].length + 2;
      board(
        g,
        tr,
        s,
        sd * (hw + 6.5),
        sd * (hw + 2.5),
        7,
        top,
        wordTexture(word, css(c), '#06040c', true),
        1.8,
      );
    }
  } else if (id === 'bridges') {
    for (const s of every(s0, s1, 90, 45)) {
      if (!plainSpan(tr, s - 3, s + 3)) continue;
      // Never over a jump's flight: you would fly through it.
      if (tr.def.gap && [-300, -150, 0, 150, 300, 450].some((d) => tr.def.gap?.(s + d))) continue;
      const i = Math.round(s / 90);
      const hw = half(s);
      const h = 18 + (i % 3) * 8;
      const W = hw + 22;
      const c = NEON[i % 4];
      const at = (u: number, dh: number, dt: number) => pose(tr, s + dt, u, h + dh);
      for (const [dh, dt] of [
        [0, -1.6],
        [0, 1.6],
        [3, -1.6],
        [3, 1.6],
      ])
        k.line(at(-W, dh, dt), at(W, dh, dt), C.warm, 0.8);
      for (let u = -W; u <= W; u += 3) {
        k.poly([at(u, 0, -1.6), at(u, 3, -1.6), at(u, 3, 1.6), at(u, 0, 1.6)], true, C.deep, 0.5);
        k.dot(at(u, 0.2, 0), c, 1.8, 1.6);
      }
      for (const sd of [-1, 1]) {
        const p = pointAt(tr, s, sd * (W + 4));
        box(k, p.x, -p.y, 0, 4, 4, h + 10, -frameAt(tr, s).h, 0, steel, 0.6);
      }
    }
  } else if (id === 'docks') {
    for (const s of every(s0, s1, 160, 80)) {
      const i = Math.round(s / 160);
      const sd = i % 2 ? 1 : -1;
      const p = pointAt(tr, s, sd * (half(s) + 30));
      if (!clearOfRoad(tr, s, p.x, p.y, 16)) continue;
      const h = 26 + (i % 3) * 9;
      const c = NEON[i % 4];
      k.line([p.x, 0, -p.y], [p.x, h, -p.y], C.deep, 0.7);
      k.poly(ringXZ(p.x, h, -p.y, 9, 40), true, c, 1.4, s);
      k.poly(ringXZ(p.x, h - 0.6, -p.y, 7.5, 40), true, C.deep, 0.5);
      box(k, p.x, -p.y, h, 1.4, 4, 1, -frameAt(tr, s).h, 0, C.warm, 1);
      k.dot([p.x, h + 1.8, -p.y], NEON[(i + 2) % 4], 2, 3);
    }
  } else if (id === 'jumps') {
    // At every jump: neon chevron frames up the kicker, a bridge across the void under your
    // flight, and arrows down the landing.
    const gap = tr.def.gap;
    if (!gap) return;
    for (let s = Math.max(4, s0); s < s1; s += 2) {
      if (!gap(s) || gap(s - 2)) continue;
      let e = s;
      while (gap(e) && e < s + 600) e += 2;
      for (let q = s - 130; q < s; q += 13) {
        const c = NEON[Math.abs(Math.round(q / 13)) % 4];
        const w = half(q) + 2;
        k.poly(
          [
            pose(tr, q, -w, 0),
            pose(tr, q, -w, 7),
            pose(tr, q, 0, 9),
            pose(tr, q, w, 7),
            pose(tr, q, w, 0),
          ],
          false,
          c,
          1.5,
          q,
        );
      }
      const mid = (s + e) / 2;
      const hw = half(s - 10);
      const W = hw + 40;
      const a = pose(tr, mid, -W, -14);
      const b = pose(tr, mid, W, -14);
      for (const dh of [0, 2.5])
        k.line([a[0], a[1] + dh, a[2]], [b[0], b[1] + dh, b[2]], C.warm, 1);
      for (let u = -W; u <= W; u += 4)
        k.dot(pose(tr, mid, u, -13.6), NEON[Math.abs(Math.round(u / 4)) % 4], 2, 1.8);
      for (const u of [-W, -hw, hw, W]) {
        const top = pose(tr, mid, u, -14);
        k.line(top, [top[0], 0, top[2]], C.deep, 0.7);
      }
      for (let q = e + 10; q < e + 220; q += 14) {
        const w = half(q) * 0.6;
        k.poly(
          [pose(tr, q - 4, -w, 0.3), pose(tr, q, 0, 0.3), pose(tr, q - 4, w, 0.3)],
          false,
          NEON[0],
          1.4,
          q,
        );
      }
    }
  }
}

/* ── the space ── */

/** The Gates category: a gate of the chosen look every 240 m, in the track's own world. */
function gates(group: THREE.Group, tr: Track, style: GateStyle, s0: number, s1: number) {
  const world = WORLD_CFG[tr.def.id];
  for (const s of every(s0, s1, 240, 120)) {
    if (!plainSpan(tr, s - 24, s + 24)) continue;
    const f = frameAt(tr, s);
    const p = pointAt(tr, s, 0);
    const g = buildGate(style, {
      hw: tr.def.half(s) + 2,
      tall: tr.def.id === 'sky' ? 1.6 : 1,
      world: world.id,
      night: world.theme !== null,
      seed: Math.round(s / 240),
    });
    g.position.set(p.x, heightAt(tr, s, 0, true), -p.y);
    g.rotation.set(0, f.h + Math.PI / 2, -f.bank, 'YXZ');
    group.add(g);
  }
}

interface Chunk {
  group: THREE.Group;
  burners: Burner[];
}

export class DesignSpace {
  readonly root = new THREE.Group();
  private sparks = new Sparks();
  private chunks = new Map<number, Chunk>();
  private layers: Pos[] = [{ cat: 0, v: 0 }];
  /** The fireworks showing (a variation id), or null. */
  private show: string | null = null;
  /** Moving things the layers ask for. */
  private moving = { ships: false, traffic: false, dragon: false, lanterns: false };
  private lanternT = 0;
  private rockets: Rocket[] = [];
  private timer = 0;
  private side = 1;
  private t = 0;
  private bend = 0;
  private ships: { off: number; u: number; y: number; v: number; col: V3 }[] = [];

  constructor(scene: THREE.Scene) {
    this.root.add(this.sparks.points);
    scene.add(this.root);
  }

  /** The point size scale: the canvas's height in pixels over twice the tangent of half the view. */
  setScale(px: number) {
    this.sparks.mat.uniforms.uScale.value = px;
    grainMat.uniforms.uScale.value = px;
  }

  /** Show one cell (the design space). */
  set(p: Pos) {
    this.setLayers([p]);
  }

  /** Show several cells at once (a track's own dressing). */
  setLayers(ps: Pos[]) {
    this.layers = ps.length ? ps : [{ cat: 0, v: 0 }];
    for (const c of this.chunks.values()) this.drop(c);
    this.chunks.clear();
    this.sparks.clear();
    this.rockets = [];
    this.timer = 0.3;
    const cells = this.layers.map((p) => ({
      cat: CATEGORIES[p.cat].id,
      id: CATEGORIES[p.cat].vars[p.v].id,
    }));
    const has = (cat: string, id: string) => cells.some((c) => c.cat === cat && c.id === id);
    const surf = cells.find((c) => c.cat === 'surface' || c.cat === 'markings');
    surfaceMat.uniforms.uStyle.value = surf ? (SURFACE_STYLE[surf.id] ?? 5) : 5;
    surfaceMat.uniforms.uMark.value = surf?.cat === 'markings' ? MARKING[surf.id] : 0;
    this.show = cells.find((c) => c.cat === 'fireworks')?.id ?? null;
    this.moving = {
      ships: has('city', 'lanes'),
      traffic: has('neon', 'traffic'),
      dragon: has('chinatown', 'dragon'),
      lanterns: has('chinatown', 'sky'),
    };
    this.ships = this.moving.ships
      ? Array.from({ length: 50 }, (_, i) => ({
          off: Math.random() * 1000,
          u: (i % 2 ? 1 : -1) * (70 + (i % 5) * 35),
          y: 30 + (i % 4) * 26,
          v: (i % 2 ? 1 : -1) * (25 + Math.random() * 30),
          col: (i % 2 ? [0.9, 0.85, 0.75] : [1, 0.15, 0.08]) as V3,
        }))
      : this.moving.traffic
        ? Array.from({ length: 70 }, (_, i) => ({
            off: Math.random() * 1000,
            u: rnd(14),
            y: 14 + (i % 4) * 9,
            v: 18 + (i % 4) * 9 + Math.random() * 10,
            col: NEON[i % 4],
          }))
        : [];
  }

  private drop(c: Chunk) {
    this.root.remove(c.group);
    c.group.traverse((o) => {
      if (o instanceof THREE.Mesh || o instanceof THREE.Points || o instanceof THREE.LineSegments)
        o.geometry.dispose();
      if (o instanceof THREE.Mesh && o.userData.ownMaterial)
        (o.material as THREE.Material).dispose();
    });
  }

  /** One frame: (ox, oy) is the engine's floating origin, which everything is drawn against. */
  update(dt: number, tr: Track, s: number, ox = 0, oy = 0) {
    this.root.position.set(-ox, 0, oy);
    this.t += dt;
    grainMat.uniforms.uTime.value = this.t;
    surfaceMat.uniforms.uTime.value = this.t;
    surfaceMat.uniforms.uHalf.value = tr.def.half(Math.max(0, s));
    if (!this.bend) {
      const ks: number[] = [];
      for (let q = 0; q < (tr.def.lap ?? 12000); q += 10) ks.push(Math.abs(tr.def.curv(q)));
      ks.sort((a, b) => a - b);
      this.bend = ks[Math.floor(ks.length * 0.62)] || 1e-3;
    }
    // Chunks: build what is missing ahead (two a frame), drop what is behind.
    const from = Math.floor(Math.max(0, s - DS_CHUNK.BEHIND) / DS_CHUNK.LEN);
    const to = Math.floor((s + DS_CHUNK.AHEAD) / DS_CHUNK.LEN);
    for (const [i, c] of this.chunks)
      if (i < from || i > to) {
        this.drop(c);
        this.chunks.delete(i);
      }
    let built = 0;
    for (let i = from; i <= to && built < 2; i++) {
      if (this.chunks.has(i)) continue;
      this.chunks.set(i, this.build(tr, i * DS_CHUNK.LEN, (i + 1) * DS_CHUNK.LEN));
      built++;
    }
    for (const c of this.chunks.values())
      for (const b of c.burners) {
        const ds = b.s - s;
        if (ds < b.w0 || ds > b.w1 || (b.gate && !b.gate(this.t))) continue;
        b.acc += b.rate * dt;
        let n = 0;
        while (b.acc >= 1 && n < 24) {
          b.acc -= 1;
          n++;
          const d = norm([
            b.dir[0] + rnd(b.spread),
            b.dir[1] + rnd(b.spread),
            b.dir[2] + rnd(b.spread),
          ]);
          const sp = b.speed * (0.8 + 0.4 * Math.random());
          this.sparks.spawn(
            [b.pos[0] + rnd(0.4), b.pos[1] + rnd(0.4), b.pos[2] + rnd(0.4)],
            [d[0] * sp, d[1] * sp, d[2] * sp],
            b.life * (0.7 + 0.6 * Math.random()),
            b.pal,
            b.size,
            b.drag,
            b.buoy,
            b.grow,
          );
        }
      }
    if (this.show) this.fireworks(dt, tr, s, this.show);
    if (this.moving.dragon) dragonFly(this.sparks, tr, s, this.t);
    if (this.moving.lanterns) {
      this.lanternT -= dt;
      if (this.lanternT < 0) {
        this.lanternT = 0.25;
        skyLantern(this.sparks, tr, s);
      }
    }
    for (const sh of this.ships) {
      sh.off += sh.v * dt;
      const q = s + (((sh.off % 1100) + 1100) % 1100) - 100;
      const p = ground(tr, q, sh.u, sh.y);
      this.sparks.spawn(p, [0, 0, 0], 0.9, 5, 1.6, 0, 0, 0, sh.col);
    }
    this.stepRockets(dt);
    this.sparks.step(dt);
  }

  dispose() {
    for (const c of this.chunks.values()) this.drop(c);
    this.chunks.clear();
    this.root.parent?.remove(this.root);
    this.sparks.geo.dispose();
    this.sparks.mat.dispose();
  }

  /* ── fireworks ── */

  private fireworks(dt: number, tr: Track, s: number, id: string) {
    this.timer -= dt;
    if (this.timer > 0) return;
    if (id === 'arch') {
      this.timer = 0.32;
      this.side = -this.side;
      const q = s + 230;
      const half = tr.def.half(q);
      const d = dir(tr, q, -this.side * 0.2, 1, 0.08);
      this.rockets.push({
        p: pose(tr, q, this.side * (half + 1), 0),
        v: [d[0] * 52, d[1] * 52, d[2] * 52],
        pat: 'small',
      });
      return;
    }
    const gap =
      { chrys: 0.9, peony: 0.8, ring: 0.8, willow: 1.1, palm: 1.0, finale: 0.35 }[id] ?? 1;
    this.timer = gap * (0.7 + 0.6 * Math.random());
    const q = s + 280 + Math.random() * 240;
    const u = (Math.random() < 0.5 ? 1 : -1) * (tr.def.half(q) + 20 + Math.random() * 80);
    const pats = ['chrys', 'peony', 'ring', 'willow', 'palm'];
    this.rockets.push({
      p: ground(tr, q, u),
      v: [rnd(4), 60 + rnd(6), rnd(4)],
      pat: id === 'finale' ? pats[Math.floor(Math.random() * pats.length)] : id,
    });
  }

  private stepRockets(dt: number) {
    const sp = this.sparks;
    for (let i = this.rockets.length - 1; i >= 0; i--) {
      const r = this.rockets[i];
      r.v[1] -= 22 * dt;
      for (let a = 0; a < 3; a++) r.p[a] += r.v[a] * dt;
      sp.spawn(r.p.slice() as V3, [rnd(1), rnd(1) - 2, rnd(1)], 0.6, 3, 0.7, 1, -4, 0);
      if (r.v[1] > 4) continue;
      this.rockets.splice(i, 1);
      const p = r.p;
      const burst = (
        n: number,
        speed: number,
        life: number,
        pal: number,
        size: number,
        drag: number,
        grav: number,
        own?: V3,
      ) => {
        for (let j = 0; j < n; j++) {
          const d = sphere();
          const v = speed + rnd(speed * 0.12);
          sp.spawn(
            p.slice() as V3,
            [d[0] * v, d[1] * v, d[2] * v],
            life + rnd(0.3),
            pal,
            size,
            drag,
            grav,
            0,
            own,
          );
        }
      };
      if (r.pat === 'chrys') burst(220, 30, 2.2, 3, 1.5, 1.3, -8);
      else if (r.pat === 'peony')
        burst(200, 28, 1.9, 5, 1.8, 1.4, -7, FW[Math.floor(Math.random() * FW.length)]);
      else if (r.pat === 'willow') burst(170, 20, 4, 3, 1.4, 1.9, -5);
      else if (r.pat === 'small') burst(120, 18, 1.6, 3, 1.2, 1.4, -7);
      else if (r.pat === 'ring') {
        const n = sphere();
        let a: V3 = [n[1], -n[0], 0];
        if (Math.hypot(...a) < 0.1) a = [0, n[2], -n[1]];
        a = norm(a);
        const b: V3 = [
          n[1] * a[2] - n[2] * a[1],
          n[2] * a[0] - n[0] * a[2],
          n[0] * a[1] - n[1] * a[0],
        ];
        const own = FW[Math.floor(Math.random() * FW.length)];
        for (let j = 0; j < 130; j++) {
          const t = (j / 130) * Math.PI * 2;
          const c = Math.cos(t) * 34;
          const s = Math.sin(t) * 34;
          sp.spawn(
            p.slice() as V3,
            [a[0] * c + b[0] * s, a[1] * c + b[1] * s, a[2] * c + b[2] * s],
            1.8,
            5,
            1.8,
            1.2,
            -5,
            0,
            own,
          );
        }
      } else if (r.pat === 'palm') {
        for (let arm = 0; arm < 9; arm++) {
          const base = sphere();
          base[1] = Math.abs(base[1]) * 0.6 + 0.2;
          for (let j = 0; j < 18; j++) {
            const d = norm([base[0] + rnd(0.04), base[1] + rnd(0.04), base[2] + rnd(0.04)]);
            const v = 20 + j * 1.2;
            sp.spawn(p.slice() as V3, [d[0] * v, d[1] * v, d[2] * v], 2.4, 0, 1.8, 1.1, -9, 0);
          }
        }
      }
    }
  }

  /* ── one chunk of the chosen element ── */

  private build(tr: Track, s0: number, s1: number): Chunk {
    const k = new Kit();
    const burners: Burner[] = [];
    const group = new THREE.Group();
    for (const p of this.layers) {
      const c = CATEGORIES[p.cat];
      this.layer(k, burners, group, tr, s0, s1, c.id, c.vars[p.v].id);
    }
    kitToGroup(k, group);
    this.root.add(group);
    return { group, burners };
  }

  private layer(
    k: Kit,
    burners: Burner[],
    group: THREE.Group,
    tr: Track,
    s0: number,
    s1: number,
    cat: string,
    id: string,
  ) {
    const half = (s: number) => tr.def.half(s);
    const edges = () => {
      for (const sd of [1, -1])
        along(
          k,
          tr,
          s0,
          s1,
          4,
          (s) => sd * (half(s) + 0.6),
          () => 0.4,
          C.gold,
          0.7,
        );
    };

    if (cat === 'arches') {
      if (id === 'spiral') {
        for (const t0 of every(s0, s1, 600, 300)) {
          if (!plainSpan(tr, t0, t0 + 135)) continue;
          for (let i = 0; i * 9 <= 135; i++) {
            const s = t0 + i * 9;
            const R = half(s) + 4;
            const ch = 5;
            k.poly(
              Array.from({ length: 40 }, (_, j) => {
                const a = (Math.PI * 2 * j) / 40;
                return pose(tr, s, Math.cos(a) * R, ch + Math.sin(a) * R);
              }),
              true,
              C.red,
              0.8,
            );
            for (const off of [0, Math.PI]) {
              const a = i * 0.55 + off;
              if (ch + Math.sin(a) * R < 1) continue;
              burners.push(
                burner(
                  s,
                  pose(tr, s, Math.cos(a) * R, ch + Math.sin(a) * R),
                  dir(tr, s, -Math.cos(a), -Math.sin(a), 0),
                  { rate: 50, speed: 12, life: 0.6, pal: 1, size: 3.2 },
                ),
              );
            }
          }
        }
      } else {
        for (const s of every(s0, s1, 120, 60)) {
          if (!plainSpan(tr, s - 4, s + 4)) continue;
          const hw = half(s);
          if (id === 'ring') {
            const R = hw + 3;
            for (const [r, c, b] of [
              [R, C.gold, 1.2],
              [R + 1.5, C.deep, 0.8],
            ] as [number, V3, number][])
              k.poly(
                Array.from({ length: 49 }, (_, i) => {
                  const a = (Math.PI * i) / 48;
                  return pose(tr, s, Math.cos(a) * r, Math.sin(a) * r);
                }),
                false,
                c,
                b,
              );
            for (let i = 0; i <= 14; i++) {
              const a = (Math.PI * i) / 14;
              burners.push(
                burner(
                  s,
                  pose(tr, s, Math.cos(a) * R, Math.sin(a) * R),
                  dir(tr, s, -Math.cos(a), -Math.sin(a), 0),
                  { rate: 50, speed: 10, life: 0.6, pal: 0, size: 3.2, buoy: 4 },
                ),
              );
            }
          } else if (id === 'pillars') {
            const u = hw + 3;
            for (const sd of [-1, 1]) {
              column(k, tr, s, sd * u, 1.2, 16, C.gold, 0.9, 0);
              burners.push(
                burner(s, pose(tr, s, sd * u, 16.5), [0, 1, 0], {
                  rate: 100,
                  speed: 16,
                  life: 1.0,
                  pal: 0,
                  size: 4.5,
                  spread: 0.18,
                  buoy: 5,
                }),
              );
            }
            k.line(pose(tr, s, -u - 2, 14), pose(tr, s, u + 2, 14), C.gold, 1.2);
            k.line(pose(tr, s, -u - 2, 15), pose(tr, s, u + 2, 15), C.gold, 1.2);
            for (let uu = -hw + 2; uu <= hw - 2; uu += 4)
              burners.push(
                burner(s, pose(tr, s, uu, 15.2), [0, 1, 0], {
                  rate: 25,
                  speed: 6,
                  life: 0.5,
                  pal: 0,
                  size: 2,
                }),
              );
          } else if (id === 'gothic') {
            const R = hw + 9;
            const cu = 7;
            const top = Math.acos(-cu / R);
            for (const sd of [1, -1]) {
              const pts: [number, number][] = [];
              for (let i = 0; i <= 22; i++) {
                const a = Math.PI + (top - Math.PI) * (i / 22);
                pts.push([sd * (cu + R * Math.cos(a)), R * Math.sin(a)]);
              }
              k.poly(
                pts.map(([u, h]) => pose(tr, s, -u, h)),
                false,
                C.blue,
                1.1,
              );
              pts.forEach(([u, h], i) => {
                if (i % 2) return;
                burners.push(
                  burner(s, pose(tr, s, -u, h), dir(tr, s, -(u - sd * cu) / R, h / R, 0), {
                    rate: 45,
                    speed: 12,
                    life: 0.5,
                    pal: 2,
                    size: 2.6,
                    spread: 0.08,
                    buoy: 2,
                  }),
                );
              });
            }
          } else if (id === 'dragon') {
            const u = hw + 3;
            for (const sd of [1, -1]) {
              column(k, tr, s, sd * u, 1.4, 11, C.gold, 0.9, 0);
              k.dot(pose(tr, s, sd * (u - 1), 9), C.warm, 2, 4);
              burners.push(
                burner(s, pose(tr, s, sd * (u - 1), 9), dir(tr, s, -sd, 0.05, 0), {
                  rate: 120,
                  speed: 32,
                  life: 0.7,
                  pal: 0,
                  size: 3.4,
                  spread: 0.07,
                  buoy: 2,
                  gate: (t) => Math.sin(t * 2.4 + s * 0.03) * sd > 0,
                }),
              );
            }
            k.line(pose(tr, s, -u - 1, 11.5), pose(tr, s, u + 1, 11.5), C.gold, 1);
          } else if (id === 'sparks') {
            const u = hw + 3;
            for (const sd of [-1, 1]) column(k, tr, s, sd * u, 1, 14, C.gold, 0.9, 0);
            k.line(pose(tr, s, -u - 1, 14), pose(tr, s, u + 1, 14), C.gold, 1.3);
            for (let uu = -hw; uu <= hw; uu += 1.8)
              burners.push(
                burner(s, pose(tr, s, uu, 13.8), [0, -1, 0], {
                  rate: 22,
                  speed: 2,
                  life: 1.6,
                  pal: 3,
                  size: 0.8,
                  spread: 0.5,
                  drag: 0.3,
                  buoy: -9.8,
                  grow: 0,
                }),
              );
          }
        }
      }
      edges();
    } else if (cat === 'slide') {
      const step = { jets: 7, wave: 5, wall: 4, tongues: 8, fans: 10, geysers: 16 }[id] ?? 8;
      for (const s of every(s0, s1, step)) {
        const kk = tr.def.curv(s);
        if (Math.abs(kk) < this.bend || !plain(tr, s)) continue;
        const out = kk > 0 ? -1 : 1; // the outside of the bend
        const e = half(s) + 1;
        const at = (sd: number, h = 0.4) => pose(tr, s, sd * e, h);
        if (id === 'jets') {
          k.dot(at(out, 0.3), C.warm, 1.6, 2);
          burners.push(
            burner(s, at(out), dir(tr, s, out, 0.22, -0.15), {
              rate: 75,
              speed: 24,
              life: 0.6,
              pal: 0,
              size: 3,
              w0: -25,
              w1: 70,
              spread: 0.1,
            }),
          );
        } else if (id === 'wave') {
          for (const sd of [1, -1])
            burners.push(
              burner(s, at(sd), dir(tr, s, sd, 1, 0), {
                rate: 65,
                speed: 15,
                life: 0.55,
                pal: 0,
                size: 2.8,
                w0: -10,
                w1: 35,
              }),
            );
        } else if (id === 'wall') {
          burners.push(
            burner(s, at(out), dir(tr, s, out * 0.45, 1, 0), {
              rate: 75,
              speed: 19,
              life: 0.65,
              pal: 1,
              size: 3.3,
              w0: -35,
              w1: 100,
            }),
          );
        } else if (id === 'tongues') {
          burners.push(
            burner(s, at(out, 0.7), dir(tr, s, out, 0.08, -0.45), {
              rate: 85,
              speed: 36,
              life: 0.55,
              pal: 2,
              size: 2.6,
              spread: 0.05,
              w0: -25,
              w1: 80,
              buoy: 1,
            }),
          );
        } else if (id === 'fans') {
          for (const dt of [-0.7, 0, 0.7])
            burners.push(
              burner(s, at(out), dir(tr, s, out, 0.35, dt), {
                rate: 35,
                speed: 20,
                life: 0.55,
                pal: 3,
                size: 2.3,
                w0: -25,
                w1: 80,
              }),
            );
        } else if (id === 'geysers') {
          burners.push(
            burner(s, at(out, 0.3), [0, 1, 0], {
              rate: 85,
              speed: 38,
              life: 1.0,
              pal: 4,
              size: 4,
              spread: 0.06,
              buoy: 2,
              w0: -25,
              w1: 150,
            }),
          );
        }
      }
      edges();
    } else if (cat === 'fireworks') {
      edges();
    } else if (cat === 'surface' || cat === 'markings') {
      // On a twist the ribbon rolls with the road; at the loop and the jumps the real road shows.
      let a = s0;
      for (let s = s0; s <= s1; s += 6) {
        const ok = s < s1 && !tr.def.gap?.(s) && !tr.def.looping?.(s);
        if (!ok) {
          if (s - a >= 6) surface(tr, a, s, group);
          a = s + 6;
        }
      }
      if (s1 - a >= 6) surface(tr, a, s1, group);
    } else if (cat === 'bridges') {
      this.bridge(k, tr, id, s0, s1);
      edges();
    } else if (cat === 'tunnels') {
      this.tunnel(k, tr, id, s0, s1);
      edges();
    } else if (cat === 'city') {
      this.city(k, tr, id, s0, s1);
      edges();
    } else if (cat === 'chinatown') {
      chinatown(k, group, tr, id, s0, s1);
    } else if (cat === 'neon') {
      neon(k, group, tr, id, s0, s1);
    } else if (cat === 'gates' && (GATE_STYLES as readonly string[]).includes(id)) {
      gates(group, tr, id as GateStyle, s0, s1);
    }
  }

  private bridge(k: Kit, tr: Track, id: string, s0: number, s1: number) {
    const half = (s: number) => tr.def.half(s);
    const ok = (a: number, b: number) => plainSpan(tr, a, b);
    if (id === 'arcades') {
      for (const s of every(s0, s1, 12)) {
        if (!ok(s, s + 12)) continue;
        for (const sd of [1, -1]) {
          const u = sd * (half(s) + 3);
          column(k, tr, s, u, 1, 10, C.gold, 0.8, 0);
          along(
            k,
            tr,
            s,
            s + 12,
            1,
            () => u,
            (q) => 6 + 3.5 * Math.sin((Math.PI * (q - s)) / 12),
            C.gold,
            0.9,
          );
          along(
            k,
            tr,
            s,
            s + 12,
            12,
            () => u,
            () => 10,
            C.deep,
            0.7,
          );
        }
      }
    } else if (id === 'suspension') {
      const Ht = 60;
      for (const s of every(s0 - 260, s1, 260)) {
        if (!ok(s, s + 260)) continue;
        if (s >= s0) {
          for (const sd of [-1, 1]) column(k, tr, s, sd * (half(s) + 3), 1.5, Ht, C.gold, 0.9);
          for (const h of [Ht, Ht * 0.6])
            k.line(pose(tr, s, -half(s) - 3, h), pose(tr, s, half(s) + 3, h), C.gold, 0.9);
        }
        const a = Math.max(s, s0);
        const b = Math.min(s + 260, s1);
        if (b <= a) continue;
        const ch = (q: number) => 6 + (Ht - 6) * (2 * ((q - s) / 260) - 1) ** 2;
        for (const sd of [-1, 1]) {
          along(k, tr, a, b, 5, (q) => sd * (half(q) + 3), ch, C.gold, 1.2);
          for (const q of every(a, b, 8))
            k.line(
              pose(tr, q, sd * (half(q) + 3), ch(q)),
              pose(tr, q, sd * (half(q) + 0.5), 0),
              C.warm,
              0.5,
            );
        }
      }
    } else if (id === 'stayed') {
      const Ht = 75;
      for (const s of every(s0, s1, 240, 120)) {
        if (!ok(s - 110, s + 110)) continue;
        const hw = half(s);
        for (const sd of [-1, 1])
          k.line(ground(tr, s, sd * (hw + 12)), pose(tr, s, 0, Ht), C.gold, 1.2);
        k.line(pose(tr, s, -hw - 5, 18), pose(tr, s, hw + 5, 18), C.gold, 0.9);
        k.dot(pose(tr, s, 0, Ht + 1), C.warm, 2.5, 6);
        for (let o = 12; o <= 108; o += 8)
          for (const d of [-1, 1])
            for (const sd of [-1, 1])
              k.line(
                pose(tr, s, 0, Ht - o * 0.2),
                pose(tr, s + d * o, sd * (half(s + d * o) + 0.5), 0),
                C.warm,
                0.5,
              );
      }
    } else if (id === 'bowstring') {
      for (const s of every(s0, s1, 120)) {
        if (!ok(s, s + 120)) continue;
        const ah = (q: number) => 28 * Math.sin((Math.PI * (q - s)) / 120);
        for (const sd of [-1, 1]) {
          along(k, tr, s, s + 120, 4, (q) => sd * (half(q) + 1.5), ah, C.gold, 1.3);
          for (const q of every(s + 1, s + 120, 6))
            k.line(
              pose(tr, q, sd * (half(q) + 1.5), ah(q)),
              pose(tr, q, sd * (half(q) + 1.5), 0),
              C.warm,
              0.5,
            );
        }
        for (const q of every(s + 6, s + 114, 12))
          if (ah(q) > 16)
            k.line(
              pose(tr, q, -half(q) - 1.5, ah(q)),
              pose(tr, q, half(q) + 1.5, ah(q)),
              C.gold,
              0.8,
            );
      }
    } else if (id === 'truss') {
      for (const s of every(s0, s1, 8)) {
        if (!ok(s, s + 8)) continue;
        const i = Math.round(s / 8);
        for (const sd of [-1, 1]) {
          const u = sd * (half(s) + 1.5);
          const u2 = sd * (half(s + 8) + 1.5);
          k.line(pose(tr, s, u, 0), pose(tr, s, u, 7), C.gold, 0.7);
          k.line(pose(tr, s, u, 7), pose(tr, s + 8, u2, 7), C.gold, 1);
          k.line(pose(tr, s, u, 0), pose(tr, s + 8, u2, 0), C.gold, 0.8);
          k.line(pose(tr, s, u, i % 2 ? 0 : 7), pose(tr, s + 8, u2, i % 2 ? 7 : 0), C.gold, 0.9);
        }
        k.line(pose(tr, s, -half(s) - 1.5, 7), pose(tr, s, half(s) + 1.5, 7), C.deep, 0.6);
      }
    } else if (id === 'rings') {
      for (const s of every(s0, s1, 16)) {
        if (!ok(s - 1, s + 1)) continue;
        const i = Math.round(s / 16);
        const R = half(s) + 4;
        const ch = 4;
        k.poly(
          Array.from({ length: 48 }, (_, j) => {
            const a = (Math.PI * 2 * j) / 48;
            return pose(tr, s, Math.cos(a) * R, ch + Math.sin(a) * R);
          }),
          true,
          C.gold,
          1.1,
          s,
        );
        if (i % 2 === 0)
          k.poly(
            Array.from({ length: 48 }, (_, j) => {
              const a = (Math.PI * 2 * j) / 48;
              return pose(tr, s, Math.cos(a) * R * 1.12, ch + Math.sin(a) * R * 1.12);
            }),
            true,
            C.deep,
            0.5,
          );
        if (i % 4 === 0)
          for (const sd of [-1, 1]) column(k, tr, s, sd * R * 0.75, 1, ch - R * 0.66, C.deep, 0.6);
      }
    }
  }

  private tunnel(k: Kit, tr: Track, id: string, s0: number, s1: number) {
    const half = (s: number) => tr.def.half(s);
    // Each tunnel runs only over plain road: split the chunk where it twists, loops or jumps.
    const spans: [number, number][] = [];
    let a = s0;
    for (let s = s0; s <= s1; s += 4) {
      if (s >= s1 || !plain(tr, s)) {
        if (s - a > 8) spans.push([a, Math.min(s, s1)]);
        a = s + 4;
      }
    }
    for (const [p0, p1] of spans) {
      if (id === 'lattice') {
        for (let j = 0; j < 8; j++)
          for (const d of [1, -1]) {
            const a0 = (j / 8) * Math.PI * 2;
            along(
              k,
              tr,
              p0,
              p1,
              3,
              (s) => (half(s) + 3) * Math.cos(a0 + (d * Math.PI * 2 * s) / 50),
              (s) => 3 + (half(s) + 3) * Math.sin(a0 + (d * Math.PI * 2 * s) / 50),
              C.gold,
              0.7,
            );
          }
      } else if (id === 'rings') {
        for (const s of every(p0, p1, 6)) {
          const R = half(s) + 3;
          k.poly(
            Array.from({ length: 33 }, (_, j) => {
              const q = (Math.PI * j) / 32;
              return pose(tr, s, Math.cos(q) * R, Math.sin(q) * R);
            }),
            false,
            C.gold,
            1,
            s,
          );
        }
      } else if (id === 'gallery') {
        const prof = (s: number): [number, number][] => {
          const w = half(s) + 2;
          return [
            [-w, 0],
            [-w, 9],
            [-w * 0.4, 12],
            [w * 0.65, 12.5],
          ];
        };
        for (const s of every(p0, p1, 5))
          k.poly(
            prof(s).map(([u, h]) => pose(tr, s, u, h)),
            false,
            C.gold,
            1,
            s,
          );
        for (let i = 0; i < 4; i++)
          along(
            k,
            tr,
            p0,
            p1,
            5,
            (s) => prof(s)[i][0],
            (s) => prof(s)[i][1],
            C.deep,
            0.6,
          );
      } else if (id === 'pergola') {
        for (const s of every(p0, p1, 8)) {
          const w = half(s) + 2;
          const tall = Math.round(s / 8) % 3 === 0;
          const h = tall ? 10 * PHI : 10;
          k.line(pose(tr, s, -w, 0), pose(tr, s, -w, h), C.gold, 1);
          k.line(pose(tr, s, w, 0), pose(tr, s, w, h), C.gold, 1);
          k.line(pose(tr, s, -w, h), pose(tr, s, w, h), C.gold, 1);
          if (tall) {
            k.line(pose(tr, s, -w, h - 5), pose(tr, s, -w + 5, h), C.gold, 0.7);
            k.line(pose(tr, s, w, h - 5), pose(tr, s, w - 5, h), C.gold, 0.7);
          }
        }
        for (const sd of [-1, 1])
          along(
            k,
            tr,
            p0,
            p1,
            8,
            (s) => sd * (half(s) + 2),
            () => 10,
            C.deep,
            0.7,
          );
      } else if (id === 'hex') {
        const V = (s: number) =>
          Array.from({ length: 6 }, (_, i): [number, number] => {
            const q = (i * Math.PI) / 3 + Math.PI / 6;
            const R = half(s) + 4;
            return [Math.cos(q) * R, 5 + Math.sin(q) * R];
          });
        for (const s of every(p0, p1 - 10, 10)) {
          const A = V(s);
          const B = V(s + 10);
          const odd = Math.round(s / 10) % 2 === 1;
          k.poly(
            A.map(([u, h]) => pose(tr, s, u, h)),
            true,
            C.gold,
            1,
          );
          A.forEach(([u, h], j) => {
            k.line(pose(tr, s, u, h), pose(tr, s + 10, B[j][0], B[j][1]), C.gold, 0.6);
            const n = (j + 1) % 6;
            if (odd) k.line(pose(tr, s, u, h), pose(tr, s + 10, B[n][0], B[n][1]), C.deep, 0.5);
            else
              k.line(
                pose(tr, s, A[n][0], A[n][1]),
                pose(tr, s + 10, B[j][0], B[j][1]),
                C.deep,
                0.5,
              );
          });
        }
      } else if (id === 'spiral') {
        for (let w = 0; w < 6; w++) {
          const off = w * 0.05;
          along(
            k,
            tr,
            p0,
            p1,
            2,
            (s) => (half(s) + 3) * Math.cos(off + (Math.PI * 2 * s) / 60),
            (s) => 3 + (half(s) + 3) * Math.sin(off + (Math.PI * 2 * s) / 60),
            C.gold,
            1.1,
            true,
          );
        }
      }
    }
  }

  private city(k: Kit, tr: Track, id: string, s0: number, s1: number) {
    const half = (s: number) => tr.def.half(s);
    const at = (s: number, u: number) => {
      const p = pointAt(tr, s, u);
      return { x: p.x, z: -p.y, ok: (r: number) => clearOfRoad(tr, s, p.x, p.y, r) };
    };
    if (id === 'plan') {
      for (const s of every(s0, s1, 1500, 700)) {
        const sd = Math.round(s / 1500) % 2 ? 1 : -1;
        const c = at(s, sd * (half(s) + 240));
        if (!c.ok(200)) continue;
        const rings: [number, number, number][] = [
          [24, 42, 1.2 * PHI ** 5 * 2.5],
          [50, 80, 1.2 * PHI ** 4 * 2.5],
          [90, 140, 1.2 * PHI ** 2 * 2.5],
        ];
        for (const r of [20, 46, 85, 146]) k.poly(ringXZ(c.x, 0.4, c.z, r, 96), true, C.canal, 0.8);
        for (let b = 0; b < 12; b++) {
          const a = (b / 12) * Math.PI * 2;
          k.line(
            [c.x + Math.cos(a) * 14, 0.4, c.z + Math.sin(a) * 14],
            [c.x + Math.cos(a) * 152, 0.4, c.z + Math.sin(a) * 152],
            C.warm,
            0.8,
          );
        }
        rings.forEach(([r0, r1, h], ri) => {
          for (let b = 0; b < 12; b++) {
            const a0 = (b / 12) * Math.PI * 2 + 0.06;
            const a1 = ((b + 1) / 12) * Math.PI * 2 - 0.06;
            const lo: V3[] = [];
            for (let i = 0; i <= 6; i++) {
              const a = a0 + ((a1 - a0) * i) / 6;
              lo.push([c.x + Math.cos(a) * r0, 0, c.z + Math.sin(a) * r0]);
            }
            for (let i = 6; i >= 0; i--) {
              const a = a0 + ((a1 - a0) * i) / 6;
              lo.push([c.x + Math.cos(a) * r1, 0, c.z + Math.sin(a) * r1]);
            }
            const hi = lo.map((p): V3 => [p[0], h, p[2]]);
            k.poly(hi, true, C.gold, 1);
            k.poly(lo, true, C.gold, 0.4);
            for (let i = 0; i < lo.length; i++) {
              k.quad(lo[i], lo[(i + 1) % lo.length], hi[(i + 1) % lo.length], hi[i]);
              if (i % 3 === 0) k.line(lo[i], hi[i], C.gold, 0.7);
            }
            if (ri === 0) {
              const a = (a0 + a1) / 2;
              const rr = (r0 + r1) / 2;
              box(
                k,
                c.x + Math.cos(a) * rr,
                c.z + Math.sin(a) * rr,
                h,
                3.5,
                3.5,
                1.2 * PHI ** 6 * 2.5 - h,
                a,
                6,
                C.gold,
                1.1,
              );
            }
          }
        });
        const R = 12;
        const cy = 34;
        for (let m = 0; m < 12; m++) {
          const rot = (m / 12) * Math.PI;
          k.poly(
            Array.from({ length: 32 }, (_, i): V3 => {
              const a = (i / 32) * Math.PI * 2;
              return [
                c.x + Math.cos(a) * R * Math.cos(rot),
                cy + Math.sin(a) * R,
                c.z + Math.cos(a) * R * Math.sin(rot),
              ];
            }),
            true,
            C.warm,
            1.2,
          );
        }
        for (const y of [-R / PHI, -R / PHI ** 2, 0, R / PHI ** 2, R / PHI])
          k.poly(ringXZ(c.x, cy + y, c.z, Math.sqrt(R * R - y * y), 32), true, C.warm, 1);
        k.dot([c.x, cy, c.z], C.warm, 3, 10);
      }
    } else if (id === 'temples') {
      for (const s of every(s0, s1, 260, 130)) {
        const i = Math.round(s / 260);
        const sd = i % 2 ? 1 : -1;
        const c = at(s, sd * (half(s) + 110 + (i % 3) * 50));
        if (!c.ok(70)) continue;
        const kind = i % 3;
        const rot = frameAt(tr, s).h;
        if (kind === 0) {
          let hw = 30;
          let y = 0;
          for (let t = 0; t < 4; t++) {
            const h = hw / PHI ** 2;
            box(k, c.x, c.z, y, hw, hw, h, rot);
            y += h;
            hw /= PHI;
          }
          box(k, c.x, c.z, y, hw, hw, hw, rot + Math.PI / 4);
          k.dot([c.x, y + hw + 2, c.z], C.warm, 2.5, 6);
        } else if (kind === 1) {
          const hw = 34;
          const h = hw * Math.sqrt(PHI);
          const base = [
            [-hw, -hw],
            [hw, -hw],
            [hw, hw],
            [-hw, hw],
          ].map(
            ([u, v]): V3 => [
              c.x + u * Math.cos(rot) - v * Math.sin(rot),
              0,
              c.z + u * Math.sin(rot) + v * Math.cos(rot),
            ],
          );
          const apex: V3 = [c.x, h, c.z];
          k.poly(base, true, C.gold, 0.8);
          base.forEach((b, j) => {
            k.line(b, apex, C.gold, 1.1);
            k.tri(b, base[(j + 1) % 4], apex);
          });
          for (let q = 1; q < 9; q++) {
            const f = q / 9;
            k.poly(
              base.map(
                (b): V3 => [b[0] + (apex[0] - b[0]) * f, h * f, b[2] + (apex[2] - b[2]) * f],
              ),
              true,
              C.deep,
              0.5,
            );
          }
          k.dot([c.x, h + 2, c.z], C.warm, 3, 8);
        } else {
          const R = 20;
          for (let q = 0; q < 12; q++) {
            const a = (q / 12) * Math.PI * 2;
            k.line(
              [c.x + Math.cos(a) * R, 0, c.z + Math.sin(a) * R],
              [c.x + Math.cos(a) * R, R, c.z + Math.sin(a) * R],
              C.gold,
              1,
            );
            k.poly(
              Array.from({ length: 13 }, (_, j): V3 => {
                const t = (j / 12) * (Math.PI / 2);
                return [
                  c.x + Math.cos(a) * R * Math.cos(t),
                  R + R * Math.sin(t),
                  c.z + Math.sin(a) * R * Math.cos(t),
                ];
              }),
              false,
              C.gold,
              0.9,
            );
          }
          for (const y of [0, R, R + 1.6]) k.poly(ringXZ(c.x, y, c.z, R, 36), true, C.gold, 0.9);
          k.dot([c.x, R * 0.6, c.z], C.warm, 2.5, 8);
        }
      }
    } else if (id === 'domes') {
      for (const s of every(s0, s1, 220, 60)) {
        const i = Math.round(s / 220);
        const sd = i % 2 ? 1 : -1;
        const c = at(s, sd * (half(s) + 90 + (i % 3) * 45));
        if (!c.ok(60)) continue;
        if (i % 2) dome(k, c.x, c.z, 28 + (i % 4) * 8, 2);
        else
          for (let b = 0; b < 5; b++)
            dome(
              k,
              c.x + Math.cos(b * 2.4) * 22 * Math.sqrt(b),
              c.z + Math.sin(b * 2.4) * 22 * Math.sqrt(b),
              16 / Math.sqrt(b + 1) + 6,
              1,
            );
      }
    } else if (id === 'skyline') {
      for (const s of every(s0, s1, 40)) {
        const rot = frameAt(tr, s).h;
        for (const sd of [-1, 1])
          for (let j = 0; j < 5; j++) {
            const off = half(s) + 45 + j * 42;
            const c = at(s, sd * off);
            if (!c.ok(30)) continue;
            const hgt =
              30 +
              130 * Math.exp(-(((j - 1.5) / 1.6) ** 2)) * (0.6 + 0.4 * Math.sin(s * 0.004)) +
              Math.random() * 20;
            const w = 8 + Math.random() * 5;
            box(k, c.x, c.z, 0, w, w, hgt, -rot, 6, C.gold, 0.9);
            k.dot([c.x, hgt + 3, c.z], C.red, 2, 4);
          }
      }
    } else if (id === 'solar') {
      for (const s of every(s0, s1, 1200, 500)) {
        const sd = Math.round(s / 1200) % 2 ? 1 : -1;
        const c = at(s, sd * (half(s) + 200));
        if (!c.ok(150)) continue;
        box(k, c.x, c.z, 0, 5, 5, 150, 0, 15, C.gold, 1);
        for (let i = 0; i < 40; i++) {
          const d = sphere();
          k.dot([c.x + d[0] * 7, 158 + d[1] * 7, c.z + d[2] * 7], C.warm, 3, 4);
        }
        for (let r = 0; r < 6; r++) {
          const R = 40 * Math.sqrt(PHI) ** r;
          const n = Math.floor((Math.PI * 2 * R) / 7);
          for (let m = 0; m < n; m++) {
            const a = (m / n) * Math.PI * 2;
            const x = c.x + Math.cos(a) * R;
            const z = c.z + Math.sin(a) * R;
            const tx = -Math.sin(a) * 1.6;
            const tz = Math.cos(a) * 1.6;
            const ln = 1.2;
            const q: V3[] = [
              [x - tx - Math.cos(a) * ln, 0.6, z - tz - Math.sin(a) * ln],
              [x + tx - Math.cos(a) * ln, 0.6, z + tz - Math.sin(a) * ln],
              [x + tx + Math.cos(a) * ln, 2.4, z + tz + Math.sin(a) * ln],
              [x - tx + Math.cos(a) * ln, 2.4, z - tz + Math.sin(a) * ln],
            ];
            k.poly(q, true, C.warm, 0.8);
            if (m % 5 === 0) k.line([x, 2, z], [c.x, 158, c.z], C.gold, 0.18);
          }
        }
      }
    } else if (id === 'lanes') {
      for (const s of every(s0, s1, 50)) {
        const rot = frameAt(tr, s).h;
        for (const sd of [-1, 1]) {
          const c = at(s, sd * (half(s) + 60 + (Math.round(s / 50) % 3) * 50));
          if (!c.ok(30)) continue;
          box(k, c.x, c.z, 0, 7, 7, 60 + (Math.round(s / 50) % 4) * 25, -rot, 8, C.gold, 0.8);
        }
      }
    }
  }
}
