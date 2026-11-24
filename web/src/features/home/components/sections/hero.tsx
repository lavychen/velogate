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
import { ArrowRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'

export function Hero(props: {
  isAuthenticated: boolean
  baseUrl: string
  version: string
}) {
  const { t } = useTranslation()
  const apiUrl = `${props.baseUrl}/v1`
  return (
    <div className='mx-auto max-w-3xl text-center'>
      <div className='home-surface mb-8 inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-xs font-medium backdrop-blur-md'>
        <span aria-hidden='true' className='relative flex size-2'>
          <span className='absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75 motion-reduce:animate-none' />
          <span className='relative inline-flex size-2 rounded-full bg-emerald-500' />
        </span>
        <span className='font-mono font-semibold text-[#4f46e5] dark:text-indigo-400'>
          {props.version}
        </span>
        <span className='text-muted-foreground'>
          {t('Enterprise multi-model routing is live')}
        </span>
      </div>
      <h1 className='text-4xl leading-[1.1] font-bold tracking-tight sm:text-5xl lg:text-[62px]'>
        {t('Unified enterprise AI gateway,')}
        <br className='hidden sm:block' />
        <span className='bg-gradient-to-r from-[#4f46e5] via-indigo-500 to-[#f97316] bg-clip-text text-transparent'>
          {t('Connect the world’s leading models')}
        </span>
      </h1>
      <p className='text-muted-foreground mx-auto mt-6 max-w-xl text-base leading-relaxed sm:text-lg'>
        {t(
          'OpenAI-compatible APIs, intelligent failover, and department-level budgets.'
        )}
      </p>
      <div className='mt-9 flex flex-wrap items-center justify-center gap-3.5'>
        <Button
          className='home-primary h-auto rounded-xl px-6 py-3.5 text-sm font-semibold shadow-sm shadow-indigo-500/25'
          render={
            <Link to={props.isAuthenticated ? '/dashboard' : '/sign-in'} />
          }
        >
          {t('Start integrating for free')}
          <ArrowRight aria-hidden='true' className='size-4' />
        </Button>
        <Button
          variant='outline'
          className='home-surface h-auto rounded-xl px-6 py-3.5 text-sm font-semibold backdrop-blur-sm'
          render={<a href='#models' />}
        >
          {t('Browse model pricing')}
        </Button>
      </div>
      <div className='mt-5 flex justify-center'>
        <CopyButton
          value={apiUrl}
          variant='outline'
          size='default'
          className='home-endpoint h-auto max-w-full gap-2.5 rounded-full px-4 py-2 font-mono text-xs backdrop-blur-md [&_svg]:order-last'
          aria-label={t('Copy API Base URL')}
          iconClassName='size-3.5'
        >
          <span className='text-muted-foreground'>BASE URL</span>
          <span className='min-w-0 truncate font-medium'>{apiUrl}</span>
        </CopyButton>
      </div>
    </div>
  )
}
