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
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

import type { ToolboxTab } from './developer-toolbox'
import { HomeBrand } from './home-brand'

export function HomeFooter(props: {
  name: string
  connected: boolean
  icp: string
  onToolbox: (tab: ToolboxTab) => void
  onContact: () => void
}) {
  const { t } = useTranslation()
  return (
    <footer className='home-alt border-t'>
      <div className='mx-auto max-w-[1240px] px-6 py-14'>
        <div className='grid grid-cols-2 gap-8 border-b border-inherit pb-12 text-xs md:grid-cols-4'>
          <div className='col-span-2 space-y-3 md:col-span-1'>
            <HomeBrand name={props.name} footer />
            <div
              className={cn(
                'inline-flex items-center gap-2 font-mono',
                props.connected
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-muted-foreground'
              )}
            >
              <span
                className={cn(
                  'size-1.5 rounded-full',
                  props.connected ? 'bg-emerald-500' : 'bg-[#f97316]'
                )}
              />
              <span>
                {props.connected ? t('Site connected') : t('Connecting...')}
              </span>
            </div>
          </div>
          <div className='space-y-2.5'>
            <p className='font-semibold'>{t('Product')}</p>
            <ul className='home-footer-links space-y-2'>
              <li>
                <a href='#models'>{t('Model Square')}</a>
              </li>
              <li>
                <a href='#architecture'>{t('Architecture')}</a>
              </li>
              <li>
                <a href='#plans'>{t('Commercial plans')}</a>
              </li>
            </ul>
          </div>
          <div className='space-y-2.5'>
            <p className='font-semibold'>{t('Developers')}</p>
            <ul className='home-footer-links space-y-2'>
              <li>
                <Button
                  variant='link'
                  className='home-footer-button'
                  onClick={() => props.onToolbox('calculator')}
                >
                  {t('Cost estimator')}
                </Button>
              </li>
              <li>
                <Button
                  variant='link'
                  className='home-footer-button'
                  onClick={() => props.onToolbox('inspector')}
                >
                  {t('API Key inspector')}
                </Button>
              </li>
            </ul>
          </div>
          <div className='space-y-2.5'>
            <p className='font-semibold'>{t('Support and compliance')}</p>
            <ul className='home-footer-links space-y-2'>
              <li>
                <Link to='/dashboard'>{t('Enter management console')}</Link>
              </li>
              <li>
                <Button
                  variant='link'
                  className='home-footer-button'
                  onClick={props.onContact}
                >
                  {t('Book an architect')}
                </Button>
              </li>
              <li className='font-mono'>ops@velogate.ai</li>
            </ul>
          </div>
        </div>
        <div className='mt-6 flex flex-col items-center justify-between gap-3 text-xs text-slate-400 sm:flex-row'>
          <span>
            © {new Date().getFullYear()} {props.name} MaaS · Powered by New API
          </span>
          <span className='font-mono'>{props.icp}</span>
        </div>
      </div>
    </footer>
  )
}
