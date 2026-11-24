/**
 * Chinatown Run's publicity panels drawn (lib/art/chinatown-street.ts lays them out): every blade
 * sign and board lettered on one canvas atlas, drawn once, and one shared material, so a chunk's
 * signs are a single mesh. Steady light: the material is a plain glow, nothing flashes.
 */

import * as THREE from 'three';
import {
  CT_ATLAS,
  CT_BLADE_PAD,
  CT_BLADE_STEP,
  CT_TONES,
  ctCell,
  ctCellRect,
} from '@/lib/art/chinatown-street';

let atlas: THREE.Texture | null | undefined;

/** The atlas (null without a canvas, as in tests). */
export function ctAtlas(): THREE.Texture | null {
  if (atlas !== undefined) return atlas;
  atlas = null;
  if (typeof document === 'undefined') return null;
  const cv = document.createElement('canvas');
  cv.width = CT_ATLAS.size;
  cv.height = CT_ATLAS.size;
  const g = cv.getContext('2d');
  if (!g) return null;
  g.textAlign = 'center';
  g.textBaseline = 'middle';
  for (const kind of ['blade', 'board'] as const) {
    for (let c = 0; c < CT_ATLAS.cells; c++) {
      const { word, tone } = ctCell(kind, c);
      const { ink, bg } = CT_TONES[tone];
      const r = ctCellRect(kind, c);
      g.fillStyle = bg;
      g.fillRect(r.x, r.y, r.w, r.h);
      // A frame and a fine inner line, as the City's hanging boards.
      g.strokeStyle = ink;
      g.lineWidth = 6;
      g.strokeRect(r.x + 6, r.y + 6, r.w - 12, r.h - 12);
      g.lineWidth = 2;
      g.strokeRect(r.x + 14, r.y + 14, r.w - 28, r.h - 28);
      g.fillStyle = ink;
      if (kind === 'blade') {
        g.font = 'bold 90px "Noto Sans JP", "Yu Gothic", "Microsoft YaHei", sans-serif';
        [...word].forEach((ch, i) => {
          g.fillText(ch, r.x + r.w / 2, r.y + CT_BLADE_PAD + CT_BLADE_STEP * (i + 0.5) + 2);
        });
      } else {
        g.font = 'bold 80px "Noto Serif SC", "Yu Mincho", "SimSun", serif';
        const fit = (r.w - 56) / Math.max(1, g.measureText(word).width);
        if (fit < 1) g.font = `bold ${Math.floor(80 * fit)}px "Noto Serif SC", "Yu Mincho", serif`;
        g.fillText(word, r.x + r.w / 2, r.y + r.h / 2 + 4);
      }
    }
  }
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  atlas = tex;
  return tex;
}

let material: THREE.MeshBasicMaterial | null = null;

/** The signs' one material: the atlas as a steady glow, fading into the fog (null without it). */
export function ctSignMaterial(): THREE.MeshBasicMaterial | null {
  if (material) return material;
  const map = ctAtlas();
  if (!map) return null;
  material = new THREE.MeshBasicMaterial({ map, toneMapped: false });
  material.color.setScalar(1.45);
  material.userData.shared = true;
  return material;
}

type V3 = [number, number, number];

/** A chunk's lettered quads, gathered into one geometry. */
export class SignBuilder {
  pos: number[] = [];
  uv: number[] = [];
  /** A quad a-b-c-d, a its bottom left as its reader sees it (counter-clockwise to them). */
  quad(a: V3, b: V3, c: V3, d: V3, r: readonly [number, number, number, number]) {
    const [u0, v0, u1, v1] = r;
    const P = [a, b, c, a, c, d];
    const U = [u0, v0, u1, v0, u1, v1, u0, v0, u1, v1, u0, v1];
    for (const p of P) this.pos.push(p[0], p[1], p[2]);
    this.uv.push(...U);
  }
  get empty() {
    return this.pos.length === 0;
  }
  geometry(): THREE.BufferGeometry {
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(this.pos, 3));
    g.setAttribute('uv', new THREE.Float32BufferAttribute(this.uv, 2));
    return g;
  }
}
