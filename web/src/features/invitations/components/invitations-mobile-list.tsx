import { Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { StatusBadge } from '@/components/status-badge'
import { formatTimestampToDate } from '@/lib/format'
import { INVITATION_STATUSES, INVITATION_STATUS } from '../constants'
import type { InvitationCode } from '../types'
import { InvitationRowActions } from './invitations-row-actions'
export function InvitationsMobileList({ items }: { items: InvitationCode[] }) {
  const { t } = useTranslation()
  if (items.length === 0) return <div className='p-8 text-center text-muted-foreground'>{t('No Invitation Codes Found')}</div>
  return <div className='space-y-2 p-2'>{items.map((item) => { const status = INVITATION_STATUSES[item.status] || INVITATION_STATUSES[INVITATION_STATUS.DISABLED]; return <div key={item.id} className='rounded-lg border bg-card p-3 shadow-sm'><div className='flex items-start justify-between gap-2'><button type='button' className='font-mono text-left font-medium hover:underline' onClick={() => { void navigator.clipboard.writeText(item.code); toast.success(t('Copied to clipboard')) }}>{item.code} <Copy className='inline h-3 w-3' /></button><InvitationRowActions row={{ original: item } as never} /></div><div className='mt-2 flex flex-wrap items-center gap-2 text-sm text-muted-foreground'><StatusBadge variant={status.variant}>{t(status.labelKey)}</StatusBadge><span>{item.used_count} / {item.max_uses}</span><span>{item.expired_time ? formatTimestampToDate(item.expired_time) : t('Never')}</span></div></div> })}</div>
}
