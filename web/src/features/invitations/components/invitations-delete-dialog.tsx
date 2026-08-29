import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { deleteInvitation } from '../api'
import { INVITATION_MESSAGES } from '../constants'
import { useInvitations } from './invitations-provider'
export function InvitationsDeleteDialog() {
  const { t } = useTranslation(); const { open, setOpen, currentRow, triggerRefresh } = useInvitations(); const [loading, setLoading] = useState(false)
  async function remove() { if (!currentRow) return; setLoading(true); try { const result = await deleteInvitation(currentRow.id); if (result.success) { toast.success(t(INVITATION_MESSAGES.DELETED)); setOpen(null); triggerRefresh() } else toast.error(result.message || t(INVITATION_MESSAGES.DELETE_FAILED)) } finally { setLoading(false) } }
  return <AlertDialog open={open === 'delete'} onOpenChange={(value) => !value && setOpen(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('Are you sure?')}</AlertDialogTitle><AlertDialogDescription>{t('This will delete invitation code')} <strong>{currentRow?.code}</strong>{t('. This action cannot be undone.')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={loading}>{t('Cancel')}</AlertDialogCancel><AlertDialogAction variant='destructive' disabled={loading} onClick={remove}>{loading ? t('Deleting...') : t('Delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
}
