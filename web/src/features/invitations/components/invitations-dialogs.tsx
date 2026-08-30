import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { deleteInvitationBatch, updateInvitationBatch } from '../api'
import { INVITATION_MESSAGES, INVITATION_STATUS } from '../constants'
import { InvitationsCreateResultDialog } from './invitations-create-result-dialog'
import { InvitationsDeleteDialog } from './invitations-delete-dialog'
import { InvitationsMutateDrawer } from './invitations-mutate-drawer'
import { useInvitations } from './invitations-provider'

function BatchEditDialog() {
  const { t } = useTranslation(); const { open, setOpen, currentBatch, triggerRefresh } = useInvitations(); const [name, setName] = useState(''); const [loading, setLoading] = useState(false)
  useEffect(() => { setName(currentBatch?.name || '') }, [currentBatch])
  async function save() { if (!currentBatch || !name.trim()) return; setLoading(true); try { const result = await updateInvitationBatch({ id: currentBatch.id, name: name.trim(), max_uses: currentBatch.max_uses, expired_time: currentBatch.expired_time, status: currentBatch.status || INVITATION_STATUS.ENABLED }); if (result.success) { toast.success(t(INVITATION_MESSAGES.UPDATED)); setOpen(null); triggerRefresh() } else toast.error(result.message || t(INVITATION_MESSAGES.UPDATE_FAILED)) } finally { setLoading(false) } }
  return <Dialog open={open === 'batch-update'} onOpenChange={(value) => !value && setOpen(null)}><DialogContent><DialogHeader><DialogTitle>{t('Edit Invitation Batch')}</DialogTitle></DialogHeader><Input aria-label={t('Batch Name')} value={name} onChange={(event) => setName(event.target.value)} maxLength={80} /><DialogFooter><Button variant='outline' onClick={() => setOpen(null)}>{t('Cancel')}</Button><Button disabled={loading || !name.trim()} onClick={() => void save()}>{t('Save')}</Button></DialogFooter></DialogContent></Dialog>
}
function BatchDeleteDialog() {
  const { t } = useTranslation(); const { open, setOpen, currentBatch, triggerRefresh } = useInvitations(); const [loading, setLoading] = useState(false)
  async function remove() { if (!currentBatch) return; setLoading(true); try { const result = await deleteInvitationBatch(currentBatch.id); if (result.success) { toast.success(t(INVITATION_MESSAGES.DELETED)); setOpen(null); triggerRefresh() } else toast.error(result.message || t(INVITATION_MESSAGES.DELETE_FAILED)) } finally { setLoading(false) } }
  return <AlertDialog open={open === 'batch-delete'} onOpenChange={(value) => !value && setOpen(null)}><AlertDialogContent><AlertDialogHeader><AlertDialogTitle>{t('Delete Invitation Batch')}</AlertDialogTitle><AlertDialogDescription>{t('This will delete the entire invitation batch and its codes.')}</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel disabled={loading}>{t('Cancel')}</AlertDialogCancel><AlertDialogAction variant='destructive' disabled={loading} onClick={() => void remove()}>{t('Delete')}</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
}
export function InvitationsDialogs() {
  const { open, setOpen, currentRow } = useInvitations(); const update = open === 'update'
  return <><InvitationsMutateDrawer open={open === 'create' || update} onOpenChange={(value) => !value && setOpen(null)} currentRow={update ? currentRow || undefined : undefined} /><InvitationsDeleteDialog /><BatchEditDialog /><BatchDeleteDialog /><InvitationsCreateResultDialog /></>
}
