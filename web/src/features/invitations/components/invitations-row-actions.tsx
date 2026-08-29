import type { Row } from '@tanstack/react-table'
import { Edit, Power, PowerOff, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DataTableRowActionMenu } from '@/components/data-table/core/row-action-menu'
import { DropdownMenuItem, DropdownMenuSeparator, DropdownMenuShortcut } from '@/components/ui/dropdown-menu'
import { INVITATION_MESSAGES, INVITATION_STATUS } from '../constants'
import { updateInvitationStatus } from '../api'
import type { InvitationCode } from '../types'
import { useInvitations } from './invitations-provider'
export function InvitationRowActions({ row }: { row: Row<InvitationCode> }) {
  const { t } = useTranslation(); const invitation = row.original
  const { setOpen, setCurrentRow, triggerRefresh } = useInvitations()
  const enabled = invitation.status === INVITATION_STATUS.ENABLED
  const exhausted = invitation.used_count >= invitation.max_uses
  async function toggle() {
    const result = await updateInvitationStatus(invitation.id, enabled ? INVITATION_STATUS.DISABLED : INVITATION_STATUS.ENABLED)
    if (result.success) { toast.success(t(enabled ? INVITATION_MESSAGES.DISABLED : INVITATION_MESSAGES.ENABLED)); triggerRefresh() }
    else toast.error(result.message || t(INVITATION_MESSAGES.STATUS_FAILED))
  }
  return <div className='flex items-center gap-1'>
    <button type='button' className='inline-flex h-8 w-8 items-center justify-center rounded-md hover:bg-muted disabled:opacity-50' disabled={exhausted} aria-label={t('Edit')} onClick={() => { setCurrentRow(invitation); setOpen('update') }}><Edit className='h-4 w-4' /></button>
    <DataTableRowActionMenu ariaLabel={t('Open menu')} modal={false}>
      {!exhausted && <><DropdownMenuItem onClick={toggle}>{enabled ? t('Disable') : t('Enable')}<DropdownMenuShortcut>{enabled ? <PowerOff size={16} /> : <Power size={16} />}</DropdownMenuShortcut></DropdownMenuItem><DropdownMenuSeparator /></>}
      <DropdownMenuItem className='text-destructive focus:text-destructive' onClick={() => { setCurrentRow(invitation); setOpen('delete') }}>{t('Delete')}<DropdownMenuShortcut><Trash2 size={16} /></DropdownMenuShortcut></DropdownMenuItem>
    </DataTableRowActionMenu>
  </div>
}
