/**
 * SIH26011 - AI API Endpoints
 */
import { api } from '../client';
import type { ApiResponse } from '../types';
import type {
  AIJobRequest, AIJobResponse,
  LiveExtractionRequest, LiveExtractionResponse,
  BatchExtractionRequest, BatchExtractionResponse,
  AOIValidateRequest, AOIValidateResponse,
  MosaicRequest, MosaicResponse,
  DetectBatchRequest, DetectBatchResponse,
  ProposalEditRequest, ProposalEditResponse,
  AICandidatesResponse, AIProposalDetail, ReviewResponse
} from '../types';

export const aiApi = {
  // Jobs
  createJob: (payload: AIJobRequest) => api.createAIJob(payload) as Promise<ApiResponse<AIJobResponse>>,
  getJob: (jobId: string) => api.getAIJob(jobId) as Promise<ApiResponse<AIJobResponse>>,

  // Live extraction
  extractLive: (payload: LiveExtractionRequest) => api.extractLiveBuilding(payload) as Promise<ApiResponse<LiveExtractionResponse>>,
  extractBatch: (payload: BatchExtractionRequest) => api.extractBatchBuildings(payload) as Promise<ApiResponse<BatchExtractionResponse>>,

  // AOI
  validateAOI: (payload: AOIValidateRequest) => api.validateAOI(payload) as Promise<ApiResponse<AOIValidateResponse>>,
  getMosaic: (payload: MosaicRequest) => api.getImageryMosaic(payload) as Promise<ApiResponse<MosaicResponse>>,
  detectBatch: (payload: DetectBatchRequest) => api.detectBatch(payload) as Promise<ApiResponse<DetectBatchResponse>>,

  // Proposals
  editProposal: (proposalId: string, patch: ProposalEditRequest) => api.editAIProposal(proposalId, patch) as Promise<ApiResponse<ProposalEditResponse>>,
  getCandidates: () => api.getAICandidates() as Promise<ApiResponse<AICandidatesResponse>>,
  getProposal: (proposalId: string) => api.getAIProposal(proposalId) as Promise<ApiResponse<AIProposalDetail>>,
  reviewProposal: (proposalId: string, decision: 'APPROVED' | 'REJECTED') => api.reviewAIProposal(proposalId, decision) as Promise<ApiResponse<ReviewResponse>>,
};