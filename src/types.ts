export type Screen =
  | 'dashboard'
  | 'import'
  | 'explorer'
  | 'records'
  | 'property-detail'
  | 'validation'
  | 'identifiers'
  | 'ai-review'
  | 'audit'
  | 'settings';

export type ImportStep = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface PropertyUnit {
  id: string;
  buildingId: string;
  floorId: string;
  floorNo: number;
  zMin: number;
  zMax: number;
  area: number;
  volume: number;
  spatialId: string;
  geometryHash: string;
  version: string;
  status: 'VALID' | 'WARNING' | 'ERROR';
}
