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
import { render, screen, within, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import type { PricingModel } from '@/features/pricing/types'
import { api } from '@/lib/api'
import {
  DEFAULT_CURRENCY_CONFIG,
  useSystemConfigStore,
} from '@/stores/system-config-store'

import { CostEstimator } from '../components/cost-estimator'
import { DeveloperToolbox } from '../components/developer-toolbox'
import { KeyInspector } from '../components/key-inspector'
import { ModelCatalog } from '../components/model-catalog'
import { Stats } from '../components/sections/stats'
import { useHomeCatalog } from '../hooks/use-home-catalog'
import { inspectGatewayKey } from '../lib/gateway-tools'

const model: PricingModel = {
  id: 1,
  model_name: 'example-chat',
  vendor_id: 1,
  vendor_name: 'Example',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 3,
  enable_groups: ['default', 'premium'],
  group_ratio: { default: 1, premium: 2 },
}
let client: QueryClient
beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  client.setQueryData(['status'], {
    HeaderNavModules: { pricing: { enabled: true, requireAuth: false } },
  })
  useSystemConfigStore
    .getState()
    .setConfig({ currency: { ...DEFAULT_CURRENCY_CONFIG } })
})
afterEach(() => {
  client.clear()
  vi.unstubAllGlobals()
})

async function renderPage(content: ReactNode) {
  const rootRoute = createRootRoute({
    component: () => (
      <QueryClientProvider client={client}>{content}</QueryClientProvider>
    ),
  })
  const router = createRouter({
    routeTree: rootRoute,
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  await router.load()
  render(<RouterProvider router={router} />)
}

function CatalogFixture() {
  const catalog = useHomeCatalog(false)
  return (
    <ModelCatalog
      catalog={catalog}
      onIntegrate={() => undefined}
      onCalculate={() => undefined}
    />
  )
}

describe('home catalog', () => {
  it('filters real catalog data by provider, group and search and shows an empty result', async () => {
    client.setQueryData(['pricing'], {
      success: true,
      data: [
        model,
        {
          ...model,
          id: 2,
          model_name: 'example-image',
          vendor_id: 2,
          enable_groups: ['default'],
        },
      ],
      vendors: [
        { id: 1, name: 'Example' },
        { id: 2, name: 'Images' },
        { id: 3, name: 'Not connected' },
      ],
      group_ratio: { default: 0.8, premium: 2 },
      usable_group: { default: { ratio: 1 }, premium: { ratio: 2 } },
    })
    vi.spyOn(api, 'get').mockResolvedValue({
      data: { success: true, data: { models: [] } },
    })
    await renderPage(<CatalogFixture />)
    const user = userEvent.setup()
    expect(screen.getByText('example-chat')).toBeVisible()
    expect(
      screen.queryByRole('option', { name: 'Not connected' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('columnheader', { name: 'Context window' })
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('columnheader', { name: 'Discount Rate' })
    ).toBeVisible()
    expect(screen.getAllByText('20% OFF')).toHaveLength(2)
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Providers' }),
      '2'
    )
    expect(screen.queryByText('example-chat')).not.toBeInTheDocument()
    expect(screen.getByText('example-image')).toBeVisible()
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Providers' }),
      'all'
    )
    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Group' }),
      'premium'
    )
    expect(screen.getByText('example-chat')).toBeVisible()
    expect(screen.queryByText('example-image')).not.toBeInTheDocument()
    await user.type(
      screen.getByRole('textbox', { name: 'Search models' }),
      'no-such-model'
    )
    expect(await screen.findByText('No Models Found')).toBeVisible()
  })

  it('does not request pricing or performance when the model marketplace requires sign in', async () => {
    client.setQueryData(['status'], {
      HeaderNavModules: { pricing: { enabled: true, requireAuth: true } },
    })
    const get = vi.spyOn(api, 'get')
    await renderPage(<CatalogFixture />)
    expect(screen.getByText('Sign in required')).toBeVisible()
    expect(get).not.toHaveBeenCalled()
  })

  it('offers retry when loading the catalog fails', async () => {
    vi.spyOn(api, 'get').mockImplementation(async (url) => {
      if (url === '/api/pricing') throw new Error('offline')
      return { data: { success: true, data: { models: [] } } }
    })
    await renderPage(<CatalogFixture />)
    expect(await screen.findByRole('button', { name: 'Retry' })).toBeVisible()
  })
})

describe('developer toolbox tabs', () => {
  it.each(['calculator', 'inspector'] as const)(
    'keeps both tabs inside a fixed-height bar when opening %s and switching tabs',
    async (initialTab) => {
      await renderPage(
        <DeveloperToolbox
          initialTab={initialTab}
          models={[model]}
          baseUrl='https://example.com'
          onClose={() => undefined}
        />
      )
      const tablist = await screen.findByRole('tablist')
      expect(tablist).toHaveClass(
        'grid-cols-2',
        'group-data-horizontal/tabs:h-11',
        'shrink-0'
      )
      const tabs = within(tablist).getAllByRole('tab')
      for (const tab of tabs) expect(tab).toHaveClass('h-full')

      const selected = initialTab === 'calculator' ? tabs[0] : tabs[1]
      const other = initialTab === 'calculator' ? tabs[1] : tabs[0]
      expect(selected).toHaveAttribute('aria-selected', 'true')
      const user = userEvent.setup()
      await user.click(other)
      expect(other).toHaveAttribute('aria-selected', 'true')
      expect(selected).toHaveAttribute('aria-selected', 'false')
      expect(screen.getByRole('tabpanel')).toHaveAttribute(
        'aria-labelledby',
        other.id
      )
    }
  )
})

describe('home cost estimator', () => {
  it('updates single-request and monthly estimates when the group and daily volume change', async () => {
    await renderPage(
      <DeveloperToolbox
        initialTab='calculator'
        models={[model]}
        baseUrl='https://example.com'
        onClose={() => undefined}
      />
    )
    const user = userEvent.setup()
    const dialog = await screen.findByRole('dialog')
    expect(within(dialog).getByText('$0.0152')).toBeVisible()
    expect(within(dialog).getByText('$228')).toBeVisible()
    await user.selectOptions(
      within(dialog).getByRole('combobox', { name: 'Group' }),
      'premium'
    )
    expect(within(dialog).getByText('$0.0304')).toBeVisible()
    const slider = within(dialog).getByLabelText('Daily requests')
    slider.focus()
    await user.keyboard('{End}')
    expect(slider).toHaveAttribute('aria-valuenow', '10000')
    expect(within(dialog).getByText('$9,120')).toBeVisible()
  })

  it.each([
    ['tier("base", p * 2 + c * 8)', '$0.0176'],
    [
      'len <= 32000 ? tier("free", fixed(0)) : tier("long", p * 4 + c * 16)',
      '$0',
    ],
  ])(
    'evaluates configured token expressions without falling back to legacy ratios: %s',
    async (expression, expected) => {
      await renderPage(
        <CostEstimator
          model={{
            ...model,
            billing_mode: 'tiered_expr',
            billing_expr: expression,
          }}
        />
      )
      expect(
        within(screen.getByRole('status')).getAllByText(expected).length
      ).toBeGreaterThan(0)
    }
  )

  it('shows details instead of a misleading estimate for conditional prices', async () => {
    await renderPage(
      <CostEstimator
        model={{
          ...model,
          billing_mode: 'tiered_expr',
          billing_expr:
            'param("quality") == "hd" ? tier("hd", fixed(0.04)) : tier("base", fixed(0.02))',
        }}
      />
    )
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'View Details' })
    ).toHaveAttribute('href', '/pricing/example-chat')
  })
})

it('shows unavailable telemetry as dashes instead of invented SLA or latency', async () => {
  await renderPage(<Stats modelCount={2} vendorCount={1} />)
  expect(
    screen.getByText('Average latency (24h)').parentElement
  ).toHaveTextContent('—')
  expect(
    screen.getByText('Success rate (24h)').parentElement
  ).toHaveTextContent('—')
  await waitFor(() =>
    expect(
      screen.getByText('Available models').parentElement
    ).toHaveTextContent('2')
  )
})

it.each([
  [98, '99.75%'],
  [99.5, '99.5%'],
])(
  'shows the requested homepage metrics for a %s success rate',
  (rate, expected) => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5)
    const view = render(
      <Stats
        performance={{ success_rate: rate, avg_latency_ms: 1250, avg_tps: 10 }}
      />
    )

    expect(
      screen.getByText('Success rate (24h)').parentElement
    ).toHaveTextContent(expected)
    expect(
      screen.getByText('Average latency (24h)').parentElement
    ).toHaveTextContent('2.8s')
    view.rerender(
      <Stats
        modelCount={2}
        performance={{ success_rate: rate, avg_latency_ms: 1400, avg_tps: 10 }}
      />
    )
    expect(
      screen.getByText('Average latency (24h)').parentElement
    ).toHaveTextContent('2.8s')
  }
)

describe('home key inspector', () => {
  it('sends credentials only in authorization headers to HTTPS endpoints without cookies, redirects or caching', async () => {
    const fetchMock = vi.fn(async (url: string) => {
      if (url.endsWith('/api/status')) {
        return new Response(
          JSON.stringify({ success: true, data: { quota_display_type: 'CNY' } })
        )
      }
      if (url.endsWith('/subscription')) {
        return new Response(
          JSON.stringify({ hard_limit_usd: 150, access_until: 0 })
        )
      }
      return new Response(JSON.stringify({ total_usage: 3845 }))
    })
    vi.stubGlobal('fetch', fetchMock)
    const report = await inspectGatewayKey(
      'https://example.com/v1/',
      'sk-example',
      new AbortController().signal
    )
    expect(report).toMatchObject({
      total: 150,
      used: 38.45,
      remaining: 111.55,
      unit: 'CNY',
      simulated: false,
    })
    for (const [url, options] of fetchMock.mock.calls as unknown as Array<
      [string, RequestInit]
    >) {
      expect(url).not.toContain('sk-example')
      expect(options).toMatchObject({
        credentials: 'omit',
        redirect: 'error',
        cache: 'no-store',
        referrerPolicy: 'no-referrer',
      })
      expect(options.headers).toEqual(
        url.endsWith('/api/status')
          ? undefined
          : { Authorization: 'Bearer sk-example' }
      )
    }
  })

  it('blocks insecure or credential-bearing gateway URLs before sending the key', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    for (const url of [
      'http://example.com',
      'https://name:secret@example.com',
      'https://example.com?key=secret',
    ]) {
      await expect(
        inspectGatewayKey(url, 'sk-example', new AbortController().signal)
      ).rejects.toThrow()
    }
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each(['unauthorized', 'expired', 'usage-error'])(
    'rejects %s responses instead of reporting a valid key',
    async (failure) => {
      vi.stubGlobal(
        'fetch',
        vi.fn(async (url: string) => {
          if (failure === 'unauthorized') {
            return new Response('{}', { status: 401 })
          }
          if (url.endsWith('/api/status')) return new Response('{}')
          if (url.endsWith('/subscription')) {
            return new Response(
              JSON.stringify({
                hard_limit_usd: 150,
                access_until: failure === 'expired' ? 1 : 0,
              })
            )
          }
          return new Response(
            JSON.stringify({ error: { message: 'sk-example' } })
          )
        })
      )
      await expect(
        inspectGatewayKey(
          'https://example.com',
          'sk-example',
          new AbortController().signal
        )
      ).rejects.toThrow()
    }
  )

  it('shows a labeled simulated result without sending a network request', async () => {
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await renderPage(<KeyInspector baseUrl='https://example.com' />)
    await userEvent.click(
      screen.getByRole('button', { name: 'Run simulated check' })
    )
    expect(screen.getByRole('status')).toHaveTextContent('Simulated result')
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it('aborts a pending check when the inspector closes and does not store the key', async () => {
    let signal: AbortSignal | undefined
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, options: RequestInit) => {
        signal = options.signal as AbortSignal
        return new Promise<Response>((_resolve, reject) =>
          signal?.addEventListener(
            'abort',
            () => reject(new DOMException('Aborted', 'AbortError')),
            { once: true }
          )
        )
      })
    )
    const user = userEvent.setup()
    const view = render(<KeyInspector baseUrl='https://example.com' />)
    await user.type(
      screen.getByLabelText('API Key', { exact: true }),
      'sk-ephemeral-secret'
    )
    await user.click(screen.getByRole('button', { name: 'Check now' }))
    await waitFor(() => expect(signal).toBeDefined())
    view.unmount()
    expect(signal?.aborted).toBe(true)
    for (const storage of [localStorage, sessionStorage]) {
      for (let index = 0; index < storage.length; index++) {
        expect(storage.getItem(storage.key(index) || '')).not.toContain(
          'sk-ephemeral-secret'
        )
      }
    }
  })
})
