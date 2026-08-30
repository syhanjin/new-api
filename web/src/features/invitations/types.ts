import { z } from 'zod'

export const invitationSchema = z.object({
  id: z.number(),
  batch_id: z.number(),
  code: z.string(),
  status: z.number(),
  created_time: z.number(),
  expired_time: z.number(),
  max_uses: z.number(),
  used_count: z.number(),
  last_used_time: z.number(),
  name: z.string().optional(),
})
export type InvitationCode = z.infer<typeof invitationSchema>

export interface InvitationBatch {
  id: number
  name: string
  created_by: number
  created_time: number
  expired_time: number
  max_uses: number
  status: number
  created_count: number
  codes?: InvitationCode[]
}
export interface ApiResponse<T = unknown> { success: boolean; message?: string; data?: T }
export interface InvitationListResponse extends ApiResponse<{ items: InvitationCode[]; total: number; page: number; page_size: number }> {}
export interface InvitationBatchListResponse extends ApiResponse<{ items: InvitationBatch[]; total: number; page: number; page_size: number }> {}
export interface InvitationBatchResponse extends ApiResponse<{ batch: InvitationBatch; codes: InvitationCode[] }> {}
export interface InvitationSearchParams { keyword?: string; status?: string; batch_id?: number; p?: number; page_size?: number }
export interface InvitationFormData { id?: number; name: string; count?: number; max_uses: number; expired_time: number; status?: number }
export type InvitationsDialogType = 'create' | 'update' | 'delete' | 'batch-update' | 'batch-delete' | 'create-result'
export type InvitationView = 'batches' | 'codes'
