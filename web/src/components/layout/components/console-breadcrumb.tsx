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
import { useLocation } from '@tanstack/react-router'
import { ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { useSidebarView } from '@/hooks/use-sidebar-view'

import { checkIsActive } from '../lib/url-utils'

export function ConsoleBreadcrumb() {
  const { t } = useTranslation()
  const pathname = useLocation({ select: (location) => location.pathname })
  const { navGroups } = useSidebarView()
  const current = navGroups
    .flatMap((group) =>
      group.items.map((item) => ({ group: group.title, item }))
    )
    .find(({ item }) => checkIsActive(pathname, item))

  return (
    <div className='flex min-w-0 items-center gap-2 px-1 text-sm'>
      <span className='text-muted-foreground hidden truncate lg:inline'>
        {current?.group ?? t('Console')}
      </span>
      <ChevronRight
        className='text-muted-foreground hidden size-3.5 shrink-0 lg:block'
        aria-hidden='true'
      />
      <span className='truncate font-semibold'>
        {current?.item.title ?? t('Console')}
      </span>
    </div>
  )
}
