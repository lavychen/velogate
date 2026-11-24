import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { AxiosRequestConfig } from 'axios'
import { afterEach, expect, test, vi } from 'vitest'

import { Input } from '@/components/ui/input'

import { ImageGenerator } from '../image-generator'
import { VideoGenerator } from '../video-generator'

const adapter = vi.hoisted(() => vi.fn())
vi.mock('axios', async (importOriginal) => {
  const axios = await importOriginal<typeof import('axios')>()
  return {
    ...axios,
    default: {
      ...axios.default,
      create: (config: AxiosRequestConfig) =>
        axios.default.create({ ...config, adapter }),
    },
  }
})

const clients: QueryClient[] = []
afterEach(() => {
  clients.forEach((client) => client.clear())
  clients.length = 0
  adapter.mockReset()
  vi.unstubAllGlobals()
})

function renderGenerator(mode: 'image' | 'video', model?: string) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  })
  clients.push(client)
  const connectionFields = <Input aria-label='API key selection' />
  return render(
    <QueryClientProvider client={client}>
      {mode === 'image' ? (
        <ImageGenerator
          apiKey='sk-selected'
          model='gpt-image-1'
          connectionFields={connectionFields}
        />
      ) : (
        <VideoGenerator
          apiKey='sk-selected'
          keyId={1}
          model={model ?? 'sora-2'}
          connectionFields={connectionFields}
        />
      )}
    </QueryClientProvider>
  )
}

test('an empty image prompt shows an accessible error without submitting a request', async () => {
  renderGenerator('image')
  fireEvent.click(screen.getByRole('button', { name: 'Generate image' }))
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Please enter a prompt'
  )
  expect(screen.getByLabelText('Prompt')).toHaveAttribute(
    'aria-invalid',
    'true'
  )
  expect(adapter).not.toHaveBeenCalled()
})

test('image submission locks settings until the selected parameters produce downloadable results', async () => {
  let complete: (response: unknown) => void = () => undefined
  adapter.mockImplementation(
    () =>
      new Promise((resolve) => {
        complete = resolve
      })
  )
  renderGenerator('image')
  expect(screen.getByText('Generated images will appear here.')).toBeVisible()
  fireEvent.change(screen.getByLabelText('Prompt'), {
    target: { value: 'A mountain lake' },
  })
  fireEvent.change(screen.getByLabelText('Image count'), {
    target: { value: '2' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Generate image' }))
  await waitFor(() =>
    expect(screen.getByLabelText('API key selection')).toBeDisabled()
  )
  expect(JSON.parse(adapter.mock.calls[0][0].data)).toMatchObject({
    model: 'gpt-image-1',
    n: 2,
  })
  complete({
    status: 200,
    headers: {},
    data: { data: [{ url: 'https://example.com/lake.png' }] },
  })
  expect(
    await screen.findByRole('img', { name: 'A mountain lake' })
  ).toBeVisible()
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
    'href',
    'https://example.com/lake.png'
  )
  expect(screen.getByRole('button', { name: 'Generate image' })).toBeEnabled()
})

test('a video polling failure keeps the active task locked and retry retrieves its preview without creating another task', async () => {
  let pollFailed = true
  const createObjectURL = vi.fn(() => 'blob:video-preview')
  const revokeObjectURL = vi.fn()
  vi.stubGlobal(
    'URL',
    class extends URL {
      static createObjectURL = createObjectURL
      static revokeObjectURL = revokeObjectURL
    }
  )
  adapter.mockImplementation(async (config) => {
    if (config.method === 'post') {
      return {
        status: 200,
        headers: {},
        data: { id: 'video_1', status: 'queued' },
      }
    }
    if (config.responseType === 'blob') {
      return {
        status: 200,
        headers: {},
        data: new Blob(['video'], { type: 'video/mp4' }),
      }
    }
    if (pollFailed) throw new Error('Temporary network failure')
    return {
      status: 200,
      headers: {},
      data: { id: 'video_1', status: 'completed' },
    }
  })
  const view = renderGenerator('video')
  fireEvent.change(screen.getByLabelText('Prompt'), {
    target: { value: 'Waves on a beach' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Generate video' }))
  expect(await screen.findByText('Temporary network failure')).toBeVisible()
  expect(screen.getByRole('button', { name: 'Generate video' })).toBeDisabled()
  expect(screen.getByLabelText('API key selection')).toBeDisabled()
  pollFailed = false
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(await screen.findByLabelText('Generated video')).toHaveAttribute(
    'src',
    'blob:video-preview'
  )
  expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
    'download',
    'video_1.mp4'
  )
  expect(
    adapter.mock.calls.filter(([config]) => config.method === 'post')
  ).toHaveLength(1)
  expect(screen.getByRole('button', { name: 'Generate video' })).toBeEnabled()
  view.unmount()
  expect(revokeObjectURL).toHaveBeenCalledWith('blob:video-preview')
})

test('a non-Sora video model uses provider defaults instead of submitting Sora-specific duration and size', async () => {
  adapter.mockResolvedValue({
    status: 200,
    headers: {},
    data: {
      id: 'video_2',
      status: 'failed',
      error: { message: 'Provider unavailable' },
    },
  })
  renderGenerator('video', 'veo-3')
  fireEvent.change(screen.getByLabelText('Prompt'), {
    target: { value: 'Waves on a beach' },
  })
  fireEvent.click(screen.getByRole('button', { name: 'Generate video' }))
  expect(await screen.findByText('Provider unavailable')).toBeVisible()
  const request = adapter.mock.calls.find(
    ([config]) => config.method === 'post'
  )?.[0]
  expect(Object.fromEntries(request.data.entries())).toEqual({
    model: 'veo-3',
    prompt: 'Waves on a beach',
  })
  expect(screen.getByRole('button', { name: 'Generate video' })).toBeEnabled()
})
