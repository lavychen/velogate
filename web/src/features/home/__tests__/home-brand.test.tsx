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
import { act, cleanup, render, screen } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'

import { DEFAULT_LOGO, DEFAULT_SYSTEM_NAME } from '@/lib/constants'
import { useSystemConfigStore } from '@/stores/system-config-store'

import { HomeBrand } from '../components/home-brand'

afterEach(() => {
  cleanup()
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  localStorage.clear()
})

test('shows the console logo, VeloGate name and MaaS badge in the home header', () => {
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  render(<HomeBrand name={DEFAULT_SYSTEM_NAME} />)

  expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute(
    'src',
    DEFAULT_LOGO
  )
  expect(screen.getByRole('img', { name: 'Logo' })).toHaveClass(
    'size-8',
    'object-contain',
    'shrink-0'
  )
  expect(screen.getByText('VeloGate')).toHaveClass('text-base', 'font-bold')
  expect(screen.getByText('MaaS')).toHaveAttribute('data-variant', 'secondary')
})

test('uses the same logo with compact sizing and no badge in the home footer', () => {
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  render(<HomeBrand name={DEFAULT_SYSTEM_NAME} footer />)

  expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute(
    'src',
    DEFAULT_LOGO
  )
  expect(screen.getByRole('img', { name: 'Logo' })).toHaveClass('size-7')
  expect(screen.getByText('VeloGate')).toHaveClass('text-sm')
  expect(screen.queryByText('MaaS')).not.toBeInTheDocument()
})

test('preserves custom names with truncation and updates the logo when site settings change', () => {
  useSystemConfigStore.setState(useSystemConfigStore.getInitialState(), true)
  const name = 'Example Enterprise AI Gateway for Developers'
  render(<HomeBrand name={name} />)

  act(() => {
    useSystemConfigStore.getState().setConfig({ logo: '/custom-brand.png' })
  })

  expect(screen.getByRole('img', { name: 'Logo' })).toHaveAttribute(
    'src',
    '/custom-brand.png'
  )
  expect(screen.getByText(name)).toHaveClass('truncate')
  expect(screen.getByText(name)).toHaveAttribute('title', name)
})
