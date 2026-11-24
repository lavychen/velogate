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
import {
  Activity,
  Building2,
  KeyRound,
  Network,
  ScrollText,
  ShieldCheck,
  Settings,
  Sparkles,
  Users,
  Wallet,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { SYSTEM_SETTINGS_VIEW } from '@/components/layout/config/system-settings.config'
import type {
  NavLink,
  SidebarBadges,
  SidebarData,
} from '@/components/layout/types'
import { useWorkspace } from '@/features/enterprise/hooks/use-enterprise'
import { ROLE } from '@/lib/roles'

/** Flat destinations; related features remain accessible as page navigation. */
export function useSidebarData(badges: SidebarBadges = {}): SidebarData {
  const { t } = useTranslation()
  const workspace = useWorkspace()
  const settingsPages: NavLink[] = SYSTEM_SETTINGS_VIEW.getNavGroups(t, badges)
    .flatMap((group) => group.items)
    .flatMap((item) =>
      (item.items ?? []).map((page) => ({
        ...page,
        section: item.title,
        requiredRole: ROLE.SUPER_ADMIN,
      }))
    )

  return {
    navGroups: [
      {
        id: 'workbench',
        title: t('Workbench'),
        items: [
          {
            title: t('Overview & usage'),
            url: '/dashboard/overview',
            icon: Activity,
            pages: [
              { title: t('Overview'), url: '/dashboard/overview' },
              { title: t('Model Call Analytics'), url: '/dashboard/models' },
              { title: t('Request Flow'), url: '/dashboard/flow' },
              {
                title: t('User Analytics'),
                url: '/dashboard/users',
                requiredRole: ROLE.ADMIN,
              },
              { title: t('Enterprise usage'), url: '/enterprise/analytics' },
            ],
          },
          {
            title: t('AI workbench'),
            url: '/playground',
            icon: Sparkles,
            activeUrls: ['/chat', '/chat2link'],
            pages: [
              { title: t('Playground'), url: '/playground' },
              { title: t('Chat'), url: '/chat2link' },
            ],
          },
          {
            title: t('Call Logs'),
            url: '/usage-logs/common',
            icon: ScrollText,
            pages: [
              { title: t('Usage Logs'), url: '/usage-logs/common' },
              { title: t('Task Logs'), url: '/usage-logs/task' },
              { title: t('Drawing Logs'), url: '/usage-logs/drawing' },
            ],
          },
          {
            title: t('Audit Logs'),
            url: '/usage-logs/audit',
            icon: ShieldCheck,
          },
        ],
      },
      {
        id: 'enterprise',
        title: t('Enterprise management'),
        subtitle: workspace.data?.name || t('Enterprise workspace'),
        items: [
          {
            title: t('Organization & members'),
            url: '/enterprise/employees',
            icon: Building2,
            pages: [
              {
                title: t('Employees'),
                url: '/enterprise/employees',
                activeUrls: ['/enterprise/members'],
              },
              { title: t('Departments'), url: '/enterprise/departments' },
            ],
          },
          {
            title: t('Key management'),
            url: '/keys',
            icon: KeyRound,
            pages: [
              { title: t('API Keys'), url: '/keys' },
              { title: t('Enterprise keys'), url: '/enterprise/keys' },
            ],
          },
          {
            title: t('Wallet & billing'),
            url: '/wallet',
            icon: Wallet,
            pages: [
              { title: t('Wallet'), url: '/wallet' },
              {
                title: t('Redemption Codes'),
                url: '/redemption-codes',
                requiredRole: ROLE.ADMIN,
              },
              {
                title: t('Subscriptions'),
                url: '/subscriptions',
                requiredRole: ROLE.ADMIN,
              },
            ],
          },
        ],
      },
      {
        id: 'admin',
        title: t('Platform management'),
        subtitle: 'Admin',
        items: [
          { title: t('User management'), url: '/users', icon: Users },
          {
            title: t('Channels & models'),
            url: '/channels',
            icon: Network,
            pages: [
              { title: t('Channels'), url: '/channels' },
              { title: t('Models'), url: '/models/metadata' },
              { title: t('Vendors'), url: '/models/vendors' },
              { title: t('Deployments'), url: '/models/deployments' },
            ],
          },
          {
            title: t('System Settings'),
            url: '/system-settings/site/system-info',
            icon: Settings,
            requiredRole: ROLE.SUPER_ADMIN,
            badge: badges.modelPricing,
            activeUrls: ['/system-settings'],
            pages: [
              ...settingsPages,
              {
                title: t('System Info'),
                url: '/system-info',
                section: t('Operations'),
                requiredRole: ROLE.SUPER_ADMIN,
              },
              {
                title: t('Plugins'),
                url: '/task-plugins',
                section: t('Operations'),
                requiredRole: ROLE.SUPER_ADMIN,
              },
              {
                title: t('Request processing'),
                url: '/request-processing',
                section: t('Operations'),
                requiredRole: ROLE.SUPER_ADMIN,
              },
            ],
          },
        ],
      },
    ],
  }
}
