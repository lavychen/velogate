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

import type { AnalyticsOverview } from '../api-types'

const colors = ['#6366f1', '#f97316', '#10b981', '#0ea5e9']
export function AnalyticsTrend(props: { data: AnalyticsOverview }) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const id = useId().replaceAll(':', '')
  const [comparison, setComparison] = useState('total')
  const [metric, setMetric] = useState('cost')
  const points =
    comparison === 'employees'
      ? props.data.employee_trend
      : props.data.department_trend
  const groups =
    comparison === 'total'
      ? [{ id: 0, name: t('Total') }]
      : [
          ...new Map(
            (points ?? []).map((point) => [
              point.id,
              { id: point.id, name: point.name },
            ])
          ).values(),
        ].slice(0, 4)
  const data = (props.data.trend ?? []).map((point) => {
    const values: Record<string, string | number> = {
      label: point.label || point.time || '',
    }
    groups.forEach((group, index) => {
      const record =
        comparison === 'total'
          ? point
          : points?.find(
              (entry) => entry.id === group.id && entry.time === point.time
            )
      let value = record?.cost ?? 0
      if (metric === 'requests') value = record?.request_count ?? 0
      if (metric === 'tokens') value = record?.total_tokens ?? 0
      values[`series${index}`] = value
    })
    return values
  })
  const config = Object.fromEntries(
    groups.map((group, index) => [
      `series${index}`,
      { label: group.name, color: colors[index] },
    ])
  )
  const formatValue = (value: number) =>
    metric === 'cost'
      ? formatBillingCurrencyFromUSD(value, { locale })
      : formatCompactNumber(value, locale)
  return (
    <section className='enterprise-panel p-5' aria-label={t('Usage trend')}>
      <div className='mb-5 flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h3 className='font-semibold'>{t('Usage trend')}</h3>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('Compare calls, tokens and cost across your organization')}
          </p>
        </div>
        <div className='flex gap-2'>
          <NativeSelect
            aria-label={t('Comparison dimension')}
            value={comparison}
            onChange={(event) => setComparison(event.target.value)}
          >
            <NativeSelectOption value='total'>{t('Total')}</NativeSelectOption>
            <NativeSelectOption value='departments'>
              {t('Departments')}
            </NativeSelectOption>
            <NativeSelectOption value='employees'>
              {t('Employees')}
            </NativeSelectOption>
          </NativeSelect>
          <NativeSelect
            aria-label={t('Metric')}
            value={metric}
            onChange={(event) => setMetric(event.target.value)}
          >
            <NativeSelectOption value='cost'>{t('Cost')}</NativeSelectOption>
            <NativeSelectOption value='requests'>
              {t('Requests')}
            </NativeSelectOption>
            <NativeSelectOption value='tokens'>
              {t('Tokens')}
            </NativeSelectOption>
          </NativeSelect>
        </div>
      </div>
      {data.length === 0 ? (
        <EmptyState title={t('No results found.')} />
      ) : (
        <ChartContainer config={config} className='h-64 w-full'>
          <AreaChart
            data={data}
            margin={{ left: 0, right: 8 }}
            accessibilityLayer
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
                    stopColor={colors[index]}
                    stopOpacity={0.2}
                  />
                  <stop
                    offset='100%'
                    stopColor={colors[index]}
                    stopOpacity={0.02}
                  />
                </linearGradient>
              ))}
            </defs>
            <CartesianGrid vertical={false} strokeDasharray='3 3' />
            <XAxis
              dataKey='label'
              tickLine={false}
              axisLine={false}
              minTickGap={32}
            />
            <YAxis
              tickFormatter={formatValue}
              tickLine={false}
              axisLine={false}
              width={70}
            />
            <ChartTooltip
              content={
                <ChartTooltipContent
                  formatter={(value) => formatValue(Number(value))}
                />
              }
            />
            {groups.map((group, index) => (
              <Area
                key={group.id}
                type='monotone'
                dataKey={`series${index}`}
                stroke={colors[index]}
                fill={`url(#${id}-${index})`}
                strokeWidth={2}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      )}
    </section>
  )
}
