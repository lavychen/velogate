import axios from 'axios'

import { fetchTokenKey } from '@/features/keys/api'
import { api } from '@/lib/api'
import { requireServerSuccess } from '@/lib/server-error-message'

// Relay requests use the selected API key. The dashboard client overwrites
// Authorization with the browser session's access token.
const relayApi = axios.create({ withCredentials: false })

export interface GenerationOption {
  id: number
  name: string
  models: string[]
}

export async function getGenerationOptions(
  mode: 'image' | 'video',
  signal: AbortSignal
): Promise<GenerationOption[]> {
  const response = requireServerSuccess(
    (
      await api.get<{ success: boolean; data: GenerationOption[] }>(
        '/api/token/generation-options',
        // React Query handles deduplication; remounts need a fresh abort signal.
        { params: { type: mode }, signal, disableDuplicate: true }
      )
    ).data
  )
  return response.data
}

export async function getGenerationKey(keyId: number) {
  const response = requireServerSuccess(await fetchTokenKey(keyId))
  if (!response.data?.key) throw new Error('Failed to load API keys')
  return `sk-${response.data.key.replace(/^sk-/, '')}`
}

export async function generateImages(
  apiKey: string,
  body: Record<string, unknown>
) {
  const response = await relayApi.post('/v1/images/generations', body, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  return readImageResults(response.data)
}

function readImageResults(value: unknown): string[] {
  if (!value || typeof value !== 'object') return []
  const record = value as Record<string, unknown>
  if (Array.isArray(record.data)) return record.data.flatMap(readImageResults)
  if (record.data && typeof record.data === 'object') {
    return readImageResults(record.data)
  }
  if (typeof record.url === 'string' && /^https?:\/\//i.test(record.url)) {
    return [record.url]
  }
  if (typeof record.b64_json === 'string' && record.b64_json.trim()) {
    const base64 = record.b64_json.trim()
    let mime = 'image/png'
    if (base64.startsWith('/9j/')) mime = 'image/jpeg'
    if (base64.startsWith('UklGR')) mime = 'image/webp'
    return [`data:${mime};base64,${base64}`]
  }
  return []
}

export type VideoTask = {
  id: string
  status: 'queued' | 'in_progress' | 'completed' | 'failed'
  progress?: number
  error?: { message?: string }
}

export async function generateVideo(
  apiKey: string,
  body: Record<string, string>
) {
  const form = new FormData()
  for (const [key, value] of Object.entries(body)) form.set(key, value)
  const response = await relayApi.post<VideoTask>('/v1/videos', form, {
    headers: { Authorization: `Bearer ${apiKey}` },
  })
  return response.data
}

export async function getVideoTask(
  apiKey: string,
  taskId: string,
  signal: AbortSignal
) {
  const response = await relayApi.get<VideoTask>(
    `/v1/videos/${encodeURIComponent(taskId)}`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal,
    }
  )
  return response.data
}

export async function getVideoContent(
  apiKey: string,
  taskId: string,
  signal: AbortSignal
) {
  const response = await relayApi.get<Blob>(
    `/v1/videos/${encodeURIComponent(taskId)}/content`,
    {
      headers: { Authorization: `Bearer ${apiKey}` },
      responseType: 'blob',
      signal,
    }
  )
  return response.data
}
