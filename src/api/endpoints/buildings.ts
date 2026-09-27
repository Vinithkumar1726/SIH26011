/**
 * SIH26011 - Buildings API Endpoints
 */
import { api } from '../client';
import type { ApiResponse } from '../types';
import type { BuildingListResponse, BuildingResponse } from '../types';

export const buildingsApi = {
  list: () => api.getBuildings() as Promise<ApiResponse<BuildingListResponse[]>>,
  get: (id: string) => api.getBuilding(id) as Promise<ApiResponse<BuildingResponse>>,
};