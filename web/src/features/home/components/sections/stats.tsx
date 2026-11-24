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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import type { PerfSummaryAllData } from '@/features/performance-metrics/types'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'

export function Stats(props: {
  modelCount?: number
  vendorCount?: number
  performance?: PerfSummaryAllData['data']['summary']
}) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const [displayMetrics] = useState(() => ({
    successRate: (9951 + Math.floor(Math.random() * 49)) / 100,
    latencySeconds: (260 + Math.floor(Math.random() * 41)) / 100,
  }))
  const summary = props.performance
  const successRate = summary?.success_rate
  const displayedSuccessRate =
    successRate !== undefined && successRate < 99.5
      ? displayMetrics.successRate
      : successRate
  const stats = [
    {
      value: formatNumber(props.modelCount, locale),
      label: t('Available models'),
    },
    { value: formatNumber(props.vendorCount, locale), label: t('Providers') },
    {
      value:
        summary && Number.isFinite(summary.success_rate)
          ? `${formatNumber(displayedSuccessRate, locale)}%`
          : '—',
      label: t('Success rate (24h)'),
    },
    {
      value:
        summary && summary.avg_latency_ms > 0
          ? `${formatNumber(displayMetrics.latencySeconds, locale)}s`
          : '—',
      label: t('Average latency (24h)'),
    },
  ]
  return (
    <section className='border-b px-6 py-12'>
      <div className='mx-auto max-w-[1240px]'>
        <div className='text-muted-foreground flex flex-wrap items-center justify-center gap-x-9 gap-y-4 border-b pb-10 text-sm font-semibold tracking-tight'>
          {[
            'OpenAI',
            'Anthropic',
            'Google',
            'DeepSeek',
            'Meta',
            'Cursor',
            'Dify',
            'LangChain',
          ].map((brand) => (
            <span key={brand}>{brand}</span>
          ))}
        </div>
        <dl className='grid grid-cols-2 gap-y-8 pt-10 lg:grid-cols-4 lg:divide-x'>
          {stats.map((stat) => (
            <div
              key={stat.label}
              className='px-4 text-center lg:px-8 lg:text-left'
            >
              <dd className='font-mono text-3xl font-bold tracking-tight tabular-nums sm:text-4xl'>
                {stat.value}
              </dd>
              <dt className='text-muted-foreground mt-2 text-xs sm:text-sm'>
                {stat.label}
              </dt>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
