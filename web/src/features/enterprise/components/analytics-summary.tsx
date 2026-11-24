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
import { Activity, Cpu, KeyRound, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import type { IconBadgeTone } from '@/components/ui/icon-badge'
import { StatCard } from '@/features/dashboard/components/ui/stat-card'
import { toIntlLocale } from '@/i18n/languages'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { formatCompactNumber, formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import type { AnalyticsSummary as Summary } from '../api-types'

export function AnalyticsSummary(props: { summary?: Summary }) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const summary = props.summary
  const stats = [
    {
      label: t('Requests'),
      value: formatNumber(summary?.request_count ?? 0, locale),
      description: t('Selected period'),
      icon: Activity,
      iconTone: 'primary' as IconBadgeTone,
      accent: 'bg-indigo-500',
    },
    {
      label: t('Tokens'),
      value: formatCompactNumber(summary?.total_tokens ?? 0, locale),
      description: t('Input {{input}} · Output {{output}}', {
        input: formatCompactNumber(summary?.prompt_tokens ?? 0, locale),
        output: formatCompactNumber(summary?.completion_tokens ?? 0, locale),
      }),
      icon: Cpu,
      iconTone: 'warning' as IconBadgeTone,
      accent: 'bg-orange-500',
    },
    {
      label: t('Usage cost'),
      value: formatBillingCurrencyFromUSD(summary?.cost ?? 0, {
        locale,
        digitsLarge: 2,
      }),
      description: t('Selected period'),
      icon: Wallet,
      iconTone: 'warning' as IconBadgeTone,
      accent: 'bg-amber-500',
    },
    {
      label: t('Active keys'),
      value: formatNumber(summary?.active_keys ?? 0, locale),
      description: t('Currently enabled keys'),
      icon: KeyRound,
      iconTone: 'success' as IconBadgeTone,
      accent: 'bg-emerald-500',
    },
  ]
  return (
    <div className='grid gap-4 sm:grid-cols-2 xl:grid-cols-4'>
      {stats.map((stat, index) => (
        <section
          key={stat.label}
          aria-label={stat.label}
          className={cn(
            'enterprise-panel relative overflow-hidden p-5',
            index === 0 && 'ring-primary/20 ring-1'
          )}
        >
          <StatCard
            title={stat.label}
            value={stat.value}
            description={stat.description}
            icon={stat.icon}
            iconTone={stat.iconTone}
            iconPosition='end'
            sparklineVariant='none'
          />
          <div
            className={cn(
              'absolute inset-x-5 bottom-0 h-0.5 rounded-full opacity-70',
              stat.accent
            )}
            aria-hidden='true'
          />
        </section>
      ))}
    </div>
  )
}
