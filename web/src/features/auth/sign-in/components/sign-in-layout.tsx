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
import { ArrowUpRight } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { LanguageSwitcher } from '@/components/language-switcher'
import { NavLinkItem } from '@/components/layout/components/nav-link-item'
import { SystemBrandMark } from '@/components/layout/components/system-brand-mark'
import { useSystemConfig } from '@/hooks/use-system-config'
import { useTopNavLinks } from '@/hooks/use-top-nav-links'
import { DEFAULT_SYSTEM_NAME } from '@/lib/constants'

import { RoutingPreview } from './routing-preview'

export function SignInLayout(props: {
  children: ReactNode
  footer: ReactNode
}) {
  const { t } = useTranslation()
  const { systemName, logo } = useSystemConfig()
  const name = systemName === DEFAULT_SYSTEM_NAME ? 'VeloGate' : systemName
  const links = useTopNavLinks()
  const docsLink = links.find((link) => link.title === t('Developer Docs'))

  return (
    <div className='sign-in-page flex min-h-svh flex-col lg:flex-row'>
      <aside className='sign-in-showcase relative hidden flex-col justify-between overflow-hidden px-10 py-9 text-white lg:flex lg:w-[56%] xl:px-14 xl:py-11'>
        <div
          className='sign-in-atmosphere pointer-events-none absolute inset-0'
          aria-hidden='true'
        >
          <div className='sign-in-dots absolute inset-0' />
          <div className='sign-in-aurora sign-in-aurora-blue' />
          <div className='sign-in-aurora sign-in-aurora-sky' />
          <div className='sign-in-aurora sign-in-aurora-orange' />
        </div>
        <header className='relative flex flex-wrap items-center justify-between gap-3'>
          <div className='flex min-w-0 items-center gap-2.5'>
            <Link
              to='/'
              aria-label={t('Go to home')}
              className='sign-in-brand min-w-0 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-4'
            >
              <SystemBrandMark logo={logo} name={name} showBadge={false} />
            </Link>
            <span className='hidden shrink-0 rounded-full border border-white/9 bg-white/6 px-2.5 py-0.5 text-[11px] font-medium tracking-wide text-slate-300 min-[1600px]:inline-flex'>
              {t('Mass Large Model Service Platform')}
            </span>
          </div>
          <span className='inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/8 px-3 py-1 font-mono text-[11px] text-emerald-300'>
            <span
              className='sign-in-status-dot size-1.5 bg-emerald-400'
              aria-hidden='true'
            >
              <span className='sign-in-ping bg-emerald-400' />
            </span>
            {t('All systems operational')}
          </span>
        </header>

        <div className='relative my-auto py-6'>
          <div className='mb-7 max-w-xl xl:mb-8'>
            <h1 className='text-[32px] leading-tight font-bold tracking-tight xl:text-[38px]'>
              {t('One gateway.')}
              <span className='bg-linear-to-r from-indigo-300 via-sky-200 to-orange-300 bg-clip-text text-transparent'>
                {t('Every leading AI model.')}
              </span>
            </h1>
            <p className='mt-3.5 text-sm leading-relaxed text-slate-400 xl:text-[15px]'>
              {t(
                'Intelligent routing, multi-provider failover, and end-to-end usage insights for your AI applications.'
              )}
            </p>
          </div>
          <RoutingPreview logo={logo} name={name} />
        </div>

        <footer className='relative grid grid-cols-3 gap-6 border-t border-white/7 pt-5'>
          <div>
            <div className='font-mono text-xl font-semibold tracking-tight xl:text-2xl'>
              99.9%
            </div>
            <div className='mt-1 text-xs text-slate-400'>
              {t('High availability guarantee')}
            </div>
          </div>
          <div>
            <div className='font-mono text-xl font-semibold tracking-tight xl:text-2xl'>
              100+
            </div>
            <div className='mt-1 text-xs text-slate-400'>
              {t('Leading AI models')}
            </div>
          </div>
          <div>
            <div className='text-xl font-semibold tracking-tight xl:text-2xl'>
              {t('Millisecond-level')}
            </div>
            <div className='mt-1 text-xs text-slate-400'>
              {t('Intelligent failover')}
            </div>
          </div>
        </footer>
      </aside>

      <main
        id='main-content'
        className='bg-background flex min-h-svh min-w-0 flex-1 flex-col justify-between px-6 py-6 sm:px-10 sm:py-9 xl:px-12 xl:py-11'
      >
        <header className='flex min-h-9 items-center justify-between gap-4'>
          <Link
            to='/'
            aria-label={t('Go to home')}
            className='max-w-[55%] min-w-0 lg:hidden'
          >
            <SystemBrandMark logo={logo} name={name} showBadge={false} />
          </Link>
          <nav
            aria-label={t('Sign-in navigation')}
            className='text-muted-foreground ms-auto flex shrink-0 items-center gap-4 text-xs'
          >
            {docsLink && (
              <span className='flex items-center gap-1'>
                <NavLinkItem link={docsLink} />
                <ArrowUpRight className='size-3' aria-hidden='true' />
              </span>
            )}
            <LanguageSwitcher />
          </nav>
        </header>

        <div className='mx-auto my-12 w-full max-w-[400px] sm:my-16'>
          {props.children}
        </div>

        <footer className='text-muted-foreground flex flex-col items-center gap-3 text-center text-xs'>
          {props.footer}
          <span>
            © {new Date().getFullYear()} {name}
          </span>
        </footer>
      </main>
    </div>
  )
}
