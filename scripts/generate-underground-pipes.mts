/**
 * Regenerate synthetic underground utility routing from the real OSM road
 * ribbon geometry in public/coimbatore/city.glb.
 *
 * Method (same as the original derivation): for each given building, take
 * road triangles whose centroid lies within 150 m of the building in
 * GLB-local metres, fit their long axis (PCA), walk it every 2 m keeping
 * samples within 4 m of real road surface, and emit the two longest
 * on-road runs (>= 25 m) as parallel pipes at 2 m depth.
 *
 * Usage:
 *   npm run generate:underground -- [--city <glb>] [--meta <json>]
 *     [--out <ts>] [--building ID:LON:LAT]...
 * Defaults cover the two live Coimbatore buildings (positions as returned
 * by GET /api/buildings). Output defaults to
 * src/workspace3d/underground.generated.ts (review before adopting).
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const args = process.argv.slice(2);
const opt = (name: string, fallback: string): string => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const CITY = opt('--city', 'public/coimbatore/city.glb');
const META = opt('--meta', 'public/coimbatore/meta.json');
const OUT = opt('--out', 'src/workspace3d/underground.generated.ts');
const buildings: Array<{ id: string; lon: number; lat: number }> = [];
for (let i = 0; i < args.length; i++) {
  if (args[i] === '--building' && args[i + 1]) {
    const [id, lon, lat] = args[i + 1].split(':');
    buildings.push({ id, lon: Number(lon), lat: Number(lat) });
  }
}
if (buildings.length === 0) {
  buildings.push(
    { id: 'BLDG-101', lon: 76.960225, lat: 11.00915 },
    { id: 'BLDG-102', lon: 76.961725, lat: 11.009675 },
  );
}

const R_NEAR = 150;
const ON_ROAD = 4;
const MIN_RUN = 25;
const DEPTH = 2.0;

const buf = readFileSync(CITY);
const gltf = await new GLTFLoader().parseAsync(
  buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength), '',
);
let roads: any = null;
gltf.scene.traverse((o: any) => {
  if (o.isMesh && String(o.name || '').toLowerCase().startsWith('roads')) roads = o;
});
if (!roads) throw new Error('roads mesh not found in ' + CITY);
const pos = roads.geometry.attributes.position;
const idx = roads.geometry.index.array;
const tris: Array<[[number, number], [number, number], [number, number]]> = [];
for (let t = 0; t < idx.length; t += 3) {
  tris.push([
    [pos.getX(idx[t]), pos.getZ(idx[t])],
    [pos.getX(idx[t + 1]), pos.getZ(idx[t + 1])],
    [pos.getX(idx[t + 2]), pos.getZ(idx[t + 2])],
  ]);
}
const boxes = tris.map((tr) => [
  Math.min(tr[0][0], tr[1][0], tr[2][0]), Math.max(tr[0][0], tr[1][0], tr[2][0]),
  Math.min(tr[0][1], tr[1][1], tr[2][1]), Math.max(tr[0][1], tr[1][1], tr[2][1]),
]);
const ptTri = (px: number, pz: number, tr: [[number, number], [number, number], [number, number]]): number => {
  const [a, b, c] = tr;
  const s = (p: number[], q: number[], r: number[]) =>
    (q[0] - p[0]) * (r[1] - p[1]) - (q[1] - p[1]) * (r[0] - p[0]);
  const dseg = (x: number, z: number, p: number[], q: number[]) => {
    const dx = q[0] - p[0], dz = q[1] - p[1], l2 = dx * dx + dz * dz;
    const tt = l2 > 0 ? Math.min(1, Math.max(0, ((x - p[0]) * dx + (z - p[1]) * dz) / l2)) : 0;
    return Math.hypot(x - (p[0] + tt * dx), z - (p[1] + tt * dz));
  };
  const p = [px, pz];
  const d1 = s(p, a, b), d2 = s(p, b, c), d3 = s(p, c, a);
  if ((d1 >= 0 && d2 >= 0 && d3 >= 0) || (d1 <= 0 && d2 <= 0 && d3 <= 0)) return 0;
  return Math.min(dseg(px, pz, a, b), dseg(px, pz, b, c), dseg(px, pz, c, a));
};
const roadDist = (x: number, z: number): number => {
  let best = Infinity;
  for (let t = 0; t < tris.length; t++) {
    const bb = boxes[t];
    if (bb[0] - 1 > x || bb[1] + 1 < x || bb[2] - 1 > z || bb[3] + 1 < z) continue;
    const d = ptTri(x, z, tris[t]);
    if (d < best) best = d;
    if (best === 0) break;
  }
  return best;
};

const meta = JSON.parse(readFileSync(META, 'utf8'));
const M_LAT = 111320;
const toGLB = (lon: number, lat: number): [number, number] => [
  (lon - meta.origin.lon) * M_LAT * Math.cos((meta.origin.lat * Math.PI) / 180),
  -((lat - meta.origin.lat) * M_LAT),
];

const allPipes: Array<{ id: string; buildingId: string; a: [number, number]; b: [number, number]; depthM: number }> = [];
for (const bd of buildings) {
  const bp = toGLB(bd.lon, bd.lat);
  const near = tris.filter((tr) => {
    const cx = (tr[0][0] + tr[1][0] + tr[2][0]) / 3;
    const cz = (tr[0][1] + tr[1][1] + tr[2][1]) / 3;
    return Math.hypot(cx - bp[0], cz - bp[1]) <= R_NEAR;
  });
  if (near.length === 0) {
    console.log(`${bd.id}: no nearby road triangles`);
    continue;
  }
  const vs = near.flat();
  const mx = vs.reduce((s, p) => s + p[0], 0) / vs.length;
  const mz = vs.reduce((s, p) => s + p[1], 0) / vs.length;
  let sxx = 0, sxz = 0, szz = 0;
  for (const [x, z] of vs) {
    sxx += (x - mx) * (x - mx);
    sxz += (x - mx) * (z - mz);
    szz += (z - mz) * (z - mz);
  }
  const ang = 0.5 * Math.atan2(2 * sxz, sxx - szz);
  const ux = Math.cos(ang), uz = Math.sin(ang);
  const px = -uz, pz = ux;
  const cands: Array<{ off: number; len: number; worst: number; A: [number, number]; Cc: [number, number] }> = [];
  for (const off of [0, -1.5, 1.5]) {
    const line: Array<[number, number]> = [];
    for (let s = -150; s <= 150; s += 2) line.push([mx + ux * s + px * off, mz + uz * s + pz * off]);
    const ok = line.map(([x, z]) => roadDist(x, z) <= ON_ROAD);
    let b0 = 0, b1 = -1, c0 = 0;
    for (let i = 0; i <= ok.length; i++) {
      if (i < ok.length && ok[i]) {
        if (i === 0 || !ok[i - 1]) c0 = i;
      } else if (i > 0 && ok[i - 1] && i - c0 > b1 - b0) {
        b0 = c0;
        b1 = i;
      }
    }
    const len = (b1 - b0) * 2;
    if (len < MIN_RUN) continue;
    const s0 = b0 * 2 - 150, s1 = (b1 - 1) * 2 - 150;
    const A: [number, number] = [mx + ux * s0 + px * off, mz + uz * s0 + pz * off];
    const Cc: [number, number] = [mx + ux * s1 + px * off, mz + uz * s1 + pz * off];
    let worst = 0;
    for (let k = 0; k <= 20; k++) {
      const x = A[0] + ((Cc[0] - A[0]) * k) / 20, z = A[1] + ((Cc[1] - A[1]) * k) / 20;
      worst = Math.max(worst, roadDist(x, z));
    }
    cands.push({ off, len, worst, A, Cc });
  }
  cands.sort((x, y) => x.worst - y.worst);
  const suffix = bd.id.slice(-3).toLowerCase();
  cands.slice(0, 2).forEach((c, k) => {
    allPipes.push({
      id: `syn-pipe-${suffix}-${k + 1}`,
      buildingId: bd.id,
      a: [+c.A[0].toFixed(2), +c.A[1].toFixed(2)],
      b: [+c.Cc[0].toFixed(2), +c.Cc[1].toFixed(2)],
      depthM: DEPTH,
    });
    console.log(`${bd.id}: pipe off=${c.off} len=${c.len.toFixed(0)}m worst=${c.worst.toFixed(1)}m`);
  });
  if (cands.length === 0) console.log(`${bd.id}: no on-road run >= ${MIN_RUN}m`);
}

const out = `/**
 * GENERATED FILE — do not hand-edit. Regenerate with:
 *   npm run generate:underground
 * Synthetic demo utilities routed on real OSM road surface (see generator).
 */
export interface SyntheticPipe {
  id: string;
  buildingId: string;
  /** endpoints in GLB-local metres [x, z] */
  a: [number, number];
  b: [number, number];
  depthM: number;
}

export const PIPE_DEPTH_M = ${DEPTH};

export const SYNTHETIC_PIPES: SyntheticPipe[] = ${JSON.stringify(allPipes, null, 2)};
`;
writeFileSync(OUT, out);
console.log(`wrote ${OUT} with ${allPipes.length} pipes`);
