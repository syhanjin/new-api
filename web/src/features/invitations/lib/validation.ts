import { z } from 'zod'

export const invitationFormSchema = z.object({
  code: z.string().optional(),
  mode: z.enum(['generate', 'import']),
  count: z.number().int().min(1).max(100),
  codes: z.string().optional(),
  max_uses: z.number().int().min(1),
  expired_time: z.date().optional(),
  status: z.number().optional(),
}).superRefine((value, ctx) => {
  if (value.mode !== 'import') return
  const lines = (value.codes || '').split(/\r?\n/)
  if (lines.length > 100) ctx.addIssue({ code: 'custom', path: ['codes'], message: 'Maximum 100 input lines' })
  if (!lines.some((line) => line.trim())) ctx.addIssue({ code: 'custom', path: ['codes'], message: 'At least one invitation code is required' })
  for (const line of lines) if (line.trim() && [...line.trim()].length > 32) ctx.addIssue({ code: 'custom', path: ['codes'], message: 'Invitation code exceeds 32 characters' })
})
