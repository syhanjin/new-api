import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { DataTablePage, useDataTable } from '@/components/data-table'
import { useMediaQuery } from '@/hooks'
import { getInvitations, searchInvitations } from '../api'
import { getInvitationStatusOptions, INVITATION_MESSAGES } from '../constants'
import { useInvitationsColumns } from './invitations-columns'
import { useInvitations } from './invitations-provider'

export function InvitationsTable() {
  const { t } = useTranslation()
  const mobile = useMediaQuery('(max-width: 640px)')
  const { refreshTrigger } = useInvitations()
  const [page, setPage] = useState(1)
  const [filter, setFilter] = useState('')
  const [status, setStatus] = useState('')
  const pageSize = mobile ? 10 : 20
  const columns = useInvitationsColumns()
  const query = useQuery({
    queryKey: ['invitations', page, pageSize, filter, status, refreshTrigger],
    queryFn: async () => {
      const result = filter.trim() || status ? await searchInvitations({ keyword: filter, status, p: page, page_size: pageSize }) : await getInvitations({ p: page, page_size: pageSize })
      if (!result.success) { toast.error(result.message || t(INVITATION_MESSAGES.LOAD_FAILED)); return { items: [], total: 0 } }
      return { items: result.data?.items || [], total: result.data?.total || 0 }
    },
    placeholderData: (previous) => previous,
  })
  const options = useMemo(() => getInvitationStatusOptions(t), [t])
  const table = useDataTable({ data: query.data?.items || [], columns, enableRowSelection: false, pagination: { pageIndex: page - 1, pageSize }, globalFilter: filter, onGlobalFilterChange: (value) => { setFilter(String(value)); setPage(1) }, columnFilters: status ? [{ id: 'status', value: [status] }] : [], onColumnFiltersChange: (value) => { const next = typeof value === 'function' ? value([]) : value; const selected = next.find((item) => item.id === 'status')?.value; setStatus(String((Array.isArray(selected) ? selected[0] : selected) || '')); setPage(1) }, onPaginationChange: (value) => { const next = typeof value === 'function' ? value({ pageIndex: page - 1, pageSize }) : value; setPage(next.pageIndex + 1) }, manualPagination: true, manualFiltering: true, totalCount: query.data?.total || 0 })
  return <DataTablePage table={table.table} columns={columns} isLoading={query.isLoading} isFetching={query.isFetching} emptyTitle={t('No Invitation Codes Found')} emptyDescription={t('No invitation codes available.')} toolbarProps={{ searchPlaceholder: t('Filter by code or ID...'), filters: [{ columnId: 'status', title: t('Status'), options, singleSelect: true }] }} />
}
