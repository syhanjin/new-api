import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useInvitations } from './invitations-provider'

export function InvitationsCreateResultDialog() {
  const { t } = useTranslation(); const { open, setOpen, result } = useInvitations()
  async function copyAll() {
    if (!result?.codes.length) return
    try { await navigator.clipboard.writeText(result.codes.join('\n')); toast.success(t('Copied to clipboard')) } catch { toast.error(t('Failed to copy')) }
  }
  return <Dialog open={open === 'create-result'} onOpenChange={(value) => !value && setOpen(null)}><DialogContent><DialogHeader><DialogTitle>{t('Invitation Codes Created')}</DialogTitle><DialogDescription>{result?.batchName} · {result?.codes.length || 0} {t('codes')}</DialogDescription></DialogHeader>{result?.codes.length ? <pre className='max-h-72 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-sm leading-6'>{result.codes.join('\n')}</pre> : <p className='py-6 text-center text-muted-foreground'>{t('No invitation codes were returned.')}</p>}<DialogFooter><Button variant='outline' onClick={() => setOpen(null)}>{t('Close')}</Button><Button disabled={!result?.codes.length} onClick={() => void copyAll()}>{t('Copy all invitation codes')}</Button></DialogFooter></DialogContent></Dialog>
}
