/**
 * SIH26011 - Spatial Identifiers API Endpoints
 */
import { api } from '../client';
import type { ApiResponse } from '../types';
import type { SpatialIdentifierResponse } from '../types';

export const spatialIdsApi = {
  list: () => api.getSpatialIdentifiers() as Promise<ApiResponse<SpatialIdentifierResponse[]>>,
};