/**
 * SIH26011 - Units API Endpoints
 */
import { api } from '../client';
import type { ApiResponse } from '../types';
import type { UnitResponse, PropertyDetailResponse, UnitGeometryUpdateRequest, UnitGeometryUpdateResponse, UnitHistoryResponse } from '../types';

export const unitsApi = {
  list: () => api.getUnits() as Promise<ApiResponse<UnitResponse[]>>,
  get: (id: string) => api.getUnit(id) as Promise<ApiResponse<UnitResponse>>,
  getDetail: (id: string) => api.getPropertyDetail(id) as Promise<ApiResponse<PropertyDetailResponse>>,
  updateGeometry: (id: string, request: UnitGeometryUpdateRequest) => 
    api.updateUnitGeometry(id, request) as Promise<ApiResponse<UnitGeometryUpdateResponse>>,
  getHistory: (id: string) => api.getUnitHistory(id) as Promise<ApiResponse<UnitHistoryResponse>>,
};