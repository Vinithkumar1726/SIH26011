/**
 * SIH26011 - Parcels API Endpoints
 */
import { api } from '../client';
import type { ApiResponse } from '../types';
import type { ParcelGeometry, ParcelHierarchyResponse } from '../types';

export const parcelsApi = {
  list: () => api.getParcels() as Promise<ApiResponse<ParcelGeometry[]>>,
  get: (id: string) => api.getParcel(id) as Promise<ApiResponse<ParcelHierarchyResponse>>,
};