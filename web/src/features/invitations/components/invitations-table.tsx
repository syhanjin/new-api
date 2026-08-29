import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { DataTablePage, useDataTable } from '@/components/data-table'
import { useMediaQuery } from '@/hooks'

import { getInvitations, searchInvitations } from '../api'
import { getInvitationStatusOptions, INVITATION_MESSAGES } from '../constants'
import { useInvitationsColumns } from './invitations-columns'
import { InvitationsMobileList } from './invitations-mobile-list'
import { useInvitations } from './invitations-provider'
export function InvitationsTable() {
  const { t } = useTranslation()
  const mobile = useMediaQuery('(max-width: 640px)')
  const { refreshTrigger } = useInvitations()
  const columns = useInvitationsColumns()
  const [page, setPage] = useState(1)
  const [pageSize] = useState(mobile ? 10 : 20)
  const [filter, setFilter] = useState('')
  const [status, setStatus] = useState('')
  const query = useQuery({
    queryKey: ['invitations', page, pageSize, filter, status, refreshTrigger],
    queryFn: async () => {
      const result =
        filter.trim() || status
          ? await searchInvitations({
              keyword: filter,
              status,
              p: page,
              page_size: pageSize,
            })
          : await getInvitations({ p: page, page_size: pageSize })
      if (!result.success) {
        toast.error(
          result.message ||
            t(
              filter || status
                ? INVITATION_MESSAGES.SEARCH_FAILED
                : INVITATION_MESSAGES.LOAD_FAILED
            )
        )
        return { items: [], total: 0 }
      }
      return { items: result.data?.items || [], total: result.data?.total || 0 }
    },
    placeholderData: (previous) => previous,
  })
  const table = useDataTable({
    data: query.data?.items || [],
    columns,
    enableRowSelection: false,
    pagination: { pageIndex: page - 1, pageSize },
    globalFilter: filter,
    onGlobalFilterChange: (v) => {
      setFilter(String(v))
      setPage(1)
    },
    columnFilters: status ? [{ id: 'status', value: [status] }] : [],
    onColumnFiltersChange: (v) => {
      const next = typeof v === 'function' ? v([]) : v
      const value = next.find((f) => f.id === 'status')?.value as
        | string[]
        | undefined
      setStatus(value?.[0] || '')
      setPage(1)
    },
    onPaginationChange: (v) => {
      const next =
        typeof v === 'function' ? v({ pageIndex: page - 1, pageSize }) : v
      setPage(next.pageIndex + 1)
    },
    manualPagination: true,
    manualFiltering: true,
    totalCount: query.data?.total || 0,
  })
  const options = useMemo(() => getInvitationStatusOptions(t), [t])
  return (
    <DataTablePage
      table={table.table}
      columns={columns}
      isLoading={query.isLoading}
      isFetching={query.isFetching}
      emptyTitle={t('No Invitation Codes Found')}
      emptyDescription={t(
        'No invitation codes available. Create your first batch to get started.'
      )}
      toolbarProps={{
        searchPlaceholder: t('Filter by code, batch, or ID...'),
        filters: [
          {
            columnId: 'status',
            title: t('Status'),
            options,
            singleSelect: true,
          },
        ],
      }}
      mobile={<InvitationsMobileList items={query.data?.items || []} />}
    />
  )
}
