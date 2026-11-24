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
import { Button } from '@/components/ui/button'
import { IconBadge } from '@/components/ui/icon-badge'
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
  const isOrganization = ['members', 'employees', 'departments'].includes(
    section
  )
  let content = (
    <OrganizationPage
      section={section === 'departments' ? 'departments' : 'employees'}
      workspaceLabel={t(
        'Enterprise workspace · {{username}} (shared account wallet)',
        {
          username: user?.username || name,
        }
      )}
    />
  )
  if (section === 'keys') content = <OrganizationPage section='keys' />
  if (section === 'analytics') {
    content = <AnalyticsPage initialDimension={search.dimension} />
  }
  return (
    <SectionPageLayout fluid={section === 'keys' || section === 'analytics'}>
      {!isOrganization && (
        <SectionPageLayout.Header>
          <section className='flex flex-wrap items-center justify-between gap-3 py-1'>
            <div className='flex min-w-0 items-center gap-3'>
              <IconBadge tone='primary' size='lg'>
                <Building2 className='size-5' aria-hidden='true' />
              </IconBadge>
              <div className='min-w-0'>
                <h1 className='truncate text-lg font-semibold tracking-tight'>
                  {name}
                </h1>
                <p className='text-muted-foreground mt-1 max-w-2xl text-xs'>
                  {t('Account {{username}} · Shared wallet for assigned keys', {
                    username: user?.username ?? '',
                  })}
                </p>
              </div>
            </div>
            <Button variant='outline' size='sm' render={<Link to='/wallet' />}>
              <Wallet className='size-4' aria-hidden='true' />
              {t('Wallet & billing')}
            </Button>
          </section>
        </SectionPageLayout.Header>
      )}
      <SectionPageLayout.Content>
        <div className='space-y-4'>{content}</div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
