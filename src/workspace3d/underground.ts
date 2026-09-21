/**
 * Synthetic underground utility routing (DEMO ONLY — not surveyed).
 *
 * DATA (generated, see derivation in commit history): for each building,
 * nearby road triangles (centroid within 150 m of the building in
 * GLB-local metres) were fitted to a long axis; each run below is the
 * longest contiguous stretch of that axis staying within 4 m of real
 * road surface (worst deviation 2.0–4.0 m), laid at 2 m depth.
 * Coordinates are GLB-local [x, z] (x east, z = -north). Regenerate the data section — do not hand-edit it.
 *
 * MATH (hand-written): segment-to-box clearance helpers below.
 */
export interface SyntheticPipe {
  id: string;
  buildingId: string;
  /** endpoints in GLB-local metres [x, z] */
  a: [number, number];
  b: [number, number];
  depthM: number;
}

export const PIPE_DEPTH_M = 2;

export const SYNTHETIC_PIPES: SyntheticPipe[] = [
  {
    "id": "syn-pipe-101-1",
    "buildingId": "BLDG-101",
    "a": [
      -52.02,
      84.52
    ],
    "b": [
      -28.18,
      141.76
    ],
    "depthM": 2
  },
  {
    "id": "syn-pipe-101-2",
    "buildingId": "BLDG-101",
    "a": [
      -53.4,
      85.1
    ],
    "b": [
      -30.33,
      140.49
    ],
    "depthM": 2
  },
  {
    "id": "syn-pipe-102-1",
    "buildingId": "BLDG-102",
    "a": [
      68.18,
      -45.08
    ],
    "b": [
      78.2,
      -69.07
    ],
    "depthM": 2
  },
  {
    "id": "syn-pipe-102-2",
    "buildingId": "BLDG-102",
    "a": [
      20.08,
      77.88
    ],
    "b": [
      30.1,
      53.89
    ],
    "depthM": 2
  }
];

// ─── Clearance math (hand-written, pure) ─────────────────────────────

export type Vec3 = [number, number, number];
export interface Box3 {
  min: Vec3;
  max: Vec3;
}

/** Distance thresholds in metres for pipe-to-foundation clearance. */
export const CLEARANCE_CONFLICT_M = 1.0;
export const CLEARANCE_BUFFER_M = 3.0;

export type Clearance = 'Clear' | 'Within buffer' | 'Conflict';

export function classifyClearance(d: number): Clearance {
  if (d < CLEARANCE_CONFLICT_M) return 'Conflict';
  if (d <= CLEARANCE_BUFFER_M) return 'Within buffer';
  return 'Clear';
}

function segSegDist(p1: Vec3, q1: Vec3, p2: Vec3, q2: Vec3): number {
  const d1 = [q1[0] - p1[0], q1[1] - p1[1], q1[2] - p1[2]];
  const d2 = [q2[0] - p2[0], q2[1] - p2[1], q2[2] - p2[2]];
  const r = [p1[0] - p2[0], p1[1] - p2[1], p1[2] - p2[2]];
  const a = d1[0] * d1[0] + d1[1] * d1[1] + d1[2] * d1[2];
  const e = d2[0] * d2[0] + d2[1] * d2[1] + d2[2] * d2[2];
  const f = d2[0] * r[0] + d2[1] * r[1] + d2[2] * r[2];
  const eps = 1e-12;
  let s: number;
  let t: number;
  if (a <= eps && e <= eps) {
    return Math.hypot(r[0], r[1], r[2]);
  }
  if (a <= eps) {
    s = 0;
    t = Math.min(1, Math.max(0, f / e));
  } else {
    const c = d1[0] * r[0] + d1[1] * r[1] + d1[2] * r[2];
    if (e <= eps) {
      t = 0;
      s = Math.min(1, Math.max(0, -c / a));
    } else {
      const b = d1[0] * d2[0] + d1[1] * d2[1] + d1[2] * d2[2];
      const denom = a * e - b * b;
      s = denom > eps ? Math.min(1, Math.max(0, (b * f - c * e) / denom)) : 0;
      t = (b * s + f) / e;
      if (t < 0) {
        t = 0;
        s = Math.min(1, Math.max(0, -c / a));
      } else if (t > 1) {
        t = 1;
        s = Math.min(1, Math.max(0, (b - c) / a));
      }
    }
  }
  const c1 = [p1[0] + d1[0] * s, p1[1] + d1[1] * s, p1[2] + d1[2] * s];
  const c2 = [p2[0] + d2[0] * t, p2[1] + d2[1] * t, p2[2] + d2[2] * t];
  return Math.hypot(c1[0] - c2[0], c1[1] - c2[1], c1[2] - c2[2]);
}

/** Exact 3D distance from segment p0-p1 to an axis-aligned box (0 if crossing). */
export function segBoxDist(p0: Vec3, p1: Vec3, box: Box3): number {
  const d = [p1[0] - p0[0], p1[1] - p0[1], p1[2] - p0[2]];
  let tmin = 0;
  let tmax = 1;
  for (let i = 0; i < 3; i++) {
    if (Math.abs(d[i]) < 1e-12) {
      if (p0[i] < box.min[i] || p0[i] > box.max[i]) {
        tmin = 1;
        tmax = 0;
        break;
      }
    } else {
      let t1 = (box.min[i] - p0[i]) / d[i];
      let t2 = (box.max[i] - p0[i]) / d[i];
      if (t1 > t2) {
        const tmp = t1;
        t1 = t2;
        t2 = tmp;
      }
      tmin = Math.max(tmin, t1);
      tmax = Math.min(tmax, t2);
      if (tmin > tmax) break;
    }
  }
  if (tmin <= tmax) return 0;
  let best = Infinity;
  const corners: Vec3[] = [];
  for (const x of [box.min[0], box.max[0]]) {
    for (const y of [box.min[1], box.max[1]]) {
      for (const z of [box.min[2], box.max[2]]) corners.push([x, y, z]);
    }
  }
  const edges: Array<[Vec3, Vec3]> = [
    [corners[0], corners[1]], [corners[0], corners[2]], [corners[1], corners[3]],
    [corners[2], corners[3]], [corners[4], corners[5]], [corners[4], corners[6]],
    [corners[5], corners[7]], [corners[6], corners[7]], [corners[0], corners[4]],
    [corners[1], corners[5]], [corners[2], corners[6]], [corners[3], corners[7]],
  ];
  for (const [a, b] of edges) best = Math.min(best, segSegDist(p0, p1, a, b));
  // endpoint-to-box distances
  for (const p of [p0, p1]) {
    const q: Vec3 = [
      Math.min(Math.max(p[0], box.min[0]), box.max[0]),
      Math.min(Math.max(p[1], box.min[1]), box.max[1]),
      Math.min(Math.max(p[2], box.min[2]), box.max[2]),
    ];
    best = Math.min(best, Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]));
  }
  return best;
}
