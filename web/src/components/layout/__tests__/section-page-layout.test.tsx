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
import { render, screen } from '@testing-library/react'
import { expect, test } from 'vitest'

import { PageFooterPortal } from '../components/page-footer'
import { SectionPageLayout } from '../components/section-page-layout'

test('a workspace header replaces the separate title row inside the shared width limit', () => {
  render(
    <SectionPageLayout>
      <SectionPageLayout.Title>Overview</SectionPageLayout.Title>
      <SectionPageLayout.Header>
        <h1>Workspace</h1>
      </SectionPageLayout.Header>
      <SectionPageLayout.Content>
        <p>Usage</p>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )

  expect(screen.getAllByRole('heading')).toHaveLength(1)
  expect(
    screen.getByRole('heading', { level: 1, name: 'Workspace' })
  ).toBeVisible()
  expect(screen.getByRole('main')).toHaveClass(
    'mx-auto',
    'w-full',
    'max-w-[1440px]'
  )
  expect(screen.getByText('Usage').parentElement).toHaveClass('overflow-auto')
})

test('ordinary pages preserve their title, actions and fixed content scrolling behavior', () => {
  render(
    <SectionPageLayout fixedContent stackActionsOnMobile>
      <SectionPageLayout.Title>Requests</SectionPageLayout.Title>
      <SectionPageLayout.Actions>
        <a href='/export'>Export</a>
      </SectionPageLayout.Actions>
      <SectionPageLayout.Content>
        <p>Request table</p>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )

  expect(screen.getByRole('heading', { name: 'Requests' })).toBeVisible()
  expect(screen.getByRole('link', { name: 'Export' })).toHaveAttribute(
    'href',
    '/export'
  )
  expect(screen.getByText('Request table').parentElement).toHaveClass(
    'overflow-hidden',
    'min-h-0'
  )
})

test('a page without header slots starts with its content and does not reserve an empty title row', () => {
  render(
    <SectionPageLayout>
      <SectionPageLayout.Content>
        <p>Page content</p>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )

  expect(screen.queryByRole('heading')).not.toBeInTheDocument()
  expect(screen.getByRole('main').firstElementChild).toBe(
    screen.getByText('Page content').parentElement
  )
})

test.each([false, true])(
  'fluid pages fill the available width and align header, content and footer (fixedContent=%s)',
  (fixedContent) => {
    render(
      <SectionPageLayout fluid fixedContent={fixedContent}>
        <SectionPageLayout.Title>Logs</SectionPageLayout.Title>
        <SectionPageLayout.Content>
          <p>Log table</p>
          <PageFooterPortal>
            <nav aria-label='Pagination'>Page 1</nav>
          </PageFooterPortal>
        </SectionPageLayout.Content>
      </SectionPageLayout>
    )

    const main = screen.getByRole('main')
    expect(main).toHaveClass('w-full', 'min-w-0', 'max-w-none')
    expect(main).not.toHaveClass('max-w-[1440px]')
    const content = screen.getByText('Log table').parentElement
    expect(content).toHaveClass(
      fixedContent ? 'overflow-hidden' : 'overflow-auto',
      'min-h-0',
      'flex-1'
    )
    for (const area of [
      main.firstElementChild,
      content,
      screen.getByRole('navigation', { name: 'Pagination' }).parentElement,
    ]) {
      expect(area).toHaveClass('px-3', 'sm:px-6', 'lg:px-8')
    }
  }
)
