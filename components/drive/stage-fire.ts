/*
 * The start's stage fire, drawn (the plan is lib/art/stage-fire.ts): columns of flame and gold
 * sparks as GPU particles, hung on the start gantry so they stand on the grid's edges. One clock,
 * seconds since the click, drives the whole show.
 */

import * as THREE from 'three';

import { BEAT } from '@/lib/art/race-intro';
import { archJets, type Jet, stageJets } from '@/lib/art/stage-fire';

const FLAMES = 90;
const SPARKS = 60;

export interface StageFire {
  points: THREE.Points;
  /** The burners, in `stageJets` order. */
  jets: Jet[];
  /** Stands each burner where it belongs: one point a jet, in the gantry's frame, as the road
   * curves (x up the road, y up, z across with left negative). */
  place(bases: { x: number; y: number; z: number }[]): void;
  /** Seconds since the click; negative before it, which shows nothing. */
  set(now: number, sparkColour: THREE.Color): void;
  dispose(): void;
}

export function makeStageFire(): StageFire {
  const pos: number[] = [];
  const jetOf: number[] = [];
  const side: number[] = [];
  const beat: number[] = [];
  const tall: number[] = [];
  const life: number[] = [];
  const phase: number[] = [];
  const kind: number[] = [];
  const rnd: number[] = [];
  let seed = 7;
  const rand = () => {
    seed = (seed * 16807) % 2147483647;
    return seed / 2147483647;
  };
  const jets = [...stageJets(), ...archJets()];
  jets.forEach((j, ji) => {
    for (const b of j.bursts) {
      const add = (k: number, n: number) => {
        for (let i = 0; i < n; i++) {
          pos.push(j.along, 0.2, 0);
          jetOf.push(ji);
          side.push(j.side);
          beat.push(b.beat);
          tall.push(b.height);
          life.push(b.life);
          phase.push(i / n);
          kind.push(k);
          rnd.push(rand() * 2 - 1, rand(), rand());
        }
      };
      add(0, FLAMES);
      if (b.sparks) add(1, SPARKS);
    }
  });
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  geo.setAttribute('aSide', new THREE.Float32BufferAttribute(side, 1));
  geo.setAttribute('aBeat', new THREE.Float32BufferAttribute(beat, 1));
  geo.setAttribute('aTall', new THREE.Float32BufferAttribute(tall, 1));
  geo.setAttribute('aLife', new THREE.Float32BufferAttribute(life, 1));
  geo.setAttribute('aPhase', new THREE.Float32BufferAttribute(phase, 1));
  geo.setAttribute('aKind', new THREE.Float32BufferAttribute(kind, 1));
  geo.setAttribute('aRnd', new THREE.Float32BufferAttribute(rnd, 3));
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      uNow: { value: -1000 },
      uBeat: { value: BEAT },
      uScale: { value: 900 },
      uSpark: { value: new THREE.Color(2, 1.4, 0.5) },
    },
    vertexShader: `
      attribute float aSide;
      attribute float aBeat;
      attribute float aTall;
      attribute float aLife;
      attribute float aPhase;
      attribute float aKind;
      attribute vec3 aRnd;
      uniform float uNow;
      uniform float uBeat;
      uniform float uScale;
      varying float vK;
      varying float vA;
      varying float vKind;
      void main() {
        vKind = aKind;
        float age = uNow - aBeat * uBeat;
        // Left (+1) stands at -z in the gantry's frame, right at +z: inward is toward z = 0.
        vec3 p = position;
        float size = 0.0;
        vA = 0.0;
        vK = 0.0;
        if (aKind < 0.5) {
          if (age >= 0.0 && age <= aLife) {
            float env = smoothstep(0.0, 0.06, age) * (1.0 - smoothstep(aLife - 0.4, aLife, age));
            float k = fract(age * 2.4 + aPhase);
            float h = aTall * (0.35 + 0.65 * smoothstep(0.0, 0.15, age));
            float spread = 0.6 + 1.6 * k;
            p += vec3(aRnd.x * spread, k * h, (aRnd.y - 0.5) * 2.0 * spread);
            vK = k;
            vA = env * (1.0 - k);
            size = (2.2 + 4.8 * k) * (0.6 + aTall / 22.0);
          }
        } else {
          // Sparks leave over the first half second and fly an arc inward over the road.
          float a = age - aPhase * 0.5;
          if (a >= 0.0 && a <= 1.6) {
            float across = abs(position.z);
            vec3 v = vec3(aRnd.x * 5.0, 20.0 + aRnd.y * 9.0, aSide * (across * 0.55 + aRnd.z * 5.0));
            p += v * a - vec3(0.0, 9.0 * a * a, 0.0);
            vA = 1.0 - a / 1.6;
            vK = a / 1.6;
            size = 1.1;
          }
        }
        vec4 mv = modelViewMatrix * vec4(p, 1.0);
        gl_PointSize = size <= 0.0 ? 0.0 : clamp(size * uScale / max(-mv.z, 0.5), 1.0, 90.0);
        gl_Position = projectionMatrix * mv;
      }`,
    fragmentShader: `
      uniform vec3 uSpark;
      varying float vK;
      varying float vA;
      varying float vKind;
      void main() {
        if (vA <= 0.0) discard;
        float r = length(gl_PointCoord - 0.5);
        float a = smoothstep(0.5, 0.0, r) * vA;
        vec3 c;
        if (vKind < 0.5) {
          vec3 hot = vec3(1.9, 1.6, 0.9);
          vec3 orange = vec3(1.7, 0.6, 0.12);
          vec3 red = vec3(0.6, 0.08, 0.02);
          c = vK < 0.3 ? mix(hot, orange, vK / 0.3) : mix(orange, red, (vK - 0.3) / 0.7);
        } else {
          c = uSpark * (1.2 - 0.6 * vK);
        }
        gl_FragColor = vec4(c * a, a);
      }`,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    toneMapped: false,
  });
  const points = new THREE.Points(geo, mat);
  points.frustumCulled = false;
  points.renderOrder = 8;
  const at = geo.getAttribute('position') as THREE.BufferAttribute;
  return {
    points,
    jets,
    place(bases) {
      for (let i = 0; i < jetOf.length; i++) {
        const b = bases[jetOf[i]];
        if (b) at.setXYZ(i, b.x, b.y + 0.2, b.z);
      }
      at.needsUpdate = true;
    },
    set(now, sparkColour) {
      mat.uniforms.uNow.value = now;
      (mat.uniforms.uSpark.value as THREE.Color).copy(sparkColour);
    },
    dispose() {
      geo.dispose();
      mat.dispose();
    },
  };
}
