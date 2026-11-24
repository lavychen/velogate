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
import { SlidersHorizontal } from 'lucide-react'
import { lazy, Suspense, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useAuthStore } from '@/stores/auth-store'

import { getAnalyticsOverview } from '../api'
import type { AnalyticsQuery } from '../api-types'
import { useOrganization } from '../hooks/use-enterprise'
import {
  AnalyticsActivity,
  AnalyticsModelShare,
  AnalyticsRankings,
  type AnalyticsDimension,
} from './analytics-breakdown'
import { AnalyticsDetails } from './analytics-details'
import { AnalyticsSummary } from './analytics-summary'

const Trend = lazy(() =>
  import('./analytics-trend').then((module) => ({
    default: module.AnalyticsTrend,
  }))
)

export function AnalyticsPage(props: { initialDimension?: string }) {
  const { t } = useTranslation()
  const userId = useAuthStore((state) => state.auth.user?.id)
  const { departments, employees } = useOrganization()
  const [range, setRange] = useState('7d')
  const [departmentId, setDepartmentId] = useState('')
  const [employeeId, setEmployeeId] = useState('')
  const [model, setModel] = useState('')
  const [detailDimension, setDetailDimension] =
    useState<AnalyticsDimension | null>(() => {
      const value = props.initialDimension
      if (
        value === 'departments' ||
        value === 'employees' ||
        value === 'keys' ||
        value === 'models'
      ) {
        return value
      }
      return null
    })
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
    enabled: !!userId,
  })
  const drill = (
    dimension: AnalyticsDimension,
    row: { id: string; name: string }
  ) => {
    if (dimension === 'departments') {
      setDepartmentId(row.id)
      setEmployeeId('')
      setDetailDimension('employees')
    }
    if (dimension === 'employees') {
      setEmployeeId(row.id)
      setDetailDimension('keys')
    }
    if (dimension === 'models') {
      setModel(row.name)
      setDetailDimension('models')
    }
  }
  const hasFilters = !!(departmentId || employeeId || model)
  return (
    <div className='space-y-5 pb-2'>
      <div className='flex flex-wrap items-center justify-between gap-4'>
        <div>
          <h2 className='text-lg font-semibold tracking-tight'>
            {t('Usage analytics')}
          </h2>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('Compare calls, tokens and cost across your organization')}
          </p>
        </div>
        <div className='flex max-w-full flex-wrap items-center gap-2'>
          <SlidersHorizontal
            className='text-muted-foreground mr-1 hidden size-4 sm:block'
            aria-hidden='true'
          />
          <NativeSelect
            aria-label={t('Department')}
            value={departmentId}
            onChange={(event) => {
              setDepartmentId(event.target.value)
              setEmployeeId('')
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
            onChange={(event) => setEmployeeId(event.target.value)}
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
            className='w-36'
            onChange={(event) => setModel(event.target.value)}
          />
          <NativeSelect
            aria-label={t('Time range')}
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            <NativeSelectOption value='today'>{t('Today')}</NativeSelectOption>
            <NativeSelectOption value='7d'>
              {t('Last 7 days')}
            </NativeSelectOption>
            <NativeSelectOption value='30d'>
              {t('Last 30 days')}
            </NativeSelectOption>
          </NativeSelect>
          {hasFilters && (
            <Button
              variant='ghost'
              size='sm'
              onClick={() => {
                setDepartmentId('')
                setEmployeeId('')
                setModel('')
              }}
            >
              {t('Reset filters')}
            </Button>
          )}
        </div>
      </div>
      {overview.isPending && <LoadingState className='min-h-80' />}
      {overview.isError && (
        <ErrorState
          className='min-h-80'
          onRetry={() => void overview.refetch()}
        />
      )}
      {overview.data && (
        <>
          <AnalyticsSummary summary={overview.data.summary} />
          <div className='grid gap-4 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]'>
            <Suspense
              fallback={<LoadingState className='enterprise-panel min-h-96' />}
            >
              <Trend data={overview.data} />
            </Suspense>
            <div className='grid min-w-0 gap-4 sm:grid-cols-2 xl:flex xl:flex-col'>
              <AnalyticsActivity data={overview.data} />
              <AnalyticsModelShare data={overview.data} />
            </div>
          </div>
          <AnalyticsRankings
            data={overview.data}
            onViewAll={setDetailDimension}
            onDrill={drill}
          />
        </>
      )}
      {detailDimension && (
        <AnalyticsDetails
          dimension={detailDimension}
          query={query}
          range={range}
          onDimensionChange={setDetailDimension}
          onDrill={drill}
          onClose={() => setDetailDimension(null)}
        />
      )}
    </div>
  )
}
