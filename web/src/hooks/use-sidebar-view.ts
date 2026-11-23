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
import { useMemo } from 'react'

import type {
  NavGroup,
  ResolvedSidebarView,
  SidebarBadges,
} from '@/components/layout/types'
import { useModelPricingIssueBadge } from '@/features/system-settings/models/pricing-issues'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { useSidebarConfig } from './use-sidebar-config'
import { useSidebarData } from './use-sidebar-data'

/** Sentinel key used for the root navigation in animation `key=` props */
const ROOT_VIEW_KEY = '__root'

/** The same flat navigation is retained across all console pages. */
export function useSidebarView(): ResolvedSidebarView {
  const userRole = useAuthStore((s) => s.auth.user?.role)
  const modelPricingBadge = useModelPricingIssueBadge()
  const badges: SidebarBadges = { modelPricing: modelPricingBadge }
  const rootSidebarData = useSidebarData(badges)
  const configFilteredRoot = useSidebarConfig(rootSidebarData.navGroups)

  const rootNavGroups = useMemo<NavGroup[]>(() => {
    const role = userRole ?? ROLE.GUEST
    const isAdmin = role >= ROLE.ADMIN
    return configFilteredRoot
      .filter((group) => (group.id === 'admin' ? isAdmin : true))
      .map((group) => {
        const items = group.items
          .filter(
            (item) =>
              item.requiredRole === undefined || role >= item.requiredRole
          )
          .map((item) => {
            if (!item.pages || !item.url) return item
            const pages = item.pages.filter(
              (page) =>
                page.requiredRole === undefined || role >= page.requiredRole
            )
            return {
              ...item,
              pages,
              url:
                pages.find((page) => page.url === item.url)?.url ??
                pages[0]?.url ??
                item.url,
            }
          })
        return { ...group, items }
      })
  }, [configFilteredRoot, userRole])

  return {
    key: ROOT_VIEW_KEY,
    view: null,
    navGroups: rootNavGroups,
  }
}
