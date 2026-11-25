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
import type { UseQueryResult } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { ArrowRight, Hourglass, ShieldCheck, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { StaggerContainer, StaggerItem } from '@/components/page-transition'
import { Button } from '@/components/ui/button'
import type { getUserQuotaDates } from '@/features/dashboard/api'
import { useSummaryCardsConfig } from '@/features/dashboard/hooks/use-dashboard-config'
import { useStatus } from '@/hooks/use-status'
import { toIntlLocale } from '@/i18n/languages'
import { getCurrencyLabel, isCurrencyDisplayEnabled } from '@/lib/currency'
import { formatNumber, formatQuota } from '@/lib/format'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { StatCard } from '../ui/stat-card'

export function SummaryCards(props: {
  usageQuery: UseQueryResult<Awaited<ReturnType<typeof getUserQuotaDates>>>
}) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const user = useAuthStore((state) => state.auth.user)
  const { status, loading } = useStatus()
  const remainQuota = user?.quota
  const hasBalance =
    typeof remainQuota === 'number' && Number.isFinite(remainQuota)
  const exhausted = hasBalance && remainQuota <= 0

  const usageQuery = props.usageQuery
  const recentUsage = (usageQuery.data?.data ?? []).reduce(
    (total, item) => total + (Number(item.quota) || 0),
    0
  )
  const usageAvailable = usageQuery.isSuccess
  let runwayDays: number | null = null
  if (hasBalance && remainQuota > 0 && usageAvailable && recentUsage > 0) {
    const estimate = remainQuota / recentUsage
    if (Number.isFinite(estimate)) runwayDays = estimate
  }
  const lowBalance = runwayDays !== null && runwayDays < 3
  const needsRecharge = exhausted || lowBalance

  let healthLabel = t('Not available')
  let healthDot = 'bg-muted-foreground'
  if (exhausted) {
    healthLabel = t('Balance depleted')
    healthDot = 'bg-destructive'
  } else if (lowBalance) {
    healthLabel = t('Low balance')
    healthDot = 'bg-warning'
  } else if (hasBalance && usageAvailable) {
    healthLabel = t('Healthy')
    healthDot = 'bg-success'
  }

  let runwayDisplay = t('Not available')
  if (exhausted) {
    runwayDisplay = t('Balance depleted')
  } else if (runwayDays !== null) {
    if (runwayDays < 1) {
      runwayDisplay = t('Less than 1 day left')
    } else if (runwayDays > 999) {
      runwayDisplay = t('More than 999 days left')
    } else {
      runwayDisplay = t('About {{days}} days left', {
        days: formatNumber(Math.floor(runwayDays), locale),
      })
    }
  } else if (hasBalance && usageAvailable) {
    runwayDisplay = t('No recent usage')
  }

  const currencyEnabled =
    typeof status?.display_in_currency === 'boolean'
      ? status.display_in_currency
      : isCurrencyDisplayEnabled()
  const currencyLabel = currencyEnabled ? getCurrencyLabel() : 'Tokens'
  const items = useSummaryCardsConfig({
    usedDisplay: user?.used_quota == null ? '—' : formatQuota(user.used_quota),
    requestCountDisplay:
      user?.request_count == null
        ? '—'
        : formatNumber(user.request_count, locale),
    todayUsageDisplay: usageAvailable ? formatQuota(recentUsage) : '—',
    currencyEnabled,
    currencyLabel,
  })
  const tones = ['accent-1', 'accent-2', 'accent-3'] as const

  return (
    <div className='grid grid-cols-1 gap-4 lg:grid-cols-12'>
      <section
        aria-label={t('Usage at a glance')}
        className='bg-card flex min-w-0 flex-col justify-between gap-5 rounded-xl border p-4 shadow-xs sm:p-5 lg:col-span-8'
      >
        <div>
          <h2 className='text-base font-semibold'>{t('Usage at a glance')}</h2>
          <p className='text-muted-foreground mt-1 text-xs'>
            {t('Monitor usage and request volume')}
          </p>
        </div>
        <StaggerContainer className='grid grid-cols-1 gap-3 sm:grid-cols-3'>
          {items.map((item, index) => (
            <StaggerItem
              key={item.key}
              className='bg-muted/20 min-w-0 rounded-xl border p-4'
            >
              <StatCard
                title={item.title}
                value={item.value}
                description={item.description}
                icon={item.icon}
                tone={tones[index]}
                sparklineVariant='none'
                loading={
                  loading || (item.key === 'todayUsage' && usageQuery.isPending)
                }
                error={item.key === 'todayUsage' && usageQuery.isError}
              />
            </StaggerItem>
          ))}
        </StaggerContainer>
      </section>

      <section
        aria-label={t('Credit remaining')}
        className={cn(
          'bg-card flex min-w-0 flex-col justify-between gap-4 rounded-xl border p-4 shadow-xs sm:p-5 lg:col-span-4',
          exhausted &&
            'border-destructive/40 bg-linear-to-b from-destructive/5 to-card',
          lowBalance &&
            'border-warning/40 bg-linear-to-b from-warning/5 to-card'
        )}
      >
        <div>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <h2 className='text-sm font-semibold'>{t('Credit remaining')}</h2>
            <span
              role='status'
              className={cn(
                'bg-muted text-muted-foreground inline-flex items-center gap-1.5 rounded-full px-2 py-1 text-[11px] font-medium',
                exhausted && 'bg-destructive/10 text-destructive',
                lowBalance && 'bg-warning/10 text-warning'
              )}
            >
              <span
                className={cn('size-1.5 rounded-full', healthDot)}
                aria-hidden='true'
              />
              {healthLabel}
            </span>
          </div>
          <div
            className={cn(
              'mt-3 text-3xl font-semibold tracking-tight break-all tabular-nums',
              exhausted && 'text-destructive'
            )}
          >
            {hasBalance ? formatQuota(remainQuota) : '—'}
          </div>
          <div className='mt-4 grid grid-cols-2 gap-2'>
            <div className='bg-background/70 min-w-0 rounded-lg border p-2.5'>
              <div className='text-muted-foreground flex items-center gap-1.5 text-[11px]'>
                <ShieldCheck className='size-3 shrink-0' aria-hidden='true' />
                {t('Billing group')}
              </div>
              <p className='mt-1.5 text-xs font-semibold break-words'>
                {user?.group || t('Not available')}
              </p>
            </div>
            <div className='bg-background/70 min-w-0 rounded-lg border p-2.5'>
              <div className='text-muted-foreground flex items-center gap-1.5 text-[11px]'>
                <Hourglass className='size-3 shrink-0' aria-hidden='true' />
                {t('Estimated runway')}
              </div>
              <p
                className={cn(
                  'mt-1.5 text-xs font-semibold break-words tabular-nums',
                  exhausted && 'text-destructive'
                )}
              >
                {runwayDisplay}
              </p>
            </div>
          </div>
          <p className='text-muted-foreground mt-2 text-[11px]'>
            {t('Based on the last 24 hours')}
          </p>
        </div>
        <Button
          role='link'
          size='lg'
          variant={needsRecharge ? 'default' : 'outline'}
          className='w-full justify-between whitespace-normal'
          render={<Link to='/wallet' />}
        >
          <span className='flex items-center gap-2'>
            <Wallet className='size-4' aria-hidden='true' />
            {needsRecharge ? t('Recharge now') : t('Wallet & billing')}
          </span>
          <ArrowRight data-icon='inline-end' aria-hidden='true' />
        </Button>
      </section>
    </div>
  )
}
