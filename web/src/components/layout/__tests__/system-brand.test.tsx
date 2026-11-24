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
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { SidebarProvider } from '@/components/ui/sidebar'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { SystemBrand } from '../components/system-brand'

const clients: QueryClient[] = []
afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
})

async function renderBrand(variant: 'sidebar' | 'inline') {
  const client = new QueryClient()
  clients.push(client)
  client.setQueryData(STATUS_QUERY_KEY, { version: 'v1.0.0' })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  const root = createRootRoute({
    component: () => (
      <SidebarProvider>
        <SystemBrand variant={variant} />
      </SidebarProvider>
    ),
  })
  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({ getParentRoute: () => root, path: '/' }),
      createRoute({ getParentRoute: () => root, path: '/dashboard' }),
    ]),
    history: createMemoryHistory({ initialEntries: ['/dashboard'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return router
}

test.each(['sidebar', 'inline'] as const)(
  'shows the name and logo in the %s brand when no site customization is configured',
  async (variant) => {
    await renderBrand(variant)

    expect(
      await screen.findByText(variant === 'sidebar' ? 'VeloGate' : 'velogate')
    ).toBeVisible()
    if (variant === 'sidebar') {
      expect(screen.getByText('MaaS')).toBeVisible()
      expect(screen.queryByText('v1.0.0')).not.toBeInTheDocument()
    }
    expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute(
      'src',
      '/velogate-logo.png'
    )
  }
)

test.each(['sidebar', 'inline'] as const)(
  'clicking the %s brand returns to home with a pointer cursor and no text selection',
  async (variant) => {
    const router = await renderBrand(variant)
    const brand = screen.getByRole('link', { name: 'Go to home' })
    expect(brand).toHaveAttribute('href', '/')
    expect(brand).toHaveClass('cursor-pointer', 'select-none')
    await userEvent.click(screen.getByRole('img', { name: 'Logo' }))
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  }
)

test.each(['sidebar', 'inline'] as const)(
  'pressing Enter on the %s brand returns to home',
  async (variant) => {
    const router = await renderBrand(variant)
    const user = userEvent.setup()
    await user.tab()
    expect(screen.getByRole('link', { name: 'Go to home' })).toHaveFocus()
    await user.keyboard('{Enter}')
    await waitFor(() => expect(router.state.location.pathname).toBe('/'))
  }
)
