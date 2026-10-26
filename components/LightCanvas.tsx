'use client';

import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';

import {
  hexToRgb,
  type LightKind,
  type LightSettings,
  type Palette,
  rampUniform,
} from '@/lib/art/light';
import { LIGHT_FRAGMENTS, LIGHT_UNIFORMS, LIGHT_VERTEX } from '@/lib/art/light-shaders';

/*
 * One Light Bodies piece (lib/art/light.ts), drawn by its kind's fragment
 * shader (lib/art/light-shaders.ts, where each is described). WebGL 1, so it
 * runs on any phone. Without WebGL it says so instead.
 */

type Props = {
  kind: LightKind;
  settings: LightSettings;
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

export type LightCanvasHandle = { toDataURL: () => string | null };

type UniformName = (typeof LIGHT_UNIFORMS)[number];

const SETTING_UNIFORMS: [keyof LightSettings, UniformName][] = [
  ['size', 'uSize'],
  ['glow', 'uGlow'],
  ['flow', 'uFlow'],
  ['detail', 'uDetail'],
  ['drift', 'uDrift'],
  ['iris', 'uIris'],
  ['corona', 'uCorona'],
  ['streaks', 'uStreaks'],
  ['sparks', 'uSparks'],
  ['grain', 'uGrain'],
  ['pose', 'uPose'],
  ['cycle', 'uCycle'],
  ['numbers', 'uNumbers'],
  ['count', 'uCount'],
];

function compile(gl: WebGLRenderingContext, type: number, src: string): WebGLShader | null {
  const sh = gl.createShader(type);
  if (!sh) return null;
  gl.shaderSource(sh, src);
  gl.compileShader(sh);
  if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
    console.error('[light-bodies] shader', gl.getShaderInfoLog(sh));
    return null;
  }
  return sh;
}

const LightCanvas = forwardRef<LightCanvasHandle, Props>(function LightCanvas(
  {
    kind,
    settings,
    palette,
    animate,
    preserve = false,
    maxDpr = 2,
    offset = 0,
    label,
    className,
    style,
  },
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
    const vs = gl && compile(gl, gl.VERTEX_SHADER, LIGHT_VERTEX);
    const fs = gl && compile(gl, gl.FRAGMENT_SHADER, LIGHT_FRAGMENTS[kind]);
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
      LIGHT_UNIFORMS.map((n) => [n, g.getUniformLocation(prog, n)]),
    ) as Record<UniformName, WebGLUniformLocation | null>;

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
      for (const [k, n] of SETTING_UNIFORMS) g.uniform1f(loc[n], s[k]);
      g.uniform1f(loc.uShift, 0);
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
  }, [kind, preserve, maxDpr, offset]);

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

export default LightCanvas;
