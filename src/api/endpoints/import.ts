/**
 * SIH26011 - Import API Endpoints
 */
import { api } from '../client';
import type { ApiResponse } from '../types';
import type { ImportAnalyzeResponse, PersistResponse } from '../types';

export const importApi = {
  analyze: (files: { parcel?: File; buildings?: File; floors?: File; units?: File }) =>
    api.analyzeImport(files) as Promise<ApiResponse<ImportAnalyzeResponse>>,
  
  persist: (files: { parcel?: File; buildings?: File; floors?: File; units?: File }, userRole?: string) =>
    api.persistImport(files, userRole) as Promise<ApiResponse<PersistResponse>>,
};