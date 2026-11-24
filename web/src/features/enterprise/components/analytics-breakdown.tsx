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
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { toIntlLocale } from '@/i18n/languages'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import type { AnalyticsOverview } from '../api-types'

export type AnalyticsDimension = 'departments' | 'employees' | 'keys' | 'models'

const modelColors = [
  '[&_[data-slot=progress-indicator]]:bg-indigo-500',
  '[&_[data-slot=progress-indicator]]:bg-orange-500',
  '[&_[data-slot=progress-indicator]]:bg-emerald-500',
  '[&_[data-slot=progress-indicator]]:bg-sky-500',
]

export function AnalyticsActivity(props: { data: AnalyticsOverview }) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const summary = props.data.summary
  const items = [
    { label: t('Active departments'), value: summary?.active_departments ?? 0 },
    { label: t('Active employees'), value: summary?.active_employees ?? 0 },
    {
      label: t('Active models'),
      value: summary?.active_models ?? summary?.model_count ?? 0,
    },
  ]
  return (
    <section
      className='enterprise-panel p-5'
      aria-label={t('Activity overview')}
    >
      <h3 className='text-sm font-semibold'>{t('Activity overview')}</h3>
      <dl className='mt-4 grid grid-cols-3 gap-2'>
        {items.map((item) => (
          <div
            key={item.label}
            className='bg-muted/70 min-w-0 rounded-xl px-2 py-3 text-center'
          >
            <dt className='text-muted-foreground text-xs leading-relaxed'>
              {item.label}
            </dt>
            <dd className='mt-1 font-mono text-xl font-semibold tabular-nums'>
              {formatNumber(item.value, locale)}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  )
}

export function AnalyticsModelShare(props: { data: AnalyticsOverview }) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const models = props.data.top_models ?? []
  const total = props.data.summary?.cost ?? 0
  return (
    <section
      className='enterprise-panel flex flex-1 flex-col p-5'
      aria-label={t('Model cost share')}
    >
      <h3 className='text-sm font-semibold'>{t('Model cost share')}</h3>
      {models.length === 0 ? (
        <EmptyState
          title={t('No results found.')}
          className='min-h-32 flex-1 py-4'
        />
      ) : (
        <ul className='mt-5 space-y-4'>
          {models.slice(0, 4).map((model, index) => {
            const name = model.model || model.name || t('Unknown')
            const percent =
              total > 0
                ? Math.min(100, Math.max(0, ((model.cost ?? 0) / total) * 100))
                : 0
            return (
              <li key={name} className='min-w-0'>
                <div className='mb-1.5 flex min-w-0 items-center justify-between gap-3 text-xs'>
                  <span className='truncate font-mono' title={name}>
                    {name}
                  </span>
                  <span className='shrink-0 font-mono tabular-nums'>
                    {formatBillingCurrencyFromUSD(model.cost ?? 0, {
                      locale,
                      digitsLarge: 2,
                    })}
                    <span className='text-muted-foreground ml-1.5'>
                      ({formatNumber(Math.round(percent), locale)}%)
                    </span>
                  </span>
                </div>
                <Progress
                  value={percent}
                  aria-label={name}
                  className={cn(
                    modelColors[index],
                    '[&_[data-slot=progress-track]]:h-2'
                  )}
                />
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}

type RankingRow = {
  id: string
  name: string
  cost: number
  calls?: number
  department?: string
}

export function AnalyticsRankings(props: {
  data: AnalyticsOverview
  onViewAll: (dimension: AnalyticsDimension) => void
  onDrill: (
    dimension: AnalyticsDimension,
    row: { id: string; name: string }
  ) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const rankings: {
    title: string
    action: string
    dimension: AnalyticsDimension
    badge: string
    rows: RankingRow[]
  }[] = [
    {
      title: t('Department ranking'),
      action: t('View all departments'),
      dimension: 'departments',
      badge: 'bg-orange-700 text-white',
      rows: (props.data.top_departments ?? []).map((row) => ({
        id: String(row.id),
        name: row.name,
        cost: row.cost ?? 0,
        calls: row.request_count ?? 0,
      })),
    },
    {
      title: t('Employee ranking'),
      action: t('View all employees'),
      dimension: 'employees',
      badge: 'bg-indigo-600 text-white',
      rows: (props.data.top_employees ?? []).map((row) => ({
        id: String(row.id),
        name: row.name,
        cost: row.cost ?? 0,
        department: row.department_name,
      })),
    },
    {
      title: t('Model ranking'),
      action: t('View all models'),
      dimension: 'models',
      badge: 'bg-emerald-700 text-white',
      rows: (props.data.top_models ?? []).map((row) => ({
        id: row.model || row.name || '',
        name: row.model || row.name || t('Unknown'),
        cost: row.cost ?? 0,
      })),
    },
  ]
  return (
    <div className='grid gap-4 xl:grid-cols-3'>
      {rankings.map((ranking) => (
        <section
          key={ranking.dimension}
          className='enterprise-panel p-5'
          aria-label={ranking.title}
        >
          <div className='mb-3 flex items-center justify-between gap-3'>
            <h3 className='text-sm font-semibold'>{ranking.title}</h3>
            <Button
              variant='link'
              size='sm'
              className='h-auto shrink-0 px-0 text-xs'
              aria-label={ranking.action}
              onClick={() => props.onViewAll(ranking.dimension)}
            >
              {t('View all')}
            </Button>
          </div>
          {ranking.rows.length === 0 ? (
            <EmptyState
              title={t('No results found.')}
              className='min-h-36 py-4'
            />
          ) : (
            <ol className='space-y-1'>
              {ranking.rows.slice(0, 4).map((row, index) => (
                <li
                  key={row.id}
                  className='flex min-w-0 items-center gap-2.5 py-2'
                >
                  <span
                    className={cn(
                      'flex size-5 shrink-0 items-center justify-center rounded-md font-mono text-[11px] font-medium',
                      index === 0
                        ? ranking.badge
                        : 'bg-muted text-muted-foreground'
                    )}
                    aria-hidden='true'
                  >
                    {index + 1}
                  </span>
                  <Button
                    variant='link'
                    className='text-foreground h-auto min-w-0 flex-1 justify-start gap-2 overflow-hidden px-0 py-1 text-xs font-normal'
                    aria-label={t('View {{name}} usage', { name: row.name })}
                    onClick={() => props.onDrill(ranking.dimension, row)}
                  >
                    <span
                      className={cn(
                        'truncate',
                        ranking.dimension === 'models' && 'font-mono'
                      )}
                      title={row.name}
                    >
                      {row.name}
                    </span>
                    {row.department && (
                      <span className='bg-muted text-muted-foreground hidden max-w-24 truncate rounded px-1.5 py-0.5 text-[10px] sm:inline-block'>
                        {row.department}
                      </span>
                    )}
                  </Button>
                  <div className='flex shrink-0 items-center gap-2 text-xs tabular-nums'>
                    {row.calls !== undefined && (
                      <span className='text-muted-foreground hidden 2xl:inline'>
                        {formatNumber(row.calls, locale)} ·
                      </span>
                    )}
                    <span className='font-mono font-medium'>
                      {formatBillingCurrencyFromUSD(row.cost, {
                        locale,
                        digitsLarge: 2,
                      })}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>
      ))}
    </div>
  )
}
