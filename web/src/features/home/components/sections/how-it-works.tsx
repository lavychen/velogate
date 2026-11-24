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
import { ArrowUpRight, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function HowItWorks() {
  const { t } = useTranslation()
  const plans = [
    {
      title: t('Pay as you go'),
      caption: t('Wallet'),
      description: t('Pay-as-you-go with real-time usage monitoring'),
      href: '/wallet',
      featured: false,
      items: [t('API Keys'), t('Usage Logs'), t('Redemption Codes')],
    },
    {
      title: t('Enterprise'),
      caption: t('Team Collaboration'),
      description: t(
        'Multi-user management with flexible permission allocation'
      ),
      href: '/enterprise',
      featured: true,
      items: [t('Departments'), t('Budgets'), t('Members')],
    },
    {
      title: t('Subscriptions'),
      caption: t('Subscription Plans'),
      description: t(
        'Choose a plan from the options configured for this site.'
      ),
      href: '/subscriptions',
      featured: false,
      items: [t('Subscription Plans'), t('Usage'), t('Billing')],
    },
  ]
  return (
    <section
      id='plans'
      className='bg-background scroll-mt-20 border-t px-6 py-20 lg:py-24'
    >
      <div className='mx-auto max-w-[1240px]'>
        <div className='mb-12 text-center'>
          <p className='mb-3 font-mono text-xs font-semibold tracking-[0.16em] text-orange-600 uppercase dark:text-orange-400'>
            {t('Flexible access')}
          </p>
          <h2 className='text-3xl font-bold tracking-tight sm:text-4xl'>
            {t('Start small. Scale with your team.')}
          </h2>
        </div>
        <div className='grid gap-6 lg:grid-cols-3'>
          {plans.map((plan) => (
            <article
              key={plan.href}
              className={cn(
                'flex flex-col rounded-2xl border p-8',
                plan.featured
                  ? 'border-indigo-900 bg-gradient-to-br from-[#121629] via-[#1b1f3b] to-[#0f1322] text-white shadow-xl shadow-indigo-950/10'
                  : 'home-surface'
              )}
            >
              <h3
                className={cn(
                  'text-sm font-semibold',
                  plan.featured && 'text-indigo-300'
                )}
              >
                {plan.title}
              </h3>
              <p className='mt-5 text-2xl font-bold tracking-tight'>
                {plan.caption}
              </p>
              <p
                className={cn(
                  'mt-3 text-sm leading-relaxed',
                  plan.featured ? 'text-slate-300' : 'text-muted-foreground'
                )}
              >
                {plan.description}
              </p>
              <ul className='mt-8 mb-10 space-y-3'>
                {plan.items.map((item) => (
                  <li key={item} className='flex items-center gap-2.5 text-sm'>
                    <Check
                      aria-hidden='true'
                      className={cn(
                        'size-4 shrink-0',
                        plan.featured
                          ? 'text-orange-400'
                          : 'text-emerald-600 dark:text-emerald-400'
                      )}
                    />
                    {item}
                  </li>
                ))}
              </ul>
              <Button
                variant={plan.featured ? 'default' : 'outline'}
                className={cn(
                  'mt-auto h-11 w-full rounded-xl',
                  plan.featured &&
                    'bg-indigo-600 text-white hover:bg-indigo-500'
                )}
                render={<Link to={plan.href} />}
              >
                {t('Get Started')}
                <ArrowUpRight aria-hidden='true' className='size-4' />
              </Button>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
