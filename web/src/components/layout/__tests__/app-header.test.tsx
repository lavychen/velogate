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
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { SidebarProvider } from '@/components/ui/sidebar'
import { DirectionProvider } from '@/context/direction-provider'
import { LayoutProvider } from '@/context/layout-provider'
import { api } from '@/lib/api'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useAuthStore } from '@/stores/auth-store'

import { AppHeader } from '../components/app-header'

const clients: QueryClient[] = []
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  useAuthStore.getState().auth.reset()
  vi.unstubAllGlobals()
  localStorage.clear()
})

async function renderHeader(version = 'v1.0.0', docsLink?: string) {
  useAuthStore.getState().auth.setUser({ id: 101, username: 'root', role: 100 })
  const fetchRelease = vi.fn(async () => new Response('[]'))
  vi.stubGlobal('fetch', fetchRelease)
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: [] },
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  clients.push(client)
  client.setQueryData(STATUS_QUERY_KEY, { version, docs_link: docsLink })
  client.setQueryData(['notice'], { success: true, data: '' })
  const root = createRootRoute({
    component: () => (
      <DirectionProvider>
        <LayoutProvider>
          <SidebarProvider>
            <AppHeader
              showSearch={false}
              showNotifications={false}
              showProfileDropdown={false}
            />
          </SidebarProvider>
        </LayoutProvider>
      </DirectionProvider>
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({ getParentRoute: () => root, path: '/dashboard' }),
      createRoute({ getParentRoute: () => root, path: '/pricing' }),
      createRoute({ getParentRoute: () => root, path: '/docs' }),
    ]),
    history: createMemoryHistory({ initialEntries: ['/dashboard'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  await screen.findByRole('banner')
  return { router, fetchRelease }
}

test('clicking the running version leaves it as plain text and never requests official releases', async () => {
  const { fetchRelease } = await renderHeader()
  await userEvent.click(screen.getByText('v1.0.0'))

  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /System updates/ })
  ).not.toBeInTheDocument()
  expect(fetchRelease).not.toHaveBeenCalled()
})

test.each(['', 'v0.0.0', '0.0.0'])(
  'shows an unknown version without checking releases when the running version is %s',
  async (version) => {
    const { fetchRelease } = await renderHeader(version)
    expect(screen.getByText('Unknown version')).toBeInTheDocument()
    expect(fetchRelease).not.toHaveBeenCalled()
  }
)

test('console navigation exposes only the marketplace link and supports navigation', async () => {
  const { router } = await renderHeader()
  const navigation = screen.getByRole('navigation', { name: 'Site navigation' })
  expect(
    within(navigation)
      .getAllByRole('link')
      .map((link) => link.getAttribute('href'))
  ).toEqual(['/pricing'])
  expect(
    screen.queryByRole('button', { name: 'Site navigation' })
  ).not.toBeInTheDocument()

  await userEvent.click(
    within(navigation).getByRole('link', { name: 'Model Marketplace' })
  )
  expect(router.state.location.pathname).toBe('/pricing')
})

test('the header omits configured docs and exposes a highlighted marketplace tag that supports Enter', async () => {
  await renderHeader('v1.0.0', 'https://example.com/docs')
  expect(
    screen.queryByRole('link', { name: 'Developer Docs' })
  ).not.toBeInTheDocument()
  const link = screen.getByRole('link', { name: 'Model Marketplace' })
  expect(link).toHaveClass('rounded-4xl', 'bg-primary/10', 'h-8')
  link.focus()
  expect(link).toHaveFocus()
  await userEvent.keyboard('{Enter}')
  expect(link).toHaveAttribute('aria-current', 'page')
})

test('the console header omits the palette settings button and retains the light/dark switch', async () => {
  await renderHeader()
  expect(
    screen.queryByRole('button', { name: 'Open theme settings' })
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('button', { name: 'Toggle theme' })
  ).toBeInTheDocument()
})
