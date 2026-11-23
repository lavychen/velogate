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
import { useId, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts'

import { EmptyState } from '@/components/empty-state'
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from '@/components/ui/chart'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { toIntlLocale } from '@/i18n/languages'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { formatCompactNumber } from '@/lib/format'

import type { UsageMetric, UsageRecord, UsageRow } from '../types'

const COLORS = ['#6366f1', '#f97316', '#10b981', '#0ea5e9']

export function UsageTrend(props: {
  records: UsageRecord[]
  departments: UsageRow[]
  members: UsageRow[]
  metric: UsageMetric
  onMetricChange: (metric: UsageMetric) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const id = useId().replaceAll(':', '')
  const [comparison, setComparison] = useState('total')
  let groups = [{ id: 'total', name: t('Total') }]
  if (comparison === 'departments') groups = props.departments.slice(0, 4)
  if (comparison === 'members') groups = props.members.slice(0, 4)
  const config = Object.fromEntries(
    groups.map((group, index) => [
      `series${index}`,
      { label: group.name, color: COLORS[index] },
    ])
  )
  const days = [...new Set(props.records.map((record) => record.day))].sort(
    (a, b) => b - a
  )
  const data = days.map((day) => {
    const point: Record<string, string | number> = {
      label: t('{{count}} days ago', { count: day }),
    }
    if (day === 0) point.label = t('Today')
    groups.forEach((group, index) => {
      point[`series${index}`] = props.records
        .filter(
          (record) =>
            record.day === day &&
            (comparison === 'total' ||
              (comparison === 'departments' &&
                record.departmentId === group.id) ||
              (comparison === 'members' && record.memberId === group.id))
        )
        .reduce((total, record) => total + record[props.metric], 0)
    })
    return point
  })
  const formatValue = (value: number) =>
    props.metric === 'cost'
      ? formatBillingCurrencyFromUSD(value, { locale })
      : formatCompactNumber(value, locale)

  return (
    <section className='enterprise-panel p-5' aria-label={t('Usage trend')}>
      <div className='mb-5 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <h3 className='text-sm font-semibold'>{t('Usage trend')}</h3>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('Compare calls, tokens and cost across your organization')}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          <NativeSelect
            aria-label={t('Metric')}
            value={props.metric}
            onChange={(event) =>
              props.onMetricChange(event.target.value as UsageMetric)
            }
          >
            <NativeSelectOption value='cost'>{t('Cost')}</NativeSelectOption>
            <NativeSelectOption value='calls'>
              {t('Requests')}
            </NativeSelectOption>
            <NativeSelectOption value='tokens'>
              {t('Tokens')}
            </NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            aria-label={t('Compare by')}
            value={comparison}
            onChange={(event) => setComparison(event.target.value)}
          >
            <NativeSelectOption value='total'>{t('Total')}</NativeSelectOption>
            <NativeSelectOption value='departments'>
              {t('Departments')}
            </NativeSelectOption>
            <NativeSelectOption value='members'>
              {t('Members')}
            </NativeSelectOption>
          </NativeSelect>
        </div>
      </div>
      {props.records.length === 0 ? (
        <EmptyState />
      ) : (
        <>
          <ChartContainer
            config={config}
            className='aspect-auto h-72 w-full'
            role='img'
            aria-label={t('Usage trend')}
          >
            <AreaChart
              data={data}
              accessibilityLayer
              margin={{ left: 0, right: 12, top: 12, bottom: 0 }}
            >
              <defs>
                {groups.map((group, index) => (
                  <linearGradient
                    key={group.id}
                    id={`${id}-${index}`}
                    x1='0'
                    y1='0'
                    x2='0'
                    y2='1'
                  >
                    <stop
                      offset='0%'
                      stopColor={COLORS[index]}
                      stopOpacity={0.22}
                    />
                    <stop
                      offset='100%'
                      stopColor={COLORS[index]}
                      stopOpacity={0.01}
                    />
                  </linearGradient>
                ))}
              </defs>
              <CartesianGrid vertical={false} strokeDasharray='3 3' />
              <XAxis
                dataKey='label'
                tickLine={false}
                axisLine={false}
                minTickGap={35}
                tickMargin={10}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                width={65}
                tickFormatter={formatValue}
              />
              <ChartTooltip
                content={
                  <ChartTooltipContent
                    formatter={(value, name) => (
                      <span>
                        {name}: {formatValue(Number(value))}
                      </span>
                    )}
                  />
                }
              />
              {groups.map((group, index) => (
                <Area
                  key={group.id}
                  type='monotone'
                  dataKey={`series${index}`}
                  stroke={COLORS[index]}
                  strokeWidth={2}
                  fill={`url(#${id}-${index})`}
                  isAnimationActive={false}
                />
              ))}
            </AreaChart>
          </ChartContainer>
          <div className='mt-4 flex flex-wrap gap-4'>
            {groups.map((group, index) => (
              <span
                key={group.id}
                className='text-muted-foreground flex items-center gap-1.5 text-xs'
              >
                <span
                  className='size-2 rounded-full'
                  style={{ backgroundColor: COLORS[index] }}
                />
                {group.name}
              </span>
            ))}
          </div>
        </>
      )}
    </section>
  )
}
