import type { TFunction } from 'i18next'
import type { StatusBadgeProps } from '@/components/status-badge'

export const INVITATION_STATUS = { ENABLED: 1, DISABLED: 2 } as const
export const INVITATION_FILTER_EXPIRED = 'expired'
export const INVITATION_STATUSES: Record<number, Pick<StatusBadgeProps, 'variant'> & { labelKey: string; value: number }> = {
  [INVITATION_STATUS.ENABLED]: { labelKey: 'Enabled', variant: 'success', value: 1 },
  [INVITATION_STATUS.DISABLED]: { labelKey: 'Disabled', variant: 'neutral', value: 2 },
}
export function getInvitationStatusOptions(t: TFunction) {
  return [...Object.values(INVITATION_STATUSES).map((s) => ({ label: t(s.labelKey), value: String(s.value) })), { label: t('Expired'), value: INVITATION_FILTER_EXPIRED }]
}
export const INVITATION_VALIDATION = { COUNT_MIN: 1, COUNT_MAX: 100, USES_MIN: 1 } as const
export const INVITATION_MESSAGES = {
  LOAD_FAILED: 'Failed to load invitation codes', SEARCH_FAILED: 'Failed to search invitation codes', CREATE_FAILED: 'Failed to create invitation codes', UPDATE_FAILED: 'Failed to update invitation code', DELETE_FAILED: 'Failed to delete invitation code', STATUS_FAILED: 'Failed to update invitation code status', CREATED: 'Invitation codes created successfully', UPDATED: 'Invitation code updated successfully', DELETED: 'Invitation code deleted successfully', ENABLED: 'Invitation code enabled successfully', DISABLED: 'Invitation code disabled successfully',
} as const
