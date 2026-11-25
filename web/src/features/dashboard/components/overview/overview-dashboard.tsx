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
import { lazy, Suspense, useMemo } from 'react'
import { useTranslation } from 'react-i18next'

import { ErrorState } from '@/components/error-state'
import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import {
  CardStaggerContainer,
  CardStaggerItem,
} from '@/components/page-transition'
import { EnterpriseSummary } from '@/features/enterprise/components/enterprise-summary'
import { requireServerSuccess } from '@/lib/server-error-message'
import { computeTimeRange } from '@/lib/time'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { getUserQuotaDates } from '../../api'
import { useDashboardContentVisibility } from '../../hooks/use-status-data'
import { AnnouncementsPanel } from './announcements-panel'
import { FAQPanel } from './faq-panel'
import { SummaryCards } from './summary-cards'

const LazyModelCharts = lazy(() =>
  import('../models/model-charts').then((module) => ({
    default: module.ModelCharts,
  }))
)

export function OverviewDashboard() {
  const { t } = useTranslation()
  const { announcements, faq } = useDashboardContentVisibility()
  const userId = useAuthStore((state) => state.auth.user?.id)
  const timeRange = useMemo(
    () => computeTimeRange(1, undefined, new Date()),
    []
  )
  const usageQuery = useQuery({
    queryKey: [
      'dashboard',
      userId,
      'overview',
      'recent-usage',
      timeRange.start_timestamp,
      timeRange.end_timestamp,
    ],
    queryFn: async () =>
      requireServerSuccess(
        await getUserQuotaDates({ ...timeRange, default_time: 'hour' })
      ),
    enabled: !!userId,
    staleTime: 60 * 1000,
  })

  return (
    <SectionPageLayout contentClassName='no-scrollbar [&_[data-slot=scroll-area-scrollbar]]:hidden [&_[data-slot=scroll-area-viewport]]:no-scrollbar'>
      <SectionPageLayout.Header>
        <EnterpriseSummary />
      </SectionPageLayout.Header>
      <SectionPageLayout.Content>
        <div className='flex flex-col gap-4'>
          <SummaryCards usageQuery={usageQuery} />

          <section
            aria-label={t('Model Call Overview')}
            className='bg-card min-w-0 overflow-hidden rounded-xl shadow-xs'
          >
            {usageQuery.isError ? (
              <ErrorState onRetry={() => void usageQuery.refetch()} />
            ) : (
              <Suspense fallback={<LoadingState />}>
                <LazyModelCharts
                  data={usageQuery.data?.data ?? []}
                  loading={usageQuery.isPending}
                  timeGranularity='hour'
                  timeRange={timeRange}
                  description={t('Last 24 hours')}
                  title={t('Model Call Overview')}
                  showTotal={false}
                  trendOnly
                />
              </Suspense>
            )}
          </section>

          {(announcements || faq) && (
            <CardStaggerContainer
              className={cn(
                'grid grid-cols-1 items-stretch gap-4',
                announcements && faq && 'lg:grid-cols-2'
              )}
            >
              {announcements && (
                <CardStaggerItem className='min-w-0'>
                  <AnnouncementsPanel />
                </CardStaggerItem>
              )}
              {faq && (
                <CardStaggerItem className='min-w-0'>
                  <FAQPanel />
                </CardStaggerItem>
              )}
            </CardStaggerContainer>
          )}
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
