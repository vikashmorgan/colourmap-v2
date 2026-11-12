/*
 * Grain meshes (lib/grain-mesh.ts) in the City game: a mesh built once in its own frame, drawn as
 * the Ship's light sites at a place and a size. The business towers, the Nova Core of the Heights,
 * the docks, the rooms and the embassies all go through here. Pure: no three.js, no DOM.
 */

import { makeParticles, type Particle, type RGB, type Vec3 } from './bigbang';
import { GROUND } from './city-grid';
import { type Built, type Hit, onMesh, type Shares } from './grain-mesh';

/** Grains to sample a mesh with: their golden-sequence numbers pick the elements fairly. */
export const MESH_GRAINS = 4096;
const GRAINS: Particle[] = makeParticles(MESH_GRAINS);

/** A mesh's colours: each tone (and key) to a colour, already at its strength. */
export type Palette = (h: Hit, t: number) => RGB;

/** A mesh placed in the city: its foot at `at` (the mesh's ground at GROUND), scaled by `sc`. */
export type Placed = { B: Built; at: Vec3; sc: number; shares: Shares; palette: Palette };

/**
 * Site s of a placed mesh (s under MESH_GRAINS), seen from `eye`: its place into o[0..2] and its
 * colour, times k, into o[3..5]. Faces are lit by how squarely they face the eye, as in the Studio.
 */
export function meshSite(P: Placed, s: number, t: number, eye: Vec3, k: number, o: number[]) {
  const p = GRAINS[s % MESH_GRAINS] as Particle;
  const { at, sc } = P;
  const local: Vec3 = [
    (eye[0] - at[0]) / sc,
    GROUND + (eye[1] - at[1]) / sc,
    (eye[2] - at[2]) / sc,
  ];
  const h = onMesh(P.B, p, p.c, t, local, P.shares);
  o[0] = at[0] + h.pos[0] * sc;
  o[1] = at[1] + (h.pos[1] - GROUND) * sc;
  o[2] = at[2] + h.pos[2] * sc;
  const c = P.palette(h, t);
  const m = k * h.lit;
  o[3] = Math.max(0, c[0] * m);
  o[4] = Math.max(0, c[1] * m);
  o[5] = Math.max(0, c[2] * m);
  return true;
}
