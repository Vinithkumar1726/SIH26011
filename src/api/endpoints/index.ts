/**
 * SIH26011 - API Endpoints Index
 * Re-exports all endpoint modules for convenient imports
 */

export * from './health';
export * from './dashboard';
export * from './import';
export * from './validation';
export * from './geometry_3d';
export * from './parcels';
export * from './buildings';
export * from './floors';
export * from './units';
export * from './spatial_ids';
export * from './ai';
export * from './cadastral_parcels';
export * from './search';
export * from './audit';
export * from './auth';

// Re-export the api client instance
export { api } from '../client';
export type { ApiResponse } from '../types';