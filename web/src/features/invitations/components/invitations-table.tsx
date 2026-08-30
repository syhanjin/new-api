import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { ArrowLeft, Edit, Power, PowerOff, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DataTablePage, useDataTable } from '@/components/data-table'
import { useMediaQuery } from '@/hooks'
import { Button } from '@/components/ui/button'
import { getInvitationBatches, getInvitationBatch, searchInvitationBatches, updateInvitationBatch } from '../api'
import { getInvitationStatusOptions, INVITATION_MESSAGES, INVITATION_STATUS, INVITATION_STATUSES } from '../constants'
import type { InvitationBatch } from '../types'
import { useInvitationsColumns } from './invitations-columns'
import { useInvitations } from './invitations-provider'

function BatchActions({ batch }: { batch: InvitationBatch }) {
  const { t } = useTranslation(); const { setCurrentBatch, setOpen, triggerRefresh } = useInvitations()
  const enabled = batch.status === INVITATION_STATUS.ENABLED
  async function toggle() { const result = await updateInvitationBatch({ id: batch.id, name: batch.name, max_uses: batch.max_uses, expired_time: batch.expired_time, status: enabled ? INVITATION_STATUS.DISABLED : INVITATION_STATUS.ENABLED }); if (result.success) { toast.success(t(enabled ? INVITATION_MESSAGES.DISABLED : INVITATION_MESSAGES.ENABLED)); triggerRefresh() } else toast.error(result.message || t(INVITATION_MESSAGES.STATUS_FAILED)) }
  return <div className='flex items-center gap-1'><Button variant='ghost' size='icon' aria-label={t('Edit')} onClick={() => { setCurrentBatch(batch); setOpen('batch-update') }}><Edit className='h-4 w-4' /></Button><Button variant='ghost' size='icon' aria-label={enabled ? t('Disable') : t('Enable')} onClick={() => void toggle()}>{enabled ? <PowerOff className='h-4 w-4' /> : <Power className='h-4 w-4' />}</Button><Button variant='ghost' size='icon' aria-label={t('Delete')} onClick={() => { setCurrentBatch(batch); setOpen('batch-delete') }}><Trash2 className='h-4 w-4 text-destructive' /></Button></div>
}
function BatchList() {
  const { t } = useTranslation(); const mobile = useMediaQuery('(max-width: 640px)'); const { refreshTrigger, openBatch } = useInvitations(); const [page, setPage] = useState(1); const [filter, setFilter] = useState(''); const [status, setStatus] = useState(''); const pageSize = mobile ? 10 : 20
  const query = useQuery({ queryKey: ['invitation-batches', page, pageSize, filter, status, refreshTrigger], queryFn: async () => { const result = filter.trim() || status ? await searchInvitationBatches({ keyword: filter, status, p: page, page_size: pageSize }) : await getInvitationBatches({ p: page, page_size: pageSize }); if (!result.success) { toast.error(result.message || t(INVITATION_MESSAGES.LOAD_FAILED)); return { items: [], total: 0 } }; return { items: result.data?.items || [], total: result.data?.total || 0 } }, placeholderData: (previous) => previous })
  const options = useMemo(() => getInvitationStatusOptions(t), [t])
  const columns = useMemo(() => [{ accessorKey: 'id', header: t('ID'), cell: ({ row }: { row: { original: InvitationBatch } }) => row.original.id }, { accessorKey: 'name', header: t('Batch'), cell: ({ row }: { row: { original: InvitationBatch } }) => <button type='button' className='font-medium hover:underline' onClick={() => openBatch(row.original)}>{row.original.name}</button> }, { accessorKey: 'created_count', header: t('Count'), cell: ({ row }: { row: { original: InvitationBatch } }) => row.original.created_count }, { accessorKey: 'max_uses', header: t('Usage'), cell: ({ row }: { row: { original: InvitationBatch } }) => row.original.max_uses }, { accessorKey: 'status', header: t('Status'), cell: ({ row }: { row: { original: InvitationBatch } }) => { const s = INVITATION_STATUSES[row.original.status] || INVITATION_STATUSES[INVITATION_STATUS.DISABLED]; return <span>{t(s.labelKey)}</span> } }, { accessorKey: 'expired_time', header: t('Expires'), cell: ({ row }: { row: { original: InvitationBatch } }) => row.original.expired_time ? new Date(row.original.expired_time * 1000).toLocaleDateString() : t('Never') }, { id: 'actions', cell: ({ row }: { row: { original: InvitationBatch } }) => <BatchActions batch={row.original} /> }], [openBatch, t])
  const table = useDataTable({ data: query.data?.items || [], columns, enableRowSelection: false, pagination: { pageIndex: page - 1, pageSize }, globalFilter: filter, onGlobalFilterChange: (v) => { setFilter(String(v)); setPage(1) }, columnFilters: status ? [{ id: 'status', value: [status] }] : [], onColumnFiltersChange: (v) => { const next = typeof v === 'function' ? v([]) : v; const selected = next.find((f) => f.id === 'status')?.value; setStatus(String((Array.isArray(selected) ? selected[0] : selected) || '')); setPage(1) }, onPaginationChange: (v) => { const next = typeof v === 'function' ? v({ pageIndex: page - 1, pageSize }) : v; setPage(next.pageIndex + 1) }, manualPagination: true, manualFiltering: true, totalCount: query.data?.total || 0 })
  return <DataTablePage table={table.table} columns={columns} isLoading={query.isLoading} isFetching={query.isFetching} emptyTitle={t('No Invitation Codes Found')} emptyDescription={t('No invitation codes available. Create your first batch to get started.')} toolbarProps={{ searchPlaceholder: t('Filter by code, batch, or ID...'), filters: [{ columnId: 'status', title: t('Status'), options, singleSelect: true }] }} />
}
function InvitationCodesTable({ batchId }: { batchId: number }) {
  const { t } = useTranslation()
  const mobile = useMediaQuery('(max-width: 640px)')
  const { refreshTrigger } = useInvitations()
  const columns = useInvitationsColumns()
  const pageSize = mobile ? 10 : 20
  const query = useQuery({
    queryKey: ['invitation-batch', batchId, pageSize, refreshTrigger],
    queryFn: async () => {
      const result = await getInvitationBatch(batchId)
      if (!result.success) return { items: [], total: 0 }
      return { items: result.data?.codes || [], total: result.data?.codes?.length || 0 }
    },
    placeholderData: (previous) => previous,
  })
  const table = useDataTable({ data: query.data?.items || [], columns, enableRowSelection: false, pagination: { pageIndex: 0, pageSize }, manualPagination: true, totalCount: query.data?.total || 0 })
  return <DataTablePage table={table.table} columns={columns} isLoading={query.isLoading} isFetching={query.isFetching} emptyTitle={t('No Invitation Codes Found')} emptyDescription={t('No invitation codes available.')} />
}
export function InvitationsTable() {
  const { t } = useTranslation(); const { view, currentBatch, showBatches } = useInvitations()
  if (view === 'batches') return <BatchList />
  return <div className='space-y-3'><Button variant='outline' size='sm' onClick={showBatches}><ArrowLeft className='mr-2 h-4 w-4' />{t('Back')}</Button><h2 className='text-lg font-semibold'>{currentBatch?.name}</h2>{currentBatch && <InvitationCodesTable batchId={currentBatch.id} />}</div>
}
