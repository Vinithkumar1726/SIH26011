/**
 * SIH26011 - Search API Endpoints
 */
import { api } from '../client';
import type { ApiResponse } from '../types';
import type { SearchResult } from '../types';

export const searchApi = {
  search: (query: string) => api.search(query) as Promise<ApiResponse<SearchResult[]>>,
};