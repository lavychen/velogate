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
import {
  act,
  cleanup,
  render,
  renderHook,
  screen,
  waitFor,
} from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { checkIsActive } from '@/components/layout/lib/url-utils'
import { invalidateModelPricing } from '@/features/model-pricing/api'
import {
  parseSidebarModulesAdmin,
  serializeSidebarModulesAdmin,
} from '@/features/system-settings/maintenance/config'
import {
  MODEL_PRICING_ISSUES_QUERY_KEY,
  type ModelPricingIssue,
} from '@/features/system-settings/models/pricing-issues'
import { api } from '@/lib/api'
import { ROLE } from '@/lib/roles'
import { useAuthStore } from '@/stores/auth-store'

import { useSidebarConfig } from '../use-sidebar-config'
import { useSidebarData } from '../use-sidebar-data'
import { useSidebarView } from '../use-sidebar-view'

beforeEach(() => {
  vi.stubGlobal('localStorage', {
    getItem: () => null,
    setItem: () => undefined,
    removeItem: () => undefined,
  })
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
  useAuthStore.getState().auth.reset()
})

function sidebarFor(admin?: object, user?: object, canConfigure = true) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  client.setQueryData(['enterprise', 1, 'workspace'], {
    newapi_user_id: 1,
    name: '',
  })
  client.setQueryData(['status'], {
    SidebarModulesAdmin: admin ? JSON.stringify(admin) : '',
  })
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'alice',
    role: 1,
    permissions: { sidebar_settings: canConfigure },
    sidebar_modules: user ? JSON.stringify(user) : '',
  })
  function Wrapper(props: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>
        {props.children}
      </QueryClientProvider>
    )
  }
  const result = renderHook(
    () => useSidebarConfig(useSidebarData().navGroups),
    { wrapper: Wrapper }
  )
  return result
}

describe('flat console navigation and legacy visibility', () => {
  it('groups all destinations into four groups with account settings and twelve flat links', () => {
    const { result } = sidebarFor()
    expect(result.current.map((group) => group.items.length)).toEqual([
      4, 3, 2, 3,
    ])
    expect(
      result.current
        .flatMap((group) => group.items)
        .every((item) => !!item.url && !item.items && !item.type)
    ).toBe(true)
    const pages = result.current
      .flatMap((group) => group.items)
      .flatMap((item) => item.pages ?? [item])
    expect(pages.map((page) => page.url)).toEqual(
      expect.arrayContaining([
        '/dashboard/overview',
        '/dashboard/models',
        '/dashboard/flow',
        '/dashboard/users',
        '/usage-logs/audit',
        '/usage-logs/task',
        '/usage-logs/drawing',
        '/enterprise/employees',
        '/enterprise/departments',
        '/keys',
        '/wallet',
        '/profile',
        '/security',
        '/channels',
        '/models/deployments',
        '/redemption-codes',
        '/subscriptions',
        '/task-plugins',
        '/request-processing',
        '/system-info',
      ])
    )
  })

  it('legacy audit toggle independently hides the audit destination', () => {
    const config = parseSidebarModulesAdmin(
      '{"console":{"enabled":true,"log":true}}'
    )
    expect(config.console.audit).toBe(true)
    config.console.audit = false
    const { result } = sidebarFor(
      parseSidebarModulesAdmin(serializeSidebarModulesAdmin(config))
    )
    const logs = result.current
      .flatMap((group) => group.items)
      .find((item) => item.title === 'Call Logs')
    expect(
      result.current.flatMap((group) => group.items).map((item) => item.title)
    ).not.toContain('Audit Logs')
    expect(logs?.pages?.map((page) => page.title)).toContain('Usage Logs')
  })

  it('hiding usage logs picks a task route and keeps audit separate', () => {
    const { result } = sidebarFor({ console: { enabled: true, log: false } })
    const logs = result.current
      .flatMap((group) => group.items)
      .find((item) => item.title === 'Call Logs')
    expect(logs?.url).toBe('/usage-logs/task')
    expect(logs?.pages?.map((page) => page.title)).not.toContain('Usage Logs')
    expect(logs && checkIsActive('/usage-logs/task?filter=test', logs)).toBe(
      true
    )
    const audit = result.current
      .flatMap((group) => group.items)
      .find((item) => item.title === 'Audit Logs')
    expect(audit?.url).toBe('/usage-logs/audit')
    expect(logs && checkIsActive('/usage-logs/audit', logs)).toBe(false)
  })

  it.each([
    [{ console: { enabled: true, audit: false } }, undefined],
    [{ console: { enabled: false } }, { console: { audit: true } }],
    [undefined, { console: { enabled: true, audit: false } }],
    [undefined, { console: { enabled: false } }],
  ])(
    'admin and user filters hide the audit sidebar destination (%j, %j)',
    (admin, user) => {
      const { result } = sidebarFor(admin, user)
      expect(
        result.current
          .flatMap((group) => group.items)
          .flatMap((item) => item.pages ?? [item])
          .map((page) => page.url)
      ).not.toContain('/usage-logs/audit')
    }
  )

  it('users without sidebar configuration permission retain all administrator-enabled pages', () => {
    const { result } = sidebarFor(
      undefined,
      { console: { token: false } },
      false
    )
    expect(
      result.current
        .flatMap((group) => group.items)
        .flatMap((item) => item.pages ?? [item])
        .map((page) => page.url)
    ).toContain('/keys')
  })
})

describe('model pricing badge', () => {
  function issue(modelName: string, pluginKey: string): ModelPricingIssue {
    return {
      model_name: modelName,
      plugin_key: pluginKey,
      plugin_name: pluginKey,
      reason: 'unconfigured',
    }
  }

  /** Lists the sidebar entries of the current view that carry a badge. */
  function BadgedEntries() {
    const { navGroups } = useSidebarView()
    const entries = navGroups
      .flatMap((group) => group.items)
      .flatMap((item) => [item])
      .filter((item) => item.badge)
    return (
      <ul aria-label='Badged entries'>
        {entries.map((item) => (
          <li key={item.title}>{`${item.title}: ${item.badge}`}</li>
        ))}
      </ul>
    )
  }

  async function renderSidebar(
    path: string,
    role: number,
    issues: () => ModelPricingIssue[]
  ) {
    const get = vi.spyOn(api, 'get').mockImplementation(async (url) => ({
      data: {
        success: true,
        data:
          url === '/api/option/model_pricing/issues'
            ? issues()
            : { newapi_user_id: 1, name: '' },
      },
    }))
    const client = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    client.setQueryData(['status'], { SidebarModulesAdmin: '' })
    useAuthStore.getState().auth.setUser({ id: 1, username: 'root', role })
    const router = createRouter({
      routeTree: createRootRoute({ component: BadgedEntries }),
      history: createMemoryHistory({ initialEntries: [path] }),
    })
    await router.load()
    render(
      <QueryClientProvider client={client}>
        <RouterProvider router={router} />
      </QueryClientProvider>
    )
    return { client, get }
  }

  function badgedEntries() {
    return screen
      .getByRole('list', { name: 'Badged entries' })
      .querySelectorAll('li')
  }

  it('counts each task model once on the System Settings entry of the main sidebar', async () => {
    await renderSidebar('/dashboard/overview', ROLE.SUPER_ADMIN, () => [
      issue('kling-v3', 'kling'),
      issue('shared-video', 'alpha'),
      issue('shared-video', 'beta'),
    ])

    expect(await screen.findByText('System Settings: 2')).toBeInTheDocument()
    expect(badgedEntries()).toHaveLength(1)
  })

  it('inside System Settings retains the same root entry and pricing badge', async () => {
    await renderSidebar('/system-settings/site', ROLE.SUPER_ADMIN, () => [
      issue('kling-v3', 'kling'),
    ])

    expect(await screen.findByText('System Settings: 1')).toBeInTheDocument()
    expect(badgedEntries()).toHaveLength(1)
  })

  it('follows plugin changes and saved prices without a page reload', async () => {
    let issues = [issue('kling-v3', 'kling')]
    const { client } = await renderSidebar(
      '/dashboard/overview',
      ROLE.SUPER_ADMIN,
      () => issues
    )
    await screen.findByText('System Settings: 1')

    // A plugin action refreshes the count it may have changed.
    issues = [issue('kling-v3', 'kling'), issue('vidu-q3', 'vidu')]
    await act(() =>
      client.invalidateQueries({ queryKey: MODEL_PRICING_ISSUES_QUERY_KEY })
    )
    expect(await screen.findByText('System Settings: 2')).toBeInTheDocument()

    // Every pricing save runs this invalidation.
    issues = []
    await act(() => invalidateModelPricing(client))
    await waitFor(() => expect(badgedEntries()).toHaveLength(0))
  })

  it('never asks for the count below the super administrator role', async () => {
    const { get } = await renderSidebar(
      '/dashboard/overview',
      ROLE.ADMIN,
      () => [issue('kling-v3', 'kling')]
    )

    expect(
      await screen.findByRole('list', { name: 'Badged entries' })
    ).toBeInTheDocument()
    expect(get).not.toHaveBeenCalledWith('/api/option/model_pricing/issues')
    expect(badgedEntries()).toHaveLength(0)
  })
})
