/**
 * SIH26011 - Audit API Endpoints
 */
import { api } from '../client';
import type { ApiResponse } from '../types';
import type { AuditLogEntry } from '../types';

export const auditApi = {
  getTrail: (limit?: number) => api.getAuditTrail(limit) as Promise<ApiResponse<AuditLogEntry[]>>,
};