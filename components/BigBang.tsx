'use client';

/*
 * The Big Bang: one continuous trip of light. Brought into Colour Brain's Art
 * from the standalone Geometry Builder (app/big-bang there), as its third tab. The math lives in lib/bigbang.ts;
 * this draws it. One cloud of particles, a perspective camera so the tunnel has
 * real depth, and the same bloom the Builder uses. The step bar always says
 * where in the trip you are; tapping a step jumps there.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {
  look,
  makeParticles,
  PHASE_START,
  PHASES,
  particleAt,
  phaseAt,
  smooth,
  TOTAL,
} from '@/lib/bigbang';

/* One representative colour per step, for the step bar. */
const STEP_COLOURS = [
  '#ffd9a0',
  '#9fb6ff',
  '#ffc35a',
  '#fff1b8',
  '#d9a85c',
  '#e0b070',
  '#e8b860',
  '#7fd6ff',
  '#f2c15a',
  '#ff9fb0',
  '#c99a55',
  '#c6a5ff',
  '#6fe0b4',
  '#d8e070',
  '#5fa8ff',
  '#9ec4ff',
];

function circleTexture(): THREE.Texture {
  const sz = 64;
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = sz;
  const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
  const g = ctx.createRadialGradient(sz / 2, sz / 2, 0, sz / 2, sz / 2, sz / 2);
  g.addColorStop(0, 'rgba(255,255,255,1)');
  g.addColorStop(0.45, 'rgba(255,255,255,0.8)');
  g.addColorStop(0.8, 'rgba(255,255,255,0.2)');
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, sz, sz);
  return new THREE.CanvasTexture(canvas);
}

const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

export default function BigBang() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const timeRef = useRef(0);
  const playingRef = useRef(true);
  const speedRef = useRef(1);
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [hud, setHud] = useState({ index: 0, u: 0, time: 0 });
  const [chrome, setChrome] = useState(true);
  const idleRef = useRef(0);

  const jumpTo = useCallback((k: number) => {
    const n = PHASES.length;
    timeRef.current = PHASE_START[((k % n) + n) % n] + 0.01;
  }, []);
  const togglePlay = useCallback(() => {
    playingRef.current = !playingRef.current;
    setPlaying(playingRef.current);
  }, []);
  const changeSpeed = useCallback((s: number) => {
    speedRef.current = s;
    setSpeed(s);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const small = window.innerWidth < 700;
    const N = small ? 5200 : 9000;

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#040207');
    const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 900);
    camera.position.set(0, 0, 58);

    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloom = new UnrealBloomPass(new THREE.Vector2(256, 256), 1.2, 0.6, 0.05);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());

    const particles = makeParticles(N);
    const positions = new Float32Array(N * 3);
    const colours = new Float32Array(N * 3);
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colours, 3));
    const texture = circleTexture();
    const material = new THREE.PointsMaterial({
      size: 0.42,
      sizeAttenuation: true,
      map: texture,
      vertexColors: true,
      transparent: true,
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const points = new THREE.Points(geometry, material);
    points.frustumCulled = false;
    scene.add(points);

    const resize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      renderer.setSize(w, h, false);
      composer.setSize(w, h);
      camera.aspect = w / h;
      // keep the whole picture in view on a tall phone screen
      camera.position.z = w / h < 0.8 ? 58 / Math.max(0.55, w / h / 0.8) : 58;
      camera.updateProjectionMatrix();
    };
    resize();
    window.addEventListener('resize', resize);

    let raf = 0;
    let last = performance.now();
    let lastHud = 0;
    const frame = (now: number) => {
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (playingRef.current) timeRef.current = (timeRef.current + dt * speedRef.current) % TOTAL;
      const t = timeRef.current;

      for (let i = 0; i < N; i++) {
        const { pos, rgb } = particleAt(particles[i], t);
        positions[i * 3] = pos[0];
        positions[i * 3 + 1] = pos[1];
        positions[i * 3 + 2] = pos[2];
        // depth: fade far away, and just before passing the eye in the tunnel
        const z = pos[2];
        // long, smooth fades: light comes out of the far dark and dissolves as it nears the eye
        const fade = smooth((z + 340) / 230) * smooth((56 - z) / 30);
        colours[i * 3] = rgb[0] * fade;
        colours[i * 3 + 1] = rgb[1] * fade;
        colours[i * 3 + 2] = rgb[2] * fade;
      }
      geometry.attributes.position.needsUpdate = true;
      geometry.attributes.color.needsUpdate = true;

      const lk = look(t);
      bloom.strength = lk.glow * 0.78; // a quarter less glow overall: the grains read as grains
      material.size = 0.42 * lk.size;
      // a slow sway of the eye, so depth reads even when nothing else moves
      camera.position.x = Math.sin(t * 0.05) * 3;
      camera.position.y = Math.cos(t * 0.037) * 2;
      camera.lookAt(0, 0, 0);
      composer.render();

      if (now - lastHud > 200) {
        lastHud = now;
        const { index, u } = phaseAt(t);
        setHud({ index, u, time: t });
        if (playingRef.current && now - idleRef.current > 4500) setChrome(false);
      }
      raf = requestAnimationFrame(frame);
    };
    idleRef.current = performance.now();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      geometry.dispose();
      material.dispose();
      texture.dispose();
      composer.dispose();
      renderer.dispose();
    };
  }, []);

  // show the controls again on any movement; keys for the projection
  useEffect(() => {
    const wake = () => {
      idleRef.current = performance.now();
      setChrome(true);
    };
    const key = (e: KeyboardEvent) => {
      wake();
      if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key === 'ArrowRight') jumpTo(phaseAt(timeRef.current).index + 1);
      else if (e.key === 'ArrowLeft') jumpTo(phaseAt(timeRef.current).index - 1);
      else if (e.key === 'f') {
        if (document.fullscreenElement) document.exitFullscreen();
        else document.documentElement.requestFullscreen?.();
      }
    };
    window.addEventListener('pointermove', wake);
    window.addEventListener('pointerdown', wake);
    window.addEventListener('keydown', key);
    return () => {
      window.removeEventListener('pointermove', wake);
      window.removeEventListener('pointerdown', wake);
      window.removeEventListener('keydown', key);
    };
  }, [jumpTo, togglePlay]);

  const step = PHASES[hud.index];
  return (
    <main className="bb">
      <canvas ref={canvasRef} className="bb-canvas" />
      <div className={`bb-top${chrome ? '' : ' bb-hidden'}`}>
        {/* The Art tabs, the same as the panel's: Stars, Geometry, Tunnels, Oils, Big Bang. */}
        <nav className="bb-tabs" aria-label="Art">
          {[
            ['stars', 'Stars'],
            ['geometry', 'Geometry'],
            ['tunnels', 'Tunnels'],
            ['oils', 'Oils'],
          ].map(([id, label]) => (
            <a key={id} href={`/geometry-field?tab=${id}`} className="bb-back">
              {label}
            </a>
          ))}
          <span className="bb-back bb-tab-on" aria-current="page">
            Big Bang
          </span>
        </nav>
      </div>
      <div className={`bb-step${chrome ? '' : ' bb-quiet'}`} aria-live="polite">
        <div className="bb-step-head">
          <span className="bb-num" style={{ background: STEP_COLOURS[hud.index] }}>
            {hud.index + 1} / {PHASES.length}
          </span>
          <span className="bb-name">{step.name}</span>
        </div>
        <p className={`bb-line${chrome ? '' : ' bb-hidden'}`}>{step.line}</p>
      </div>
      <div className={`bb-bar${chrome ? '' : ' bb-hidden'}`}>
        <div className="bb-segments" role="toolbar" aria-label="Steps of the trip">
          {PHASES.map((p, k) => {
            const fill = k < hud.index ? 1 : k === hud.index ? hud.u : 0;
            return (
              <button
                type="button"
                key={p.id}
                className={`bb-seg${k === hud.index ? ' bb-seg-on' : ''}`}
                style={{ flexGrow: p.duration }}
                onClick={() => jumpTo(k)}
                title={`${k + 1}. ${p.name}`}
                aria-label={`Go to step ${k + 1}, ${p.name}`}
              >
                <span style={{ width: `${fill * 100}%`, background: STEP_COLOURS[k] }} />
              </button>
            );
          })}
        </div>
        <div className="bb-controls">
          <button type="button" onClick={() => jumpTo(hud.index - 1)} aria-label="Previous step">
            ⏮
          </button>
          <button type="button" onClick={togglePlay} aria-label={playing ? 'Pause' : 'Play'}>
            {playing ? '❚❚' : '▶'}
          </button>
          <button type="button" onClick={() => jumpTo(hud.index + 1)} aria-label="Next step">
            ⏭
          </button>
          <span className="bb-time">
            {fmt(hud.time)} / {fmt(TOTAL)}
          </span>
          <span className="bb-speeds" role="toolbar" aria-label="Speed">
            {[0.5, 1, 2].map((s) => (
              <button
                type="button"
                key={s}
                aria-pressed={speed === s}
                onClick={() => changeSpeed(s)}
              >
                {s}×
              </button>
            ))}
          </span>
        </div>
      </div>
    </main>
  );
}
