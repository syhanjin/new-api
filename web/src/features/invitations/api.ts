import { api } from '@/lib/api'
import type { ApiResponse, InvitationFormData, InvitationListResponse, InvitationSearchParams, InvitationCode } from './types'

export async function getInvitations(params: InvitationSearchParams = {}): Promise<InvitationListResponse> {
  const { p = 1, page_size = 20 } = params
  const res = await api.get(`/api/invitation/?p=${p}&page_size=${page_size}`)
  return res.data
}
export async function searchInvitations(params: InvitationSearchParams): Promise<InvitationListResponse> {
  const query = new URLSearchParams()
  query.set('keyword', params.keyword || '')
  if (params.status) query.set('status', params.status)
  query.set('p', String(params.p || 1)); query.set('page_size', String(params.page_size || 20))
  const res = await api.get(`/api/invitation/search?${query}`); return res.data
}
export async function getInvitation(id: number): Promise<ApiResponse<InvitationCode>> { return (await api.get(`/api/invitation/${id}`)).data }
export async function createInvitations(data: InvitationFormData): Promise<ApiResponse<{ batch: unknown; codes: string[] }>> { return (await api.post('/api/invitation/', data)).data }
export async function updateInvitation(data: InvitationFormData & { id: number }): Promise<ApiResponse<InvitationCode>> { return (await api.put('/api/invitation/', data)).data }
export async function updateInvitationStatus(id: number, status: number): Promise<ApiResponse<InvitationCode>> { return (await api.put('/api/invitation/?status_only=true', { id, status })).data }
export async function deleteInvitation(id: number): Promise<ApiResponse> { return (await api.delete(`/api/invitation/${id}/`)).data }
export async function deleteInvalidInvitations(): Promise<ApiResponse<number>> { return (await api.delete('/api/invitation/invalid')).data }
