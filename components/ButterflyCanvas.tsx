'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { type ButterflySettings, hexToRgb, type Palette, rampUniform } from '@/lib/art/butterflies';

/*
 * One Liquid Butterflies piece, drawn by a fragment shader (lib/art/butterflies.ts).
 *
 * Per pixel:
 *  1. Fold: round into `fold` sectors when it is more than 1, then always
 *     mirrored left to right, so the butterfly is symmetric whatever happens.
 *  2. Slice: the distance from the centre line picks a strip; each strip is
 *     the butterfly `delay` later, a little bigger. Strips melt at the edges.
 *  3. Flow: the folded point is pushed by two layers of slow noise, so the
 *     wings move like liquid. The push is computed in mirrored space, so the
 *     symmetry holds.
 *  4. Shape: two wings a side (an upper and a lower ellipse, wobbling at the
 *     edge, swelling with `morph`, foreshortened by `flap`) and a thin body,
 *     joined with a smooth minimum into one signed distance.
 *  5. Colour: inside, the distance plus a swirl of noise walks the six-stop
 *     ramp, and the whole walk drifts in time; outside, a glow fades to the
 *     background, echo rings travel outward, and behind it all the pool flows.
 *
 * WebGL 1, so it runs on any phone. Without WebGL it says so instead.
 */

const VERT = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }
`;

const FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform float uSlices;
uniform float uDelay;
uniform float uEchoes;
uniform float uDrift;
uniform float uFlow;
uniform float uFlap;
uniform float uMorph;
uniform float uFold;
uniform float uSize;
uniform float uGlow;
uniform float uPool;
uniform float uGrain;
uniform float uIris;
uniform float uStreaks;
uniform float uSparks;
uniform vec3 uBg0;
uniform vec3 uBg1;
uniform vec3 uRamp[6];

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  for (int i = 0; i < 4; i++) {
    v += a * noise(p);
    p = p * 2.03 + vec2(1.7, 9.2);
    a *= 0.5;
  }
  return v;
}

float ellipse(vec2 p, vec2 c, vec2 r, float rot) {
  vec2 q = p - c;
  float cs = cos(rot);
  float sn = sin(rot);
  q = vec2(cs * q.x + sn * q.y, -sn * q.x + cs * q.y);
  // A close distance even for long thin ellipses (the body), so no glow leaks along them.
  float k0 = length(q / r);
  float k1 = length(q / (r * r));
  return k0 * (k0 - 1.0) / max(k1, 1e-4);
}

float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

// One side of the butterfly (x >= 0), and its body on the centre line.
float butterfly(vec2 q, float t) {
  float open = 1.0 - uFlap * 0.55 * (0.5 + 0.5 * sin(t * 1.3));
  q.x /= max(open, 0.2);
  float m1 = 1.0 + uMorph * 0.22 * sin(t * 0.7);
  float m2 = 1.0 + uMorph * 0.25 * sin(t * 0.9 + 2.0);
  float a = atan(q.y, q.x);
  float wob = 1.0 + uMorph * 0.08 * sin(a * 6.0 + t * 1.1);
  float up = ellipse(q, vec2(0.21, 0.12) * m1, vec2(0.21, 0.13) * m1 * wob, 0.55 + uMorph * 0.15 * sin(t * 0.5));
  float lo = ellipse(q, vec2(0.14, -0.13) * m2, vec2(0.12, 0.10) * m2 * wob, -0.7 + uMorph * 0.15 * sin(t * 0.6 + 1.0));
  float body = ellipse(q, vec2(0.0, 0.0), vec2(0.016, 0.15), 0.0);
  return smin(smin(up, lo, 0.04), body, 0.03) * max(open, 0.2);
}

vec3 ramp(float g) {
  vec3 col = uRamp[0];
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    if (g >= fi && g <= fi + 1.0) col = mix(uRamp[i], uRamp[i + 1], g - fi);
  }
  if (g > 5.0) col = uRamp[5];
  return col;
}

// Walks 0..5 and back, so drifting colour never jumps.
float bounce(float g) { return 5.0 - abs(mod(g, 10.0) - 5.0); }

void main() {
  float aspect = uRes.x / uRes.y;
  vec2 p = (gl_FragCoord.xy - 0.5 * uRes) / uRes.y;

  if (uFold > 1.5) {
    float sector = 6.2831853 / uFold;
    float a = atan(p.x, p.y);
    a = mod(a + 0.5 * sector, sector) - 0.5 * sector;
    p = length(p) * vec2(sin(a), cos(a)) - vec2(0.0, 0.18);
  }
  vec2 q = vec2(abs(p.x), p.y);

  float k = 0.0;
  if (uSlices > 0.5) {
    float w = 0.5 * aspect / uSlices;
    float s = q.x / w;
    k = floor(s) + smoothstep(0.88, 1.0, fract(s));
    k = min(k, uSlices - 1.0);
  }
  float t = uTime - k * uDelay * 2.0;
  float grow = 1.0 + k * 0.06;

  vec2 warp = vec2(fbm(q * 2.2 + vec2(0.0, t * 0.15)), fbm(q * 2.2 + vec2(5.2, 1.3) - t * 0.12)) - 0.5;
  vec2 fq = q + uFlow * 0.22 * warp;

  float sc = uSize * grow * 0.78;
  float d = butterfly(fq / sc, t) * sc;
  float phase = uTime * uDrift * 0.6;

  float inside = clamp(-d / (0.1 * uSize), 0.0, 1.0);
  float swirl = fbm(fq * 4.0 + vec2(t * 0.2, -t * 0.15));
  float gIn = bounce(2.0 * (1.0 - inside) + (swirl - 0.5) * 2.2 * (0.3 + uFlow) + phase * 2.0);
  float gOut = 2.0 + 3.0 * clamp(d / uGlow, 0.0, 1.0);
  float g = d < 0.0 ? gIn : bounce(gOut + phase * 2.0 * (1.0 - clamp(d / uGlow, 0.0, 1.0)));
  float alpha = 1.0 - smoothstep(0.0, uGlow, d);
  alpha *= 1.0 - 0.55 * (k / max(uSlices - 1.0, 1.0)) * step(0.5, uSlices);

  float y = clamp(0.5 - p.y, 0.0, 1.0);
  vec3 col = mix(uBg0, uBg1, smoothstep(0.0, 1.0, y));
  float pool = fbm(q * 1.4 + warp * 1.5 + vec2(uTime * 0.03, -uTime * 0.02));
  col = mix(col, ramp(bounce(pool * 7.0 + phase)), uPool * 0.55);
  col *= 1.0 - 0.2 * length(p / vec2(aspect, 1.0));

  if (uEchoes > 0.5 && d > 0.0) {
    float wave = d * uEchoes * 9.0 - uTime * (0.6 + uDrift);
    float band = pow(0.5 + 0.5 * cos(6.2831853 * wave), 3.0);
    float reach = exp(-d * 4.5);
    vec3 ec = ramp(bounce(3.0 + 2.0 * fract(wave * 0.25) + phase));
    col = mix(col, ec, band * reach * 0.75);
  }

  vec3 body = ramp(g);
  if (uIris > 0.0) {
    // Thin film: the colour follows the film's thickness, which the liquid keeps moving.
    float film = d * 38.0 + swirl * 5.0 + uTime * 0.15;
    vec3 iris = 0.55 + 0.45 * cos(6.2831853 * (film + vec3(0.0, 0.33, 0.67)));
    float edge = smoothstep(0.03, 0.0, abs(d + 0.006));
    body = mix(body, iris, uIris * (0.35 + 0.65 * (1.0 - inside)) * step(d, 0.0));
    body += uIris * edge * 0.45;
  }
  col = mix(col, body, alpha);

  if (uStreaks > 0.0) {
    // Glitch: thin columns near the centre line, each its own height and flicker.
    float colw = 0.006;
    float ci = floor(q.x / colw);
    float hc = hash(vec2(ci, 3.1));
    float reach = 0.18 + 0.5 * hash(vec2(ci, floor(uTime * 2.0 + hc * 9.0)));
    float on = step(0.45, hc) * smoothstep(0.16, 0.0, q.x) * smoothstep(reach, reach * 0.4, abs(p.y));
    vec3 sc = mix(ramp(5.0), ramp(3.0 + hash(vec2(ci, 7.0))), 0.5);
    col = mix(col, sc, uStreaks * on * 0.85);
  }

  if (uSparks > 0.0) {
    // Embers: one in a few grid cells near the rim, twinkling, drifting up.
    vec2 cp = p * 34.0 + vec2(0.0, -uTime * 0.6);
    vec2 cell = floor(cp);
    float hs = hash(cell);
    vec2 at = cell + 0.5 + 0.35 * vec2(sin(hs * 40.0), cos(hs * 30.0));
    float ember = smoothstep(0.16, 0.0, length(cp - at)) * step(0.88, hs);
    float near = exp(-max(d, 0.0) * 9.0) * step(0.0, d);
    float tw = 0.5 + 0.5 * sin(uTime * 4.0 + hs * 60.0);
    col += ramp(3.0 + hs * 2.0) * ember * near * tw * uSparks * 1.4;
  }

  col += (hash(gl_FragCoord.xy + fract(uTime) * 61.0) - 0.5) * uGrain;
  gl_FragColor = vec4(col, 1.0);
}
`;

type Props = {
  settings: ButterflySettings;
  palette: Palette;
  /** Move over time; off holds one frame. */
  animate: boolean;
  /** Keep the drawn frame, so it can be saved as a PNG. */
  preserve?: boolean;
  /** Highest device-pixel ratio to draw at. */
  maxDpr?: number;
  /** Where in time to start, so pieces side by side are not in step. */
  offset?: number;
  label: string;
  className?: string;
  style?: React.CSSProperties;
};

export type ButterflyCanvasHandle = { toDataURL: () => string | null };

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[liquid-butterflies] shader', gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

const UNIFORMS = [
  'uRes',
  'uTime',
  'uSlices',
  'uDelay',
  'uEchoes',
  'uDrift',
  'uFlow',
  'uFlap',
  'uMorph',
  'uFold',
  'uSize',
  'uGlow',
  'uPool',
  'uGrain',
  'uIris',
  'uStreaks',
  'uSparks',
  'uBg0',
  'uBg1',
  'uRamp',
] as const;

const ButterflyCanvas = forwardRef<ButterflyCanvasHandle, Props>(function ButterflyCanvas(
  { settings, palette, animate, preserve = false, maxDpr = 2, offset = 0, label, className, style },
  handle,
) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const look = useRef({ settings, palette, animate });
  look.current = { settings, palette, animate };
  const redraw = useRef<(() => void) | null>(null);
  const [failed, setFailed] = useState(false);

  useImperativeHandle(handle, () => ({
    toDataURL: () => {
      redraw.current?.();
      try {
        return canvasRef.current?.toDataURL('image/png') ?? null;
      } catch {
        return null;
      }
    },
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    let gl: WebGLRenderingContext | null = null;
    try {
      gl = canvas.getContext('webgl', {
        preserveDrawingBuffer: preserve,
        antialias: false,
      }) as WebGLRenderingContext | null;
    } catch {
      gl = null;
    }
    const vs = gl && compile(gl, gl.VERTEX_SHADER, VERT);
    const fs = gl && compile(gl, gl.FRAGMENT_SHADER, FRAG);
    const prog = gl?.createProgram();
    if (!gl || !vs || !fs || !prog) {
      setFailed(true);
      return;
    }
    gl.attachShader(prog, vs);
    gl.attachShader(prog, fs);
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      setFailed(true);
      return;
    }
    gl.useProgram(prog);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(prog, 'aPos');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const g = gl;
    const loc = Object.fromEntries(
      UNIFORMS.map((n) => [n, g.getUniformLocation(prog, n)]),
    ) as Record<(typeof UNIFORMS)[number], WebGLUniformLocation | null>;

    let raf = 0;
    let t = offset;
    let last = performance.now();
    const draw = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
      const w = Math.max(1, Math.round(canvas.clientWidth * dpr));
      const h = Math.max(1, Math.round(canvas.clientHeight * dpr));
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      g.viewport(0, 0, w, h);
      const { settings: s, palette: p } = look.current;
      g.uniform2f(loc.uRes, w, h);
      g.uniform1f(loc.uTime, t);
      g.uniform1f(loc.uSlices, s.slices);
      g.uniform1f(loc.uDelay, s.delay);
      g.uniform1f(loc.uEchoes, s.echoes);
      g.uniform1f(loc.uDrift, s.drift);
      g.uniform1f(loc.uFlow, s.flow);
      g.uniform1f(loc.uFlap, s.flap);
      g.uniform1f(loc.uMorph, s.morph);
      g.uniform1f(loc.uFold, s.fold);
      g.uniform1f(loc.uSize, s.size);
      g.uniform1f(loc.uGlow, s.glow);
      g.uniform1f(loc.uPool, s.pool);
      g.uniform1f(loc.uGrain, s.grain);
      g.uniform1f(loc.uIris, s.iris);
      g.uniform1f(loc.uStreaks, s.streaks);
      g.uniform1f(loc.uSparks, s.sparks);
      g.uniform3fv(loc.uBg0, hexToRgb(p.bg[0]));
      g.uniform3fv(loc.uBg1, hexToRgb(p.bg[1]));
      g.uniform3fv(loc.uRamp, rampUniform(p));
      g.drawArrays(g.TRIANGLES, 0, 3);
    };
    redraw.current = draw;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      const { animate: on, settings: s } = look.current;
      if (on) t += dt * s.speed;
      draw();
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      redraw.current = null;
      g.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [preserve, maxDpr, offset]);

  if (failed) {
    return (
      <div
        role="img"
        aria-label={label}
        className={className}
        style={{
          ...style,
          display: 'grid',
          placeItems: 'center',
          background: '#1a1418',
          color: '#b9ab8e',
          fontSize: 13,
        }}
      >
        This piece needs WebGL.
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={label}
      className={className}
      style={{ display: 'block', ...style }}
    />
  );
});

export default ButterflyCanvas;
