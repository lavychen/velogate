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
import { act, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import type { SystemStatus } from '@/features/auth/types'
import { api } from '@/lib/api'
import { STATUS_QUERY_KEY } from '@/lib/status-query'
import { useAuthStore, type AuthBundle } from '@/stores/auth-store'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { SignIn } from '..'

const clients: QueryClient[] = []
const bundle: AuthBundle = {
  access_token: 'signed-in',
  token_type: 'Bearer',
  access_expires_at: 4102444800,
  user: { id: 42, username: 'gateway-user', role: 1 },
  session: {
    sid: 'login-session',
    current: true,
    login_method: 'password',
    ip: '',
    user_agent: '',
    created_at: 1,
    last_active_at: 1,
    expires_at: 4102444800,
  },
}

function renderSignIn(status: SystemStatus = {}) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  })
  clients.push(client)
  client.setQueryData(STATUS_QUERY_KEY, status)
  const root = createRootRoute({ component: Outlet })
  const auth = createRoute({
    getParentRoute: () => root,
    id: '(auth)',
    component: Outlet,
  })
  const signIn = createRoute({
    getParentRoute: () => auth,
    path: '/sign-in',
    component: SignIn,
    validateSearch: () => ({ redirect: '/pricing' }),
  })
  const router = createRouter({
    routeTree: root.addChildren([
      auth.addChildren([signIn]),
      createRoute({
        getParentRoute: () => root,
        path: '/pricing',
        component: () => <div>Requested destination</div>,
      }),
      createRoute({
        getParentRoute: () => root,
        path: '/otp',
        component: () => <div>Additional verification required</div>,
      }),
    ]),
    history: createMemoryHistory({ initialEntries: ['/sign-in'] }),
  })
  render(
    <QueryClientProvider client={client}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
  return { router }
}

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  useAuthStore.getState().auth.reset('complete')
  useSystemConfigStore
    .getState()
    .setConfig({ systemName: 'Gateway Test', logo: '/custom-logo.svg' })
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {})
})

afterEach(() => {
  clients.splice(0).forEach((client) => client.clear())
  vi.restoreAllMocks()
  useAuthStore.getState().auth.reset('idle')
  localStorage.clear()
  sessionStorage.clear()
})

it('keeps pasted passwords masked and supports keyboard visibility toggling without submitting', async () => {
  const post = vi.spyOn(api, 'post')
  renderSignIn()
  const user = userEvent.setup()
  const password = await screen.findByLabelText('Password', { exact: true })
  expect(password).toHaveAttribute('type', 'password')
  expect(password).toHaveAttribute('autocomplete', 'current-password')
  expect(screen.getByLabelText('Username or Email')).toHaveAttribute(
    'autocomplete',
    'username'
  )
  await user.click(password)
  await user.paste(' correct horse battery staple ')
  await user.tab()
  expect(screen.getByRole('button', { name: 'Show password' })).toHaveFocus()
  await user.keyboard('{Enter}')
  expect(password).toHaveAttribute('type', 'text')
  expect(password).toHaveValue(' correct horse battery staple ')
  await user.keyboard('{Enter}')
  expect(password).toHaveAttribute('type', 'password')
  expect(post).not.toHaveBeenCalled()
})

it('focuses an invalid account field and sends no request when an empty form is submitted', async () => {
  const post = vi.spyOn(api, 'post')
  renderSignIn()
  const user = userEvent.setup()
  await user.click(await screen.findByRole('button', { name: 'Sign in' }))
  const username = screen.getByLabelText('Username or Email')
  await waitFor(() => expect(username).toHaveFocus())
  expect(username).toHaveAttribute('aria-invalid', 'true')
  expect(post).not.toHaveBeenCalled()
})

it('disables submission while login is pending and restores it after a failed request', async () => {
  let reject!: (error: Error) => void
  const response = new Promise<never>((_, fail) => {
    reject = fail
  })
  const post = vi.spyOn(api, 'post').mockReturnValue(response)
  const { router } = renderSignIn()
  const user = userEvent.setup()
  await user.type(
    await screen.findByLabelText('Username or Email'),
    'gateway-user'
  )
  await user.type(
    screen.getByLabelText('Password', { exact: true }),
    'gateway-password'
  )
  const submit = screen.getByRole('button', { name: 'Sign in' })
  await user.click(submit)
  await waitFor(() => expect(submit).toBeDisabled())
  await act(async () => {
    reject(new Error('Network unavailable'))
  })
  await waitFor(() => expect(submit).toBeEnabled())
  expect(post).toHaveBeenCalledTimes(1)
  expect(router.state.location.pathname).toBe('/sign-in')
  expect(useAuthStore.getState().auth.user).toBeNull()
})

it('requires legal consent for password and configured OAuth login', async () => {
  const post = vi
    .spyOn(api, 'post')
    .mockResolvedValue({ data: { success: false } })
  renderSignIn({
    user_agreement_enabled: true,
    privacy_policy_enabled: true,
    github_oauth: true,
    github_client_id: 'github-client',
  })
  const user = userEvent.setup()
  await user.type(
    await screen.findByLabelText('Username or Email'),
    'gateway-user'
  )
  await user.type(
    screen.getByLabelText('Password', { exact: true }),
    'gateway-password'
  )
  const oauth = screen.getByRole('button', { name: /Continue with GitHub/ })
  expect(oauth).toBeDisabled()
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  expect(post).not.toHaveBeenCalled()
  await user.click(screen.getByRole('checkbox'))
  expect(oauth).toBeEnabled()
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  await waitFor(() => expect(post).toHaveBeenCalledTimes(1))
})

it('shows configured alternative login when password login and registration are disabled', async () => {
  renderSignIn({
    password_login_enabled: false,
    register_enabled: false,
    github_oauth: true,
    passkey_login: true,
  })
  expect(
    await screen.findByRole('button', { name: /Continue with GitHub/ })
  ).toBeVisible()
  expect(
    screen.getByRole('button', { name: 'Sign in with Passkey' })
  ).toBeDisabled()
  expect(
    screen.queryByLabelText('Password', { exact: true })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: 'Sign in' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('link', { name: 'Sign up' })
  ).not.toBeInTheDocument()
  expect(
    screen.queryByRole('button', { name: /Google|SSO/ })
  ).not.toBeInTheDocument()
})

it('uses configured branding and exposes real recovery, registration and documentation links', async () => {
  renderSignIn({
    docs_link: 'https://docs.example.com',
    register_enabled: true,
  })
  expect(
    await screen.findByText('Sign in to your Gateway Test console')
  ).toBeVisible()
  expect(screen.getByRole('main')).toHaveAttribute('id', 'main-content')
  expect(
    screen.getByRole('link', { name: 'Forgot password?' })
  ).toHaveAttribute('href', '/forgot-password')
  expect(screen.getByRole('link', { name: 'Sign up' })).toHaveAttribute(
    'href',
    '/sign-up'
  )
  expect(screen.getByRole('link', { name: 'Developer Docs' })).toHaveAttribute(
    'href',
    'https://docs.example.com'
  )
  expect(
    screen.getByRole('region', { name: 'AI routing preview' })
  ).toHaveTextContent('Illustrative preview')
})

it('authenticates and preserves the requested destination after a successful login', async () => {
  const post = vi
    .spyOn(api, 'post')
    .mockResolvedValue({ data: { success: true, data: bundle } })
  const { router } = renderSignIn()
  const user = userEvent.setup()
  await user.type(
    await screen.findByLabelText('Username or Email'),
    'gateway-user'
  )
  const password = screen.getByLabelText('Password', { exact: true })
  await user.click(password)
  await user.paste(' exact password ')
  await user.keyboard('{Enter}')
  await waitFor(() => expect(router.state.location.pathname).toBe('/pricing'))
  expect(post).toHaveBeenCalledWith(
    '/api/user/login?turnstile=',
    { username: 'gateway-user', password: ' exact password ' },
    { skipAuthRefresh: true }
  )
  expect(useAuthStore.getState().auth.user?.id).toBe(42)
})

it('routes a primary login challenge to verification without creating an authenticated session', async () => {
  vi.spyOn(api, 'post').mockResolvedValue({
    data: {
      success: true,
      data: {
        require_verification: true,
        flow_token: 'primary-flow',
        expires_at: Math.floor(Date.now() / 1000) + 300,
        methods: [{ method: '2fa', available: true }],
      },
    },
  })
  const { router } = renderSignIn()
  const user = userEvent.setup()
  await user.type(
    await screen.findByLabelText('Username or Email'),
    'gateway-user'
  )
  await user.type(
    screen.getByLabelText('Password', { exact: true }),
    'gateway-password'
  )
  await user.click(screen.getByRole('button', { name: 'Sign in' }))
  await waitFor(() => expect(router.state.location.pathname).toBe('/otp'))
  expect(useAuthStore.getState().auth.user).toBeNull()
  expect(
    useAuthStore.getState().auth.pendingLoginVerification?.redirectTo
  ).toBe('/pricing')
})
