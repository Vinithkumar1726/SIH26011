/**
 * SIH26011 - Cadastral Parcels API Endpoints
 */
import { api } from '../client';
import type { ApiResponse } from '../types';
import type { CadastralParcel, CadastralParcelDetail } from '../types';

export const cadastralParcelsApi = {
  list: () => api.getCadastralParcels() as Promise<ApiResponse<CadastralParcel[]>>,
  get: (parcelId: string) => api.getCadastralParcel(parcelId) as Promise<ApiResponse<CadastralParcelDetail>>,
};