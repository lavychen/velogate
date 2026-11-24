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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import {
  createRootRoute,
  createRoute,
  createRouter,
  createMemoryHistory,
  RouterProvider,
  Outlet,
} from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'

import { EnterpriseWorkspace } from '..'
import type { AnalyticsQuery } from '../api-types'
import { AnalyticsModelShare } from '../components/analytics-breakdown'

let client: QueryClient
let rowCount = 20
let overviewFailed = false
let emptyOverview = false
let detailFailed = false

beforeEach(() => {
  rowCount = 20
  overviewFailed = false
  emptyOverview = false
  detailFailed = false
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  useAuthStore.getState().auth.setUser({ id: 101, username: 'owner', role: 1 })
  client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  vi.spyOn(api, 'get').mockImplementation(async (url, config) => {
    let data: unknown = []
    if (url === '/api/enterprise/workspace') data = { name: 'Company' }
    if (url === '/api/enterprise/departments') {
      data = [{ id: 1, name: 'Engineering', status: 1 }]
    }
    if (url === '/api/enterprise/employees') {
      data = [{ id: 2, name: 'Alice', department_id: 1, status: 1 }]
    }
    if (url === '/api/enterprise/analytics/overview') {
      if (overviewFailed) throw new Error('Analytics unavailable')
      data = emptyOverview
        ? {}
        : {
            summary: {
              request_count: 100,
              total_tokens: 20000,
              prompt_tokens: 15000,
              completion_tokens: 5000,
              cost: 10,
              active_keys: 6,
              active_departments: 4,
              active_employees: 6,
              active_models: 4,
            },
            trend: [
              {
                time: '2026-11-24',
                label: 'Today',
                request_count: 100,
                cost: 10,
              },
            ],
            department_trend: [
              { id: 1, name: 'Engineering', time: '2026-11-24', cost: 6 },
            ],
            employee_trend: [
              { id: 2, name: 'Alice', time: '2026-11-24', cost: 6 },
            ],
            top_departments: [
              { id: 1, name: 'Engineering', request_count: 60, cost: 6 },
            ],
            top_employees: [
              { id: 2, name: 'Alice', department_name: 'Engineering', cost: 6 },
            ],
            top_models: [
              { model: 'model-a', cost: 6 },
              { model: 'model-b', cost: 4 },
            ],
          }
    }
    if (url === '/api/enterprise/analytics/departments') {
      if (detailFailed) throw new Error('Details unavailable')
      const params = config?.params as AnalyticsQuery | undefined
      const page = params?.page ?? 1
      data = {
        total: rowCount === 0 ? 0 : 40,
        items: Array.from({ length: rowCount }, (_, index) => ({
          id: (page - 1) * 20 + index + 1,
          name: `Department ${(page - 1) * 20 + index + 1}`,
          request_count: 100,
        })),
      }
    }
    if (url === '/api/enterprise/analytics/employees') {
      data = { items: [{ id: 2, name: 'Alice', cost: 6 }], total: 1 }
    }
    return { data: { success: true, data } }
  })
})

afterEach(() => {
  client.clear()
  useAuthStore.getState().auth.reset()
})

async function renderAnalytics(section = 'analytics') {
  const root = createRootRoute()
  const authenticated = createRoute({
    getParentRoute: () => root,
    id: '_authenticated',
    component: Outlet,
  })
  const enterprise = createRoute({
    getParentRoute: () => authenticated,
    path: '/enterprise/$section',
    component: EnterpriseWorkspace,
  })
  const router = createRouter({
    routeTree: root.addChildren([authenticated.addChildren([enterprise])]),
    history: createMemoryHistory({
      initialEntries: [`/enterprise/${section}`],
    }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <TooltipProvider>
        <RouterProvider router={router} />
      </TooltipProvider>
    </QueryClientProvider>
  )
}

test('organization combines workspace context and actions, with searchable employees and departments in one card', async () => {
  const user = userEvent.setup()
  await renderAnalytics('employees')
  const row = await screen.findByRole('row', { name: /Alice/ })
  expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
    'Organization & members'
  )
  expect(
    screen.getByText('Enterprise workspace · owner (shared account wallet)')
  ).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Wallet & billing' })
  ).toHaveAttribute('href', '/wallet')
  expect(screen.getByRole('button', { name: 'Add employee' })).toBeVisible()
  expect(
    screen.queryByRole('button', { name: 'Assign Key' })
  ).not.toBeInTheDocument()
  expect(within(row).getByText('ID: 2')).toBeVisible()
  for (const name of ['API Keys', 'Requests', 'Usage cost', 'Actions']) {
    const header = screen.getByRole('columnheader', { name })
    expect(header).toHaveClass('text-right', 'tabular-nums')
    const index = screen.getAllByRole('columnheader').indexOf(header)
    expect(within(row).getAllByRole('cell')[index]).toHaveClass(
      'text-right',
      'tabular-nums'
    )
  }
  const employees = screen.getByRole('tab', { name: 'Employees' })
  expect(employees).toHaveAttribute('aria-selected', 'true')
  const card = employees.closest('[data-slot="tabs"]')
  expect(card).toContainElement(screen.getByRole('table'))
  expect(card).toContainElement(
    screen.getByRole('textbox', { name: 'Search organization' })
  )
  await user.type(
    screen.getByRole('textbox', { name: 'Search organization' }),
    '2'
  )
  expect(screen.getByRole('row', { name: /Alice/ })).toBeVisible()
  await user.clear(screen.getByRole('textbox', { name: 'Search organization' }))
  await user.click(screen.getByRole('tab', { name: 'Departments' }))
  expect(
    await screen.findByRole('button', { name: 'Add department' })
  ).toBeVisible()
  expect(screen.getByRole('tab', { name: 'Departments' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
})

test('analytics overview keeps the trend, activity and three rankings visible without a detail table', async () => {
  await renderAnalytics()
  expect(
    await screen.findByRole('region', { name: 'Department ranking' })
  ).toBeVisible()
  expect(screen.getByRole('region', { name: 'Employee ranking' })).toBeVisible()
  expect(screen.getByRole('region', { name: 'Model ranking' })).toBeVisible()
  expect(
    screen.getByRole('region', { name: 'Activity overview' })
  ).toBeVisible()
  expect(
    await screen.findByRole('region', { name: 'Usage trend' })
  ).toBeVisible()
  expect(screen.getByRole('main')).toHaveClass('w-full', 'max-w-none')
  expect(screen.queryByRole('table')).not.toBeInTheDocument()
  expect(
    within(screen.getByRole('region', { name: 'Active keys' })).getByText('6')
  ).toBeVisible()
  const share = screen.getByRole('region', { name: 'Model cost share' })
  expect(
    within(share).getByRole('progressbar', { name: 'model-a' })
  ).toHaveAttribute('aria-valuenow', '60')
})

test('view all opens paginated details with a scrollable table and returns focus on close', async () => {
  const user = userEvent.setup()
  await renderAnalytics()
  const trigger = await screen.findByRole('button', {
    name: 'View all departments',
  })
  await user.click(trigger)
  const dialog = screen.getByRole('dialog', { name: 'Usage details' })
  await within(dialog).findByRole('row', { name: /Department 20/ })
  const table = within(dialog).getByRole('table')
  expect(table.parentElement?.parentElement).toHaveClass(
    'min-h-0',
    'flex-1',
    'overflow-auto'
  )
  expect(
    within(dialog).getByRole('button', { name: 'Next' }).parentElement
  ).toHaveClass('shrink-0')
  await user.click(within(dialog).getByRole('button', { name: 'Next' }))
  expect(
    await within(dialog).findByRole('row', { name: /Department 21/ })
  ).toBeVisible()
  expect(within(dialog).getByText('Page 2')).toBeVisible()
  await user.keyboard('{Escape}')
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(trigger).toHaveFocus()
})

test('selecting a ranked department filters the overview and opens employee details', async () => {
  const user = userEvent.setup()
  await renderAnalytics()
  await user.click(
    await screen.findByRole('button', { name: 'View Engineering usage' })
  )
  const dialog = screen.getByRole('dialog')
  expect(
    within(dialog).getByRole('tab', { name: 'Employees' })
  ).toHaveAttribute('aria-selected', 'true')
  expect(
    await within(dialog).findByRole('row', { name: /Alice/ })
  ).toBeVisible()
  expect(
    vi
      .mocked(api.get)
      .mock.calls.some(
        ([url, config]) =>
          url === '/api/enterprise/analytics/employees' &&
          (config?.params as AnalyticsQuery | undefined)?.department_id === 1
      )
  ).toBe(true)
  await user.keyboard('{Escape}')
  expect(screen.getByRole('combobox', { name: 'Department' })).toHaveValue('1')
  await user.click(screen.getByRole('button', { name: 'Reset filters' }))
  expect(screen.getByRole('combobox', { name: 'Department' })).toHaveValue('')
})

test('trend controls keep a single metric selected and identify the compared series', async () => {
  const user = userEvent.setup()
  await renderAnalytics()
  const trend = await screen.findByRole('region', { name: 'Usage trend' })
  await user.click(within(trend).getByRole('button', { name: 'Requests' }))
  expect(
    within(trend).getByRole('button', { name: 'Requests' })
  ).toHaveAttribute('aria-pressed', 'true')
  expect(within(trend).getByRole('button', { name: 'Cost' })).toHaveAttribute(
    'aria-pressed',
    'false'
  )
  await user.click(within(trend).getByRole('button', { name: 'Departments' }))
  expect(within(trend).getByText('Engineering')).toBeVisible()
  await user.click(within(trend).getByRole('button', { name: 'Employees' }))
  expect(within(trend).getByText('Alice')).toBeVisible()
})

test('an empty overview shows empty rankings and zero model shares without fabricated activity', async () => {
  emptyOverview = true
  await renderAnalytics()
  const ranking = await screen.findByRole('region', {
    name: 'Department ranking',
  })
  expect(within(ranking).getByText('No results found.')).toBeVisible()
  const share = screen.getByRole('region', { name: 'Model cost share' })
  expect(within(share).queryByRole('progressbar')).not.toBeInTheDocument()
  expect(within(share).getByText('No results found.')).toBeVisible()
  expect(
    within(screen.getByRole('region', { name: 'Requests' })).getByText('0')
  ).toBeVisible()
})

test('failed overview can retry and failed details keep export disabled', async () => {
  overviewFailed = true
  await renderAnalytics()
  await screen.findByRole('button', { name: /Retry/i })
  overviewFailed = false
  await userEvent.click(await screen.findByRole('button', { name: /Retry/i }))
  detailFailed = true
  await userEvent.click(
    await screen.findByRole('button', { name: 'View all departments' })
  )
  const dialog = screen.getByRole('dialog')
  expect(
    await within(dialog).findByRole('button', { name: /Retry/i })
  ).toBeVisible()
  expect(within(dialog).getByRole('button', { name: 'Next' })).toBeDisabled()
  expect(
    within(dialog).getByRole('button', { name: 'Export current page' })
  ).toBeDisabled()
})

test('keyboard navigation switches detail dimensions without losing tab focus', async () => {
  const user = userEvent.setup()
  await renderAnalytics()
  await user.click(
    await screen.findByRole('button', { name: 'View all departments' })
  )
  const dialog = screen.getByRole('dialog')
  await user.click(within(dialog).getByRole('tab', { name: 'Departments' }))
  await user.keyboard('{ArrowRight}')
  const tab = within(dialog).getByRole('tab', { name: 'Employees' })
  expect(tab).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(tab).toHaveAttribute('aria-selected', 'true')
  expect(tab).toHaveFocus()
  expect(
    await within(dialog).findByRole('row', { name: /Alice/ })
  ).toBeVisible()
})

test('empty detail data keeps pagination and export disabled while search remains usable', async () => {
  rowCount = 0
  const user = userEvent.setup()
  await renderAnalytics()
  await user.click(
    await screen.findByRole('button', { name: 'View all departments' })
  )
  const dialog = screen.getByRole('dialog')
  expect(await within(dialog).findByText('No results found.')).toBeVisible()
  expect(within(dialog).getByRole('button', { name: 'Next' })).toBeDisabled()
  expect(
    within(dialog).getByRole('button', { name: 'Export current page' })
  ).toBeDisabled()
  expect(
    within(dialog).getByRole('textbox', { name: 'Search usage' })
  ).toBeEnabled()
})

test('a single zero-cost model shows a zero share and keeps a long identifier contained', () => {
  const model =
    'provider/enterprise-custom-model-with-a-long-version-identifier'
  render(
    <AnalyticsModelShare
      data={{ summary: { cost: 0 }, top_models: [{ model, cost: 0 }] }}
    />
  )
  expect(screen.getByRole('progressbar', { name: model })).toHaveAttribute(
    'aria-valuenow',
    '0'
  )
  expect(screen.getByTitle(model)).toHaveClass('truncate')
  expect(screen.getByText('(0%)')).toBeVisible()
})
