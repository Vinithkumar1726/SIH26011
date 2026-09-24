/**
 * SIH26011 - API Client
 * Real HTTP client for FastAPI backend
 */

// Use VITE_API_URL from environment, default to localhost:8000
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

// Ensure no trailing slash
const BASE_URL = API_BASE_URL.replace(/\/$/, '');

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

export interface DashboardStats {
  total_parcels: number;
  total_buildings: number;
  total_floors: number;
  total_units: number;
  total_3d_units: number;
  validated_units: number;
  conflicts: number;
  ai_proposals_pending: number;
}

export interface ImportAnalyzeResponse {
  parcel_count: number;
  building_count: number;
  floor_count: number;
  unit_count: number;
  detected_crs: string;
  geometry_types: string[];
  warnings: string[];
}

export interface PersistResponse {
  session_id: string;
  status: string;
  identifiers_generated: number;
  validation_passed: boolean;
  validation_issues: number;
}

export interface ValidationResult {
  passed: boolean;
  total_checks: number;
  passed_checks: number;
  failed_checks: number;
  issues: any[];
}

export interface GeometryData {
  parcels: any[];
  buildings: any[];
  floors: any[];
  units: any[];
}

class ApiClient {
  private async request<T>(endpoint: string, options?: RequestInit): Promise<ApiResponse<T>> {
    try {
      const url = `${BASE_URL}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...options?.headers,
        },
      });

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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Health check
  async health(): Promise<ApiResponse<{ status: string; version: string; timestamp: string }>> {
    return this.request('/api/health');
  }

  // Dashboard statistics
  async getDashboardStats(): Promise<ApiResponse<DashboardStats>> {
    return this.request('/api/stats');
  }

  // Import: Analyze uploaded files
  async analyzeImport(files: {
    parcel?: File;
    buildings?: File;
    floors?: File;
    units?: File;
  }): Promise<ApiResponse<ImportAnalyzeResponse>> {
    const formData = new FormData();
    if (files.parcel) formData.append('parcel', files.parcel);
    if (files.buildings) formData.append('buildings', files.buildings);
    if (files.floors) formData.append('floors_csv', files.floors);
    if (files.units) formData.append('units', files.units);

    try {
      const response = await fetch(`${BASE_URL}/api/import/analyze`, {
        method: 'POST',
        body: formData,
      });

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
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error',
      };
    }
  }

  // Import: Persist approved data
  async persistImport(files: {
    parcel?: File;
    buildings?: File;
    floors?: File;
    units?: File;
  }, userRole = 'surveyor'): Promise<ApiResponse<PersistResponse>> {
    const formData = new FormData();
    if (files.parcel) formData.append('parcel', files.parcel);
    if (files.buildings) formData.append('buildings', files.buildings);
    if (files.floors) formData.append('floors_csv', files.floors);
    if (files.units) formData.append('units', files.units);
    formData.append('user_role', userRole);

    try {
      const response = await fetch(`${BASE_URL}/api/import/persist`, { method: 'POST', body: formData });
      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
        return { success: false, error: error.detail || `HTTP ${response.status}` };
      }
      return { success: true, data: await response.json() };
    } catch (error) {
      return { success: false, error: error instanceof Error ? error.message : 'Network error' };
    }
  }

  // Validation: Run topology validation
  async runValidation(): Promise<ApiResponse<ValidationResult>> {
    return this.request('/api/validation/run', {
      method: 'POST',
    });
  }

  // 3D: Get geometry for Three.js
  async get3DGeometry(): Promise<ApiResponse<GeometryData>> {
    return this.request('/api/3d/geometry');
  }

  // Spatial identifiers: Get all
  async getSpatialIdentifiers(): Promise<ApiResponse<any[]>> {
    return this.request('/api/spatial-identifiers');
  }

  // AI: Get one real building-extraction proposal by id
  async getAIProposal(proposalId: string): Promise<ApiResponse<any>> {
    return this.request(`/api/ai/proposal/${proposalId}`);
  }

  // AI: Review proposal
  async reviewAIProposal(proposalId: string, decision: 'APPROVED' | 'REJECTED'): Promise<ApiResponse<any>> {
    return this.request(`/api/ai/review/${proposalId}`, {
      method: 'POST',
      body: JSON.stringify({ decision }),
    });
  }

  // Parcels
  async getParcels(): Promise<ApiResponse<any[]>> {
    return this.request('/api/parcels');
  }

  async getParcel(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/parcels/${id}`);
  }

  // Buildings
  async getBuildings(): Promise<ApiResponse<any[]>> {
    return this.request('/api/buildings');
  }

  async getBuilding(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/buildings/${id}`);
  }

  // Floors
  async getFloors(): Promise<ApiResponse<any[]>> {
    return this.request('/api/floors');
  }

  async getFloor(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/floors/${id}`);
  }

  // Property Units
  async getUnits(): Promise<ApiResponse<any[]>> {
    return this.request('/api/units');
  }

  async getUnit(id: string): Promise<ApiResponse<any>> {
    return this.request(`/api/units/${id}`);
  }

  // Statistics
  async getStatistics(): Promise<ApiResponse<any>> {
    return this.request('/api/statistics');
  }

  async getBuildingsByHeight(): Promise<ApiResponse<any[]>> {
    return this.request('/api/statistics/buildings-by-height');
  }

  async getValidationState(): Promise<ApiResponse<any>> {
    return this.request('/api/statistics/validation-state');
  }

  // Search
  async search(query: string): Promise<ApiResponse<any[]>> {
    return this.request(`/api/search?query=${encodeURIComponent(query)}`);
  }

  // AI Candidates
  async getAICandidates(): Promise<ApiResponse<any>> {
    return this.request('/api/ai/candidates');
  }

  // Audit Trail
  async getAuditTrail(): Promise<ApiResponse<any[]>> {
    return this.request('/api/audit');
  }
}

export const api = new ApiClient();
