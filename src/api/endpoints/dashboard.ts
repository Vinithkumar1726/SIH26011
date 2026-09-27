/**
 * SIH26011 - Dashboard API Endpoints
 */
import { api } from '../client';
import type { ApiResponse } from '../types';
import type { DashboardStats, BuildingHeightRange, ValidationState } from '../types';

export const dashboardApi = {
  getStats: () => api.getDashboardStats() as Promise<ApiResponse<DashboardStats>>,
  getStatistics: () => api.getStatistics() as Promise<ApiResponse<DashboardStats>>,
  getBuildingsByHeight: () => api.getBuildingsByHeight() as Promise<ApiResponse<BuildingHeightRange[]>>,
  getValidationState: () => api.getValidationState() as Promise<ApiResponse<ValidationState>>,
};