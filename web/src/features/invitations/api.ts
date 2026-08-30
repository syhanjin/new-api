import { api } from '@/lib/api'
import type { ApiResponse, InvitationBatchListResponse, InvitationBatchResponse, InvitationCreateResult, InvitationFormData, InvitationListResponse, InvitationSearchParams, InvitationCode } from './types'

function invitationQuery(params: InvitationSearchParams = {}) {
  const query = new URLSearchParams()
  query.set('p', String(params.p || 1)); query.set('page_size', String(params.page_size || 20))
  if (params.keyword) query.set('keyword', params.keyword)
  if (params.status) query.set('status', params.status)
  if (params.batch_id) query.set('batch_id', String(params.batch_id))
  return query
}
export async function getInvitations(params: InvitationSearchParams = {}): Promise<InvitationListResponse> { return (await api.get(`/api/invitation/?${invitationQuery(params)}`)).data }
export async function searchInvitations(params: InvitationSearchParams): Promise<InvitationListResponse> { return (await api.get(`/api/invitation/search?${invitationQuery(params)}`)).data }
export async function getInvitation(id: number): Promise<ApiResponse<InvitationCode>> { return (await api.get(`/api/invitation/${id}`)).data }
export async function createInvitations(data: InvitationFormData): Promise<ApiResponse<InvitationCreateResult>> { return (await api.post('/api/invitation/', data)).data }
export async function updateInvitation(data: InvitationFormData & { id: number }): Promise<ApiResponse<InvitationCode>> { return (await api.put('/api/invitation/', data)).data }
export async function updateInvitationStatus(id: number, status: number): Promise<ApiResponse<InvitationCode>> { return (await api.put('/api/invitation/?status_only=true', { id, status })).data }
export async function deleteInvitation(id: number): Promise<ApiResponse> { return (await api.delete(`/api/invitation/${id}/`)).data }
export async function deleteInvalidInvitations(): Promise<ApiResponse<number>> { return (await api.delete('/api/invitation/invalid')).data }
export async function getInvitationBatches(params: InvitationSearchParams = {}): Promise<InvitationBatchListResponse> { return (await api.get(`/api/invitation/batch/?${invitationQuery(params)}`)).data }
export async function searchInvitationBatches(params: InvitationSearchParams): Promise<InvitationBatchListResponse> { return (await api.get(`/api/invitation/batch/search?${invitationQuery(params)}`)).data }
export async function getInvitationBatch(id: number): Promise<InvitationBatchResponse> { return (await api.get(`/api/invitation/batch/${id}`)).data }
export async function updateInvitationBatch(data: InvitationFormData & { id: number }): Promise<InvitationBatchResponse> { return (await api.put('/api/invitation/batch/', data)).data }
export async function deleteInvitationBatch(id: number): Promise<ApiResponse> { return (await api.delete(`/api/invitation/batch/${id}`)).data }
