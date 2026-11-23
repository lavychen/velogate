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
import { Activity, Cpu, Download, KeyRound, Wallet } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { StaticDataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { downloadCsv, toCsvLine } from '@/features/usage-logs/lib/export'
import { toIntlLocale } from '@/i18n/languages'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { formatNumber, formatCompactNumber } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'

import {
  getAnalyticsOverview,
  getDepartmentAnalytics,
  getEmployeeAnalytics,
  getModelAnalytics,
  getAnalyticsTokens,
} from '../api'
import type { AnalyticsQuery } from '../api-types'
import { useOrganization } from '../hooks/use-enterprise'

const Trend = lazy(() =>
  import('./analytics-trend').then((module) => ({
    default: module.AnalyticsTrend,
  }))
)
type UsageRow = {
  id: string
  name: string
  calls: number
  tokens: number
  cost: number
}
export function AnalyticsPage(props: { initialDimension?: string }) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const userId = useAuthStore((state) => state.auth.user?.id)
  const { departments, employees } = useOrganization()
  const [range, setRange] = useState('7d')
  const [departmentId, setDepartmentId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [model, setModel] = useState('')
  const [dimension, setDimension] = useState(
    props.initialDimension || 'departments'
  )
  const [page, setPage] = useState(1)
  const [sortBy, setSortBy] = useState('cost')
  const [search, setSearch] = useState('')
  const interval = useMemo(() => {
    const end = new Date()
    const start = new Date(end)
    if (range === 'today') start.setHours(0, 0, 0, 0)
    else start.setDate(start.getDate() - (range === '30d' ? 30 : 7))
    return {
      start: start.toISOString(),
      end: new Date(end.getTime() + 1000).toISOString(),
      granularity: range === 'today' ? ('hour' as const) : ('day' as const),
    }
  }, [range])
  const query: AnalyticsQuery = {
    ...interval,
    department_id: departmentId ? Number(departmentId) : undefined,
    employee_id: employeeId ? Number(employeeId) : undefined,
    model: model.trim() || undefined,
  }
  const overview = useQuery({
    queryKey: ['enterprise', userId, 'analytics', 'overview', query],
    queryFn: () => getAnalyticsOverview(query),
  })
  const detail = useQuery({
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
  const summary = overview.data?.summary
  const stats = [
    {
      label: t('Requests'),
      value: formatNumber(summary?.request_count ?? 0, locale),
      icon: Activity,
      tone: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    },
    {
      label: t('Tokens'),
      value: formatCompactNumber(summary?.total_tokens ?? 0, locale),
      icon: Cpu,
      tone: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    },
    {
      label: t('Usage cost'),
      value: money(summary?.cost ?? 0),
      icon: Wallet,
      tone: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    },
    {
      label: t('Active keys'),
      value: formatNumber(summary?.active_keys ?? 0, locale),
      icon: KeyRound,
      tone: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    },
  ]
  const dimensions = [
    { id: 'departments', label: t('Departments') },
    { id: 'employees', label: t('Employees') },
    { id: 'keys', label: t('API Keys') },
    { id: 'models', label: t('Models') },
  ]
  const drill = (row: UsageRow) => {
    if (dimension === 'departments') {
      setDepartmentId(row.id)
      setEmployeeId('')
      setDimension('employees')
    }
    if (dimension === 'employees') {
      setEmployeeId(row.id)
      setDimension('keys')
    }
    if (dimension === 'models') setModel(row.name)
    setPage(1)
  }
  return (
    <div className='space-y-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-xl font-semibold'>{t('Usage analytics')}</h2>
          <p className='text-muted-foreground mt-1 text-sm'>
            {t('Compare calls, tokens and cost across your organization')}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <NativeSelect
            aria-label={t('Time range')}
            value={range}
            onChange={(event) => {
              setRange(event.target.value)
              setPage(1)
            }}
          >
            <NativeSelectOption value='today'>{t('Today')}</NativeSelectOption>
            <NativeSelectOption value='7d'>
              {t('Last 7 days')}
            </NativeSelectOption>
            <NativeSelectOption value='30d'>
              {t('Last 30 days')}
            </NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            aria-label={t('Department')}
            value={departmentId}
            onChange={(event) => {
              setDepartmentId(event.target.value)
              setEmployeeId('')
              setPage(1)
            }}
          >
            <NativeSelectOption value=''>
              {t('All departments')}
            </NativeSelectOption>
            {departments.data?.map((row) => (
              <NativeSelectOption key={row.id} value={row.id}>
                {row.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label={t('Employee')}
            value={employeeId}
            onChange={(event) => {
              setEmployeeId(event.target.value)
              setPage(1)
            }}
          >
            <NativeSelectOption value=''>
              {t('All employees')}
            </NativeSelectOption>
            {employees.data
              ?.filter(
                (row) =>
                  !departmentId || row.department_id === Number(departmentId)
              )
              .map((row) => (
                <NativeSelectOption key={row.id} value={row.id}>
                  {row.name}
                </NativeSelectOption>
              ))}
          </NativeSelect>
          <Input
            aria-label={t('Model')}
            placeholder={t('Model')}
            value={model}
            className='w-40'
            onChange={(event) => {
              setModel(event.target.value)
              setPage(1)
            }}
          />
        </div>
      </div>
      {overview.isPending && <LoadingState />}
      {overview.isError && (
        <ErrorState onRetry={() => void overview.refetch()} />
      )}
      {overview.data && (
        <>
          <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
            {stats.map((stat) => (
              <section
                key={stat.label}
                className='enterprise-panel p-5'
                aria-label={stat.label}
              >
                <div className='flex items-center justify-between gap-3'>
                  <p className='text-muted-foreground text-sm'>{stat.label}</p>
                  <span
                    className={`flex size-9 items-center justify-center rounded-xl ${stat.tone}`}
                  >
                    <stat.icon className='size-4' aria-hidden='true' />
                  </span>
                </div>
                <p className='mt-3 text-2xl font-semibold tracking-tight'>
                  {stat.value}
                </p>
                <p className='text-muted-foreground mt-2 text-xs'>
                  {t('Selected period')}
                </p>
              </section>
            ))}
          </div>
          <Suspense fallback={<LoadingState />}>
            <Trend data={overview.data} />
          </Suspense>
        </>
      )}
      <section className='enterprise-panel p-4'>
        <Tabs
          value={dimension}
          onValueChange={(value) => {
            setDimension(value)
            setPage(1)
            setSearch('')
          }}
        >
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <TabsList>
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
                <NativeSelectOption value='cost'>
                  {t('Cost')}
                </NativeSelectOption>
                <NativeSelectOption value='request_count'>
                  {t('Requests')}
                </NativeSelectOption>
                <NativeSelectOption value='total_tokens'>
                  {t('Tokens')}
                </NativeSelectOption>
              </NativeSelect>
              <Button
                variant='outline'
                disabled={
                  rows.length === 0 || detail.isPending || detail.isError
                }
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
          {detail.isPending && <LoadingState />}
          {detail.isError && (
            <ErrorState onRetry={() => void detail.refetch()} />
          )}
          {!detail.isPending && !detail.isError && (
            <StaticDataTable
              data={rows}
              getRowKey={(row) => row.id}
              tableClassName='min-w-[600px]'
              emptyContent={<EmptyState title={t('No results found.')} />}
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
                        onClick={() => drill(row)}
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
          <div className='mt-3 flex items-center justify-end gap-3 border-t pt-3'>
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
                page * 20 >= (detail.data?.total ?? 0) || detail.isPending
              }
              onClick={() => setPage((value) => value + 1)}
            >
              {t('Next')}
            </Button>
          </div>
        </Tabs>
      </section>
    </div>
  )
}
