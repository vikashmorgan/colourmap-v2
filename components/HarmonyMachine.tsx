'use client';

/**
 * Harmony Machine: one ringed planet that plays itself.
 * Swipe across a ring to spin it; each light sings as it passes the golden needle.
 * Swipe the gradient (or empty space) to move the sound from dusk to dawn.
 * Left alone for a few seconds, the autopilot flies it. See docs/specs/harmony-machine.md.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { HarmonyAudio } from '@/lib/harmony-audio';
import {
  crossed,
  melodyPool,
  paletteBlend,
  progressionFor,
  ringNote,
  TAU,
} from '@/lib/harmony-machine';

const RING_DEFS = [
  { inner: 1.62, outer: 1.86, lights: 5, base: 0.34, octave: 12, tint: 2 },
  { inner: 1.95, outer: 2.32, lights: 7, base: -0.21, octave: 0, tint: 1 },
  { inner: 2.4, outer: 2.52, lights: 3, base: 0.13, octave: 0, tint: 2 },
  { inner: 2.62, outer: 3.1, lights: 6, base: 0.09, octave: -12, tint: 0 },
] as const;

const PALETTES = [
  ['#3a1d5c', '#b0537a', '#f0a46a'],
  ['#5a3b12', '#e8c27a', '#5fb3a6'],
  ['#2f4f7a', '#f2b8a0', '#dff0ff'],
].map((p) => p.map((c) => new THREE.Color(c)));

const IDLE_SECONDS = 6;

type Controls = { mood: number; colour: number; autopilot: boolean; lastInput: number };

function grooveTexture(seed: number) {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 4;
  const x = c.getContext('2d');
  let r = seed;
  const rnd = () => {
    r = (r * 9301 + 49297) % 233280;
    return r / 233280;
  };
  for (let i = 0; i < 512 && x; i++) {
    const a = 0.25 + 0.55 * rnd() * (0.6 + 0.4 * Math.sin(i * 0.05));
    const edge = Math.min(1, Math.min(i, 511 - i) / 10);
    x.fillStyle = `rgba(255,255,255,${(a * edge).toFixed(3)})`;
    x.fillRect(i, 0, 1, 4);
  }
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

function glowTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const x = c.getContext('2d');
  if (x) {
    const g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.25, 'rgba(255,240,200,.6)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    x.fillStyle = g;
    x.fillRect(0, 0, 64, 64);
  }
  return new THREE.CanvasTexture(c);
}

const PLANET_VERT = `varying vec3 vN; varying vec3 vP; varying vec2 vUv;
void main(){ vUv=uv; vN=normalize(normalMatrix*normal); vP=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }`;
const PLANET_FRAG = `uniform float uT; uniform vec3 uA,uB,uC,uSun; varying vec3 vN; varying vec3 vP; varying vec2 vUv;
float h(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y);}
void main(){
  float y=vP.y*1.6; float w=n(vec2(vUv.x*8.+uT*.05,y*3.))*.6+n(vec2(vUv.x*22.,y*9.-uT*.03))*.25;
  float b=sin(y*7.+w*3.)*.5+.5; float b2=sin(y*19.+w*5.)*.5+.5;
  vec3 col=mix(uA,uB,b); col=mix(col,uC,smoothstep(.75,1.,b2)*.55);
  float lit=clamp(dot(vN,uSun),0.,1.); col*=.18+.95*lit;
  float rim=pow(1.-max(dot(vN,vec3(0,0,1)),0.),3.); col+=uC*rim*.55;
  gl_FragColor=vec4(col,1.);
}`;
const HALO_VERT = `varying vec3 vN; void main(){vN=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const HALO_FRAG = `uniform vec3 uC; varying vec3 vN; void main(){float i=pow(.72-dot(vN,vec3(0,0,1)),3.);gl_FragColor=vec4(uC*i,i);}`;

export default function HarmonyMachine() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const readoutRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const controls = useRef<Controls>({ mood: 0, colour: 0.45, autopilot: true, lastInput: -1e9 });
  const audioRef = useRef<HarmonyAudio | null>(null);
  const startAudioRef = useRef<() => void>(() => {});
  const [started, setStarted] = useState(false);
  const [mood, setMood] = useState<0 | 1>(0);
  const [autopilot, setAutopilot] = useState(true);
  const [noGl, setNoGl] = useState(false);

  const touch = useCallback(() => {
    controls.current.lastInput = performance.now();
  }, []);
  const setColour = useCallback((c: number) => {
    controls.current.colour = Math.max(0, Math.min(1, c));
    if (knobRef.current) knobRef.current.style.left = `${controls.current.colour * 100}%`;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    } catch {
      setNoGl(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 200);
    let dist = 10;
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      dist = w / h < 0.8 ? 15 : 10;
    };
    const ro = new ResizeObserver(resize);
    ro.observe(canvas);
    resize();

    // stars
    const starGeo = new THREE.BufferGeometry();
    const sp = new Float32Array(1800 * 3);
    for (let i = 0; i < 1800; i++) {
      const v = new THREE.Vector3().randomDirection().multiplyScalar(40 + Math.random() * 60);
      sp.set([v.x, v.y, v.z], i * 3);
    }
    starGeo.setAttribute('position', new THREE.BufferAttribute(sp, 3));
    scene.add(
      new THREE.Points(
        starGeo,
        new THREE.PointsMaterial({ color: 0xcfc6b0, size: 0.18, transparent: true, opacity: 0.8 }),
      ),
    );

    // planet and halo
    const planetMat = new THREE.ShaderMaterial({
      uniforms: {
        uT: { value: 0 },
        uA: { value: new THREE.Color() },
        uB: { value: new THREE.Color() },
        uC: { value: new THREE.Color() },
        uSun: { value: new THREE.Vector3(-0.6, 0.5, 0.7).normalize() },
      },
      vertexShader: PLANET_VERT,
      fragmentShader: PLANET_FRAG,
    });
    const system = new THREE.Group();
    system.rotation.set(0.32, 0, 0.18);
    scene.add(system);
    const planet = new THREE.Mesh(new THREE.SphereGeometry(1.25, 96, 64), planetMat);
    system.add(planet);
    const haloMat = new THREE.ShaderMaterial({
      uniforms: { uC: { value: new THREE.Color() } },
      vertexShader: HALO_VERT,
      fragmentShader: HALO_FRAG,
      transparent: true,
      depthWrite: false,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
    });
    system.add(new THREE.Mesh(new THREE.SphereGeometry(1.42, 48, 32), haloMat));

    // rings lie in a plane tilted so its local -Y faces the viewer (the needle side)
    const ringPlane = new THREE.Group();
    ringPlane.rotation.x = -1.2;
    system.add(ringPlane);
    const glow = glowTexture();
    const rings = RING_DEFS.map((d, k) => {
      const geo = new THREE.RingGeometry(d.inner, d.outer, 160, 1);
      const pos = geo.attributes.position;
      const uv = geo.attributes.uv;
      for (let i = 0; i < pos.count; i++) {
        const r = Math.hypot(pos.getX(i), pos.getY(i));
        uv.setXY(i, (r - d.inner) / (d.outer - d.inner), 0.5);
      }
      const mat = new THREE.MeshBasicMaterial({
        map: grooveTexture(17 + k * 31),
        transparent: true,
        opacity: 0.62,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(geo, mat);
      ringPlane.add(mesh);
      const radius = (d.inner + d.outer) / 2;
      const lights = Array.from({ length: d.lights }, (_, j) => {
        const a = (j / d.lights) * TAU + k * 0.7;
        const sprite = new THREE.Sprite(
          new THREE.SpriteMaterial({
            map: glow,
            color: 0xffe2a8,
            transparent: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending,
          }),
        );
        sprite.position.set(Math.cos(a) * radius, Math.sin(a) * radius, 0.01);
        sprite.scale.setScalar(0.22);
        mesh.add(sprite);
        return { a, sprite, pulse: 0, index: j };
      });
      return {
        ...d,
        idx: k,
        mesh,
        mat,
        lights,
        theta: 0,
        vel: d.base as number,
        glow: 0,
        lastNote: 0,
      };
    });

    // the golden needle, fixed
    const needle = new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -1.5, 0.02),
        new THREE.Vector3(0, -3.0, 0.02),
      ]),
      new THREE.LineBasicMaterial({ color: 0xe8c27a, transparent: true, opacity: 0.9 }),
    );
    ringPlane.add(needle);
    const tip = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: glow,
        color: 0xe8c27a,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      }),
    );
    tip.position.set(0, -3.05, 0.02);
    tip.scale.setScalar(0.35);
    ringPlane.add(tip);

    // music state
    const music = {
      chordIdx: -1,
      chordName: '',
      pool: [] as number[],
      nextChordAt: 0,
      goal: 0.45,
      goalAt: 0,
      mood: 0,
    };
    const nextChord = () => {
      const audio = audioRef.current;
      if (!audio) return;
      const prog = progressionFor(controls.current.colour);
      music.chordIdx = (music.chordIdx + 1) % prog.chords.length;
      const chord = prog.chords[music.chordIdx];
      music.chordName = chord.name;
      music.pool = melodyPool(chord.notes);
      audio.chord(chord.notes);
      music.nextChordAt = audio.now + (music.mood > 0.5 ? 11 : 9);
    };
    startAudioRef.current = () => {
      if (audioRef.current) return;
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      audioRef.current = new HarmonyAudio(new Ctx());
      nextChord();
    };

    // input: swipe a ring to spin it, swipe space to change colour and tilt
    const ray = new THREE.Raycaster();
    const ndc = new THREE.Vector2();
    let drag: { ring: (typeof rings)[number] | null; x: number; y: number; t: number } | null =
      null;
    const pick = (x: number, y: number) => {
      const r = canvas.getBoundingClientRect();
      ndc.set(((x - r.left) / r.width) * 2 - 1, -((y - r.top) / r.height) * 2 + 1);
      ray.setFromCamera(ndc, camera);
      const hit = ray.intersectObjects(
        rings.map((g) => g.mesh),
        false,
      )[0];
      return hit ? (rings.find((g) => g.mesh === hit.object) ?? null) : null;
    };
    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture(e.pointerId);
      drag = { ring: pick(e.clientX, e.clientY), x: e.clientX, y: e.clientY, t: performance.now() };
      touch();
    };
    const onMove = (e: PointerEvent) => {
      if (!drag) return;
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      const dx = e.clientX - drag.x;
      const dt = Math.max(8, performance.now() - drag.t) / 1000;
      if (drag.ring) {
        const target = Math.max(-4, Math.min(4, ((dx / w) * 3) / dt));
        drag.ring.vel = drag.ring.vel * 0.6 + target * 0.4;
        drag.ring.glow = Math.max(drag.ring.glow, 0.6);
      } else {
        setColour(controls.current.colour + (dx / w) * 0.6);
        system.rotation.x = Math.max(
          0.05,
          Math.min(0.7, system.rotation.x + ((e.clientY - drag.y) / h) * 0.8),
        );
      }
      drag.x = e.clientX;
      drag.y = e.clientY;
      drag.t = performance.now();
      touch();
    };
    const onUp = () => {
      drag = null;
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onUp);

    const white = new THREE.Color(1, 1, 1);
    const pal = [new THREE.Color(), new THREE.Color(), new THREE.Color()];
    const clock = new THREE.Clock();
    let frame = 0;
    let raf = 0;
    const tick = () => {
      const dt = Math.min(clock.getDelta(), 0.05);
      const t = clock.elapsedTime;
      const c = controls.current;
      const idle = (performance.now() - c.lastInput) / 1000;
      const piloting = c.autopilot && idle > IDLE_SECONDS;
      const audio = audioRef.current;

      if (piloting) {
        if (t > music.goalAt) {
          music.goal = 0.1 + Math.random() * 0.8;
          music.goalAt = t + 25 + Math.random() * 20;
        }
        setColour(c.colour + (music.goal - c.colour) * dt * 0.05);
        system.rotation.x += (0.32 + Math.sin(t * 0.05) * 0.12 - system.rotation.x) * dt * 0.2;
      }
      music.mood += (c.mood - music.mood) * dt * 0.4;

      for (const r of rings) {
        const home = r.base * (piloting ? 1 + 0.35 * Math.sin(t * 0.07 + r.idx * 1.7) : 1);
        if (drag?.ring !== r) r.vel += (home - r.vel) * dt * 0.35;
        const prev = r.theta;
        r.theta += r.vel * dt;
        r.mesh.rotation.z = r.theta;
        for (const l of r.lights) {
          if (audio && crossed(prev + l.a, r.theta + l.a) && audio.now - r.lastNote > 0.07) {
            r.lastNote = audio.now;
            const m = ringNote(music.pool, l.index, r.idx, music.chordIdx, r.octave);
            if (m !== null) {
              const speed = Math.min(1, Math.abs(r.vel) / 1.2);
              audio.note(m, 0.07 + 0.06 * (1 - speed), Math.sin(r.theta + l.a) * 0.7);
            }
            l.pulse = 1;
            r.glow = 1;
          }
          l.pulse *= Math.exp(-dt * 2.2);
          l.sprite.scale.setScalar(0.22 + l.pulse * 0.5);
        }
        r.glow *= Math.exp(-dt * 1.2);
        r.mat.opacity = 0.5 + r.glow * 0.4;
      }

      const { index, t: blend } = paletteBlend(c.colour);
      for (let k = 0; k < 3; k++)
        pal[k].copy(PALETTES[index][k]).lerp(PALETTES[index + 1][k], blend);
      planetMat.uniforms.uA.value.copy(pal[0]);
      planetMat.uniforms.uB.value.copy(pal[1]);
      planetMat.uniforms.uC.value.copy(pal[2]);
      haloMat.uniforms.uC.value.copy(pal[2]);
      for (const r of rings) r.mat.color.copy(pal[r.tint]).lerp(white, 0.35);
      planetMat.uniforms.uT.value = t;
      planet.rotation.y = t * 0.04;

      const ang = Math.sin(t * 0.03) * 0.25;
      camera.position.set(Math.sin(ang) * dist, 0.4, Math.cos(ang) * dist);
      camera.lookAt(0, -0.55, 0);

      if (audio) {
        audio.update(music.mood, c.colour);
        if (audio.now > music.nextChordAt) nextChord();
        if (music.mood < 0.7 && Math.random() < dt * 0.22 * (1 - music.mood)) audio.chirp();
      }

      if (frame++ % 10 === 0 && readoutRef.current) {
        const spin = rings.reduce((s, r) => s + Math.abs(r.vel), 0) / rings.length;
        readoutRef.current.innerText = [
          `MOOD  ${music.mood < 0.5 ? 'CHILL' : 'PIANO'}`,
          `COLOUR  ${progressionFor(c.colour).name.toUpperCase()}`,
          `CHORD  ${music.chordName || '·'}`,
          `SPIN  ${spin.toFixed(2)}`,
          `PILOT  ${!c.autopilot ? 'OFF' : piloting ? 'FLYING' : 'YOU'}`,
        ].join('\n');
      }
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onUp);
      renderer.dispose();
      audioRef.current?.close();
      audioRef.current = null;
    };
  }, [touch, setColour]);

  const stripDrag = useRef(false);
  const stripAt = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setColour((e.clientX - r.left) / r.width);
    touch();
  };

  const gold = '#e8c27a';
  const pill = (on: boolean): React.CSSProperties => ({
    fontFamily: 'var(--font-serif)',
    fontSize: 15,
    letterSpacing: '0.05em',
    color: on ? gold : '#efe6d2',
    background: on ? 'rgba(232,194,122,.1)' : 'rgba(10,11,22,.55)',
    border: `1px solid ${on ? gold : 'rgba(232,194,122,.28)'}`,
    borderRadius: 999,
    padding: '9px 18px',
    cursor: 'pointer',
  });

  return (
    <main
      data-testid="harmony-machine"
      style={{
        position: 'relative',
        height: 'calc(100svh - 64px)',
        minHeight: 520,
        background: '#04050b',
        color: '#efe6d2',
        overflow: 'hidden',
        fontFamily: 'var(--font-serif)',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          inset: 0,
          width: '100%',
          height: '100%',
          touchAction: 'none',
          cursor: 'grab',
        }}
      />
      <div style={{ position: 'absolute', top: 18, left: 16, pointerEvents: 'none' }}>
        <h1 style={{ fontSize: 28, fontWeight: 600, color: gold, lineHeight: 1.2 }}>
          Harmony Machine
        </h1>
        <p style={{ fontStyle: 'italic', fontSize: 16, color: '#9a917e' }}>
          one planet, first sketch
        </p>
      </div>
      <div
        ref={readoutRef}
        style={{
          position: 'absolute',
          top: 18,
          right: 16,
          fontSize: 13,
          lineHeight: 1.7,
          textAlign: 'right',
          color: '#cfc6b0',
          letterSpacing: '0.06em',
          whiteSpace: 'pre',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: '50%',
          bottom: 18,
          transform: 'translateX(-50%)',
          width: 'min(560px, calc(100% - 32px))',
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
        }}
      >
        <div
          role="slider"
          aria-label="Colour of the sound, dusk to dawn"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(controls.current.colour * 100)}
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') setColour(controls.current.colour - 0.05);
            if (e.key === 'ArrowRight') setColour(controls.current.colour + 0.05);
            touch();
          }}
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture(e.pointerId);
            stripDrag.current = true;
            stripAt(e);
          }}
          onPointerMove={(e) => stripDrag.current && stripAt(e)}
          onPointerUp={() => {
            stripDrag.current = false;
          }}
          style={{
            position: 'relative',
            height: 44,
            borderRadius: 22,
            border: '1px solid rgba(232,194,122,.28)',
            overflow: 'hidden',
            touchAction: 'none',
            cursor: 'ew-resize',
            background:
              'repeating-linear-gradient(90deg,rgba(255,255,255,.14) 0 1px,transparent 1px 14px), linear-gradient(90deg,#2a1747,#7a3a6a,#c98a52,#e8c27a,#9fd6c8,#cfe7ff)',
          }}
        >
          <span
            style={{
              position: 'absolute',
              left: 14,
              top: 12,
              fontSize: 13,
              letterSpacing: '0.1em',
              textShadow: '0 0 6px #000',
            }}
          >
            DUSK
          </span>
          <span
            style={{
              position: 'absolute',
              right: 14,
              top: 12,
              fontSize: 13,
              letterSpacing: '0.1em',
              textShadow: '0 0 6px #000',
            }}
          >
            DAWN
          </span>
          <div
            ref={knobRef}
            style={{
              position: 'absolute',
              top: 4,
              bottom: 4,
              left: '45%',
              width: 4,
              borderRadius: 2,
              background: '#fff',
              boxShadow: '0 0 14px #fff',
              transform: 'translateX(-2px)',
            }}
          />
        </div>
        <div style={{ display: 'flex', gap: 8, justifyContent: 'center', flexWrap: 'wrap' }}>
          <button
            type="button"
            aria-pressed={mood === 0}
            style={pill(mood === 0)}
            onClick={() => {
              controls.current.mood = 0;
              setMood(0);
            }}
          >
            Chill
          </button>
          <button
            type="button"
            aria-pressed={mood === 1}
            style={pill(mood === 1)}
            onClick={() => {
              controls.current.mood = 1;
              setMood(1);
            }}
          >
            Piano
          </button>
          <button
            type="button"
            aria-pressed={autopilot}
            style={pill(autopilot)}
            onClick={() => {
              controls.current.autopilot = !autopilot;
              setAutopilot(!autopilot);
            }}
          >
            Autopilot
          </button>
        </div>
      </div>
      {!started && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 16,
            background: 'radial-gradient(ellipse at center, rgba(4,5,11,.55), rgba(4,5,11,.92))',
          }}
        >
          <div style={{ maxWidth: 420, textAlign: 'center' }}>
            <h2 style={{ fontSize: 40, fontWeight: 500, color: gold, marginBottom: 10 }}>
              Harmony Machine
            </h2>
            <p style={{ fontSize: 19, lineHeight: 1.45, marginBottom: 8 }}>
              The rings are records. Each light that passes the golden needle sings.
            </p>
            <p style={{ fontSize: 19, lineHeight: 1.45 }}>
              {noGl
                ? 'This device cannot draw the planet (WebGL is off), but the sound still plays.'
                : 'Swipe across a ring to spin it. Swipe the gradient to change the colour of the sound. Leave it alone and it plays itself.'}
            </p>
            <button
              type="button"
              style={{ ...pill(true), marginTop: 18, fontSize: 17, padding: '12px 30px' }}
              onClick={() => {
                startAudioRef.current();
                setStarted(true);
              }}
            >
              Begin
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
