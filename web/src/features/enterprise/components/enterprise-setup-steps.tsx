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
import { ArrowRight, Check, ChevronRight } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'
import { useStatus } from '@/hooks/use-status'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import { useKeyDialogStore } from '../key-dialog-store'

export function EnterpriseSetupSteps(props: { activeKeys?: number }) {
  const { t, i18n } = useTranslation()
  const { status } = useStatus()
  const showKeyDialog = useKeyDialogStore((state) => state.show)
  const hasKeys = props.activeKeys !== undefined && props.activeKeys > 0
  const needsKey = props.activeKeys === 0
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const docsLink =
    typeof status?.docs_link === 'string' && status.docs_link
      ? status.docs_link
      : 'https://docs.newapi.pro/api/'

  return (
    <TooltipProvider>
      <nav
        aria-label={t('Quick Start')}
        className='order-3 flex w-full min-w-0 flex-wrap items-center gap-2 border-t pt-3 xl:order-2 xl:w-auto xl:flex-1 xl:justify-center xl:border-t-0 xl:pt-0'
      >
        <div
          role='group'
          aria-label={t('Optional setup')}
          className='bg-muted/40 flex max-w-full flex-wrap items-center gap-1 rounded-3xl border border-dashed px-2 py-1'
        >
          <Badge
            variant='outline'
            className='bg-background text-muted-foreground text-[10px]'
          >
            {t('Optional setup')}
          </Badge>
          {[
            {
              number: '1.',
              section: 'departments',
              label: t('Add department'),
              hint: t(
                'A default department has been created. Customize it as needed.'
              ),
            },
            {
              number: '2.',
              section: 'employees',
              label: t('Add employee'),
              hint: t(
                'A default employee has been created. Customize it as needed.'
              ),
            },
          ].map((step, index) => (
            <div key={step.section} className='flex items-center gap-1'>
              {index > 0 && (
                <ChevronRight
                  className='text-muted-foreground/50 size-3'
                  aria-hidden='true'
                />
              )}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      role='link'
                      variant='ghost'
                      size='xs'
                      className='text-muted-foreground rounded-full'
                      render={
                        <Link
                          to='/enterprise/$section'
                          params={{ section: step.section }}
                        />
                      }
                    />
                  }
                >
                  <span className='font-mono text-[11px]' aria-hidden='true'>
                    {step.number}
                  </span>
                  {step.label}
                </TooltipTrigger>
                <TooltipContent>{step.hint}</TooltipContent>
              </Tooltip>
            </div>
          ))}
        </div>
        <ArrowRight
          className='text-muted-foreground/50 size-4 shrink-0'
          aria-hidden='true'
        />
        <div className='flex flex-wrap items-center gap-1.5'>
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  variant='outline'
                  className={cn(
                    'h-9 gap-1.5 rounded-full px-3 text-xs',
                    needsKey &&
                      'border-primary/25 bg-primary/5 text-primary hover:bg-primary/10'
                  )}
                  aria-current={needsKey ? 'step' : undefined}
                  onClick={() => showKeyDialog()}
                />
              }
            >
              <Badge
                aria-hidden='true'
                variant={needsKey ? 'default' : 'outline'}
                className={cn(
                  'size-5 p-0 text-[11px]',
                  hasKeys && 'border-success/25 bg-success/10 text-success'
                )}
              >
                {hasKeys ? <Check className='size-3' /> : '3'}
              </Badge>
              {t('Assign Key')}
            </TooltipTrigger>
            <TooltipContent>
              {hasKeys
                ? t('Active keys: {{count}}. Click to assign more.', {
                    count: formatNumber(props.activeKeys ?? 0, locale),
                  })
                : t('Create an API key to get started')}
            </TooltipContent>
          </Tooltip>
          <ArrowRight
            className='text-primary/60 size-4 shrink-0'
            aria-hidden='true'
          />
          <Tooltip>
            <TooltipTrigger
              render={
                <Button
                  role='link'
                  variant='outline'
                  className={cn(
                    'h-9 gap-1.5 rounded-full px-3 text-xs',
                    hasKeys &&
                      'border-primary/25 bg-primary/5 text-primary hover:bg-primary/10'
                  )}
                  aria-current={hasKeys ? 'step' : undefined}
                  render={
                    <a
                      href={docsLink}
                      target='_blank'
                      rel='noopener noreferrer'
                    />
                  }
                />
              }
            >
              <Badge
                aria-hidden='true'
                variant={hasKeys ? 'default' : 'outline'}
                className='size-5 p-0 text-[11px]'
              >
                4
              </Badge>
              {t('Start calling')}
            </TooltipTrigger>
            <TooltipContent>
              {t('View API documentation and code examples')}
            </TooltipContent>
          </Tooltip>
        </div>
      </nav>
    </TooltipProvider>
  )
}
