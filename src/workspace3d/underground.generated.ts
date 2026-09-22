/**
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
