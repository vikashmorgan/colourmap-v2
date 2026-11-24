/**
 * The title screen's key art (docs/specs/drive-menus.md, "The title"): the hover ship boosting
 * through a banked golden bend at sunset, both boosters firing, a gear ring just broken, burners on
 * the road's edges. Painted on a 2D canvas in a 1600×900 frame scaled to cover; the road is laid out
 * on the ground and projected, so the bank and the bend hold their shape. t in seconds moves only the
 * flicker, the dashes and the sparks.
 */

type Ctx = CanvasRenderingContext2D;
type P2 = [number, number];
type P3 = [number, number, number];
interface RoadPt {
  z: number;
  th: number;
  s: number;
  bank: number;
  L: P3;
  R: P3;
}

export function paintTitleArt(ctx: Ctx, W: number, H: number, t: number) {
  const k = Math.max(W / 1600, H / 900);
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  ctx.translate((W - 1600 * k) / 2, (H - 900 * k) / 2);
  ctx.scale(k, k);
  ctx.translate(800, 450);
  ctx.rotate(-0.07);
  ctx.scale(1.08, 1.08);
  ctx.translate(-800, -450);
  const HZ = 360;
  const rnd = mulberry(7);

  // Sky: violet night into burnt orange, a gold band at the horizon.
  let g = ctx.createLinearGradient(0, 0, 0, HZ + 40);
  g.addColorStop(0, '#120a1c');
  g.addColorStop(0.45, '#3a1630');
  g.addColorStop(0.78, '#a3402a');
  g.addColorStop(1, '#f2a13f');
  ctx.fillStyle = g;
  ctx.fillRect(-300, -300, 2200, HZ + 340);
  // Stars.
  for (let i = 0; i < 90; i++) {
    const x = rnd() * 1600;
    const y = rnd() * HZ * 0.5;
    ctx.fillStyle = `rgba(255,236,210,${0.15 + rnd() * 0.5})`;
    ctx.fillRect(x, y, 1.6, 1.6);
  }
  // The sun, low, behind the far end of the road.
  g = ctx.createRadialGradient(1200, HZ - 10, 0, 1200, HZ - 10, 520);
  g.addColorStop(0, 'rgba(255,226,150,0.95)');
  g.addColorStop(0.12, 'rgba(255,180,80,0.55)');
  g.addColorStop(0.45, 'rgba(230,100,50,0.18)');
  g.addColorStop(1, 'rgba(200,60,40,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1600, 900);
  ctx.fillStyle = '#ffe3a0';
  ctx.beginPath();
  ctx.arc(1200, HZ - 4, 46, Math.PI, 0);
  ctx.fill();

  // Far towers and mesas, in layers of haze.
  mesas(ctx, HZ, 'rgba(140,52,52,0.7)', 0.6, 3);
  towers(ctx, rnd, HZ);
  mesas(ctx, HZ, 'rgba(66,22,36,0.96)', 1, 11);

  // Ground: dark dunes, warm toward the light.
  g = ctx.createLinearGradient(0, HZ, 0, 900);
  g.addColorStop(0, '#5a2324');
  g.addColorStop(0.25, '#2a1018');
  g.addColorStop(1, '#0c0609');
  ctx.fillStyle = g;
  ctx.fillRect(-300, HZ, 2200, 1200);
  g = ctx.createRadialGradient(1200, HZ, 0, 1200, HZ, 900);
  g.addColorStop(0, 'rgba(255,150,70,0.45)');
  g.addColorStop(0.4, 'rgba(160,60,40,0.18)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-300, HZ, 2200, 1200);
  // Dune crests, catching the low light.
  for (let i = 0; i < 26; i++) {
    const yy = HZ + 6 + (i / 26) ** 2.1 * 620;
    const amp = 2 + i * 0.9;
    ctx.strokeStyle = `rgba(255,${150 + i * 2},90,${0.03 + 0.07 * (1 - i / 26)})`;
    ctx.lineWidth = 1 + i * 0.12;
    ctx.beginPath();
    for (let xx = -300; xx <= 1900; xx += 40) {
      const yv = yy + Math.sin(xx * 0.004 + i * 1.7) * amp + Math.sin(xx * 0.011 + i) * amp * 0.4;
      if (xx === -300) ctx.moveTo(xx, yv);
      else ctx.lineTo(xx, yv);
    }
    ctx.stroke();
  }

  // The road, laid out on the ground and projected: it comes in from the left and bends hard right
  // toward the sun, banked (its outer, left edge lifted).
  const F = 820;
  const CH = 7;
  const CX = 760;
  const proj = (X: number, Y: number, Z: number): P2 => [CX + (F * X) / Z, HZ + (F * (CH - Y)) / Z];
  const HW = 6.5;
  const pts: RoadPt[] = [];
  let x = -1.2;
  let z = 7.5;
  let th = -0.5;
  for (let sd = 0; sd < 520; ) {
    const KM = 0.0165;
    const k =
      sd < 4
        ? 0
        : sd < 18
          ? KM * ((sd - 4) / 14)
          : sd < 52
            ? KM
            : sd < 90
              ? KM * (1 - (sd - 52) / 38)
              : 0;
    const bankA = Math.min(0.42, k * 27);
    const rx = Math.cos(th);
    const rz = -Math.sin(th);
    pts.push({
      z,
      th,
      s: sd,
      bank: bankA,
      L: [x - rx * HW, 2 * HW * Math.sin(bankA), z - rz * HW],
      R: [x + rx * HW, 0, z + rz * HW],
    });
    const ds = sd < 40 ? 0.5 : sd < 120 ? 1.5 : 5;
    th += k * ds;
    x += Math.sin(th) * ds;
    z += Math.cos(th) * ds;
    sd += ds;
  }
  const Lp = pts.map((p) => proj(...p.L));
  const Rp = pts.map((p) => proj(...p.R));
  // Under-glow of the road on the ground.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.filter = 'blur(28px)';
  ctx.fillStyle = 'rgba(200,110,30,0.3)';
  poly(ctx, Lp, Rp);
  ctx.fill();
  ctx.restore();
  // The banked wall's face under the lifted edge.
  ctx.fillStyle = '#1c0c0a';
  ctx.beginPath();
  pts.forEach((p, i) => {
    const q = proj(p.L[0], p.L[1], p.L[2]);
    if (i) ctx.lineTo(q[0], q[1]);
    else ctx.moveTo(q[0], q[1]);
  });
  for (let i = pts.length - 1; i >= 0; i--) {
    const q = proj(pts[i].L[0], -0.2, pts[i].L[2]);
    ctx.lineTo(q[0], q[1]);
  }
  ctx.closePath();
  ctx.fill();
  // The deck, far quads first so near ones lie over them.
  for (let i = pts.length - 2; i >= 0; i--) {
    const p = pts[i];
    const far = 1 - Math.min(1, 7 / p.z);
    const tone = 0.42 + 0.7 * far;
    const g2 = ctx.createLinearGradient(Lp[i][0], Lp[i][1], Rp[i][0], Rp[i][1]);
    g2.addColorStop(0, shade('#f0bb58', tone * (1 + p.bank)));
    g2.addColorStop(0.55, shade('#b9792a', tone * 0.9));
    g2.addColorStop(1, shade('#d99a3c', tone));
    ctx.fillStyle = g2;
    ctx.strokeStyle = g2;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(Lp[i][0], Lp[i][1]);
    ctx.lineTo(Lp[i + 1][0], Lp[i + 1][1]);
    ctx.lineTo(Rp[i + 1][0], Rp[i + 1][1]);
    ctx.lineTo(Rp[i][0], Rp[i][1]);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  ctx.save();
  poly(ctx, Lp, Rp);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  g = ctx.createRadialGradient(1200, HZ, 10, 1050, HZ + 60, 560);
  g.addColorStop(0, 'rgba(255,225,150,0.7)');
  g.addColorStop(1, 'rgba(255,180,80,0)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1600, 900);
  // Lane dashes at a quarter and three quarters across, moving toward us.
  const run = (t * 26) % 8;
  for (const f of [0.25, 0.5, 0.75]) {
    for (let i = 0; i < pts.length - 1; i++) {
      const p = pts[i];
      if (Math.floor((p.s + run) / 4) % 2) continue;
      const A: P3 = [
        p.L[0] + (p.R[0] - p.L[0]) * f,
        p.L[1] * (1 - f),
        p.L[2] + (p.R[2] - p.L[2]) * f,
      ];
      const n = pts[i + 1];
      const B: P3 = [
        n.L[0] + (n.R[0] - n.L[0]) * f,
        n.L[1] * (1 - f),
        n.L[2] + (n.R[2] - n.L[2]) * f,
      ];
      const a2 = proj(...A);
      const b2 = proj(...B);
      ctx.strokeStyle = `rgba(255,246,220,${f === 0.5 ? 0.55 : 0.3})`;
      ctx.lineWidth = Math.max(0.8, (F * 0.18) / p.z);
      ctx.beginPath();
      ctx.moveTo(a2[0], a2[1]);
      ctx.lineTo(b2[0], b2[1]);
      ctx.stroke();
    }
  }
  ctx.restore();
  // Glowing edge lines.
  for (const E of [Lp, Rp]) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const [w, al] of [
      [16, 0.12],
      [6, 0.35],
      [2.2, 0.95],
    ]) {
      ctx.strokeStyle = `rgba(255,214,120,${al})`;
      ctx.lineWidth = w;
      ctx.beginPath();
      E.forEach((p, i) => {
        if (i) ctx.lineTo(p[0], p[1]);
        else ctx.moveTo(p[0], p[1]);
      });
      ctx.stroke();
    }
    ctx.restore();
  }
  // Fire burners on both edges, every 9 m, far ones first.
  const burners: RoadPt[] = [];
  for (let i = 0; i < pts.length; i++) {
    const p = pts[i];
    if (Math.floor(p.s / 9) === Math.floor((pts[i - 1]?.s ?? -1) / 9)) continue;
    if (p.z < 9) continue;
    burners.push(p);
  }
  for (let i = burners.length - 1; i >= 0; i--) {
    const p = burners[i];
    const sc = F / p.z;
    for (const [E, side] of [
      [p.L, 1],
      [p.R, -1],
    ] as [P3, number][]) {
      const q = proj(...E);
      flame(
        ctx,
        q[0],
        q[1],
        0.9 * sc,
        3.4 * sc * (side > 0 ? 1.25 : 1),
        -0.12 * side - 0.15,
        t * 9 + p.s * 0.7 + side,
        0.95,
      );
    }
  }

  // The ship over the deck, in the bend, rolled hard into it.
  let sp = pts[0];
  for (const p of pts) if (p.s <= 13) sp = p;
  const lat = 0.55;
  const hx = sp.L[0] + (sp.R[0] - sp.L[0]) * lat;
  const hz = sp.L[2] + (sp.R[2] - sp.L[2]) * lat;
  const deckY = sp.L[1] * (1 - lat);
  const bob = Math.sin(t * 2.1) * 0.08;
  const [sx, sy] = proj(hx, deckY + 1.1 + bob, hz);
  const gy = proj(hx, deckY, hz)[1];
  const head = 0;
  ship(ctx, sx, sy, sp.th, t, ((F / hz) * 5) / 340, gy - sy);

  // Speed lines rushing past.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const r2 = mulberry(31);
  for (let i = 0; i < 46; i++) {
    const a = head + Math.PI + (r2() - 0.5) * 0.9;
    const dist = 160 + r2() * 900;
    const ph = (t * (0.8 + r2()) + r2()) % 1;
    const d1 = dist * (0.4 + ph);
    const x0 = sx + Math.cos(a) * d1;
    const y0 = sy + Math.sin(a) * d1 * 0.8;
    const len = 60 + r2() * 160;
    ctx.strokeStyle = `rgba(255,${200 + r2() * 50},${120 + r2() * 80},${0.08 + 0.25 * (1 - ph)})`;
    ctx.lineWidth = 1 + r2() * 2;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x0 + Math.cos(a) * len, y0 + Math.sin(a) * len * 0.8);
    ctx.stroke();
  }
  ctx.restore();

  // Vignette.
  g = ctx.createRadialGradient(800, 470, 300, 800, 470, 1000);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(6,3,8,0.75)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, 1600, 900);
  ctx.restore();
}

function ship(ctx: Ctx, x: number, y: number, head: number, t: number, sc: number, gdy: number) {
  // Nose points along the road (up and right); the ship rolls into the turn (right wing down).
  const roll = 0.42;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(sc, sc);
  const gy = gdy / sc;
  // Hover glow on the deck below.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  let g = ctx.createRadialGradient(0, gy, 0, 0, gy, 230);
  g.addColorStop(0, 'rgba(255,170,70,0.55)');
  g.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, gy, 250, 70, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  // Shadow on the deck.
  ctx.fillStyle = 'rgba(40,16,6,0.45)';
  ctx.beginPath();
  ctx.ellipse(-10, gy + 6, 160, 34, 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.rotate(roll + head * 0.35);

  // Booster plumes first (behind the hull), streaming back toward the camera.
  const pods: P2[] = [
    [-118, 22],
    [118, 22],
  ];
  for (const [px, py] of pods) {
    plume(ctx, px, py + 18, t, px < 0 ? 0.08 : -0.08);
  }
  // Hull: a low lens, seen from behind and above, nose away from us.
  g = ctx.createLinearGradient(0, -70, 0, 60);
  g.addColorStop(0, '#fff3d8');
  g.addColorStop(0.35, '#c9b9a0');
  g.addColorStop(0.6, '#5d4a3c');
  g.addColorStop(1, '#1c1210');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(-170, 18);
  ctx.bezierCurveTo(-150, -40, -60, -88, 0, -104); // up to the nose
  ctx.bezierCurveTo(60, -88, 150, -40, 170, 18);
  ctx.bezierCurveTo(120, 52, -120, 52, -170, 18);
  ctx.closePath();
  ctx.fill();
  // Rim light from the sun (upper right).
  ctx.strokeStyle = 'rgba(255,220,150,0.9)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(0, -104);
  ctx.bezierCurveTo(60, -88, 150, -40, 170, 18);
  ctx.stroke();
  // Tail band of red light.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.strokeStyle = 'rgba(255,70,40,0.9)';
  ctx.lineWidth = 4;
  ctx.shadowColor = '#ff4020';
  ctx.shadowBlur = 16;
  ctx.beginPath();
  ctx.moveTo(-120, 34);
  ctx.bezierCurveTo(-60, 46, 60, 46, 120, 34);
  ctx.stroke();
  ctx.restore();
  // Glass bubble with the pilot.
  g = ctx.createRadialGradient(-14, -52, 4, 0, -38, 54);
  g.addColorStop(0, 'rgba(255,240,210,0.95)');
  g.addColorStop(0.3, 'rgba(120,150,170,0.75)');
  g.addColorStop(1, 'rgba(20,24,34,0.95)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, -36, 50, 34, 0, Math.PI, 0);
  ctx.bezierCurveTo(46, -22, -46, -22, -50, -36);
  ctx.fill();
  ctx.fillStyle = 'rgba(10,8,12,0.75)';
  ctx.beginPath();
  ctx.arc(0, -46, 9, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillRect(-12, -38, 24, 12);
  // Turbine pods.
  for (const [px, py] of pods) {
    g = ctx.createLinearGradient(px - 30, py - 30, px + 30, py + 30);
    g.addColorStop(0, '#e8dcc4');
    g.addColorStop(0.5, '#6a5546');
    g.addColorStop(1, '#1a100c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(px, py - 10, 34, 40, 0, 0, Math.PI * 2);
    ctx.fill();
    // Ribs.
    ctx.strokeStyle = 'rgba(20,12,10,0.6)';
    ctx.lineWidth = 1.5;
    for (let r = -2; r <= 2; r++) {
      ctx.beginPath();
      ctx.ellipse(px, py - 10 + r * 7, 33 - Math.abs(r) * 3, 6, 0, 0, Math.PI);
      ctx.stroke();
    }
    // Nozzle, white-hot.
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    g = ctx.createRadialGradient(px, py + 14, 0, px, py + 14, 34);
    g.addColorStop(0, 'rgba(255,255,240,1)');
    g.addColorStop(0.35, 'rgba(255,210,110,0.95)');
    g.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(px, py + 14, 34, 22, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  // The shock ring of a gear change, just broken through, upright and opening toward us.
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const ph = (t * 0.55) % 1;
  const R0 = 230 + ph * 60;
  for (const [lw, a2] of [
    [34, 0.1],
    [12, 0.3],
    [3.5, 0.95],
  ]) {
    ctx.strokeStyle = `rgba(255,${lw < 5 ? 240 : 190},${lw < 5 ? 200 : 100},${a2 * (1 - ph * 0.6)})`;
    ctx.lineWidth = lw;
    ctx.beginPath();
    ctx.ellipse(-10, 20, R0, R0 * 0.82, -0.2, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();
  ctx.restore();
}

// A booster's fire: a long tapered tongue streaming toward the viewer and down the road.
function plume(ctx: Ctx, x: number, y: number, t: number, lean: number) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const len = 560;
  // Bloom around the whole jet.
  const bg = ctx.createRadialGradient(x, y + 120, 0, x, y + 120, 240);
  bg.addColorStop(0, 'rgba(255,150,50,0.42)');
  bg.addColorStop(1, 'rgba(255,90,20,0)');
  ctx.fillStyle = bg;
  ctx.fillRect(x - 260, y - 120, 520, 520);
  for (let layer = 0; layer < 4; layer++) {
    const wd = [130, 96, 56, 24][layer];
    const col = [
      'rgba(150,20,10,0.55)',
      'rgba(235,70,15,0.75)',
      'rgba(255,190,80,0.8)',
      'rgba(255,250,225,1)',
    ][layer];
    ctx.globalCompositeOperation = layer < 2 ? 'source-over' : 'lighter';
    const ll = len * [1, 0.85, 0.6, 0.35][layer];
    ctx.fillStyle = col;
    ctx.filter = `blur(${[10, 6, 3, 1][layer]}px)`;
    ctx.beginPath();
    ctx.moveTo(x - wd / 2, y);
    const steps = 14;
    const pts: P3[] = [];
    for (let i = 0; i <= steps; i++) {
      const v = i / steps;
      const w = (wd / 2) * (1 - v) ** 0.8 * (1 + 0.25 * Math.sin(t * 23 + v * 9 + x));
      const cx = x + lean * ll * v + Math.sin(t * 17 + v * 6 + layer) * 6 * v;
      const cy = y + ll * v;
      pts.push([cx, cy, w]);
    }
    pts.forEach(([cx, cy, w]) => ctx.lineTo(cx - w, cy));
    for (let i = pts.length - 1; i >= 0; i--) ctx.lineTo(pts[i][0] + pts[i][2], pts[i][1]);
    ctx.closePath();
    ctx.fill();
  }
  ctx.filter = 'none';
  // Shock diamonds in the core.
  for (let i = 0; i < 5; i++) {
    const v = 0.08 + i * 0.13 + ((t * 3) % 1) * 0.02;
    const dy = y + len * 0.6 * v;
    const dx = x + lean * len * 0.6 * v;
    const r = 13 * (1 - v);
    ctx.fillStyle = `rgba(255,255,235,${0.85 - i * 0.14})`;
    ctx.beginPath();
    ctx.moveTo(dx, dy - r * 1.6);
    ctx.lineTo(dx + r, dy);
    ctx.lineTo(dx, dy + r * 1.6);
    ctx.lineTo(dx - r, dy);
    ctx.closePath();
    ctx.fill();
  }
  // Sparks thrown off the plume.
  const r = mulberry(Math.floor(x) + 99);
  for (let i = 0; i < 26; i++) {
    const ph = (t * (0.9 + r()) + r()) % 1;
    const sx = x + (r() - 0.5) * 60 + lean * 300 * ph + (r() - 0.5) * 140 * ph;
    const sy = y + 40 + ph * 380;
    ctx.fillStyle = `rgba(255,${190 + r() * 60},${90 + r() * 80},${(1 - ph) * 0.9})`;
    ctx.fillRect(sx, sy, 2.4, 2.4 + ph * 6);
  }
  ctx.restore();
}

// A burner's flame standing on the road's edge.
function flame(
  ctx: Ctx,
  x: number,
  y: number,
  w: number,
  h0: number,
  lean: number,
  ph: number,
  a: number,
) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const fl = 0.8 + 0.3 * Math.sin(ph) * Math.sin(ph * 1.7 + 1);
  const h = h0 * fl;
  const layers: [number, string, number][] = [
    [1, 'rgba(220,60,20,', 0.45],
    [0.7, 'rgba(255,150,40,', 0.6],
    [0.4, 'rgba(255,235,170,', 0.85],
  ];
  for (const [s, c, al] of layers) {
    const ww = w * s;
    const hh = h * (0.5 + s * 0.5);
    ctx.fillStyle = `${c}${al * a})`;
    ctx.beginPath();
    ctx.moveTo(x - ww / 2, y);
    ctx.quadraticCurveTo(x - ww * 0.6 + lean * hh * 0.3, y - hh * 0.5, x + lean * hh, y - hh);
    ctx.quadraticCurveTo(x + ww * 0.6 + lean * hh * 0.3, y - hh * 0.5, x + ww / 2, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function mesas(ctx: Ctx, hz: number, col: string, hk: number, seed: number) {
  const r = mulberry(seed);
  ctx.fillStyle = col;
  ctx.beginPath();
  ctx.moveTo(0, hz + 2);
  let x = -40;
  while (x < 1640) {
    const w = 120 + r() * 260;
    const h = (r() < 0.45 ? 20 + r() * 70 : 4 + r() * 14) * hk;
    const slope = 18 + r() * 30;
    ctx.lineTo(x + slope, hz - h);
    ctx.lineTo(x + w - slope, hz - h);
    ctx.lineTo(x + w, hz);
    x += w + r() * 60;
  }
  ctx.lineTo(1640, hz + 2);
  ctx.closePath();
  ctx.fill();
}
function towers(ctx: Ctx, r: () => number, hz: number) {
  for (let i = 0; i < 14; i++) {
    const x = 120 + r() * 1360;
    if (Math.abs(x - 1200) < 90) continue;
    const h = 40 + r() ** 2 * 150;
    const w = 6 + r() * 10;
    ctx.fillStyle = 'rgba(54,18,32,0.9)';
    ctx.fillRect(x, hz - h, w, h);
    ctx.fillRect(x + w / 2 - 0.8, hz - h - 18, 1.6, 18);
    ctx.fillStyle = 'rgba(255,190,90,0.85)';
    for (let j = 0; j < h / 14; j++)
      if (r() < 0.35) ctx.fillRect(x + 2, hz - h + 6 + j * 14, w - 4, 2);
    ctx.fillStyle = 'rgba(255,80,50,0.9)';
    ctx.fillRect(x + w / 2 - 1.5, hz - h - 20, 3, 3);
  }
}
function poly(ctx: Ctx, L: P2[], R: P2[]) {
  ctx.beginPath();
  L.forEach((p, i) => {
    if (i) ctx.lineTo(p[0], p[1]);
    else ctx.moveTo(p[0], p[1]);
  });
  for (let i = R.length - 1; i >= 0; i--) ctx.lineTo(R[i][0], R[i][1]);
  ctx.closePath();
}
function shade(hex: string, f: number) {
  const n = parseInt(hex.slice(1), 16);
  const c = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => Math.min(255, Math.round(v * f)));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}
function mulberry(seed: number) {
  let a = seed;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
