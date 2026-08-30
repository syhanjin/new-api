import { describe, expect, it } from 'vitest'
import { invitationFormSchema } from '../lib/validation'

describe('standalone invitation form validation', () => {
  const base = { mode: 'import' as const, count: 1, max_uses: 1 }

  it('accepts custom codes within the standalone limits', () => {
    expect(invitationFormSchema.safeParse({ ...base, codes: ' alpha\nbeta ' }).success).toBe(true)
  })

  it('rejects empty imports and oversized input', () => {
    expect(invitationFormSchema.safeParse({ ...base, codes: ' \n ' }).success).toBe(false)
    expect(invitationFormSchema.safeParse({ ...base, codes: `${'x'.repeat(33)}\nvalid` }).success).toBe(false)
  })
})
