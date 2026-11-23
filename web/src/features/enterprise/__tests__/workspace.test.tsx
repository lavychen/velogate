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
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { OrganizationManagement } from '../components/organization-management'
import { UsageAnalytics } from '../components/usage-analytics'
import { useEnterpriseDemoStore } from '../store'

beforeEach(() => useEnterpriseDemoStore.getState().reset())
afterEach(() => useEnterpriseDemoStore.getState().reset())

test('adding a member validates email and saves a zero budget without sending a request', async () => {
  const user = userEvent.setup()
  const request = vi.spyOn(globalThis, 'fetch')
  render(<OrganizationManagement section='members' />)
  await user.click(screen.getByRole('button', { name: 'Add member' }))
  const dialog = screen.getByRole('dialog')
  await user.type(within(dialog).getByLabelText('Name'), 'Demo teammate')
  await user.type(within(dialog).getByLabelText('Email'), 'invalid')
  await user.clear(within(dialog).getByLabelText('Monthly budget (USD)'))
  await user.type(within(dialog).getByLabelText('Monthly budget (USD)'), '0')
  await user.click(
    within(dialog).getByRole('button', { name: 'Save demo changes' })
  )
  expect(
    await within(dialog).findByText('Please enter a valid email address')
  ).toBeVisible()
  expect(within(dialog).getByLabelText('Email')).toHaveAttribute(
    'aria-invalid',
    'true'
  )
  await user.clear(within(dialog).getByLabelText('Email'))
  await user.type(
    within(dialog).getByLabelText('Email'),
    'teammate@example.com'
  )
  await user.click(
    within(dialog).getByRole('button', { name: 'Save demo changes' })
  )
  expect(await screen.findByText('teammate@example.com')).toBeVisible()
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  expect(request).not.toHaveBeenCalled()
})

test('disabling a member disables their demo key and prevents another assignment', async () => {
  const user = userEvent.setup()
  const view = render(<OrganizationManagement section='members' />)
  await user.click(screen.getByRole('switch', { name: 'Enable 陈克顺' }))
  expect(
    screen.getByRole('switch', { name: 'Enable 陈克顺' })
  ).not.toBeChecked()
  expect(
    screen.getByRole('button', { name: 'Assign key to 陈克顺' })
  ).toBeDisabled()
  view.rerender(<OrganizationManagement section='keys' />)
  expect(
    screen.getByRole('switch', { name: 'Enable Cursor' })
  ).not.toBeChecked()
  expect(screen.getByRole('switch', { name: 'Enable Cursor' })).toHaveAttribute(
    'aria-disabled',
    'true'
  )
})

test('key assignments require a model and can be created from a member without creating credentials', async () => {
  const user = userEvent.setup()
  const view = render(<OrganizationManagement section='members' />)
  await user.click(screen.getByRole('button', { name: 'Assign key to 陈克顺' }))
  const dialog = screen.getByRole('dialog')
  await user.type(within(dialog).getByLabelText('Name'), 'Demo integration')
  await user.click(
    within(dialog).getByRole('button', { name: 'Save demo changes' })
  )
  expect(
    await within(dialog).findByText('Select at least one model')
  ).toBeVisible()
  await user.click(
    within(dialog).getByRole('combobox', { name: 'Allowed models' })
  )
  await user.click(await screen.findByRole('option', { name: 'gpt-4.1' }))
  await user.keyboard('{Escape}')
  await user.click(
    within(dialog).getByRole('button', { name: 'Save demo changes' })
  )
  await waitFor(() =>
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  )
  view.rerender(<OrganizationManagement section='keys' />)
  expect(screen.getByText('Demo integration')).toBeVisible()
  expect(
    screen.getByText(
      'These are assignment records, not usable API keys. Manage real credentials in API Keys.'
    )
  ).toBeVisible()
})

test('time and department filters update usage totals and the selected dimension supports empty search', async () => {
  const user = userEvent.setup()
  render(<UsageAnalytics />)
  await user.selectOptions(screen.getByLabelText('Time range'), 'today')
  expect(
    within(screen.getByRole('region', { name: 'Requests' })).getByText('2,130')
  ).toBeVisible()
  await user.click(
    screen.getByRole('button', { name: 'View Engineering usage' })
  )
  expect(screen.getByRole('tab', { name: 'Members' })).toHaveAttribute(
    'aria-selected',
    'true'
  )
  expect(
    within(screen.getByRole('region', { name: 'Requests' })).getByText('1,040')
  ).toBeVisible()
  expect(screen.getByRole('row', { name: /陈克顺/ })).toBeVisible()
  expect(screen.queryByRole('row', { name: /林思远/ })).not.toBeInTheDocument()
  await user.type(screen.getByLabelText('Search usage'), 'no such member')
  expect(await screen.findByText('No results found.')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Export' })).toBeDisabled()
})
