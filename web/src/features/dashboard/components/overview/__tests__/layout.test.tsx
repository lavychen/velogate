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
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import i18next from 'i18next'
import {
  afterAll,
  afterEach,
  beforeAll,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'

import type {
  AnnouncementItem,
  FAQItem,
  QuotaDataItem,
} from '@/features/dashboard/types'
import { api } from '@/lib/api'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { OverviewDashboard } from '../overview-dashboard'

const getAnimationsDescriptor = Object.getOwnPropertyDescriptor(
  HTMLElement.prototype,
  'getAnimations'
)
beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, 'getAnimations', {
    configurable: true,
    value: () => [],
  })
})
afterAll(() => {
  if (getAnimationsDescriptor) {
    Object.defineProperty(
      HTMLElement.prototype,
      'getAnimations',
      getAnimationsDescriptor
    )
  } else {
    Reflect.deleteProperty(HTMLElement.prototype, 'getAnimations')
  }
})

let client: QueryClient
let announcementsEnabled: boolean
let faqEnabled: boolean
let usageData: QuotaDataItem[]
let usageFailed: boolean
let announcementItems: AnnouncementItem[]
let faqItems: FAQItem[]
let workspaceName: string

beforeEach(() => {
  window.localStorage.clear()
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'dashboard-user',
    role: 1,
    quota: 1000000,
    used_quota: 1000,
    request_count: 1234,
    group: 'production',
  })
  client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  announcementsEnabled = true
  faqEnabled = true
  usageData = []
  usageFailed = false
  announcementItems = []
  faqItems = []
  workspaceName = 'Workspace'
  vi.spyOn(api, 'get').mockImplementation(async (url) => {
    switch (url) {
      case '/api/status':
        return {
          data: {
            data: {
              api_info_enabled: true,
              announcements_enabled: announcementsEnabled,
              faq_enabled: faqEnabled,
              uptime_kuma_enabled: true,
              announcements: announcementItems,
              faq: faqItems,
            },
          },
        }
      case '/api/enterprise/workspace':
        return { data: { success: true, data: { id: 1, name: workspaceName } } }
      case '/api/enterprise/analytics/overview':
        return {
          data: { success: true, data: { summary: { active_keys: 0 } } },
        }
      case '/api/data/self':
        if (usageFailed) throw new Error('Usage unavailable')
        return { data: { success: true, data: usageData } }
      default:
        throw new Error(`Unexpected dashboard request: ${url}`)
    }
  })
})

afterEach(async () => {
  cleanup()
  await i18next.changeLanguage('en')
  for (const language of ['zhCN', 'zhTW', 'fr', 'ja', 'ru', 'vi']) {
    i18next.removeResourceBundle(language, 'translation')
  }
  client.clear()
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  window.localStorage.clear()
})

async function renderOverview() {
  const router = createRouter({
    routeTree: createRootRoute({ component: OverviewDashboard }),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  return render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}

describe('overview layout', () => {
  it.each([
    { role: 1, requestCount: 0, guidePreference: 'expanded' },
    { role: 1, requestCount: 1, guidePreference: 'collapsed' },
    { role: 10, requestCount: 1, guidePreference: 'expanded' },
  ])(
    'shows usage without the removed panels for role $role and $requestCount prior requests',
    async (scenario) => {
      useAuthStore.getState().auth.setUser({
        id: 1,
        username: 'dashboard-user',
        role: scenario.role,
        request_count: scenario.requestCount,
      })
      window.localStorage.setItem(
        'dashboard_overview_setup_guide_expanded',
        scenario.guidePreference
      )
      await renderOverview()

      expect(
        await screen.findByRole('heading', { name: 'Usage at a glance' })
      ).toBeVisible()
      await screen.findByText('No FAQ entries available')
      for (const text of [
        'Setup guide',
        'Get started',
        'API Info',
        'Uptime',
        'Performance health',
      ]) {
        expect(screen.queryByText(text)).not.toBeInTheDocument()
      }
      expect(
        screen.queryByRole('button', { name: /setup guide/i })
      ).not.toBeInTheDocument()
      expect(api.get).not.toHaveBeenCalledWith('/api/token/?p=1&size=10')
      expect(api.get).not.toHaveBeenCalledWith('/api/user/models')
    }
  )

  it('merges the overview heading into the workspace bar and links active keys', async () => {
    await renderOverview()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Workspace' })
    ).toBeVisible()
    expect(
      screen.queryByRole('heading', { name: 'Overview' })
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('link', { name: 'Enterprise workspace' })
    ).not.toBeInTheDocument()
    expect(
      await screen.findByRole('link', { name: 'Active keys' })
    ).toHaveAttribute('href', '/enterprise/keys')
    expect(screen.getByRole('main')).toHaveClass(
      'mx-auto',
      'max-w-[1440px]',
      'w-full'
    )
  })

  it('places empty announcements and FAQ side by side on desktop with compact equal heights', async () => {
    await renderOverview()

    const announcements = await screen.findByText(
      'No announcements at this time'
    )
    const faq = await screen.findByText('No FAQ entries available')
    expect(announcements).toHaveClass('h-[180px]')
    expect(faq).toHaveClass('h-[180px]')
    const announcementCard = announcements.parentElement?.parentElement
    const faqCard = faq.parentElement?.parentElement
    const content = announcementCard?.parentElement
    expect(content).toHaveClass(
      'grid',
      'grid-cols-1',
      'lg:grid-cols-2',
      'items-stretch'
    )
    expect(content?.children).toHaveLength(2)
    expect(content?.firstElementChild).toBe(announcementCard)
    expect(content?.lastElementChild).toBe(faqCard)
  })

  it('keeps long workspace names truncated without displacing the key shortcut', async () => {
    workspaceName =
      'Enterprise workspace for customer support and production model integrations'
    await renderOverview()

    expect(
      await screen.findByRole('heading', { name: workspaceName })
    ).toHaveClass('truncate')
    expect(screen.getByRole('link', { name: 'Active keys' })).toHaveClass(
      'max-w-full'
    )
  })

  it('preserves announcement details and keyboard FAQ expansion inside compact scroll areas', async () => {
    const user = userEvent.setup()
    announcementItems = [
      {
        id: 1,
        content:
          'Model availability and scheduled maintenance for production integrations',
        extra: 'Maintenance details',
      },
      { id: 2, content: 'A new model is available' },
    ]
    faqItems = [
      {
        id: 1,
        question: 'How do I add credit?',
        answer: 'Open the wallet to add credit.',
      },
      {
        id: 2,
        question: 'Where are my keys?',
        answer: 'Open enterprise keys.',
      },
    ]
    await renderOverview()

    const question = await screen.findByRole('button', {
      name: 'How do I add credit?',
    })
    expect(question.closest('[data-slot="scroll-area"]')).toHaveClass(
      'h-[180px]'
    )
    question.focus()
    await user.keyboard('{Enter}')
    expect(question).toHaveAttribute('aria-expanded', 'true')
    expect(
      await screen.findByText('Open the wallet to add credit.')
    ).toBeVisible()
    expect(
      screen.getByRole('button', { name: 'Where are my keys?' })
    ).toHaveAttribute('aria-expanded', 'false')

    const announcement = screen.getByRole('button', {
      name: /Model availability and scheduled maintenance/,
    })
    expect(announcement.closest('[data-slot="scroll-area"]')).toHaveClass(
      'h-[180px]'
    )
    await user.click(announcement)
    const details = await screen.findByRole('dialog', {
      name: 'Announcement Details',
    })
    expect(within(details).getByText('Maintenance details')).toBeVisible()
    await user.keyboard('{Escape}')
    await waitFor(() =>
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    )
  })

  it('shows each usage metric once and replaces decorative charts with billing context', async () => {
    await renderOverview()

    await screen.findByText('No recent usage')
    expect(screen.getAllByText('Last 24h usage')).toHaveLength(1)
    expect(screen.getByText('production')).toBeVisible()
    const usage = screen.getByRole('region', { name: 'Usage at a glance' })
    const credit = screen.getByRole('region', { name: 'Credit remaining' })
    expect(usage).toHaveClass('lg:col-span-8')
    expect(credit).toHaveClass('lg:col-span-4')
    expect(usage.querySelector('svg linearGradient')).toBeNull()
    expect(within(usage).getByText('1,234')).toHaveClass('tabular-nums')
    expect(within(credit).getByText('Billing group')).toBeVisible()
    expect(
      within(credit).getByRole('link', { name: /Wallet & billing/ })
    ).toHaveAttribute('href', '/wallet')
  })

  it.each([0, -1])(
    'warns and offers an immediate recharge when the raw balance is %s',
    async (quota) => {
      const user = useAuthStore.getState().auth.user
      if (!user) throw new Error('Expected the dashboard user fixture')
      useAuthStore.getState().auth.setUser({ ...user, quota })
      await renderOverview()

      const credit = await screen.findByRole('region', {
        name: 'Credit remaining',
      })
      expect(credit).toHaveClass('border-destructive/40')
      expect(within(credit).getByRole('status')).toHaveTextContent(
        'Balance depleted'
      )
      expect(
        within(credit).getByRole('link', { name: /Recharge now/ })
      ).toHaveAttribute('href', '/wallet')
    }
  )

  it('shows an estimate and low balance warning from successful recent usage', async () => {
    usageData = [{ quota: 500000, count: 1, created_at: 1 }]
    await renderOverview()

    expect(await screen.findByText('About 2 days left')).toBeVisible()
    expect(screen.getByRole('status')).toHaveTextContent('Low balance')
    expect(screen.getByText('Based on the last 24 hours')).toBeVisible()
    expect(screen.getByRole('link', { name: /Recharge now/ })).toHaveAttribute(
      'href',
      '/wallet'
    )
  })

  it('does not treat a failed usage request as zero usage or a healthy estimate', async () => {
    usageFailed = true
    await renderOverview()

    await waitFor(() =>
      expect(screen.getAllByText('Not available').length).toBeGreaterThan(0)
    )
    expect(screen.queryByText('No recent usage')).not.toBeInTheDocument()
    expect(screen.queryByText('Healthy')).not.toBeInTheDocument()
    expect(screen.queryByText(/About .* days left/)).not.toBeInTheDocument()
  })

  it.each([
    ['zhCN', '1,234'],
    ['zhTW', '1,234'],
    ['en', '1,234'],
    ['fr', '1\u202f234'],
    ['ja', '1,234'],
    ['ru', '1\u00a0234'],
    ['vi', '1.234'],
    ['@@invalid', '1,234'],
  ])(
    'updates request count formatting when the interface switches to %s',
    async (language, expected) => {
      await renderOverview()
      await screen.findByText('No recent usage')
      if (language !== 'en' && language !== '@@invalid') {
        i18next.addResourceBundle(language, 'translation', {
          'Request Count': 'Request Count',
        })
      }
      await act(async () => {
        await i18next.changeLanguage(language)
      })

      const usage = screen.getByRole('region', { name: 'Usage at a glance' })
      expect(
        within(usage).getByText(expected, { collapseWhitespace: false })
      ).toBeVisible()
    }
  )

  it('does not show depleted credit or a fabricated billing group when account fields are unavailable', async () => {
    useAuthStore
      .getState()
      .auth.setUser({ id: 1, username: 'dashboard-user', role: 1 })
    await renderOverview()

    const credit = screen.getByRole('region', { name: 'Credit remaining' })
    expect(credit).not.toHaveClass('border-destructive/40')
    expect(within(credit).getByRole('status')).toHaveTextContent(
      'Not available'
    )
    expect(
      within(credit).queryByText('Balance depleted')
    ).not.toBeInTheDocument()
    expect(
      within(credit).getByRole('link', { name: /Wallet & billing/ })
    ).toBeVisible()
  })

  it.each([
    { announcements: false, faq: true },
    { announcements: true, faq: false },
    { announcements: false, faq: false },
  ])(
    'respects content visibility when announcements=$announcements and FAQ=$faq',
    async (visibility) => {
      announcementsEnabled = visibility.announcements
      faqEnabled = visibility.faq
      await renderOverview()
      await waitFor(() => expect(client.getQueryData(['status'])).toBeDefined())

      expect(Boolean(screen.queryByText('Announcements'))).toBe(
        visibility.announcements
      )
      expect(Boolean(screen.queryByText('FAQ'))).toBe(visibility.faq)
    }
  )
})
