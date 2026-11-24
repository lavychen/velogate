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
import { act, render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { TooltipProvider } from '@/components/ui/tooltip'
import { api } from '@/lib/api'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useAuthStore } from '@/stores/auth-store'

import { EnterpriseSummary } from '../components/enterprise-summary'
import { KeyAssignmentDialog } from '../components/key-assignment-dialog'
import { OrganizationPage } from '../components/organization-page'
import { useKeyDialogStore } from '../key-dialog-store'

const clients: QueryClient[] = []
const department = {
  id: 41,
  name: 'Engineering',
  status: 1,
  sort: 9,
  created_at: 1,
  updated_at: 1,
}
const employee = {
  id: 51,
  department_id: 41,
  department_name: 'Engineering',
  name: 'Ada',
  email: 'ada@example.com',
  status: 1,
  key_count: 1,
  created_at: 1,
  updated_at: 1,
}
let employeeKeys = 1
let activeKeys = 1

beforeEach(() => {
  employeeKeys = 1
  activeKeys = 1
  localStorage.clear()
  useAuthStore.getState().auth.setUser({ id: 101, username: 'owner', role: 1 })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    if (url === '/api/enterprise/departments') {
      return { data: { success: true, data: [department] } }
    }
    if (url === '/api/enterprise/employees') {
      return {
        data: {
          success: true,
          data: [{ ...employee, key_count: employeeKeys }],
        },
      }
    }
    if (url === '/api/enterprise/token-assignments') {
      return { data: { success: true, data: [] } }
    }
    if (url === '/api/enterprise/workspace') {
      return {
        data: { success: true, data: { newapi_user_id: 101, name: 'Company' } },
      }
    }
    if (url === '/api/enterprise/analytics/overview') {
      return {
        data: { success: true, data: { summary: { active_keys: activeKeys } } },
      }
    }
    if (url === '/api/user/models') {
      return { data: { success: true, data: ['gpt-test'] } }
    }
    if (url === '/api/user/self/groups') {
      return {
        data: {
          success: true,
          data: { default: { ratio: 1, desc: 'Default' } },
        },
      }
    }
    if (url === '/api/token/auto-groups') {
      return {
        data: { success: true, data: { groups: ['default'], max_count: 5 } },
      }
    }
    throw new Error(`Unexpected GET ${url}`)
  })
})
afterEach(() => {
  clients.splice(0).forEach((client) => client.clear())
  useAuthStore.getState().auth.reset()
  useKeyDialogStore.getState().close()
  localStorage.clear()
})
async function renderOrganization(
  state: 'employees' | 'empty' | 'error' = 'employees'
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  clients.push(client)
  client.setQueryData(STATUS_QUERY_KEY, { default_use_auto_group: false })
  const router = createRouter({
    routeTree: createRootRoute({
      component: () => (
        <TooltipProvider>
          <OrganizationPage section='employees' />
          <EnterpriseSummary />
          <KeyAssignmentDialog />
        </TooltipProvider>
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
  if (state === 'employees') await screen.findByRole('row', { name: /Ada/ })
  if (state === 'empty') await screen.findByText('No results found.')
  if (state === 'error') await screen.findByRole('button', { name: 'Retry' })
  return client
}

test('employee creation validates input and preserves a rejected server result in the editor', async () => {
  const user = userEvent.setup()
  const post = vi.spyOn(api, 'post').mockResolvedValue({
    data: { success: false, message: 'department not found' },
  })
  await renderOrganization()
  await user.click(screen.getByRole('button', { name: 'Add employee' }))
  const editor = screen.getByRole('dialog')
  await user.click(within(editor).getByRole('button', { name: 'Save' }))
  expect(await within(editor).findByText('Name is required')).toBeVisible()
  expect(post).not.toHaveBeenCalled()
  await user.type(within(editor).getByLabelText('Name'), 'Grace')
  await user.type(within(editor).getByLabelText('Email'), 'invalid')
  await user.click(within(editor).getByRole('button', { name: 'Save' }))
  expect(
    await within(editor).findByText('Please enter a valid email address')
  ).toBeVisible()
  await user.clear(within(editor).getByLabelText('Email'))
  await user.type(within(editor).getByLabelText('Email'), 'grace@example.com')
  await user.click(within(editor).getByRole('button', { name: 'Save' }))
  await waitFor(() =>
    expect(post).toHaveBeenCalledWith(
      '/api/enterprise/employees',
      expect.objectContaining({
        name: 'Grace',
        email: 'grace@example.com',
        department_id: 41,
      })
    )
  )
  expect(screen.getByRole('dialog')).toBeVisible()
})

test('assigning a real key reveals it once and refreshes employee and homepage key counts', async () => {
  const user = userEvent.setup()
  const post = vi.spyOn(api, 'post').mockImplementation(async (url) => {
    if (url !== '/api/token/') throw new Error(`Unexpected POST ${url}`)
    employeeKeys = 2
    activeKeys = 2
    return {
      data: {
        success: true,
        created_key: 'sk-vg-test-creation-secret',
        data: { id: 81, key: 'vg-t***cret' },
      },
    }
  })
  await renderOrganization()
  await user.click(screen.getByRole('button', { name: 'Assign key to Ada' }))
  const drawer = await screen.findByRole('dialog')
  await waitFor(() =>
    expect(
      within(drawer).getByRole('button', { name: 'Save changes' })
    ).toBeEnabled()
  )
  await user.type(within(drawer).getByLabelText('Name'), 'Ada integration')
  await user.click(within(drawer).getByRole('button', { name: 'Save changes' }))
  expect(await screen.findByText('Key created and assigned')).toBeVisible()
  expect(post).toHaveBeenCalledWith(
    '/api/token/',
    expect.objectContaining({
      assignment_type: 'employee',
      department_id: 41,
      employee_id: 51,
      name: 'Ada integration',
    })
  )
  expect(screen.getByLabelText('New API key')).toHaveTextContent(
    'sk-vg-test-creation-secret'
  )
  await waitFor(() =>
    expect(
      within(screen.getByLabelText('Active keys')).getByText('2')
    ).toBeVisible()
  )
  expect(JSON.stringify(localStorage)).not.toContain(
    'sk-vg-test-creation-secret'
  )
  await user.click(screen.getByRole('button', { name: 'Done' }))
  expect(
    within(screen.getByRole('row', { name: /Ada/ })).getByText('2')
  ).toBeVisible()

  expect(
    screen.queryByText('sk-vg-test-creation-secret')
  ).not.toBeInTheDocument()
  act(() => useKeyDialogStore.getState().show())
  expect(
    screen.queryByText('sk-vg-test-creation-secret')
  ).not.toBeInTheDocument()
  expect(
    screen.getByRole('combobox', { name: 'Assigned employee' })
  ).toBeVisible()
})

test('empty organization disables key assignment continuation', async () => {
  vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [] } })
  await renderOrganization('empty')
  act(() => useKeyDialogStore.getState().show())
  expect(
    await screen.findByText(
      'Add an active department and employee before assigning a key.'
    )
  ).toBeVisible()
  expect(screen.getByRole('button', { name: 'Continue' })).toBeDisabled()
})

test('a failed organization query offers retry instead of an empty successful list', async () => {
  const user = userEvent.setup()
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: false, message: 'Service unavailable' },
  })
  await renderOrganization('error')
  expect(await screen.findByRole('button', { name: 'Retry' })).toBeVisible()
  expect(screen.queryByText('No results found.')).not.toBeInTheDocument()
  vi.spyOn(api, 'get').mockResolvedValue({ data: { success: true, data: [] } })
  await user.click(screen.getByRole('button', { name: 'Retry' }))
  expect(await screen.findByText('No results found.')).toBeVisible()
})
