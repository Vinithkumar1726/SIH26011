/**
 * SIH26011 - Auth API Endpoints
 */
import { api } from '../client';
import type { ApiResponse } from '../types';
import type { LoginResponse, RefreshResponse, UserInfo, LoginRequest } from '../types';

export const authApi = {
  login: (credentials: LoginRequest) => api.login(credentials.username, credentials.password) as Promise<ApiResponse<LoginResponse>>,
  refresh: () => api.refresh() as Promise<ApiResponse<RefreshResponse>>,
  getMe: () => api.getCurrentUser() as Promise<ApiResponse<UserInfo>>,
  logout: () => api.logout(),
  isAuthenticated: () => api.isAuthenticated(),
};