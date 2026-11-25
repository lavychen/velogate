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
  Outlet,
  RouterProvider,
} from '@tanstack/react-router'
import { act, fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { Pricing } from '..'

vi.mock('@visactor/react-vchart', () => ({ VChart: () => null }))

let client: QueryClient
let sidebarHeight: number
let resizeSidebar: () => void

beforeEach(() => {
  sidebarHeight = 600
  resizeSidebar = () => undefined
  vi.stubGlobal('innerHeight', 800)
  vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
    function (this: HTMLElement) {
      return new DOMRect(
        0,
        0,
        256,
        this.tagName === 'ASIDE' ? sidebarHeight : 0
      )
    }
  )
  const getComputedStyle = window.getComputedStyle
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element, pseudo) => {
    const style = getComputedStyle(element, pseudo)
    if (element.tagName === 'ASIDE') style.top = '72px'
    return style
  })
  vi.stubGlobal(
    'ResizeObserver',
    class implements ResizeObserver {
      constructor(private callback: ResizeObserverCallback) {}
      observe(target: Element) {
        if (target.tagName === 'ASIDE') {
          resizeSidebar = () => this.callback([], this)
        }
      }
      unobserve() {}
      disconnect() {}
    }
  )
})

afterEach(() => {
  client.clear()
  vi.unstubAllGlobals()
})

async function renderPricing(groupCount = 0) {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  const groups = Array.from(
    { length: groupCount },
    (_, index) => `catalog-group-${index}`
  )
  client.setQueryData(['status'], {})
  client.setQueryData(['pricing'], {
    success: true,
    data: [],
    vendors: [],
    usable_group: Object.fromEntries(groups.map((group) => [group, ''])),
  })
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: {} },
  })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  const rootRoute = createRootRoute({
    component: () => (
      <QueryClientProvider client={client}>
        <Outlet />
      </QueryClientProvider>
    ),
  })
  const pricingRoute = createRoute({
    getParentRoute: () => rootRoute,
    path: '/pricing/',
    component: Pricing,
  })
  const router = createRouter({
    routeTree: rootRoute.addChildren([pricingRoute]),
    history: createMemoryHistory({ initialEntries: ['/pricing/'] }),
  })
  await router.load()
  render(<RouterProvider router={router} />)
  return screen.findByRole('complementary')
}

it.each([0, 1, 30])(
  'keeps %i groups fully expanded without a height limit or separate scroll area',
  async (groupCount) => {
    const sidebar = await renderPricing(groupCount)
    expect(sidebar).toHaveClass('hidden', 'lg:block', 'self-start')
    expect([...sidebar.classList]).not.toEqual(
      expect.arrayContaining([expect.stringMatching(/^(?:max-)?h-/)])
    )
    for (const className of [
      'overflow-y-auto',
      'overflow-auto',
      'overflow-hidden',
    ]) {
      expect(sidebar).not.toHaveClass(className)
    }
    expect(
      within(sidebar).queryAllByRole('button', { name: /^catalog-group-/ })
    ).toHaveLength(groupCount)
  }
)

it.each([
  { height: 600, sticky: true },
  { height: 1006, viewport: 1080, sticky: true },
  { height: 728, sticky: true },
  { height: 729, sticky: false },
  { height: 900, sticky: false },
  { height: 0, sticky: false },
])(
  'uses sticky positioning only when the measured height ($height) fits below the header',
  async ({ height, sticky, viewport = 800 }) => {
    sidebarHeight = height
    vi.stubGlobal('innerHeight', viewport)
    const sidebar = await renderPricing()
    if (sticky) {
      expect(sidebar).toHaveClass('sticky', 'top-18')
    } else {
      expect(sidebar).not.toHaveClass('sticky')
    }
  }
)

it('switches between page scrolling and sticky positioning when the viewport height changes', async () => {
  const sidebar = await renderPricing()
  expect(sidebar).toHaveClass('sticky')

  vi.stubGlobal('innerHeight', 650)
  fireEvent.resize(window)
  expect(sidebar).not.toHaveClass('sticky')

  vi.stubGlobal('innerHeight', 900)
  fireEvent.resize(window)
  expect(sidebar).toHaveClass('sticky')
})

it('rechecks sticky positioning when collapsing or expanding filters changes the sidebar height', async () => {
  sidebarHeight = 900
  const sidebar = await renderPricing(30)
  const user = userEvent.setup()
  const groups = within(sidebar).getByRole('button', { name: 'Groups' })
  expect(sidebar).not.toHaveClass('sticky')

  await user.click(groups)
  expect(groups).toHaveAttribute('aria-expanded', 'false')
  sidebarHeight = 600
  act(() => resizeSidebar())
  expect(sidebar).toHaveClass('sticky')

  await user.click(groups)
  expect(groups).toHaveAttribute('aria-expanded', 'true')
  sidebarHeight = 900
  act(() => resizeSidebar())
  expect(sidebar).not.toHaveClass('sticky')
})

it('keeps mobile drawer filters in normal flow even when the desktop sidebar fits', async () => {
  const sidebar = await renderPricing()
  expect(sidebar).toHaveClass('sticky')

  const user = userEvent.setup()
  await user.click(screen.getByRole('button', { name: 'Filter' }))
  const dialog = await screen.findByRole('dialog', { name: 'Filter' })
  const mobileSidebar = within(dialog).getByRole('complementary')
  expect(mobileSidebar).not.toHaveClass('sticky')
  expect(mobileSidebar).not.toHaveClass('top-18')
})
