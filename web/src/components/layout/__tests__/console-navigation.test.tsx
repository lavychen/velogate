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
  createMemoryHistory,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { SidebarProvider } from '@/components/ui/sidebar'
import { useSidebarView } from '@/hooks/use-sidebar-view'
import { api } from '@/lib/api'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useAuthStore } from '@/stores/auth-store'

import { ConsolePageNav } from '../components/console-page-nav'
import { NavGroup } from '../components/nav-group'

const clients: QueryClient[] = []
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear())
  useAuthStore.getState().auth.reset()
})
function Navigation() {
  const { navGroups } = useSidebarView()
  return (
    <SidebarProvider>
      <nav aria-label='Primary'>
        {navGroups.map((group) => (
          <NavGroup key={group.id} {...group} />
        ))}
      </nav>
      <ConsolePageNav />
    </SidebarProvider>
  )
}
async function renderNavigation(path: string, role = 100, modules = '') {
  useAuthStore.getState().auth.setUser({ id: 101, username: 'root', role })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.spyOn(api, 'get').mockImplementation(async (url) => ({
    data: {
      success: true,
      data:
        url === '/api/option/model_pricing/issues'
          ? []
          : {
              newapi_user_id: 101,
              name: 'A very long enterprise workspace name that must not displace navigation',
            },
    },
  }))
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  client.setQueryData(STATUS_QUERY_KEY, { SidebarModulesAdmin: modules })
  client.setQueryData(['enterprise', 101, 'workspace'], {
    newapi_user_id: 101,
    name: 'A very long enterprise workspace name that must not displace navigation',
  })
  const router = createRouter({
    routeTree: createRootRoute({ component: Navigation }),
    history: createMemoryHistory({ initialEntries: [path] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return router
}

test('audit page keeps nine flat sidebar links and marks the merged logs item and audit page as current', async () => {
  await renderNavigation('/usage-logs/audit')
  const sidebar = screen.getByRole('navigation', { name: 'Primary' })
  expect(within(sidebar).getAllByRole('link')).toHaveLength(9)
  expect(
    within(sidebar).queryByRole('button', { expanded: false })
  ).not.toBeInTheDocument()
  expect(
    within(sidebar).getByRole('link', { name: 'Logs & audit' })
  ).toHaveAttribute('aria-current', 'page')
  const content = screen.getByRole('navigation', { name: 'Logs & audit' })
  expect(
    within(content).getByRole('link', { name: 'Audit Logs' })
  ).toHaveAttribute('aria-current', 'page')
  expect(
    within(content).getByRole('link', { name: 'Usage Logs' })
  ).not.toHaveAttribute('aria-current')
  expect(content).toHaveClass('shrink-0')
  expect(
    within(content).getByRole('link', { name: 'Audit Logs' }).parentElement
  ).toHaveClass('overflow-x-auto')
})

test('settings category selection navigates to its first real page and leaves sidebar destinations fixed', async () => {
  const user = userEvent.setup()
  const router = await renderNavigation('/system-settings/site/system-info')
  expect(
    within(screen.getByRole('navigation', { name: 'Primary' })).getAllByRole(
      'link'
    )
  ).toHaveLength(9)
  await user.selectOptions(
    screen.getByRole('combobox', { name: 'Settings category' }),
    'Operations'
  )
  expect(router.state.location.pathname).toBe(
    '/system-settings/operations/behavior'
  )
  expect(
    within(screen.getByRole('navigation', { name: 'Primary' })).getByRole(
      'link',
      { name: 'System Settings' }
    )
  ).toHaveAttribute('aria-current', 'page')
  expect(
    screen.getByRole('combobox', { name: 'Settings category' })
  ).toHaveValue('Operations')
})

test('ordinary users cannot discover admin pages through merged wallet and dashboard navigation', async () => {
  await renderNavigation('/wallet', 1)
  const sidebar = screen.getByRole('navigation', { name: 'Primary' })
  expect(within(sidebar).getAllByRole('link')).toHaveLength(6)
  expect(
    screen.queryByRole('link', { name: 'Redemption Codes' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'Subscriptions' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'User management' })
  ).not.toBeInTheDocument()
})
