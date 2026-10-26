'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import { type ButterflySettings, hexToRgb, type Palette, rampUniform } from '@/lib/art/butterflies';
import { BUTTERFLY_FRAGMENT as FRAG, BUTTERFLY_VERTEX as VERT } from '@/lib/art/butterfly-shader';

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
  'uSparks',
  'uForm',
  'uPetals',
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
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
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
      g.uniform1f(loc.uSparks, s.sparks);
      g.uniform1f(loc.uForm, s.form);
      g.uniform1f(loc.uPetals, s.petals);
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
      // Free what this run made, but keep the context: React may mount the same
      // canvas again (Strict Mode does in development), and a lost context
      // would come back from getContext dead.
      g.deleteProgram(prog);
      g.deleteShader(vs);
      g.deleteShader(fs);
      g.deleteBuffer(buffer);
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
