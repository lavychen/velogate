import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import type { AxiosRequestConfig } from 'axios'
import { StrictMode } from 'react'
import { afterEach, expect, test, vi } from 'vitest'

import { Input } from '@/components/ui/input'
import { clearAuthenticatedClientState } from '@/lib/auth-session'
import { useAuthStore } from '@/stores/auth-store'

import { MediaGeneration } from '..'
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
  useAuthStore.getState().auth.reset()
  vi.unstubAllGlobals()
  vi.useRealTimers()
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

function renderGenerationPage(mode: 'image' | 'video', client: QueryClient) {
  return render(
    <StrictMode>
      <QueryClientProvider client={client}>
        <MediaGeneration mode={mode} />
      </QueryClientProvider>
    </StrictMode>
  )
}

function setupGenerationPage(
  options?: { id: number; name: string; models: string[] }[]
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  })
  clients.push(client)
  useAuthStore.getState().auth.setUser({
    id: 1,
    username: 'generator',
    role: 1,
  })
  adapter.mockImplementation(async (config) => {
    let data: unknown
    if (config.url === '/api/token/generation-options') {
      data = {
        success: true,
        data: options ?? [
          {
            id: 1,
            name: 'First key',
            models: [config.params.type === 'image' ? 'gpt-image-1' : 'sora-2'],
          },
          {
            id: 2,
            name: 'Second key',
            models: [config.params.type === 'image' ? 'gpt-image-1' : 'sora-2'],
          },
        ],
      }
    } else if (/^\/api\/token\/\d+\/key$/.test(config.url)) {
      data = {
        success: true,
        data: { key: `selected-${config.url.split('/')[3]}` },
      }
    } else {
      throw new Error(`Unexpected request: ${config.url}`)
    }
    return { config, status: 200, headers: {}, data }
  })
  return client
}

test.each(['image', 'video'] as const)(
  '%s generation opens under StrictMode, selects the first matching key and reads only that credential',
  async (mode) => {
    const model = mode === 'image' ? 'gpt-image-1' : 'sora-2'
    const client = setupGenerationPage([
      { id: 2, name: 'Matching key', models: [model] },
      { id: 3, name: 'Another matching key', models: [model] },
    ])
    renderGenerationPage(mode, client)
    expect(
      await screen.findByRole('button', {
        name: mode === 'image' ? 'Generate image' : 'Generate video',
      })
    ).toBeEnabled()
    expect(screen.getByLabelText('API Key')).toHaveValue('2')
    expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
      '/api/token/generation-options',
      '/api/token/2/key',
    ])
    expect(adapter.mock.calls[0][0].params).toEqual({ type: mode })
  }
)

test('generation shows no available models only after the options query succeeds with an empty list', async () => {
  const client = setupGenerationPage([])
  renderGenerationPage('image', client)
  expect(await screen.findByText('No available models')).toBeVisible()
  expect(screen.getByLabelText('API Key')).toBeDisabled()
  expect(adapter.mock.calls.map(([config]) => config.url)).toEqual([
    '/api/token/generation-options',
  ])
})

test('an options query failure shows an error and retry loads a matching key without reading unrelated credentials', async () => {
  const client = setupGenerationPage()
  adapter.mockRejectedValueOnce(new Error('Options unavailable'))
  renderGenerationPage('video', client)
  expect(await screen.findByText('Options unavailable')).toBeVisible()
  expect(screen.queryByText('No available models')).not.toBeInTheDocument()
  fireEvent.click(screen.getByRole('button', { name: 'Retry' }))
  expect(
    await screen.findByRole('button', { name: 'Generate video' })
  ).toBeEnabled()
  expect(
    adapter.mock.calls
      .filter(([config]) => config.method === 'post')
      .map(([config]) => config.url)
  ).toEqual(['/api/token/1/key'])
})

test.each(['image', 'video'] as const)(
  '%s generation reuses each selected key when switching keys and reopening either generation page',
  async (mode) => {
    const client = setupGenerationPage()
    const view = renderGenerationPage(mode, client)
    const action = mode === 'image' ? 'Generate image' : 'Generate video'
    expect(await screen.findByRole('button', { name: action })).toBeEnabled()

    fireEvent.change(screen.getByLabelText('API Key'), {
      target: { value: '2' },
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: action })).toBeEnabled()
    )
    fireEvent.change(screen.getByLabelText('API Key'), {
      target: { value: '1' },
    })
    await waitFor(() =>
      expect(screen.getByRole('button', { name: action })).toBeEnabled()
    )
    view.unmount()
    const otherMode = mode === 'image' ? 'video' : 'image'
    renderGenerationPage(otherMode, client)
    expect(
      await screen.findByRole('button', {
        name: otherMode === 'image' ? 'Generate image' : 'Generate video',
      })
    ).toBeEnabled()

    expect(
      adapter.mock.calls
        .filter(([config]) => config.method === 'post')
        .map(([config]) => config.url)
    ).toEqual(['/api/token/1/key', '/api/token/2/key'])
  }
)

test('generation fetches a selected key again after its five minute freshness window expires', async () => {
  vi.useFakeTimers({ toFake: ['Date'] })
  const client = setupGenerationPage()
  renderGenerationPage('image', client)
  expect(
    await screen.findByRole('button', { name: 'Generate image' })
  ).toBeEnabled()
  fireEvent.change(screen.getByLabelText('API Key'), { target: { value: '2' } })
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Generate image' })).toBeEnabled()
  )

  vi.setSystemTime(Date.now() + 5 * 60 * 1000 + 1)
  fireEvent.change(screen.getByLabelText('API Key'), { target: { value: '1' } })
  await waitFor(() =>
    expect(
      adapter.mock.calls.filter(([config]) => config.url === '/api/token/1/key')
    ).toHaveLength(2)
  )
  await waitFor(() =>
    expect(screen.getByRole('button', { name: 'Generate image' })).toBeEnabled()
  )
})

test('ending the authenticated session removes generation credentials before the same user returns', async () => {
  const client = setupGenerationPage()
  const view = renderGenerationPage('image', client)
  expect(
    await screen.findByRole('button', { name: 'Generate image' })
  ).toBeEnabled()
  view.unmount()

  clearAuthenticatedClientState(client, false)
  useAuthStore
    .getState()
    .auth.setUser({ id: 1, username: 'generator', role: 1 })
  renderGenerationPage('video', client)
  expect(
    await screen.findByRole('button', { name: 'Generate video' })
  ).toBeEnabled()

  expect(
    adapter.mock.calls.filter(([config]) => config.url === '/api/token/1/key')
  ).toHaveLength(2)
})

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
  fireEvent.click(screen.getByRole('button', { name: '1536 × 1024' }))
  expect(screen.getByRole('button', { name: '1536 × 1024' })).toHaveAttribute(
    'aria-pressed',
    'true'
  )
  fireEvent.click(screen.getByRole('button', { name: 'Generate image' }))
  await waitFor(() =>
    expect(screen.getByLabelText('API key selection')).toBeDisabled()
  )
  expect(JSON.parse(adapter.mock.calls[0][0].data)).toMatchObject({
    model: 'gpt-image-1',
    n: 2,
    size: '1536x1024',
  })
  expect(screen.getByRole('region', { name: 'Preview' })).toHaveAttribute(
    'aria-busy',
    'true'
  )
  expect(screen.getByRole('button', { name: '1536 × 1024' })).toBeDisabled()
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

test.each([
  ['image', 'Product photography'],
  ['video', 'Cinematic aerial'],
] as const)(
  '%s example fills and focuses the prompt without submitting',
  async (mode, example) => {
    const user = userEvent.setup()
    renderGenerator(mode)
    await user.click(screen.getByRole('button', { name: example }))
    const prompt = screen.getByLabelText('Prompt')
    expect(prompt).not.toHaveValue('')
    expect(prompt).toHaveFocus()
    expect(adapter).not.toHaveBeenCalled()
  }
)

test.each(['image', 'video'] as const)(
  '%s history switches previews and reuses parameters without generating again',
  async (mode) => {
    let requestNumber = 0
    vi.stubGlobal(
      'URL',
      class extends URL {
        static createObjectURL = () => 'blob:history-preview'
        static revokeObjectURL = vi.fn()
      }
    )
    adapter.mockImplementation(async (config) => {
      let data: unknown
      if (config.method === 'post') {
        requestNumber++
        data =
          mode === 'image'
            ? {
                data: [
                  { url: `https://example.com/result-${requestNumber}.png` },
                ],
              }
            : { id: `video_${requestNumber}`, status: 'completed' }
      } else if (config.responseType === 'blob') {
        data = new Blob(['video'], { type: 'video/mp4' })
      } else {
        data = { id: `video_${requestNumber}`, status: 'completed' }
      }
      return { status: 200, headers: {}, data }
    })
    renderGenerator(mode)
    const generate = mode === 'image' ? 'Generate image' : 'Generate video'
    const size = mode === 'image' ? '1536 × 1024' : '720 × 1280'
    fireEvent.change(screen.getByLabelText('Prompt'), {
      target: { value: 'First scene' },
    })
    fireEvent.click(screen.getByRole('button', { name: size }))
    fireEvent.click(screen.getByRole('button', { name: generate }))
    await screen.findByRole('button', { name: 'View generation 1' })
    fireEvent.change(screen.getByLabelText('Prompt'), {
      target: { value: 'Second scene' },
    })
    fireEvent.click(screen.getByRole('button', { name: generate }))
    await screen.findByRole('button', { name: 'View generation 2' })

    const user = userEvent.setup()
    const first = screen.getByRole('button', { name: 'View generation 1' })
    first.focus()
    await user.keyboard('{Enter}')
    expect(first).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByText('First scene')).toBeVisible()
    if (mode === 'image') {
      expect(screen.getByRole('img', { name: 'First scene' })).toHaveAttribute(
        'src',
        'https://example.com/result-1.png'
      )
    } else {
      await waitFor(() =>
        expect(screen.getByRole('link', { name: 'Download' })).toHaveAttribute(
          'download',
          'video_1.mp4'
        )
      )
    }
    fireEvent.change(screen.getByLabelText('Prompt'), {
      target: { value: 'An unsaved edit' },
    })
    await user.click(screen.getByRole('button', { name: 'Reuse settings' }))
    expect(screen.getByLabelText('Prompt')).toHaveValue('First scene')
    await waitFor(() => expect(screen.getByLabelText('Prompt')).toHaveFocus())
    expect(screen.getByRole('button', { name: size })).toHaveAttribute(
      'aria-pressed',
      'true'
    )
    expect(requestNumber).toBe(2)
  }
)
