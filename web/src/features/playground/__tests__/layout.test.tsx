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
import { render, screen } from '@testing-library/react'
import { expect, test, vi } from 'vitest'

import { Playground } from '..'

vi.mock('../hooks', () => ({
  usePlaygroundState: () => ({
    config: {},
    parameterEnabled: {},
    messages: [],
    models: [],
    groups: [],
  }),
  useChatHandler: () => ({}),
  usePlaygroundConversation: () => ({}),
  usePlaygroundOptions: () => ({}),
}))

vi.mock('../components/input/playground-input', () => ({
  PlaygroundInput: () => <textarea aria-label='Prompt' />,
}))

vi.mock('../components/message/playground-message-content', () => ({
  PlaygroundMessageContent: () => null,
}))

vi.mock('../components/message/playground-message-editor', () => ({
  PlaygroundMessageEditor: () => null,
}))

test('the workbench fills its container and aligns full-width conversation and input areas', () => {
  const { container } = render(<Playground />)

  expect(container.firstElementChild).toHaveClass(
    'size-full',
    'min-h-0',
    'overflow-hidden'
  )
  const inputArea = screen.getByRole('textbox', {
    name: 'Prompt',
  }).parentElement
  const conversation = screen.getByRole('log')
  const messageArea = conversation.querySelector('.w-full')
  expect(conversation).toHaveClass('min-h-0', 'flex-1', 'overflow-hidden')
  expect(inputArea).toHaveClass('shrink-0')
  for (const area of [inputArea, messageArea]) {
    expect(area).toHaveClass('w-full', 'px-3', 'sm:px-6', 'lg:px-8')
    expect(area).not.toHaveClass('max-w-4xl')
  }
})
