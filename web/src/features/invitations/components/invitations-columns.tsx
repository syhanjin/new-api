import type { ColumnDef } from '@tanstack/react-table'
import { Copy } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DataTableColumnHeader } from '@/components/data-table'
import { StatusBadge } from '@/components/status-badge'
import { formatTimestampToDate } from '@/lib/format'
import { INVITATION_STATUSES, INVITATION_STATUS } from '../constants'
import type { InvitationCode } from '../types'
import { InvitationRowActions } from './invitations-row-actions'

export function useInvitationsColumns(): ColumnDef<InvitationCode>[] {
  const { t } = useTranslation()
  return [
    { accessorKey: 'id', header: ({ column }) => <DataTableColumnHeader column={column} title={t('ID')} />, cell: ({ row }) => row.original.id },
    { accessorKey: 'code', header: t('Invitation Code'), cell: ({ row }) => <button type='button' className='font-mono text-left hover:underline' onClick={() => { void navigator.clipboard.writeText(row.original.code); toast.success(t('Copied to clipboard')) }}>{row.original.code}<Copy className='ml-1 inline h-3 w-3' /></button> },
    { accessorKey: 'name', header: t('Batch'), cell: ({ row }) => row.original.name || `#${row.original.batch_id}` },
    { accessorKey: 'status', header: t('Status'), cell: ({ row }) => { const status = INVITATION_STATUSES[row.original.status] || INVITATION_STATUSES[INVITATION_STATUS.DISABLED]; return <StatusBadge variant={status.variant}>{t(status.labelKey)}</StatusBadge> } },
    { accessorKey: 'used_count', header: t('Usage'), cell: ({ row }) => `${row.original.used_count} / ${row.original.max_uses}` },
    { accessorKey: 'expired_time', header: t('Expires'), cell: ({ row }) => row.original.expired_time ? formatTimestampToDate(row.original.expired_time) : t('Never') },
    { accessorKey: 'last_used_time', header: t('Last Used'), cell: ({ row }) => row.original.last_used_time ? formatTimestampToDate(row.original.last_used_time) : t('Never') },
    { id: 'actions', cell: ({ row }) => <InvitationRowActions row={row} /> },
  ]
}
