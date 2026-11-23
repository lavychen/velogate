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
import {
  Activity,
  ArrowUpRight,
  Cpu,
  Download,
  KeyRound,
  Search,
  Wallet,
} from 'lucide-react'
import { lazy, Suspense, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { StaticDataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Progress } from '@/components/ui/progress'
import { Skeleton } from '@/components/ui/skeleton'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { downloadCsv, toCsvLine } from '@/features/usage-logs/lib/export'
import { toIntlLocale } from '@/i18n/languages'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { formatCompactNumber, formatNumber } from '@/lib/format'

import { DEMO_USAGE } from '../demo-data'
import { filterUsage, groupUsage, summarizeUsage } from '../lib/usage'
import { useEnterpriseDemoStore } from '../store'
import type {
  UsageDimension,
  UsageMetric,
  UsageRange,
  UsageRow,
} from '../types'

const LazyUsageTrend = lazy(() =>
  import('./usage-trend').then((module) => ({ default: module.UsageTrend }))
)

export function UsageAnalytics() {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const departments = useEnterpriseDemoStore((state) => state.departments)
  const members = useEnterpriseDemoStore((state) => state.members)
  const keys = useEnterpriseDemoStore((state) => state.keys)
  const [range, setRange] = useState<UsageRange>('7d')
  const [metric, setMetric] = useState<UsageMetric>('cost')
  const [departmentId, setDepartmentId] = useState('')
  const [dimension, setDimension] = useState<UsageDimension>('departments')
  const [search, setSearch] = useState('')
  const records = filterUsage(DEMO_USAGE, range, departmentId)
  const totals = summarizeUsage(records)
  const money = (value: number) =>
    formatBillingCurrencyFromUSD(value, { locale, digitsLarge: 2 })
  const names = new Map([
    ...departments.map((item) => [item.id, t(item.name)] as const),
    ...members.map((item) => [item.id, item.name] as const),
    ...keys.map((item) => [item.id, item.name] as const),
  ])
  const departmentRows = groupUsage(records, 'departments', names)
  const memberRows = groupUsage(records, 'members', names)
  const rows = groupUsage(records, dimension, names).filter((row) =>
    row.name.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  )
  const budget = departments
    .filter((department) => !departmentId || department.id === departmentId)
    .reduce((total, department) => total + department.budget, 0)
  const monthCost = summarizeUsage(
    filterUsage(DEMO_USAGE, '30d', departmentId)
  ).cost
  const budgetPercent =
    budget > 0 ? Math.min(100, (monthCost / budget) * 100) : 0
  const relevantMembers = members.filter(
    (member) => !departmentId || member.departmentId === departmentId
  )
  const relevantKeys = keys.filter((key) =>
    relevantMembers.some((member) => member.id === key.memberId)
  )
  const stats = [
    {
      label: t('Requests'),
      value: formatNumber(totals.calls, locale),
      detail: t('Selected period'),
      icon: Activity,
      color: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400',
    },
    {
      label: t('Tokens'),
      value: formatCompactNumber(totals.tokens, locale),
      detail: t('Input and output tokens'),
      icon: Cpu,
      color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
    },
    {
      label: t('Usage cost'),
      value: money(totals.cost),
      detail: t('Sample usage'),
      icon: Wallet,
      color: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
    },
    {
      label: t('Active keys'),
      value: formatNumber(
        relevantKeys.filter((key) => key.enabled).length,
        locale
      ),
      detail: t('{{count}} assigned keys', { count: relevantKeys.length }),
      icon: KeyRound,
      color: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
    },
  ]
  const dimensions: { value: UsageDimension; label: string }[] = [
    { value: 'departments', label: t('Departments') },
    { value: 'members', label: t('Members') },
    { value: 'keys', label: t('API Keys') },
    { value: 'models', label: t('Models') },
  ]

  const exportRows = () => {
    downloadCsv(`enterprise-demo-${dimension}-${range}.csv`, [
      toCsvLine([t('Name'), t('Requests'), t('Tokens'), 'USD']),
      ...rows.map((row) =>
        toCsvLine([
          row.name,
          String(row.calls),
          String(row.tokens),
          row.cost.toFixed(4),
        ])
      ),
    ])
  }
  const drillIntoDepartment = (row: UsageRow) => {
    setDepartmentId(row.id)
    setDimension('members')
    setSearch('')
  }

  return (
    <div className='space-y-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-xl font-semibold tracking-tight'>
            {t('Usage analytics')}
          </h2>
          <p className='text-muted-foreground mt-1 text-sm'>
            {t('Understand usage, attribute costs and plan team budgets')}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <NativeSelect
            aria-label={t('Department')}
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
          >
            <NativeSelectOption value=''>
              {t('All departments')}
            </NativeSelectOption>
            {departments.map((department) => (
              <NativeSelectOption key={department.id} value={department.id}>
                {t(department.name)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
          <NativeSelect
            aria-label={t('Time range')}
            value={range}
            onChange={(event) => setRange(event.target.value as UsageRange)}
          >
            <NativeSelectOption value='today'>{t('Today')}</NativeSelectOption>
            <NativeSelectOption value='7d'>
              {t('Last 7 days')}
            </NativeSelectOption>
            <NativeSelectOption value='30d'>
              {t('Last 30 days')}
            </NativeSelectOption>
          </NativeSelect>
        </div>
      </div>
      <div className='grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4'>
        {stats.map((stat) => (
          <section
            aria-label={stat.label}
            className='enterprise-panel p-5'
            key={stat.label}
          >
            <div className='flex items-center justify-between gap-2'>
              <span className='text-muted-foreground text-xs font-medium'>
                {stat.label}
              </span>
              <span
                className={`flex size-8 items-center justify-center rounded-lg ${stat.color}`}
              >
                <stat.icon className='size-4' aria-hidden='true' />
              </span>
            </div>
            <p className='mt-3 text-2xl font-semibold tracking-tight tabular-nums'>
              {stat.value}
            </p>
            <p className='text-muted-foreground mt-2 text-xs'>{stat.detail}</p>
          </section>
        ))}
      </div>
      <div className='grid gap-5 xl:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]'>
        <Suspense fallback={<Skeleton className='h-[420px] rounded-xl' />}>
          <LazyUsageTrend
            records={records}
            departments={departmentRows}
            members={memberRows}
            metric={metric}
            onMetricChange={setMetric}
          />
        </Suspense>
        <section
          className='enterprise-panel flex flex-col p-5'
          aria-label={t('Monthly budget')}
        >
          <h3 className='text-sm font-semibold'>{t('Monthly budget')}</h3>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('Sample budget allocation')}
          </p>
          <p className='mt-6 text-3xl font-semibold tabular-nums'>
            {money(monthCost)}
          </p>
          <p className='text-muted-foreground mt-2 text-xs'>
            {t('of {{amount}} budget', { amount: money(budget) })}
          </p>
          <Progress
            value={budgetPercent}
            aria-label={t('Budget used')}
            className='my-5'
          />
          <div className='border-t pt-4'>
            <div className='mb-3 flex justify-between text-xs'>
              <span className='text-muted-foreground'>{t('Departments')}</span>
              <span>
                {formatNumber(
                  departments.filter(
                    (item) => !departmentId || item.id === departmentId
                  ).length,
                  locale
                )}
              </span>
            </div>
            <div className='flex justify-between text-xs'>
              <span className='text-muted-foreground'>{t('Members')}</span>
              <span>{formatNumber(relevantMembers.length, locale)}</span>
            </div>
          </div>
          <p className='text-muted-foreground mt-auto pt-6 text-xs leading-relaxed'>
            {t(
              'Budgets and key limits are illustrative and are not enforced by the gateway.'
            )}
          </p>
        </section>
      </div>
      <div className='grid gap-5 lg:grid-cols-2'>
        {[
          { title: t('Department ranking'), data: departmentRows, drill: true },
          { title: t('Member ranking'), data: memberRows, drill: false },
        ].map((ranking) => (
          <section key={ranking.title} className='enterprise-panel p-5'>
            <h3 className='mb-4 text-sm font-semibold'>{ranking.title}</h3>
            {ranking.data.slice(0, 3).map((row, index) => (
              <div
                key={row.id}
                className='flex items-center gap-3 border-b py-3 last:border-0'
              >
                <span className='text-muted-foreground w-4 font-mono text-xs'>
                  {index + 1}
                </span>
                <div className='min-w-0 flex-1'>
                  <span className='block truncate text-sm'>{row.name}</span>
                  <Progress
                    value={totals.cost > 0 ? (row.cost / totals.cost) * 100 : 0}
                    aria-label={row.name}
                    className='mt-2'
                  />
                </div>
                <span className='text-sm tabular-nums'>{money(row.cost)}</span>
                {ranking.drill && (
                  <Button
                    variant='ghost'
                    size='icon-sm'
                    aria-label={t('View {{name}} usage', { name: row.name })}
                    onClick={() => drillIntoDepartment(row)}
                  >
                    <ArrowUpRight aria-hidden='true' />
                  </Button>
                )}
              </div>
            ))}
            {ranking.data.length === 0 && <EmptyState className='min-h-32' />}
          </section>
        ))}
      </div>
      <section className='enterprise-panel p-4 sm:p-5'>
        <Tabs
          value={dimension}
          onValueChange={(value) => {
            setDimension(value as UsageDimension)
            setSearch('')
          }}
        >
          <div className='flex flex-wrap items-center justify-between gap-3'>
            <div className='max-w-full overflow-x-auto'>
              <TabsList aria-label={t('Usage dimension')} variant='line'>
                {dimensions.map((item) => (
                  <TabsTrigger value={item.value} key={item.value}>
                    {item.label}
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className='flex max-w-full gap-2'>
              <div className='relative min-w-0'>
                <Search
                  className='text-muted-foreground absolute top-2.5 left-2.5 size-3.5'
                  aria-hidden='true'
                />
                <Input
                  aria-label={t('Search usage')}
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder={t('Search')}
                  className='w-full pl-8 sm:w-48'
                />
              </div>
              <Button
                variant='outline'
                size='sm'
                onClick={exportRows}
                disabled={rows.length === 0}
              >
                <Download aria-hidden='true' />
                {t('Export')}
              </Button>
            </div>
          </div>
          {dimensions.map((item) => (
            <TabsContent key={item.value} value={item.value} className='mt-3'>
              <StaticDataTable
                data={rows}
                getRowKey={(row) => row.id}
                tableClassName='min-w-[640px]'
                emptyContent={
                  <EmptyState
                    title={t('No results found.')}
                    className='min-h-40'
                  />
                }
                columns={[
                  {
                    id: 'name',
                    header: t('Name'),
                    cell: (row) =>
                      dimension === 'departments' ? (
                        <Button
                          variant='link'
                          className='h-auto max-w-full justify-start p-0 text-left'
                          onClick={() => drillIntoDepartment(row)}
                        >
                          {row.name}
                          <ArrowUpRight className='size-3' aria-hidden='true' />
                        </Button>
                      ) : (
                        row.name
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
                  {
                    id: 'share',
                    header: t('Cost share'),
                    cell: (row) =>
                      `${formatNumber(totals.cost > 0 ? (row.cost / totals.cost) * 100 : 0, locale)}%`,
                  },
                ]}
              />
            </TabsContent>
          ))}
        </Tabs>
      </section>
    </div>
  )
}
