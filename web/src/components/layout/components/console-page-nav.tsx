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
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import { MessageSquare } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { useIsSidebarModuleVisible } from '@/hooks/use-sidebar-config'
import { useSidebarView } from '@/hooks/use-sidebar-view'

import { checkIsActive } from '../lib/url-utils'
import { ChatPresetsItem } from './chat-presets-item'

/** Related screens share a content navigation bar while sidebar destinations stay fixed. */
export function ConsolePageNav() {
  const { t } = useTranslation()
  const pathname = useLocation({ select: (location) => location.pathname })
  const navigate = useNavigate()
  const { navGroups } = useSidebarView()
  const chatVisible = useIsSidebarModuleVisible('/chat')
  const current = navGroups
    .flatMap((group) => group.items)
    .find((item) => checkIsActive(pathname, item))
  const pages = current?.pages ?? []
  const sections = [
    ...new Set(
      pages
        .map((page) => page.section)
        .filter((section): section is string => !!section)
    ),
  ]
  const selected = pages.find((page) => checkIsActive(pathname, page))
  const activeSection = selected?.section ?? sections[0]
  const visiblePages =
    sections.length > 0
      ? pages.filter((page) => page.section === activeSection)
      : pages
  const isWorkbench = current?.activeUrls?.includes('/chat')

  if (pages.length < 2 && !isWorkbench) return null

  return (
    <nav
      aria-label={current?.title ?? t('Console')}
      className='console-page-nav flex shrink-0 items-center gap-3 border-b px-3 sm:px-6'
    >
      {sections.length > 0 && (
        <NativeSelect
          aria-label={t('Settings category')}
          value={activeSection}
          className='my-2 max-w-44 shrink-0'
          onChange={(event) => {
            const destination = pages.find(
              (page) => page.section === event.target.value
            )
            if (destination) void navigate({ to: destination.url })
          }}
        >
          {sections.map((section) => (
            <NativeSelectOption key={section} value={section}>
              {section}
            </NativeSelectOption>
          ))}
        </NativeSelect>
      )}
      <div className='flex min-w-0 flex-1 items-center gap-5 overflow-x-auto'>
        {visiblePages.map((page) => (
          <Link
            key={page.url}
            to={page.url}
            preload={false}
            aria-current={checkIsActive(pathname, page) ? 'page' : undefined}
            className='console-page-link text-muted-foreground hover:text-foreground focus-visible:ring-ring aria-[current=page]:border-primary aria-[current=page]:text-primary shrink-0 border-b-2 border-transparent px-1 py-3 text-xs font-medium outline-none focus-visible:ring-2'
          >
            {page.title}
            {page.badge && (
              <span className='bg-primary/10 ms-2 rounded px-1'>
                {page.badge}
              </span>
            )}
          </Link>
        ))}
        {isWorkbench && chatVisible && (
          <ChatPresetsItem
            presentation='toolbar'
            item={{
              title: t('Chat'),
              type: 'chat-presets',
              icon: MessageSquare,
            }}
          />
        )}
      </div>
    </nav>
  )
}
