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
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, expect, test, vi } from 'vitest'

import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar'
import { LayoutProvider } from '@/context/layout-provider'
import { api } from '@/lib/api'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useAuthStore } from '@/stores/auth-store'

import { AppSidebar } from '../components/app-sidebar'

const clients: QueryClient[] = []
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear())
  useAuthStore.getState().auth.reset()
  vi.unstubAllGlobals()
})
async function renderAccount(
  options: {
    failed?: boolean
    enabled?: boolean
    collapsed?: boolean
    address?: string
  } = {}
) {
  useAuthStore.getState().auth.setUser({
    id: 1001,
    username: 'root_admin',
    display_name: '陈克顺',
    email: 'chen@example.com',
    role: 100,
  })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/user/2fa/status' && options.failed) {
      throw new Error('Offline')
    }
    let data: unknown = []
    if (url === '/api/user/self') {
      data = {
        id: 1001,
        username: 'root_admin',
        display_name: '陈克顺',
        email: 'chen@example.com',
        role: 100,
        quota: 143200000,
      }
    }
    if (url === '/api/user/2fa/status') {
      data = {
        enabled: options.enabled ?? true,
        locked: false,
        backup_codes_remaining: 5,
      }
    }
    return { data: { success: true, data } }
  })
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  client.setQueryData(STATUS_QUERY_KEY, {
    server_address: options.address ?? 'https://api.example.com/proxy/',
  })
  client.setQueryData(['enterprise', 1001, 'workspace'], {
    newapi_user_id: 1001,
    name: '星辰科技 · 企业主',
  })
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <LayoutProvider>
          <SidebarProvider defaultOpen={!options.collapsed}>
            <SidebarTrigger />
            <AppSidebar />
          </SidebarProvider>
        </LayoutProvider>
      ),
    }),
    history: createMemoryHistory({ initialEntries: ['/dashboard/overview'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

test('clicking the account name opens account and workspace details and copies the Base URL', async () => {
  const user = userEvent.setup()
  await renderAccount()
  await user.click(screen.getByText('陈克顺'))
  const dialog = await screen.findByRole('dialog', {
    name: 'Account & workspace information',
  })
  expect(await within(dialog).findByText('#1001')).toBeVisible()
  expect(within(dialog).getByText('chen@example.com')).toBeVisible()
  expect(within(dialog).getByText('星辰科技 · 企业主')).toBeVisible()
  expect(await within(dialog).findByText('Enabled')).toBeVisible()
  await user.click(
    within(dialog).getByRole('button', { name: 'Copy Base URL' })
  )
  expect(await navigator.clipboard.readText()).toBe(
    'https://api.example.com/proxy/v1'
  )
  await user.click(
    within(dialog).getByRole('button', { name: 'Close account information' })
  )
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
})

test('the collapsed account trigger supports keyboard opening and Escape restores focus', async () => {
  const user = userEvent.setup()
  await renderAccount({
    collapsed: true,
    enabled: false,
    address: 'https://api.example.com/v1/',
  })
  const trigger = screen.getByRole('button', {
    name: 'Account & workspace information',
  })
  trigger.focus()
  await user.keyboard('{Enter}')
  const dialog = await screen.findByRole('dialog')
  expect(await within(dialog).findByText('Disabled')).toBeVisible()
  expect(within(dialog).getByText('https://api.example.com/v1')).toBeVisible()
  await user.click(within(dialog).getByText('https://api.example.com/v1'))
  await user.keyboard('{Escape}')
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
  expect(trigger).toHaveFocus()
})

test('failed 2FA loading shows unavailable instead of a false disabled status', async () => {
  const user = userEvent.setup()
  await renderAccount({ failed: true })
  await user.click(screen.getByText('陈克顺'))
  const dialog = await screen.findByRole('dialog')
  expect(await within(dialog).findByText('Unavailable')).toBeVisible()
  expect(within(dialog).queryByText('Disabled')).not.toBeInTheDocument()
})

test('opening account information from the mobile sidebar allows closing and returns focus to the account', async () => {
  vi.stubGlobal('innerWidth', 390)
  const user = userEvent.setup()
  await renderAccount()
  await user.click(screen.getByRole('button', { name: 'Toggle Sidebar' }))
  const trigger = await screen.findByRole('button', {
    name: 'Account & workspace information',
  })
  await user.click(trigger)
  const dialog = await screen.findByRole('dialog', {
    name: 'Account & workspace information',
  })
  expect(await within(dialog).findByText('Enabled')).toBeVisible()
  await user.click(
    within(dialog).getByRole('button', { name: 'Close account information' })
  )
  await waitFor(() => expect(trigger).toHaveFocus())
  expect(screen.getByRole('dialog', { name: 'Sidebar' })).toBeVisible()
})
