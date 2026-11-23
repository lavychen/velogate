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
import { getRouteApi, Link } from '@tanstack/react-router'
import { Building2, Wallet } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SectionPageLayout } from '@/components/layout'
import { useAuthStore } from '@/stores/auth-store'

import { AnalyticsPage } from './components/analytics-page'
import { OrganizationPage } from './components/organization-page'
import { useWorkspace } from './hooks/use-enterprise'

const route = getRouteApi('/_authenticated/enterprise/$section')
export function EnterpriseWorkspace() {
  const { t } = useTranslation()
  const { section } = route.useParams()
  const search = route.useSearch()
  const user = useAuthStore((state) => state.auth.user)
  const workspace = useWorkspace()
  const name = workspace.data?.name || t('Enterprise workspace')
  let content = <OrganizationPage section='employees' />
  if (section === 'departments') {
    content = <OrganizationPage section='departments' />
  }
  if (section === 'keys') content = <OrganizationPage section='keys' />
  if (section === 'analytics') {
    content = <AnalyticsPage initialDimension={search.dimension} />
  }
  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>
        {section === 'analytics'
          ? t('Overview & usage')
          : t('Organization & members')}
      </SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='mx-auto w-full max-w-[1520px] space-y-5 py-2'>
          <section className='enterprise-panel flex flex-wrap items-center justify-between gap-3 px-5 py-4'>
            <div className='flex min-w-0 items-center gap-3'>
              <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400'>
                <Building2 className='size-5' aria-hidden='true' />
              </span>
              <div className='min-w-0'>
                <p className='truncate text-sm font-semibold'>{name}</p>
                <p className='text-muted-foreground mt-1 text-xs'>
                  {t(
                    'Owned by NewAPI account {{username}}. All assigned keys use this account wallet.',
                    { username: user?.username ?? '' }
                  )}
                </p>
              </div>
            </div>
            <Link
              to='/wallet'
              className='text-primary flex items-center gap-2 text-xs font-medium'
            >
              <Wallet className='size-4' aria-hidden='true' />
              {t('Wallet & billing')}
            </Link>
          </section>
          {content}
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
