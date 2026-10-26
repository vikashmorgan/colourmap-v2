'use client';

import { useEffect, useRef, useState } from 'react';

import { hexToHsl, hslToHex, hslToRgb, hueSatToPoint, pointToHueSat } from '@/lib/art/colour-wheel';

/*
 * A circle of colour to pick from (2026-10-26): "a beautiful trippy circle of
 * colour with a bit of an echo effect to select your colour".
 *
 * Hue runs round the circle and saturation from the grey centre out; the
 * Light slider under it sets how dark or bright. Echo rings ripple slowly out
 * through the wheel, and out of the chosen colour, so it feels alive while
 * the colours stay true enough to pick by eye. Drag or tap to pick; with the
 * keyboard, left and right turn the hue, up and down change the saturation.
 * With reduced motion the rings hold still.
 */

type Props = {
  value: string;
  onChange: (hex: string) => void;
  label: string;
  /** Diameter in CSS pixels. */
  size?: number;
  still?: boolean;
  accent?: string;
};

export default function ColourWheel({
  value,
  onChange,
  label,
  size = 200,
  still = false,
  accent = '#C4A060',
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hsl = hexToHsl(value);
  const [light, setLight] = useState(hsl.l || 0.5);
  const pick = useRef({ ...hsl, l: light });
  pick.current = { h: hsl.h, s: hsl.s, l: light };
  const stillRef = useRef(still);
  stillRef.current = still;
  const dragging = useRef(false);

  // A colour set from outside (another swatch, a reset) brings its own lightness.
  useEffect(() => {
    setLight(hexToHsl(value).l);
  }, [value]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
    const px = Math.round(size * dpr);
    canvas.width = px;
    canvas.height = px;
    const R = px / 2;
    const image = ctx.createImageData(px, px);
    let raf = 0;
    let t = 0;
    let last = performance.now();

    const draw = () => {
      const { l } = pick.current;
      const data = image.data;
      for (let y = 0; y < px; y++) {
        for (let x = 0; x < px; x++) {
          const dx = x + 0.5 - R;
          const dy = y + 0.5 - R;
          const r = Math.hypot(dx, dy) / R;
          const i = (y * px + x) * 4;
          if (r > 1) {
            data[i + 3] = 0;
            continue;
          }
          const { h, s } = pointToHueSat(dx, dy, R);
          // The echo: soft bands travelling outward.
          const band = (0.5 + 0.5 * Math.cos(2 * Math.PI * (r * 5 - t * 0.35))) ** 3;
          const [cr, cg, cb] = hslToRgb(
            h + band * 8,
            s,
            Math.min(1, l * (1 - 0.14 * band) + 0.05 * band),
          );
          data[i] = cr;
          data[i + 1] = cg;
          data[i + 2] = cb;
          data[i + 3] = r > 0.985 ? Math.round(255 * (1 - (r - 0.985) / 0.015)) : 255;
        }
      }
      ctx.putImageData(image, 0, 0);

      const { h, s } = pick.current;
      const p = hueSatToPoint(h, s, R);
      const cx = R + p.x;
      const cy = R + p.y;
      const chosen = hslToHex(pick.current);
      for (let k = 0; k < 3; k++) {
        const f = (t * 0.5 + k / 3) % 1;
        ctx.beginPath();
        ctx.arc(cx, cy, (9 + f * 34) * dpr, 0, Math.PI * 2);
        ctx.strokeStyle = chosen;
        ctx.globalAlpha = 0.7 * (1 - f);
        ctx.lineWidth = 2 * dpr;
        ctx.stroke();
      }
      ctx.globalAlpha = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, 8 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = chosen;
      ctx.fill();
      ctx.lineWidth = 2.5 * dpr;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
      ctx.lineWidth = 1 * dpr;
      ctx.strokeStyle = 'rgba(0,0,0,0.6)';
      ctx.stroke();
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const dt = Math.min(0.1, (now - last) / 1000);
      last = now;
      if (!stillRef.current) t += dt;
      draw();
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [size]);

  const choose = (h: number, s: number, l = light) => onChange(hslToHex({ h, s, l }));

  const fromPointer = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const box = e.currentTarget.getBoundingClientRect();
    const r = box.width / 2;
    const { h, s } = pointToHueSat(e.clientX - box.left - r, e.clientY - box.top - r, r);
    choose(h, s);
  };

  const onKey = (e: React.KeyboardEvent) => {
    const step: Record<string, [number, number]> = {
      ArrowLeft: [-6, 0],
      ArrowRight: [6, 0],
      ArrowUp: [0, 0.05],
      ArrowDown: [0, -0.05],
    };
    const d = step[e.key];
    if (!d) return;
    e.preventDefault();
    choose(hsl.h + d[0], Math.min(1, Math.max(0, hsl.s + d[1])));
  };

  return (
    <div style={{ display: 'grid', gap: 8, justifyItems: 'center' }}>
      <canvas
        ref={canvasRef}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={0}
        aria-valuemax={360}
        aria-valuenow={Math.round(hsl.h)}
        aria-valuetext={value}
        onKeyDown={onKey}
        onPointerDown={(e) => {
          dragging.current = true;
          e.currentTarget.setPointerCapture?.(e.pointerId);
          fromPointer(e);
        }}
        onPointerMove={(e) => {
          if (dragging.current) fromPointer(e);
        }}
        onPointerUp={() => {
          dragging.current = false;
        }}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          cursor: 'crosshair',
          touchAction: 'none',
          boxShadow: `0 0 0 1px ${accent}55, 0 0 28px -6px ${value}`,
        }}
      />
      <label style={{ display: 'flex', alignItems: 'center', gap: 10, width: size, fontSize: 12 }}>
        <span style={{ width: 40, color: '#b9ab8e' }}>Light</span>
        <input
          type="range"
          min={0.03}
          max={0.97}
          step={0.01}
          value={light}
          onChange={(e) => {
            const l = Number(e.target.value);
            setLight(l);
            choose(hsl.h, hsl.s, l);
          }}
          aria-label={`${label} lightness`}
          style={{ width: '100%', accentColor: accent }}
        />
      </label>
    </div>
  );
}
