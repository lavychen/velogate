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
import { Link } from '@tanstack/react-router'
import { ArrowUpRight, Menu, Sliders, X } from 'lucide-react'
import { useState, type MouseEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '@/components/language-switcher'
import { NavLinkList } from '@/components/layout/components/nav-link-item'
import type { TopNavLink } from '@/components/layout/types'
import { ThemeSwitch } from '@/components/theme-switch'
import { Button } from '@/components/ui/button'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { cn } from '@/lib/utils'

import { HomeBrand } from './home-brand'

export interface HomeHeaderProps {
  name: string
  onToolbox: () => void
  homeUrl?: string
  className?: string
  links?: TopNavLink[]
  mobileLinks?: TopNavLink[]
  brand?: ReactNode
  leftContent?: ReactNode
  rightContent?: ReactNode
  showNavigation?: boolean
  showThemeSwitch?: boolean
  showLanguageSwitcher?: boolean
  showConsole?: boolean
  onLinkClick?: (event: MouseEvent<HTMLAnchorElement>, link: TopNavLink) => void
}

export function HomeHeader(props: HomeHeaderProps) {
  const { t } = useTranslation()
  const [mobileOpen, setMobileOpen] = useState(false)
  const dynamicLinks = useTopNavLinks()
  const links =
    props.showNavigation === false ? [] : (props.links ?? dynamicLinks)
  const mobileLinks =
    props.showNavigation === false ? [] : (props.mobileLinks ?? links)
  const showConsole =
    props.showConsole !== false &&
    links.some((link) => link.href === '/dashboard')
  return (
    <header
      className={cn(
        'home-portal home-header sticky top-0 z-40 h-16 border-b backdrop-blur-xl transition-colors',
        props.className
      )}
    >
      <div className='mx-auto flex h-full max-w-[1240px] items-center justify-between gap-2 px-4 sm:gap-4 sm:px-6'>
        <Link
          to={props.homeUrl ?? '/'}
          hash={props.homeUrl ? undefined : 'top'}
          aria-label={t('Go to home')}
          className='flex max-w-56 min-w-0 cursor-pointer items-center select-none xl:max-w-48'
        >
          {props.brand ?? <HomeBrand name={props.name} />}
        </Link>
        {props.leftContent}
        {links.length > 0 && (
          <nav
            aria-label={t('Main navigation')}
            className='hidden min-w-0 items-center gap-1 overflow-x-auto xl:flex'
          >
            <NavLinkList
              links={links}
              onLinkClick={props.onLinkClick}
              itemClassName='home-nav-link shrink-0 rounded-lg px-3 py-2 text-[13px] font-medium whitespace-nowrap'
            />
          </nav>
        )}
        <div className='flex shrink-0 items-center gap-2'>
          {props.rightContent ?? (
            <>
              <Button
                variant='outline'
                onClick={props.onToolbox}
                title={t('Token inspector and cost estimator')}
                aria-label={t('Developer toolbox')}
                className='text-muted-foreground h-auto gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium'
              >
                <Sliders
                  aria-hidden='true'
                  className='size-3.5 text-[#4f46e5] dark:text-indigo-400'
                />
                <span className='hidden lg:inline'>{t('Toolbox')}</span>
              </Button>
              {props.showThemeSwitch !== false && (
                <ThemeSwitch
                  presentation='toggle'
                  className='text-muted-foreground size-[34px] rounded-lg border'
                />
              )}
              {props.showLanguageSwitcher !== false && <LanguageSwitcher />}
              {showConsole && (
                <Button
                  className='home-primary hidden h-auto gap-1 rounded-lg px-4 py-2 text-xs font-semibold shadow-xs sm:inline-flex'
                  render={<Link to='/dashboard' />}
                >
                  {t('Enter console')}
                  <ArrowUpRight aria-hidden='true' className='size-3.5' />
                </Button>
              )}
            </>
          )}
          {mobileLinks.length > 0 && (
            <Button
              variant='outline'
              size='icon'
              className='size-[34px] rounded-lg xl:hidden'
              aria-label={t('Toggle navigation menu')}
              aria-expanded={mobileOpen}
              aria-controls='home-mobile-nav'
              onClick={() => setMobileOpen(!mobileOpen)}
            >
              {mobileOpen ? (
                <X aria-hidden='true' className='size-4' />
              ) : (
                <Menu aria-hidden='true' className='size-4' />
              )}
            </Button>
          )}
        </div>
      </div>
      {mobileOpen && mobileLinks.length > 0 && (
        <nav
          id='home-mobile-nav'
          aria-label={t('Mobile navigation')}
          className='home-surface max-h-[calc(100dvh-4rem)] space-y-2 overflow-y-auto border-b px-6 py-4 xl:hidden'
        >
          <NavLinkList
            links={mobileLinks}
            onLinkClick={props.onLinkClick}
            itemClassName='home-nav-link block py-2 text-sm font-medium'
            onClick={() => setMobileOpen(false)}
          />
        </nav>
      )}
    </header>
  )
}
