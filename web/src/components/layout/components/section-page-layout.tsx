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
  Children,
  isValidElement,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react'

import { cn } from '@/lib/utils'

import { Main } from './main'
import { PageFooterProvider } from './page-footer'

type SlotProps = { children?: ReactNode }

function SectionPageLayoutHeader(_props: SlotProps) {
  return null
}
SectionPageLayoutHeader.displayName = 'SectionPageLayout.Header'

function SectionPageLayoutTitle(_props: SlotProps) {
  return null
}
SectionPageLayoutTitle.displayName = 'SectionPageLayout.Title'

function SectionPageLayoutActions(_props: SlotProps) {
  return null
}
SectionPageLayoutActions.displayName = 'SectionPageLayout.Actions'

function SectionPageLayoutContent(_props: SlotProps) {
  return null
}
SectionPageLayoutContent.displayName = 'SectionPageLayout.Content'

function SectionPageLayoutBreadcrumb(_props: SlotProps) {
  return null
}
SectionPageLayoutBreadcrumb.displayName = 'SectionPageLayout.Breadcrumb'

export type SectionPageLayoutProps = {
  children: ReactNode
  fluid?: boolean
  fixedContent?: boolean
  stackActionsOnMobile?: boolean
  /** Keep the title accessible when the console navigation already shows it. */
  hideTitle?: boolean
}

export function SectionPageLayout(props: SectionPageLayoutProps) {
  const [footerContainer, setFooterContainer] = useState<HTMLDivElement | null>(
    null
  )

  let header: ReactNode = null
  let title: ReactNode = null
  let actions: ReactNode = null
  let content: ReactNode = null
  let breadcrumb: ReactNode = null

  Children.forEach(props.children, (node) => {
    if (!isValidElement(node)) return
    const child = node as ReactElement<SlotProps>
    if (child.type === SectionPageLayoutHeader) header = child.props.children
    else if (child.type === SectionPageLayoutTitle) title = child.props.children
    else if (child.type === SectionPageLayoutActions) {
      actions = child.props.children
    } else if (child.type === SectionPageLayoutContent) {
      content = child.props.children
    } else if (child.type === SectionPageLayoutBreadcrumb) {
      breadcrumb = child.props.children
    }
  })

  const showTitle = title != null && !props.hideTitle
  const hasActions = Children.toArray(actions).length > 0
  const hasPageHeader =
    header != null || showTitle || hasActions || breadcrumb != null

  return (
    <PageFooterProvider container={footerContainer}>
      <Main
        className={cn(
          'mx-auto w-full min-w-0',
          props.fluid ? 'max-w-none' : 'max-w-[1440px]'
        )}
      >
        {props.hideTitle && header == null && title != null && (
          <h2 className='sr-only'>{title}</h2>
        )}
        {hasPageHeader && (
          <div
            className={cn(
              'shrink-0 px-3 pt-3 pb-2.5 sm:px-4 sm:pt-5 sm:pb-3',
              props.fluid && 'sm:px-6 lg:px-8'
            )}
          >
            {breadcrumb != null && (
              <div className='mb-2 sm:mb-3'>{breadcrumb}</div>
            )}
            {header ?? (
              <div
                className={cn(
                  'flex flex-wrap items-center gap-x-3 gap-y-2 sm:gap-x-4',
                  showTitle ? 'justify-between' : 'justify-end'
                )}
              >
                {showTitle && (
                  <div
                    className={
                      props.stackActionsOnMobile
                        ? 'min-w-0 flex-1 max-sm:basis-full'
                        : 'min-w-0 flex-1'
                    }
                  >
                    <h2 className='truncate text-base font-bold tracking-tight sm:text-lg'>
                      {title}
                    </h2>
                  </div>
                )}
                {hasActions && (
                  <div className='flex max-w-full shrink-0 flex-wrap items-center justify-end gap-2 sm:gap-x-4'>
                    {actions}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            'min-h-0 flex-1 overflow-auto px-3 pb-3 sm:px-4 sm:pb-4',
            props.hideTitle && !hasPageHeader
              ? 'pt-3 sm:pt-5'
              : 'pt-1 sm:pt-1.5',
            props.fixedContent && 'overflow-hidden',
            props.fluid && 'sm:px-6 lg:px-8'
          )}
        >
          {content}
        </div>

        <div
          ref={setFooterContainer}
          className={cn(
            'bg-background shrink-0 border-t px-3 py-2.5 empty:hidden sm:px-4 sm:py-3',
            props.fluid && 'sm:px-6 lg:px-8'
          )}
        />
      </Main>
    </PageFooterProvider>
  )
}

SectionPageLayout.Header = SectionPageLayoutHeader
SectionPageLayout.Title = SectionPageLayoutTitle
SectionPageLayout.Actions = SectionPageLayoutActions
SectionPageLayout.Content = SectionPageLayoutContent
SectionPageLayout.Breadcrumb = SectionPageLayoutBreadcrumb
