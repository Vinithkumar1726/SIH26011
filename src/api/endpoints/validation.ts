/**
 * SIH26011 - Validation API Endpoints
 */
import { api } from '../client';
import type { ApiResponse } from '../types';
import type { ValidationResult } from '../types';

export const validationApi = {
  run: () => api.runValidation() as Promise<ApiResponse<ValidationResult>>,
};