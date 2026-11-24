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
import { z } from 'zod'

import type { PricingData } from '@/features/pricing/types'

const keyReportSchema = z.object({
  hard_limit_usd: z.number().finite().nonnegative(),
  access_until: z.number().finite().optional(),
})
const usageSchema = z.object({ total_usage: z.number().finite().nonnegative() })
const statusSchema = z.object({
  success: z.literal(true),
  data: z.record(z.string(), z.unknown()),
})
const pricingSchema = z.object({
  success: z.literal(true),
  data: z.array(
    z
      .object({
        model_name: z.string(),
        quota_type: z.number(),
        model_ratio: z.number().optional(),
        completion_ratio: z.number().optional(),
        enable_groups: z.array(z.string()).default([]),
      })
      .passthrough()
  ),
  vendors: z
    .array(z.object({ id: z.number(), name: z.string() }).passthrough())
    .default([]),
  group_ratio: z.record(z.string(), z.number()).default({}),
  usable_group: z
    .record(
      z.string(),
      z.object({ desc: z.string().default(''), ratio: z.number() })
    )
    .default({}),
  supported_endpoint: z.record(z.string(), z.unknown()).default({}),
  auto_groups: z.array(z.string()).default([]),
})

export function normalizeGatewayUrl(value: string): string {
  const url = new URL(value.trim())
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new Error(
      'Enter an HTTPS gateway URL without credentials, query parameters, or fragments.'
    )
  }
  return url.href.replace(/\/+$/, '').replace(/\/v1$/, '')
}

export type KeyInspection = {
  total: number
  used: number
  remaining: number
  latency: number
  unit: string
  simulated: boolean
}

// OWASP ASVS 5.0.0: 12.2.1, 14.2.1, 14.2.3, 14.3.1–3.
// Credential requests deliberately bypass the session-aware API interceptor,
// query/mutation caches, persistent storage, redirects, cookies, and retries.
export async function inspectGatewayKey(
  baseUrl: string,
  apiKey: string,
  signal: AbortSignal
): Promise<KeyInspection> {
  const target = normalizeGatewayUrl(baseUrl)
  const key = apiKey.trim()
  if (!key || /\s/.test(key)) throw new Error('Enter a valid API key.')
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), 8_000)
  const combinedSignal = AbortSignal.any([signal, controller.signal])
  const started = performance.now()
  const options: RequestInit = {
    method: 'GET',
    credentials: 'omit',
    redirect: 'error',
    cache: 'no-store',
    referrerPolicy: 'no-referrer',
    signal: combinedSignal,
  }
  try {
    const [subscriptionResponse, usageResponse, statusResponse] =
      await Promise.all([
        fetch(`${target}/v1/dashboard/billing/subscription`, {
          ...options,
          headers: { Authorization: `Bearer ${key}` },
        }),
        fetch(`${target}/v1/dashboard/billing/usage`, {
          ...options,
          headers: { Authorization: `Bearer ${key}` },
        }),
        fetch(`${target}/api/status`, options).catch(() => null),
      ])
    if (!subscriptionResponse.ok || !usageResponse.ok) {
      throw new Error(
        'Key check failed. Check the key, gateway address, and CORS settings.'
      )
    }
    const subscription = keyReportSchema.safeParse(
      await subscriptionResponse.json()
    )
    const usage = usageSchema.safeParse(await usageResponse.json())
    if (!subscription.success || !usage.success) {
      throw new Error('The gateway returned an invalid billing response.')
    }
    if (
      subscription.data.access_until &&
      subscription.data.access_until <= Date.now() / 1000
    ) {
      throw new Error('The API key has expired.')
    }
    let unit = 'Gateway units'
    if (statusResponse?.ok) {
      const status = statusSchema.safeParse(
        await statusResponse.json().catch(() => null)
      )
      if (
        status.success &&
        typeof status.data.data.quota_display_type === 'string'
      ) {
        unit = status.data.data.quota_display_type
      }
    }
    const used = usage.data.total_usage / 100
    return {
      total: subscription.data.hard_limit_usd,
      used,
      remaining: Math.max(0, subscription.data.hard_limit_usd - used),
      latency: Math.round(performance.now() - started),
      unit,
      simulated: false,
    }
  } finally {
    clearTimeout(timeout)
    controller.abort()
  }
}

export type GatewaySnapshot = {
  baseUrl: string
  status: Record<string, unknown>
  pricing: PricingData
}

export async function connectGateway(
  baseUrl: string,
  signal: AbortSignal
): Promise<GatewaySnapshot> {
  const target = normalizeGatewayUrl(baseUrl)
  const options: RequestInit = {
    credentials: 'omit',
    redirect: 'error',
    referrerPolicy: 'no-referrer',
    signal: AbortSignal.any([signal, AbortSignal.timeout(8_000)]),
  }
  const [statusResponse, pricingResponse] = await Promise.all([
    fetch(`${target}/api/status`, options),
    fetch(`${target}/api/pricing`, options),
  ])
  if (!statusResponse.ok || !pricingResponse.ok) {
    throw new Error(
      'Connection failed. Check the gateway address and CORS settings.'
    )
  }
  const status = statusSchema.safeParse(await statusResponse.json())
  const pricing = pricingSchema.safeParse(await pricingResponse.json())
  if (!status.success || !pricing.success) {
    throw new Error('The gateway returned an invalid response.')
  }
  return {
    baseUrl: target,
    status: status.data.data,
    pricing: pricing.data as unknown as PricingData,
  }
}
