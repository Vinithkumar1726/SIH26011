/**
 * SIH26011 - 3D Geometry API Endpoints
 */
import { api } from '../client';
import type { ApiResponse } from '../types';
import type { GeometryData } from '../types';

export const geometry3dApi = {
  getGeometry: () => api.get3DGeometry() as Promise<ApiResponse<GeometryData>>,
};