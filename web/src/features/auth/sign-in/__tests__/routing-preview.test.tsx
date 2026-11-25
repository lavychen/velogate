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
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { RoutingBeams } from '../components/routing-beams'
import { RoutingPreview } from '../components/routing-preview'

beforeEach(() => {
  vi.useFakeTimers()
  vi.spyOn(Math, 'random').mockReturnValue(0.5)
})

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  vi.restoreAllMocks()
})

it('advances the sample log and throughput together every 2.6 seconds on desktop', () => {
  const media = window.matchMedia('')
  vi.spyOn(window, 'matchMedia').mockReturnValue({ ...media, matches: true })
  render(<RoutingPreview logo='/logo.png' name='VeloGate' />)
  expect(screen.getByText(/route: claude-fable-5/)).toBeInTheDocument()
  expect(screen.getByText('184.2k')).toBeInTheDocument()

  act(() => {
    vi.advanceTimersByTime(2599)
  })
  expect(screen.getByText(/route: claude-fable-5/)).toBeInTheDocument()
  act(() => {
    vi.advanceTimersByTime(1)
  })
  expect(
    screen.getByText(/route: gpt5.6-sol → 214 tok\/s · 180ms/)
  ).toBeInTheDocument()
  expect(screen.getByText('186.3k')).toBeInTheDocument()

  act(() => {
    vi.advanceTimersByTime(3 * 2600)
  })
  expect(screen.getByText(/route: claude-fable-5/)).toBeInTheDocument()
})

it('keeps the preview static when reduced motion is preferred or the panel is hidden on mobile', () => {
  const media = window.matchMedia('')
  vi.spyOn(window, 'matchMedia').mockReturnValue({ ...media, matches: false })
  render(<RoutingPreview logo='/logo.png' name='VeloGate' />)
  act(() => {
    vi.advanceTimersByTime(2600)
  })
  expect(screen.getByText(/route: claude-fable-5/)).toBeInTheDocument()
  expect(screen.getByText('184.2k')).toBeInTheDocument()
})

it('stops rotating the sample when the viewport no longer allows the animation', () => {
  const changes = new EventTarget()
  const media = {
    ...window.matchMedia(''),
    matches: true,
    addEventListener: changes.addEventListener.bind(changes),
    removeEventListener: changes.removeEventListener.bind(changes),
  }
  vi.spyOn(window, 'matchMedia').mockReturnValue(media)
  render(<RoutingPreview logo='/logo.png' name='VeloGate' />)
  act(() => {
    vi.advanceTimersByTime(2600)
  })
  expect(screen.getByText(/route: gpt5.6-sol/)).toBeInTheDocument()

  act(() => {
    media.matches = false
    changes.dispatchEvent(new Event('change'))
  })
  act(() => {
    vi.advanceTimersByTime(2600)
  })
  expect(screen.getByText(/route: gpt5.6-sol/)).toBeInTheDocument()
  expect(screen.getByText('186.3k')).toBeInTheDocument()
})

it.each([false, true])(
  'keeps fast routing pulses active when reduced motion is %s',
  (reducedMotion) => {
    const media = window.matchMedia('')
    vi.spyOn(window, 'matchMedia').mockReturnValue({
      ...media,
      matches: reducedMotion,
    })
    const { container } = render(<RoutingBeams outbound />)
    const animations = container.querySelectorAll('animateMotion')
    expect(animations).toHaveLength(4)
    for (const animation of animations) {
      expect(
        Number.parseFloat(animation.getAttribute('begin') ?? '')
      ).toBeLessThanOrEqual(0)
      expect(
        Number.parseFloat(animation.getAttribute('dur') ?? '')
      ).toBeLessThanOrEqual(1.65)
      expect(animation).toHaveAttribute('path')
    }
  }
)

it.each([
  { random: 0, expected: '150ms' },
  { random: 0.999, expected: '300ms' },
])(
  'keeps all four model latencies in range when random is $random',
  ({ random, expected }) => {
    const media = window.matchMedia('')
    vi.spyOn(window, 'matchMedia').mockReturnValue({ ...media, matches: true })
    vi.spyOn(Math, 'random').mockReturnValue(random)
    const { container } = render(
      <RoutingPreview logo='/logo.png' name='VeloGate' />
    )
    for (const model of [
      'gpt5.6-sol',
      'Claude Fable 5',
      'Gemini 3.8 Flash',
      'DeepSeek-V4',
    ]) {
      expect(screen.getByText(model, { exact: true })).toBeInTheDocument()
    }
    for (const latency of container.querySelectorAll('.sign-in-latency')) {
      expect(Number.parseInt(latency.textContent ?? '')).toBeGreaterThanOrEqual(
        150
      )
      expect(Number.parseInt(latency.textContent ?? '')).toBeLessThanOrEqual(
        300
      )
    }
    act(() => {
      vi.advanceTimersByTime(2600)
    })
    expect(screen.getAllByText(expected, { exact: true })).toHaveLength(4)
  }
)
