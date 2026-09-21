/**
 * API Service Layer
 * Replaces mock data with real backend API calls
 */

import { api } from '../api';

// Types
export interface Parcel {
  id: string;
  ulpin: string;
  name: string;
  area_sqm: number;
  geometry: any;
}

export interface Building {
  id: string;
  parcel_id: string;
  name: string;
  height_m: number;
  floors_count: number;
  footprint: any;
}

export interface Floor {
  id: string;
  building_id: string;
  floor_code: string;
  floor_label: string;
  z_min: number;
  z_max: number;
  area_sqm: number;
}

export interface PropertyUnit {
  id: string;
  floor_id: string;
  unit_code: string;
  unit_type: string;
  label: string;
  area_sqm: number;
  volume_cum: number;
  geometry_hash: string;
  geometry_version: number;
}

export interface SpatialIdentifier {
  id: string;
  identifier_string: string;
  ulpin: string;
  building_code: string;
  floor_code: string;
  unit_code: string;
  version: number;
  geometry_hash: string;
  property_unit_id?: string;
}

export interface Statistics {
  total_parcels: number;
  total_buildings: number;
  total_floors: number;
  total_units: number;
  validated_units: number;
  conflicts: number;
  ai_proposals_pending: number;
}

export interface SearchResult {
  type: 'parcel' | 'building' | 'floor' | 'unit';
  id: string;
  label: string;
  ulpin?: string;
  unit_code?: string;
}

// Service functions
export const cadastralService = {
  // Parcels
  async getParcels(): Promise<Parcel[]> {
    const response = await api.getParcels();
    return response.data || [];
  },

  async getParcel(id: string): Promise<any> {
    const response = await api.getParcel(id);
    return response.data;
  },

  // Buildings
  async getBuildings(): Promise<Building[]> {
    const response = await api.getBuildings();
    return response.data || [];
  },

  async getBuilding(id: string): Promise<any> {
    const response = await api.getBuilding(id);
    return response.data;
  },

  // Floors
  async getFloors(): Promise<Floor[]> {
    const response = await api.getFloors();
    return response.data || [];
  },

  async getFloor(id: string): Promise<any> {
    const response = await api.getFloor(id);
    return response.data;
  },

  // Property Units
  async getUnits(): Promise<PropertyUnit[]> {
    const response = await api.getUnits();
    return response.data || [];
  },

  async getUnit(id: string): Promise<any> {
    const response = await api.getUnit(id);
    return response.data;
  },

  // Spatial Identifiers
  async getSpatialIdentifiers(): Promise<SpatialIdentifier[]> {
    const response = await api.getSpatialIdentifiers();
    return response.data || [];
  },

  // Statistics
  async getStatistics(): Promise<Statistics> {
    const response = await api.getStatistics();
    return response.data || {
      total_parcels: 0,
      total_buildings: 0,
      total_floors: 0,
      total_units: 0,
      validated_units: 0,
      conflicts: 0,
      ai_proposals_pending: 0
    };
  },

  async getBuildingsByHeight(): Promise<any[]> {
    const response = await api.getBuildingsByHeight();
    return response.data || [];
  },

  async getValidationState(): Promise<any> {
    const response = await api.getValidationState();
    return response.data || { clean: 0, warnings: 0, errors: 0, not_validated: 0, total: 0 };
  },

  // Search
  async search(query: string): Promise<SearchResult[]> {
    const response = await api.search(query);
    return response.data || [];
  },

  // 3D Geometry
  async get3DGeometry(): Promise<any> {
    const response = await api.get3DGeometry();
    return response.data;
  },

  // AI Candidates
  async getAICandidates(): Promise<any> {
    const response = await api.getAICandidates();
    return response.data || { total: 0, categories: [], proposals: [] };
  },

  // Audit
  async getAuditTrail(): Promise<any[]> {
    const response = await api.getAuditTrail();
    return response.data || [];
  },

  // Validation
  async runValidation(): Promise<any> {
    const response = await api.runValidation();
    return response.data;
  }
};
