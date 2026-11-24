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
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
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
  const comparisonPoints = new Map(
    (points ?? []).map((point) => [
      `${point.id}:${point.time || point.date || point.label}`,
      point,
    ])
  )
  const data = (props.data.trend ?? []).map((point) => {
    const values: Record<string, string | number> = {
      label: point.label || point.time || point.date || '',
    }
    groups.forEach((group, index) => {
      const record =
        comparison === 'total'
          ? point
          : comparisonPoints.get(
              `${group.id}:${point.time || point.date || point.label}`
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
  const metrics = [
    { value: 'requests', label: t('Requests') },
    { value: 'tokens', label: t('Tokens') },
    { value: 'cost', label: t('Cost') },
  ]
  const dimensions = [
    { value: 'total', label: t('Total') },
    { value: 'departments', label: t('Departments') },
    { value: 'employees', label: t('Employees') },
  ]
  return (
    <section
      className='enterprise-panel flex min-w-0 flex-col p-5'
      aria-label={t('Usage trend')}
    >
      <div className='mb-5 flex shrink-0 flex-wrap items-start justify-between gap-4'>
        <div>
          <h3 className='text-sm font-semibold'>{t('Usage trend')}</h3>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('Compare calls, tokens and cost across your organization')}
          </p>
        </div>
        <div className='flex max-w-full flex-wrap gap-2'>
          <ToggleGroup
            aria-label={t('Metric')}
            value={[metric]}
            onValueChange={(values) => {
              if (values[0]) setMetric(values[0])
            }}
            size='sm'
            className='bg-muted/70 max-w-full flex-wrap rounded-lg border p-0.5'
          >
            {metrics.map((item) => (
              <ToggleGroupItem
                key={item.value}
                value={item.value}
                className='text-muted-foreground aria-pressed:bg-primary aria-pressed:text-primary-foreground rounded-md! px-2.5 text-xs'
              >
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            aria-label={t('Comparison dimension')}
            value={[comparison]}
            onValueChange={(values) => {
              if (values[0]) setComparison(values[0])
            }}
            size='sm'
            className='bg-muted/70 max-w-full flex-wrap rounded-lg border p-0.5'
          >
            {dimensions.map((item) => (
              <ToggleGroupItem
                key={item.value}
                value={item.value}
                className='text-muted-foreground aria-pressed:bg-orange-700 aria-pressed:text-white rounded-md! px-2.5 text-xs'
              >
                {item.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </div>
      {comparison !== 'total' && groups.length > 0 && (
        <ul className='mb-4 flex flex-wrap gap-x-4 gap-y-2 text-xs'>
          {groups.map((group, index) => (
            <li key={group.id} className='flex min-w-0 items-center gap-1.5'>
              <span
                className='size-2 shrink-0 rounded-full'
                style={{ backgroundColor: colors[index] }}
                aria-hidden='true'
              />
              <span className='max-w-48 truncate' title={group.name}>
                {group.name}
              </span>
            </li>
          ))}
        </ul>
      )}
      {data.length === 0 || groups.length === 0 ? (
        <div className='flex min-h-72 flex-1 items-center justify-center'>
          <EmptyState title={t('No results found.')} className='min-h-0 py-4' />
        </div>
      ) : (
        <ChartContainer
          config={config}
          className='h-72 w-full flex-1 aspect-auto sm:min-h-80'
        >
          <AreaChart
            data={data}
            margin={{ left: -12, right: 8, top: 12, bottom: 4 }}
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
                  formatter={(value, name) => (
                    <div className='flex w-full items-center justify-between gap-6'>
                      <span className='text-muted-foreground'>
                        {config[String(name)]?.label ?? name}
                      </span>
                      <span className='font-mono font-medium tabular-nums'>
                        {formatValue(Number(value))}
                      </span>
                    </div>
                  )}
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
                strokeWidth={2.25}
                dot={data.length === 1}
                isAnimationActive={false}
              />
            ))}
          </AreaChart>
        </ChartContainer>
      )}
    </section>
  )
}
