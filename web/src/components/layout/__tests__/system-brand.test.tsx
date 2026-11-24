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
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'

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

test.each(['sidebar', 'inline'] as const)(
  'shows the name and logo in the %s brand when no site customization is configured',
  async (variant) => {
    const client = new QueryClient()
    clients.push(client)
    client.setQueryData(STATUS_QUERY_KEY, { version: 'v1.0.0' })
    const router = createRouter({
      routeTree: createRootRoute({
        component: () => (
          <SidebarProvider>
            <SystemBrand variant={variant} />
          </SidebarProvider>
        ),
      }),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await router.load()
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )

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
