import { z } from 'zod'

export const invitationSchema = z.object({
  id: z.number(),
  code: z.string(),
  status: z.number(),
  created_time: z.number(),
  expired_time: z.number(),
  max_uses: z.number(),
  used_count: z.number(),
  last_used_time: z.number(),
})
export type InvitationCode = z.infer<typeof invitationSchema>
export interface ApiResponse<T = unknown> { success: boolean; message?: string; data?: T }
export interface InvitationImportSkipped { line: number; code: string; reason: string }
export interface InvitationCreateResult { codes: string[]; imported_count?: number; skipped_count?: number; skipped?: InvitationImportSkipped[] }
export interface InvitationListResponse extends ApiResponse<{ items: InvitationCode[]; total: number; page: number; page_size: number }> {}
export interface InvitationSearchParams { keyword?: string; status?: string; p?: number; page_size?: number }
export interface InvitationFormData { id?: number; code?: string; count?: number; max_uses: number; expired_time: number; status?: number; codes?: string[] }
export type InvitationsDialogType = 'create' | 'update' | 'delete' | 'create-result'
