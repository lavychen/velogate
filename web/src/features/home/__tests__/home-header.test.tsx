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
import { act, cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createInstance, type i18n } from 'i18next'
import { I18nextProvider, initReactI18next } from 'react-i18next'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'

import { PublicLayout } from '@/components/layout/components/public-layout'
import { INTERFACE_LANGUAGE_OPTIONS } from '@/i18n/languages'
import en from '@/i18n/locales/en.json'
import fr from '@/i18n/locales/fr.json'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useAuthStore } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { HomeHeader } from '../components/home-header'

let client: QueryClient
let language: i18n

beforeEach(async () => {
  localStorage.clear()
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  language = createInstance()
  await language.use(initReactI18next).init({
    lng: 'en',
    fallbackLng: 'en',
    resources: { en, fr },
  })
})

afterEach(() => {
  cleanup()
  client.clear()
  useAuthStore.setState(useAuthStore.getInitialState(), true)
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  localStorage.clear()
})

async function renderHeader(
  modules?: unknown,
  docsLink?: string,
  publicPage = false
) {
  client.setQueryData(STATUS_QUERY_KEY, {
    HeaderNavModules: modules,
    docs_link: docsLink,
  })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => undefined)
  const root = createRootRoute({
    component: () =>
      publicPage ? (
        <PublicLayout>
          <h1>Public page content</h1>
        </PublicLayout>
      ) : (
        <HomeHeader name='Example enterprise gateway' onToolbox={vi.fn()} />
      ),
  })
  const router = createRouter({
    routeTree: root.addChildren([
      createRoute({ getParentRoute: () => root, path: '/' }),
      createRoute({ getParentRoute: () => root, path: '/about' }),
    ]),
    history: createMemoryHistory({ initialEntries: ['/'] }),
  })
  await router.load()
  render(
    <QueryClientProvider client={client}>
      <I18nextProvider i18n={language}>
        <RouterProvider router={router} />
      </I18nextProvider>
    </QueryClientProvider>
  )
  return router
}

test.each([undefined, '{invalid json'])(
  'shows the default backend navigation on desktop and mobile when configuration is %s',
  async (modules) => {
    await renderHeader(modules)
    const desktop = screen.getByRole('navigation', { name: 'Main navigation' })
    expect(
      within(desktop)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'))
    ).toEqual(['/', '/dashboard', '/pricing', '/rankings', '/docs', '/about'])
    expect(desktop).toHaveClass('hidden', 'xl:flex')
    const toggle = screen.getByRole('button', {
      name: 'Toggle navigation menu',
    })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await userEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    const mobile = screen.getByRole('navigation', { name: 'Mobile navigation' })
    expect(mobile).toHaveClass('xl:hidden', 'overflow-y-auto')
    expect(
      within(mobile)
        .getAllByRole('link')
        .map((link) => link.getAttribute('href'))
    ).toEqual(['/', '/dashboard', '/pricing', '/rankings', '/docs', '/about'])
  }
)

test('applies backend visibility updates without restoring disabled navigation or console buttons', async () => {
  await renderHeader()
  await userEvent.click(
    screen.getByRole('button', { name: 'Toggle navigation menu' })
  )
  act(() => {
    client.setQueryData(STATUS_QUERY_KEY, {
      HeaderNavModules: JSON.stringify({
        home: false,
        console: false,
        pricing: false,
        rankings: false,
        docs: false,
        about: false,
      }),
    })
  })
  expect(
    await screen.findByRole('button', { name: 'Developer toolbox' })
  ).toBeInTheDocument()
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Toggle navigation menu' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Enter console' })
  ).not.toBeInTheDocument()
  expect(screen.getAllByRole('link')).toHaveLength(1)
})

test('preserves configured external documentation links in desktop and mobile navigation', async () => {
  await renderHeader(
    {
      home: false,
      console: false,
      pricing: false,
      rankings: false,
      about: false,
    },
    'https://docs.example.com/guide'
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Toggle navigation menu' })
  )
  for (const name of ['Main navigation', 'Mobile navigation']) {
    const navigation = screen.getByRole('navigation', { name })
    const link = within(navigation).getByRole('link', { name: 'Docs' })
    expect(within(navigation).getAllByRole('link')).toHaveLength(1)
    expect(link).toHaveAttribute('href', 'https://docs.example.com/guide')
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
  }
})

test('closes mobile navigation after keyboard activation of an internal destination', async () => {
  const router = await renderHeader()
  const user = userEvent.setup()
  const toggle = screen.getByRole('button', { name: 'Toggle navigation menu' })
  toggle.focus()
  await user.keyboard('{Enter}')
  const mobile = screen.getByRole('navigation', { name: 'Mobile navigation' })
  within(mobile).getByRole('link', { name: 'About' }).focus()
  await user.keyboard('{Enter}')
  expect(router.state.location.pathname).toBe('/about')
  expect(
    screen.queryByRole('navigation', { name: 'Mobile navigation' })
  ).not.toBeInTheDocument()
  expect(toggle).toHaveAttribute('aria-expanded', 'false')
})

test('offers all seven languages and updates header navigation when a visitor switches language', async () => {
  await renderHeader()
  const user = userEvent.setup()
  screen.getByRole('button', { name: 'Change language' }).focus()
  await user.keyboard('{Enter}')
  for (const option of INTERFACE_LANGUAGE_OPTIONS) {
    expect(
      await screen.findByRole('menuitem', { name: option.label })
    ).toBeVisible()
  }
  await user.click(screen.getByRole('menuitem', { name: 'Français' }))
  const navigation = await screen.findByRole('navigation', {
    name: 'Navigation principale',
  })
  expect(language.language).toBe('fr')
  expect(
    within(navigation).getByRole('link', { name: 'Accueil' })
  ).toHaveAttribute('href', '/')
  expect(
    screen.getByRole('button', { name: 'Changer de langue' })
  ).toBeInTheDocument()
})

test('public pages use the home header layout and return to the home route through the brand', async () => {
  const router = await renderHeader(undefined, undefined, true)
  const header = screen.getByRole('banner')
  expect(header).toHaveClass('sticky', 'h-16', 'border-b')
  expect(screen.getByRole('main')).toHaveClass('py-6')
  expect(screen.getByRole('main')).not.toHaveClass('pt-20')
  expect(within(header).getByText('MaaS')).toBeVisible()
  expect(
    within(header).getByRole('button', { name: 'Enter console' })
  ).toHaveAttribute('href', '/dashboard')
  expect(
    within(header).getByRole('button', { name: 'Developer toolbox' })
  ).toBeVisible()
  expect(
    within(header).getByRole('button', { name: 'Change language' })
  ).toBeVisible()
  expect(
    within(header).getByRole('navigation', { name: 'Main navigation' })
  ).toHaveClass('hidden', 'xl:flex')
  await userEvent.click(
    within(header).getByRole('button', { name: 'Toggle navigation menu' })
  )
  expect(
    screen.getByRole('navigation', { name: 'Mobile navigation' })
  ).toHaveClass('xl:hidden', 'overflow-y-auto')
  await act(async () => {
    await router.navigate({ to: '/about' })
  })
  const brand = within(header).getByRole('img', { name: 'Logo' }).closest('a')
  expect(brand).toHaveAttribute('href', '/')
  if (!brand) throw new Error('Brand link is missing')
  await userEvent.click(brand)
  expect(router.state.location.pathname).toBe('/')
})

test.each([false, true])(
  'the brand on a public page (%s) uses a pointer without text selection and supports keyboard navigation home',
  async (publicPage) => {
    const router = await renderHeader(undefined, undefined, publicPage)
    await act(async () => {
      await router.navigate({ to: '/about' })
    })
    const brand = screen.getByRole('link', { name: 'Go to home' })
    expect(brand).toHaveClass('cursor-pointer', 'select-none')
    const user = userEvent.setup()
    await user.tab()
    expect(brand).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(router.state.location.pathname).toBe('/')
  }
)

test('public pages keep backend-disabled navigation hidden on desktop and mobile', async () => {
  await renderHeader(
    {
      home: false,
      console: false,
      pricing: false,
      rankings: false,
      docs: false,
      about: false,
    },
    undefined,
    true
  )
  expect(screen.queryByRole('navigation')).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Enter console' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Toggle navigation menu' })
  ).not.toBeInTheDocument()
})

test('public page toolbox opens and closes while pricing navigation is disabled', async () => {
  await renderHeader({ pricing: false }, undefined, true)
  await userEvent.click(
    screen.getByRole('button', { name: 'Developer toolbox' })
  )
  const toolbox = await screen.findByRole('dialog', {
    name: 'Developer toolbox',
  })
  expect(
    within(toolbox).getByRole('tab', { name: 'Token inspector' })
  ).toHaveAttribute('aria-selected', 'true')
  await userEvent.click(
    within(toolbox).getByRole('tab', { name: 'Cost estimator' })
  )
  expect(within(toolbox).getByText('No Models Found')).toBeVisible()
  await userEvent.click(within(toolbox).getByRole('button', { name: 'Close' }))
  expect(
    screen.queryByRole('dialog', { name: 'Developer toolbox' })
  ).not.toBeInTheDocument()
})

test('public page mobile navigation keeps the sign-in prompt for restricted modules and closes the menu', async () => {
  const router = await renderHeader(
    { pricing: { enabled: true, requireAuth: true } },
    undefined,
    true
  )
  await userEvent.click(
    screen.getByRole('button', { name: 'Toggle navigation menu' })
  )
  await userEvent.click(
    within(
      screen.getByRole('navigation', { name: 'Mobile navigation' })
    ).getByRole('link', { name: 'Model Square' })
  )
  expect(
    await screen.findByRole('dialog', { name: 'Sign in required' })
  ).toBeVisible()
  expect(router.state.location.pathname).toBe('/')
  expect(
    screen.queryByRole('navigation', { name: 'Mobile navigation' })
  ).not.toBeInTheDocument()
  await userEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
})
