import type { AxiosRequestConfig } from 'axios'
import { afterEach, expect, test, vi } from 'vitest'

import {
  generateImages,
  generateVideo,
  getVideoContent,
  getVideoTask,
} from './api'

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

afterEach(() => adapter.mockReset())

test('image generation sends the selected key and handles object-shaped image results', async () => {
  adapter.mockImplementation(async (config) => ({
    config,
    status: 200,
    headers: {},
    data: { data: { b64_json: 'UklGR-image' } },
  }))
  const images = await generateImages('sk-selected', {
    model: 'gpt-image-1',
    prompt: 'A mountain lake',
    n: 1,
    size: '1024x1024',
  })
  expect(images).toEqual(['data:image/webp;base64,UklGR-image'])
  const config = adapter.mock.calls[0][0]
  expect(config.url).toBe('/v1/images/generations')
  expect(config.headers.get('Authorization')).toBe('Bearer sk-selected')
  expect(JSON.parse(config.data)).toEqual({
    model: 'gpt-image-1',
    prompt: 'A mountain lake',
    n: 1,
    size: '1024x1024',
  })
})

test('video generation submits multipart fields and retrieves the task and protected content', async () => {
  const content = new Blob(['video'], { type: 'video/mp4' })
  adapter.mockImplementation(async (config) => {
    let data: unknown = { id: 'video_1', status: 'queued' }
    if (config.method === 'get') data = { id: 'video_1', status: 'completed' }
    if (config.responseType === 'blob') data = content
    return { config, status: 200, headers: {}, data }
  })
  expect(
    await generateVideo('sk-selected', {
      model: 'sora-2',
      prompt: 'Waves on a beach',
      seconds: '4',
      size: '1280x720',
    })
  ).toMatchObject({ id: 'video_1', status: 'queued' })
  const create = adapter.mock.calls[0][0]
  expect(create.url).toBe('/v1/videos')
  expect(Object.fromEntries(create.data.entries())).toEqual({
    model: 'sora-2',
    prompt: 'Waves on a beach',
    seconds: '4',
    size: '1280x720',
  })
  const signal = new AbortController().signal
  expect(await getVideoTask('sk-selected', 'video_1', signal)).toMatchObject({
    status: 'completed',
  })
  expect(await getVideoContent('sk-selected', 'video_1', signal)).toBe(content)
  expect(adapter.mock.calls.slice(1).map(([config]) => config.url)).toEqual([
    '/v1/videos/video_1',
    '/v1/videos/video_1/content',
  ])
  for (const [config] of adapter.mock.calls) {
    expect(config.headers.get('Authorization')).toBe('Bearer sk-selected')
  }
})
