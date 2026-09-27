/**
 * SIH26011 - Health API Endpoint
 */
import { api } from '../client';
import type { ApiResponse } from '../types';

export const healthApi = {
  check: () => api.health(),
};