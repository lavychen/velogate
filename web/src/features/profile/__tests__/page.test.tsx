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
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'

import { api } from '@/lib/api'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useAuthStore } from '@/stores/auth-store'

import { Profile } from '../index'
import type { UserProfile } from '../types'

const profile: UserProfile = {
  id: 1,
  username: 'alice',
  display_name: 'Alice',
  role: 1,
  group: 'default',
  quota: 1000000,
  used_quota: 0,
  request_count: 0,
  status: 1,
  aff_count: 0,
  aff_quota: 0,
  aff_history_quota: 0,
  created_time: 0,
}
const clients: QueryClient[] = []

afterEach(() => {
  cleanup()
  clients.splice(0).forEach((client) => client.clear())
  useAuthStore.getState().auth.reset()
  vi.restoreAllMocks()
})

test.each([false, true])(
  'ordinary users see profile preferences without sidebar customization and no empty column when check-in is %s',
  async (checkinEnabled) => {
    useAuthStore.getState().auth.setUser({
      ...profile,
      permissions: { sidebar_settings: true },
    })
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/api/user/self') {
        return { data: { success: true, data: profile } }
      }
      if (url.startsWith('/api/user/checkin?')) {
        return {
          data: {
            success: true,
            data: {
              enabled: true,
              stats: {
                checked_in_today: false,
                total_checkins: 0,
                total_quota: 0,
                checkin_count: 0,
                records: [],
              },
            },
          },
        }
      }
      throw new Error(`Unexpected GET ${url}`)
    })
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false, gcTime: 0 } },
    })
    clients.push(client)
    client.setQueryData(STATUS_QUERY_KEY, { checkin_enabled: checkinEnabled })
    render(
      <QueryClientProvider client={client}>
        <Profile />
      </QueryClientProvider>
    )

    expect(
      await screen.findByRole('button', { name: 'Save Settings' })
    ).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Alice' })).toBeVisible()
    const language = screen.getByText('Language Preferences')
    expect(language).toBeVisible()
    expect(
      screen.queryByText('Sidebar Personal Settings')
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Customize sidebar display content')
    ).not.toBeInTheDocument()

    const layout =
      language.closest('[data-slot="card"]')?.parentElement?.parentElement
    expect(layout).toHaveClass('grid')
    if (checkinEnabled) {
      expect(
        await screen.findByRole('heading', { name: 'Daily Check-in' })
      ).toBeVisible()
      expect(layout).toHaveClass(
        'xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.46fr)]'
      )
      expect(layout?.children).toHaveLength(2)
    } else {
      expect(
        screen.queryByRole('heading', { name: 'Daily Check-in' })
      ).not.toBeInTheDocument()
      expect(layout).not.toHaveClass(
        'xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.46fr)]'
      )
      expect(layout?.children).toHaveLength(1)
    }
  }
)
