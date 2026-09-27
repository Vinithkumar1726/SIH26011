/**
 * SIH26011 - Base API Client
 * Handles HTTP requests, JWT token injection, error handling
 */

import type { ApiResponse } from './types';

// Use relative URLs so Vite proxy can forward to backend
const BASE_URL = '';

// Token storage keys
const ACCESS_TOKEN_KEY = 'sih26011_access_token';
const REFRESH_TOKEN_KEY = 'sih26011_refresh_token';

export class ApiClient {
  private accessToken: string | null = null;
  private refreshPromise: Promise<string | null> | null = null;

  constructor() {
    // Load token from localStorage on init
    this.accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  }

  // Token management
  setAccessToken(token: string | null) {
    this.accessToken = token;
    if (token) {
      localStorage.setItem(ACCESS_TOKEN_KEY, token);
    } else {
      localStorage.removeItem(ACCESS_TOKEN_KEY);
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  clearTokens() {
    this.accessToken = null;
    localStorage.removeItem(ACCESS_TOKEN_KEY);
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  // Core request method with JWT injection
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    // Inject JWT if available
    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await fetch(url, {
        ...options,
        headers,
      });

      // Handle 401 - try to refresh token once
      if (response.status === 401 && this.accessToken) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          // Retry with new token
          (headers as Record<string, string>)['Authorization'] = `Bearer ${refreshed}`;
          const retryResponse = await fetch(url, {
            ...options,
            headers,
          });
          return this.handleResponse<T>(retryResponse);
        } else {
          // Refresh failed - clear tokens and redirect to login
          this.clearTokens();
          window.dispatchEvent(new CustomEvent('auth:logout'));
          return {
            success: false,
            error: 'Session expired. Please log in again.',
          };
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  private async handleResponse<T>(response: Response): Promise<ApiResponse<T>> {
    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      return {
        success: false,
        error: error.detail || `HTTP ${response.status}`,
      };
    }

    const data = await response.json();
    return {
      success: true,
      data,
    };
  }

  private async tryRefreshToken(): Promise<string | null> {
    if (this.refreshPromise) {
      return this.refreshPromise;
    }

    this.refreshPromise = this.doRefreshToken();
    try {
      return await this.refreshPromise;
    } finally {
      this.refreshPromise = null;
    }
  }

  private async doRefreshToken(): Promise<string | null> {
    try {
      const response = await fetch(`${BASE_URL}/api/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.accessToken}`,
        },
      });

      if (!response.ok) {
        return null;
      }

      const data = await response.json();
      if (data.success && data.data?.access_token) {
        this.setAccessToken(data.data.access_token);
        return data.data.access_token;
      }
      return null;
    } catch {
      return null;
    }
  }

  // Multipart request helper (for file uploads)
  private async requestMultipart<T>(
    endpoint: string,
    formData: FormData,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
    
    const headers: HeadersInit = {
      ...options.headers,
    };

    if (this.accessToken) {
      (headers as Record<string, string>)['Authorization'] = `Bearer ${this.accessToken}`;
    }

    // Don't set Content-Type for FormData - browser sets it with boundary
    delete (headers as Record<string, string>)['Content-Type'];

    try {
      const response = await fetch(url, {
        ...options,
        method: 'POST',
        body: formData,
        headers,
      });

      if (response.status === 401 && this.accessToken) {
        const refreshed = await this.tryRefreshToken();
        if (refreshed) {
          (headers as Record<string, string>)['Authorization'] = `Bearer ${refreshed}`;
          const retryResponse = await fetch(url, {
            ...options,
            method: 'POST',
            body: formData,
            headers,
          });
          return this.handleResponse<T>(retryResponse);
        } else {
          this.clearTokens();
          window.dispatchEvent(new CustomEvent('auth:logout'));
          return {
            success: false,
            error: 'Session expired. Please log in again.',
          };
        }
      }

      return this.handleResponse<T>(response);
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // ==================== Health ====================
  async health(): Promise<ApiResponse<{ status: string; version: string; timestamp: string }>> {
    return this.request('/api/health');
  }

  // ==================== Dashboard ====================
  async getDashboardStats(): Promise<ApiResponse<import('./types').DashboardStats>> {
    return this.request('/api/stats');
  }

  async getStatistics(): Promise<ApiResponse<import('./types').DashboardStats>> {
    return this.request('/api/statistics');
  }

  async getBuildingsByHeight(): Promise<ApiResponse<import('./types').BuildingHeightRange[]>> {
    return this.request('/api/statistics/buildings-by-height');
  }

  async getValidationState(): Promise<ApiResponse<import('./types').ValidationState>> {
    return this.request('/api/statistics/validation-state');
  }

  // ==================== Import ====================
  async analyzeImport(files: {
    parcel?: File;
    buildings?: File;
    floors?: File;
    units?: File;
  }): Promise<ApiResponse<import('./types').ImportAnalyzeResponse>> {
    const formData = new FormData();
    if (files.parcel) formData.append('parcel', files.parcel);
    if (files.buildings) formData.append('buildings', files.buildings);
    if (files.floors) formData.append('floors_csv', files.floors);
    if (files.units) formData.append('units', files.units);
    return this.requestMultipart<import('./types').ImportAnalyzeResponse>('/api/import/analyze', formData);
  }

  async persistImport(files: {
    parcel?: File;
    buildings?: File;
    floors?: File;
    units?: File;
  }, userRole = 'surveyor'): Promise<ApiResponse<import('./types').PersistResponse>> {
    const formData = new FormData();
    if (files.parcel) formData.append('parcel', files.parcel);
    if (files.buildings) formData.append('buildings', files.buildings);
    if (files.floors) formData.append('floors_csv', files.floors);
    if (files.units) formData.append('units', files.units);
    formData.append('user_role', userRole);
    return this.requestMultipart<import('./types').PersistResponse>('/api/import/persist', formData);
  }

  // ==================== Validation ====================
  async runValidation(): Promise<ApiResponse<import('./types').ValidationResult>> {
    return this.request('/api/validation/run', { method: 'POST' });
  }

  // ==================== 3D Geometry ====================
  async get3DGeometry(): Promise<ApiResponse<import('./types').GeometryData>> {
    return this.request('/api/3d/geometry');
  }

  // ==================== Parcels ====================
  async getParcels(): Promise<ApiResponse<import('./types').ParcelGeometry[]>> {
    return this.request('/api/parcels');
  }

  async getParcel(id: string): Promise<ApiResponse<import('./types').ParcelHierarchyResponse>> {
    return this.request(`/api/parcels/${id}`);
  }

  // ==================== Buildings ====================
  async getBuildings(): Promise<ApiResponse<import('./types').BuildingListResponse[]>> {
    return this.request('/api/buildings');
  }

  async getBuilding(id: string): Promise<ApiResponse<import('./types').BuildingResponse>> {
    return this.request(`/api/buildings/${id}`);
  }

  // ==================== Floors ====================
  async getFloors(): Promise<ApiResponse<import('./types').FloorResponse[]>> {
    return this.request('/api/floors');
  }

  async getFloor(id: string): Promise<ApiResponse<import('./types').FloorResponse>> {
    return this.request(`/api/floors/${id}`);
  }

  // ==================== Property Units ====================
  async getUnits(): Promise<ApiResponse<import('./types').UnitResponse[]>> {
    return this.request('/api/units');
  }

  async getUnit(id: string): Promise<ApiResponse<import('./types').UnitResponse>> {
    return this.request(`/api/units/${id}`);
  }

  async getPropertyDetail(id: string): Promise<ApiResponse<import('./types').PropertyDetailResponse>> {
    return this.request(`/api/properties/${id}`);
  }

  async updateUnitGeometry(
    id: string,
    request: import('./types').UnitGeometryUpdateRequest
  ): Promise<ApiResponse<import('./types').UnitGeometryUpdateResponse>> {
    return this.request(`/api/units/${id}/geometry`, {
      method: 'PUT',
      body: JSON.stringify(request),
    });
  }

  async getUnitHistory(id: string): Promise<ApiResponse<import('./types').UnitHistoryResponse>> {
    return this.request(`/api/units/${id}/history`);
  }

  // ==================== Spatial Identifiers ====================
  async getSpatialIdentifiers(): Promise<ApiResponse<import('./types').SpatialIdentifierResponse[]>> {
    return this.request('/api/spatial-identifiers');
  }

  // ==================== AI ====================
  async createAIJob(payload: import('./types').AIJobRequest): Promise<ApiResponse<import('./types').AIJobResponse>> {
    return this.request('/api/ai/jobs', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getAIJob(jobId: string): Promise<ApiResponse<import('./types').AIJobResponse>> {
    return this.request(`/api/ai/jobs/${jobId}`);
  }

  async extractLiveBuilding(payload: import('./types').LiveExtractionRequest): Promise<ApiResponse<import('./types').LiveExtractionResponse>> {
    return this.request('/api/ai/extract-live-building', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async extractBatchBuildings(payload: import('./types').BatchExtractionRequest): Promise<ApiResponse<import('./types').BatchExtractionResponse>> {
    return this.request('/api/ai/extract-batch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async validateAOI(payload: import('./types').AOIValidateRequest): Promise<ApiResponse<import('./types').AOIValidateResponse>> {
    return this.request('/api/aoi/validate', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async getImageryMosaic(payload: import('./types').MosaicRequest): Promise<ApiResponse<import('./types').MosaicResponse>> {
    return this.request('/api/imagery/mosaic', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async detectBatch(payload: import('./types').DetectBatchRequest): Promise<ApiResponse<import('./types').DetectBatchResponse>> {
    return this.request('/api/ai/detect-batch', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  }

  async editAIProposal(proposalId: string, patch: import('./types').ProposalEditRequest): Promise<ApiResponse<import('./types').ProposalEditResponse>> {
    return this.request(`/api/ai/proposal/${proposalId}/edit`, {
      method: 'POST',
      body: JSON.stringify(patch),
    });
  }

  async getAICandidates(): Promise<ApiResponse<import('./types').AICandidatesResponse>> {
    return this.request('/api/ai/candidates');
  }

  async getAIProposal(proposalId: string): Promise<ApiResponse<import('./types').AIProposalDetail>> {
    return this.request(`/api/ai/proposal/${proposalId}`);
  }

  async reviewAIProposal(proposalId: string, decision: 'APPROVED' | 'REJECTED'): Promise<ApiResponse<import('./types').ReviewResponse>> {
    return this.request(`/api/ai/review/${proposalId}`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
  }

  // ==================== Cadastral Parcels ====================
  async getCadastralParcels(): Promise<ApiResponse<import('./types').CadastralParcel[]>> {
    return this.request('/api/cadastral-parcels');
  }

  async getCadastralParcel(parcelId: string): Promise<ApiResponse<import('./types').CadastralParcelDetail>> {
    return this.request(`/api/cadastral-parcels/${encodeURIComponent(parcelId)}`);
  }

  // ==================== Search ====================
  async search(query: string): Promise<ApiResponse<import('./types').SearchResult[]>> {
    return this.request(`/api/search?query=${encodeURIComponent(query)}`);
  }

  // ==================== Audit ====================
  async getAuditTrail(limit = 100): Promise<ApiResponse<import('./types').AuditLogEntry[]>> {
    return this.request(`/api/audit?limit=${limit}`);
  }

  // ==================== Auth ====================
  async login(username: string, password: string): Promise<ApiResponse<import('./types').LoginResponse>> {
    // Backend returns LoginResponse directly, wrap it in our standard format
    const response = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });

    const data = await response.json();
    
    // Backend returns LoginResponse directly, wrap it in our standard format
    if (response.ok && data.access_token) {
      this.setAccessToken(data.access_token);
      return { success: true, data };
    } else {
      return { success: false, error: data.detail || 'Login failed' };
    }
  }

  async refresh(): Promise<ApiResponse<import('./types').RefreshResponse>> {
    const response = await this.request<import('./types').RefreshResponse>('/api/auth/refresh', {
      method: 'POST',
    });
    if (response.success && response.data?.access_token) {
      this.setAccessToken(response.data.access_token);
    }
    return response;
  }

  async getCurrentUser(): Promise<ApiResponse<import('./types').UserInfo>> {
    return this.request('/api/auth/me');
  }

  logout() {
    this.clearTokens();
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

// Export singleton instance
export const api = new ApiClient();