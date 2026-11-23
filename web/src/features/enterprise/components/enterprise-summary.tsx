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
import { ArrowUpRight, Building2, KeyRound } from 'lucide-react'
import { useTranslation } from 'react-i18next'

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
      className='enterprise-panel flex flex-wrap items-center justify-between gap-4 p-5'
      aria-label={t('Enterprise workspace')}
    >
      <div className='flex min-w-0 items-center gap-3'>
        <span className='flex size-10 shrink-0 items-center justify-center rounded-xl bg-orange-500/10 text-orange-600 dark:text-orange-400'>
          <Building2 className='size-5' aria-hidden='true' />
        </span>
        <div className='min-w-0'>
          <h3 className='truncate text-sm font-semibold'>
            {workspace.data?.name || t('Enterprise workspace')}
          </h3>
          <Link
            to='/enterprise/$section'
            params={{ section: 'analytics' }}
            className='text-muted-foreground mt-1 flex items-center gap-1 text-xs'
          >
            {t('Usage analytics')}
            <ArrowUpRight className='size-3' aria-hidden='true' />
          </Link>
        </div>
      </div>
      <div className='flex items-center gap-3' aria-label={t('Active keys')}>
        <KeyRound className='text-primary size-4' aria-hidden='true' />
        <span className='text-muted-foreground text-xs'>
          {t('Active keys')}
        </span>
        <span className='text-xl font-semibold'>
          {overview.data
            ? formatNumber(overview.data.summary?.active_keys ?? 0, locale)
            : '—'}
        </span>
      </div>
    </section>
  )
}
