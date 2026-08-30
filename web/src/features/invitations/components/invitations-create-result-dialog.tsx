import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { useInvitations } from './invitations-provider'

export function InvitationsCreateResultDialog() {
  const { t } = useTranslation()
  const { open, setOpen, result } = useInvitations()
  async function copyAll() {
    if (!result?.codes.length) return
    try {
      await navigator.clipboard.writeText(result.codes.join('\n'))
      toast.success(t('Copied to clipboard'))
    } catch {
      toast.error(t('Failed to copy'))
    }
  }
  const importedCount = result?.importedCount ?? result?.codes.length ?? 0
  return (
    <Dialog open={open === 'create-result'} onOpenChange={(value) => !value && setOpen(null)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{t('Invitation Codes Created')}</DialogTitle>
          <DialogDescription>
            {importedCount} {t('imported')}
            {result?.deduplicatedCount !== undefined ? ` · ${result.deduplicatedCount} ${t('deduplicated')}` : ''}
            {result?.skippedCount ? ` · ${result.skippedCount} ${t('skipped')}` : ''}
          </DialogDescription>
        </DialogHeader>
        {result?.codes.length ? <pre className='max-h-72 overflow-auto rounded-md border bg-muted/40 p-3 font-mono text-sm leading-6'>{result.codes.join('\n')}</pre> : <p className='py-6 text-center text-muted-foreground'>{t('No invitation codes were returned.')}</p>}
        {result?.skipped?.length ? <div className='max-h-48 space-y-1 overflow-auto rounded-md border p-3 text-sm'>{result.skipped.map((item) => <div key={`${item.line}-${item.code}`}><span className='font-medium'>{t('Line')} {item.line}</span>: {item.code || t('Empty')} · {item.reason}</div>)}</div> : null}
        <DialogFooter>
          <Button variant='outline' onClick={() => setOpen(null)}>{t('Close')}</Button>
          <Button onClick={() => void copyAll()} disabled={!result?.codes.length}>{t('Copy all')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
