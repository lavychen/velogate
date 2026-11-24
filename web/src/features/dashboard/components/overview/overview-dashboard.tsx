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

import { SectionPageLayout } from '@/components/layout'
import {
  CardStaggerContainer,
  CardStaggerItem,
} from '@/components/page-transition'
import { EnterpriseSummary } from '@/features/enterprise/components/enterprise-summary'
import { cn } from '@/lib/utils'

import { useDashboardContentVisibility } from '../../hooks/use-status-data'
import { AnnouncementsPanel } from './announcements-panel'
import { FAQPanel } from './faq-panel'
import { SummaryCards } from './summary-cards'

export function OverviewDashboard() {
  const { announcements, faq } = useDashboardContentVisibility()

  return (
    <SectionPageLayout>
      <SectionPageLayout.Header>
        <EnterpriseSummary />
      </SectionPageLayout.Header>
      <SectionPageLayout.Content>
        <div className='flex flex-col gap-4'>
          <SummaryCards />

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
