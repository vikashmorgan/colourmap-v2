/*
 * THE BALL OF STARS AT THE ROOT — shared by the life tree and the star wheel,
 * so the two looks of the G menu have the same centre (2026-10-30: "a ball of
 * star dots instead, so it keeps style").
 */

export type Orb = { x: Float32Array; y: Float32Array; z: Float32Array };

/** `n` stars inside a unit ball, thicker toward its skin so it reads as a sphere. */
export function makeOrb(n: number): Orb {
  const x = new Float32Array(n);
  const y = new Float32Array(n);
  const z = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const u = Math.random() * 2 - 1;
    const t = Math.random() * Math.PI * 2;
    const r = Math.random() ** 0.25;
    const k = Math.sqrt(1 - u * u);
    x[i] = Math.cos(t) * k * r;
    y[i] = u * r;
    z[i] = Math.sin(t) * k * r;
  }
  return { x, y, z };
}

/** Draws the ball turning slowly about its upright, the near side brighter. */
export function drawOrb(
  ctx: CanvasRenderingContext2D,
  orb: Orb,
  cx: number,
  cy: number,
  radius: number,
  clock: number,
  size: number,
  bright: number,
  rgb: [number, number, number],
): void {
  const spin = clock * 0.18;
  const cs = Math.cos(spin);
  const sn = Math.sin(spin);
  const [r, g, b] = rgb;
  for (let i = 0; i < orb.x.length; i++) {
    const x = orb.x[i] as number;
    const z = orb.z[i] as number;
    const rx = x * cs - z * sn;
    const rz = x * sn + z * cs;
    const twinkle = 0.7 + 0.3 * Math.sin(clock * 1.7 + i * 1.3);
    const alpha = Math.min(1, (0.3 + 0.45 * (rz + 1)) * twinkle * bright);
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
    ctx.fillRect(
      cx + rx * radius - size / 2,
      cy + (orb.y[i] as number) * radius - size / 2,
      size,
      size,
    );
  }
}
