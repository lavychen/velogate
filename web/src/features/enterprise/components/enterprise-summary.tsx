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
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Building2, ChevronRight, KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { IconBadge } from '@/components/ui/icon-badge'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'
import { useAuthStore } from '@/stores/auth-store'

import { getAnalyticsOverview } from '../api'
import { useWorkspace } from '../hooks/use-enterprise'

export function EnterpriseSummary() {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const userId = useAuthStore((state) => state.auth.user?.id)
  const workspace = useWorkspace()
  const overview = useQuery({
    queryKey: ['enterprise', userId, 'analytics', 'home'],
    queryFn: () => getAnalyticsOverview(),
    enabled: !!userId,
  })
  return (
    <section
      className='enterprise-panel flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5'
      aria-label={t('Enterprise workspace')}
    >
      <div className='flex min-w-0 items-center gap-3'>
        <IconBadge tone='warning' size='lg'>
          <Building2 className='size-5' aria-hidden='true' />
        </IconBadge>
        <div className='min-w-0'>
          <h1 className='truncate text-base font-semibold'>
            {workspace.data?.name || t('Enterprise workspace')}
          </h1>
          <Link
            to='/enterprise/$section'
            params={{ section: 'analytics' }}
            className='text-muted-foreground hover:text-primary focus-visible:ring-ring mt-1 inline-flex items-center gap-1 rounded-sm text-xs outline-none focus-visible:ring-2'
          >
            {t('Usage analytics')}
            <ArrowUpRight className='size-3' aria-hidden='true' />
          </Link>
        </div>
      </div>
      <Button
        role='link'
        aria-label={t('Active keys')}
        variant='outline'
        className='bg-muted/40 h-9 max-w-full gap-2 rounded-full px-3'
        render={<Link to='/enterprise/$section' params={{ section: 'keys' }} />}
      >
        <KeyRound className='text-primary size-4' aria-hidden='true' />
        <span className='text-muted-foreground text-xs'>
          {t('Active keys')}
        </span>
        <span className='font-semibold tabular-nums'>
          {overview.data
            ? formatNumber(overview.data.summary?.active_keys ?? 0, locale)
            : '—'}
        </span>
        <ChevronRight
          className='text-muted-foreground size-3.5'
          aria-hidden='true'
        />
      </Button>
    </section>
  )
}
