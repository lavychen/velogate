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
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '@/components/language-switcher'
import { NotificationPopover } from '@/components/notification-popover'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { badgeVariants } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { useKeyDialogStore } from '@/features/enterprise/key-dialog-store'
import { useNotifications } from '@/hooks/use-notifications'
import { useStatus } from '@/hooks/use-status'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { ROLE } from '@/lib/roles'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'

import { defaultTopNavLinks } from '../config/top-nav.config'
import type { TopNavLink } from '../types'
import { ConsoleBreadcrumb } from './console-breadcrumb'
import { Header } from './header'
import { NavLinkList } from './nav-link-item'

/**
 * General application Header component
 * Integrates navigation bar, search and profile functions
 *
 * @example
 * // Basic usage
 * <AppHeader />
 *
 * @example
 * // Custom navigation links
 * <AppHeader navLinks={customLinks} />
 *
 * @example
 * // Hide navigation bar and search box
 * <AppHeader showTopNav={false} showSearch={false} />
 *
 * @example
 * // Fully customize left and right content
 * <AppHeader
 *   leftContent={<CustomLeft />}
 *   rightContent={<CustomRight />}
 * />
 */
type AppHeaderProps = {
  /**
   * Custom navigation links, uses default global navigation or dynamically generated from backend if not provided
   */
  navLinks?: TopNavLink[]
  /**
   * Whether to show top navigation bar
   * @default true
   */
  showTopNav?: boolean
  /**
   * Left content, overrides TopNav if provided
   */
  leftContent?: React.ReactNode
  /**
   * Whether to show search box
   * @default true
   */
  showSearch?: boolean
  /**
   * Custom right content, overrides default right content if provided
   */
  rightContent?: React.ReactNode
  /**
   * Whether to show notification button
   * @default true
   */
  showNotifications?: boolean
  /**
   * Whether to show profile dropdown
   * @default true
   */
  showProfileDropdown?: boolean
}

export function AppHeader({
  navLinks = defaultTopNavLinks,
  showTopNav = true,
  leftContent,
  showSearch = true,
  rightContent,
  showNotifications = true,
  showProfileDropdown = true,
}: AppHeaderProps) {
  const { t } = useTranslation()
  const { status } = useStatus()
  const isAdmin = useAuthStore(
    (state) => (state.auth.user?.role ?? 0) >= ROLE.ADMIN
  )
  const runningVersion = status?.version?.trim()
  const version =
    runningVersion && runningVersion !== 'v0.0.0' && runningVersion !== '0.0.0'
      ? runningVersion
      : t('Unknown version')
  const showKeyDialog = useKeyDialogStore((state) => state.show)
  // Prioritize dynamically generated links from backend
  const dynamicLinks = useTopNavLinks()
  const links = (dynamicLinks.length > 0 ? dynamicLinks : navLinks).filter(
    (link) => link.href === '/pricing'
  )

  // Notifications hook
  const notifications = useNotifications()

  return (
    <Header className='bg-card/95 h-15 border-b backdrop-blur-md'>
      <div className='@container/system-brand flex min-w-0 flex-1 items-center gap-1'>
        <ConsoleBreadcrumb />
        {isAdmin && (
          <span
            className='text-muted-foreground hidden max-w-32 truncate px-1.5 font-mono text-xs xl:block'
            title={version}
          >
            {version}
          </span>
        )}
      </div>

      {leftContent ? (
        <div className='ms-2 flex items-center'>{leftContent}</div>
      ) : null}

      {rightContent ?? (
        <div className='ms-auto flex shrink-0 items-center gap-1 sm:gap-2'>
          {showTopNav && links.length > 0 && (
            <nav
              aria-label={t('Site navigation')}
              className='me-1 hidden items-center gap-4 whitespace-nowrap md:flex'
            >
              <NavLinkList
                links={links}
                itemClassName={cn(
                  badgeVariants({ variant: 'outline' }),
                  'border-primary/20 bg-primary/10 text-primary hover:bg-primary/15 hover:text-primary h-8 px-3'
                )}
              />
            </nav>
          )}
          {showSearch && (
            <Search className='w-8 flex-none [&>span]:hidden sm:[&>span]:inline' />
          )}
          {showNotifications && (
            <NotificationPopover
              open={notifications.popoverOpen}
              onOpenChange={notifications.setPopoverOpen}
              unreadCount={notifications.unreadCount}
              activeTab={notifications.activeTab}
              onTabChange={notifications.setActiveTab}
              notice={notifications.notice}
              announcements={notifications.announcements}
              loading={notifications.loading}
            />
          )}
          <LanguageSwitcher />
          <ThemeSwitch />
          <Button
            size='sm'
            onClick={() => showKeyDialog()}
            aria-label={t('Assign Key')}
          >
            <Plus aria-hidden='true' />
            <span className='hidden sm:inline'>{t('Assign Key')}</span>
          </Button>
          {showProfileDropdown && <ProfileDropdown />}
        </div>
      )}
    </Header>
  )
}
