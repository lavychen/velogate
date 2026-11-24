/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { useQuery } from '@tanstack/react-query'
import { Download } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { StaticDataTable } from '@/components/data-table'
import { Dialog } from '@/components/dialog'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { downloadCsv, toCsvLine } from '@/features/usage-logs/lib/export'
import { toIntlLocale } from '@/i18n/languages'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { formatNumber, formatCompactNumber } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'

import {
  getDepartmentAnalytics,
  getEmployeeAnalytics,
  getModelAnalytics,
  getAnalyticsTokens,
} from '../api'
import type { AnalyticsQuery } from '../api-types'
import type { AnalyticsDimension } from './analytics-breakdown'

export function AnalyticsDetails(props: {
  dimension: AnalyticsDimension
  query: AnalyticsQuery
  range: string
  onDimensionChange: (dimension: AnalyticsDimension) => void
  onDrill: (
    dimension: AnalyticsDimension,
    row: { id: string; name: string }
  ) => void
  onClose: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const userId = useAuthStore((state) => state.auth.user?.id)
  const dimension = props.dimension
  const query = props.query
  const range = props.range
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('cost')
  const [search, setSearch] = useState('')
  const dimensions = [
    { id: 'departments', label: t('Departments') },
    { id: 'employees', label: t('Employees') },
    { id: 'keys', label: t('API Keys') },
    { id: 'models', label: t('Models') },
  ]
  const detail = useQuery({
    enabled: !!userId,
    queryKey: [
      'enterprise',
      userId,
      'analytics',
      dimension,
      query,
      page,
      sortBy,
    ],
    queryFn: async () => {
      const params = { ...query, page, page_size: 20, sort_by: sortBy }
      if (dimension === 'employees') {
        const result = await getEmployeeAnalytics(params)
        return {
          total: result.total ?? 0,
          rows: result.items.map((row) => ({
            id: String(row.id),
            name: row.name,
            calls: row.request_count ?? 0,
            tokens: row.total_tokens ?? 0,
            cost: row.cost ?? 0,
          })),
        }
      }
      if (dimension === 'keys') {
        const result = await getAnalyticsTokens(params)
        return {
          total: result.total ?? 0,
          rows: result.items.map((row) => ({
            id: String(row.token_id),
            name: row.token_name || String(row.token_id),
            calls: row.request_count ?? 0,
            tokens: row.total_tokens ?? 0,
            cost: row.cost ?? 0,
          })),
        }
      }
      if (dimension === 'models') {
        const result = await getModelAnalytics(params)
        return {
          total: result.total ?? 0,
          rows: result.items.map((row) => ({
            id: row.model || '',
            name: row.model || '',
            calls: row.request_count ?? 0,
            tokens: row.total_tokens ?? 0,
            cost: row.cost ?? 0,
          })),
        }
      }
      const result = await getDepartmentAnalytics(params)
      return {
        total: result.total ?? 0,
        rows: result.items.map((row) => ({
          id: String(row.id),
          name: row.name,
          calls: row.request_count ?? 0,
          tokens: row.total_tokens ?? 0,
          cost: row.cost ?? 0,
        })),
      }
    },
  })
  const rows = (detail.data?.rows ?? []).filter((row) =>
    row.name.toLowerCase().includes(search.trim().toLowerCase())
  )
  const money = (value: number) =>
    formatBillingCurrencyFromUSD(value, { locale, digitsLarge: 2 })
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
      title={t('Usage details')}
      description={t('Compare calls, tokens and cost across your organization')}
      contentClassName='sm:max-w-5xl'
      contentHeight='min(65dvh, 640px)'
      bodyClassName='h-full'
    >
      <Tabs
        className='h-full min-h-0 flex-1'
        value={dimension}
        onValueChange={(value) => {
          props.onDimensionChange(value as AnalyticsDimension)
          setPage(1)
          setSearch('')
        }}
      >
        <div className='flex shrink-0 flex-wrap items-center justify-between gap-3'>
          <TabsList className='max-w-full flex-wrap group-data-horizontal/tabs:h-auto'>
            {dimensions.map((item) => (
              <TabsTrigger key={item.id} value={item.id}>
                {item.label}
              </TabsTrigger>
            ))}
          </TabsList>
          <div className='flex flex-wrap gap-2'>
            <Input
              aria-label={t('Search usage')}
              placeholder={t('Search current page')}
              className='w-44'
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
            <NativeSelect
              aria-label={t('Sort by')}
              value={sortBy}
              onChange={(event) => {
                setSortBy(event.target.value)
                setPage(1)
              }}
            >
              <NativeSelectOption value='cost'>{t('Cost')}</NativeSelectOption>
              <NativeSelectOption value='request_count'>
                {t('Requests')}
              </NativeSelectOption>
              <NativeSelectOption value='total_tokens'>
                {t('Tokens')}
              </NativeSelectOption>
            </NativeSelect>
            <Button
              variant='outline'
              disabled={rows.length === 0 || detail.isPending || detail.isError}
              onClick={() =>
                downloadCsv(`enterprise-${dimension}-${range}.csv`, [
                  toCsvLine([t('Name'), t('Requests'), t('Tokens'), 'USD']),
                  ...rows.map((row) =>
                    toCsvLine([
                      row.name,
                      String(row.calls),
                      String(row.tokens),
                      String(row.cost),
                    ])
                  ),
                ])
              }
            >
              <Download aria-hidden='true' />
              {t('Export current page')}
            </Button>
          </div>
        </div>
        <TabsContent value={dimension} className='min-h-0 flex-1 overflow-auto'>
          {detail.isPending && <LoadingState className='min-h-0 py-4' />}
          {detail.isError && (
            <ErrorState
              className='min-h-0 py-4'
              onRetry={() => void detail.refetch()}
            />
          )}
          {!detail.isPending && !detail.isError && (
            <StaticDataTable
              className='min-h-0 overflow-visible'
              data={rows}
              getRowKey={(row) => row.id}
              tableProps={{ withContainer: false }}
              tableClassName='min-w-[600px] [&_thead]:bg-background [&_thead]:sticky [&_thead]:top-0 [&_thead]:z-10'
              emptyContent={
                <EmptyState
                  title={t('No results found.')}
                  className='min-h-0 py-4'
                />
              }
              columns={[
                {
                  id: 'name',
                  header: t('Name'),
                  cell: (row) =>
                    dimension === 'keys' ? (
                      row.name
                    ) : (
                      <Button
                        variant='link'
                        className='max-w-full truncate px-0'
                        onClick={() => {
                          setPage(1)
                          setSearch('')
                          props.onDrill(dimension, row)
                        }}
                      >
                        {row.name}
                      </Button>
                    ),
                },
                {
                  id: 'calls',
                  header: t('Requests'),
                  cell: (row) => formatNumber(row.calls, locale),
                },
                {
                  id: 'tokens',
                  header: t('Tokens'),
                  cell: (row) => formatCompactNumber(row.tokens, locale),
                },
                {
                  id: 'cost',
                  header: t('Cost'),
                  cell: (row) => money(row.cost),
                },
              ]}
            />
          )}
        </TabsContent>
        <div className='flex shrink-0 items-center justify-end gap-3 border-t pt-2'>
          <Button
            size='sm'
            variant='outline'
            disabled={page <= 1 || detail.isPending}
            onClick={() => setPage((value) => value - 1)}
          >
            {t('Previous')}
          </Button>
          <span className='text-muted-foreground text-xs'>
            {t('Page {{page}}', { page })}
          </span>
          <Button
            size='sm'
            variant='outline'
            disabled={
              page * 20 >= (detail.data?.total ?? 0) ||
              detail.isPending ||
              detail.isError
            }
            onClick={() => setPage((value) => value + 1)}
          >
            {t('Next')}
          </Button>
        </div>
      </Tabs>
    </Dialog>
  )
}
