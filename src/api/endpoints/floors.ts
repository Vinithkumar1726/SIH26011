/**
 * SIH26011 - Floors API Endpoints
 */
import { api } from '../client';
import type { ApiResponse } from '../types';
import type { FloorResponse } from '../types';

export const floorsApi = {
  list: () => api.getFloors() as Promise<ApiResponse<FloorResponse[]>>,
  get: (id: string) => api.getFloor(id) as Promise<ApiResponse<FloorResponse>>,
};