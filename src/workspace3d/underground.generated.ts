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
      -50.63,
      83.94
    ],
    "b": [
      -26.8,
      141.18
    ],
    "depthM": 2
  },
  {
    "id": "syn-pipe-101-2",
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
    "id": "syn-pipe-102-1",
    "buildingId": "BLDG-102",
    "a": [
      17.93,
      79.15
    ],
    "b": [
      29.49,
      51.46
    ],
    "depthM": 2
  },
  {
    "id": "syn-pipe-102-2",
    "buildingId": "BLDG-102",
    "a": [
      16.54,
      78.57
    ],
    "b": [
      28.1,
      50.89
    ],
    "depthM": 2
  }
];
