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
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'

export function CTA() {
  const { t } = useTranslation()
  return (
    <section className='py-16 lg:py-24'>
      <div className='mx-auto max-w-[1240px] px-6'>
        <div className='relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#121629] via-[#1b1f3b] to-[#0f1322] px-8 py-14 text-center text-white shadow-2xl sm:px-14 sm:py-16'>
          <div
            aria-hidden='true'
            className='pointer-events-none absolute -top-24 left-1/2 h-[260px] w-[560px] -translate-x-1/2 rounded-full bg-gradient-to-r from-[#4f46e5]/30 to-[#f97316]/25 blur-3xl'
          />
          <div className='relative mx-auto max-w-2xl'>
            <h2 className='text-2xl font-bold tracking-tight sm:text-4xl'>
              {t('Ready to upgrade your AI infrastructure?')}
            </h2>
            <div className='mt-8 flex flex-wrap items-center justify-center gap-3.5'>
              <Button
                className='home-primary h-auto rounded-xl px-6 py-3.5 text-sm font-semibold'
                render={<Link to='/dashboard' />}
              >
                {t('Enter console')}
                <ArrowUpRight aria-hidden='true' className='size-4' />
              </Button>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
