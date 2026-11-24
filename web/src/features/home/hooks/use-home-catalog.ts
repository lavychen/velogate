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
import { useQuery } from '@tanstack/react-query'
import { useMemo } from 'react'

import { getPerfMetricsSummary } from '@/features/performance-metrics/api'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { useStatus } from '@/hooks/use-status'
import { getModuleAccessFromStatus } from '@/lib/nav-modules'
import { requireServerSuccess } from '@/lib/server-error-message'

import type { GatewaySnapshot } from '../lib/gateway-tools'

export function useHomeCatalog(
  isAuthenticated: boolean,
  remote?: GatewaySnapshot | null
) {
  const { status, loading } = useStatus()
  const access = getModuleAccessFromStatus(status, 'pricing')
  const canViewPricing =
    !loading &&
    !!status &&
    access.enabled &&
    (!access.requireAuth || isAuthenticated)
  const pricing = usePricingData(canViewPricing && !remote)
  const performance = useQuery({
    queryKey: ['home-performance-summary'],
    queryFn: async () => requireServerSuccess(await getPerfMetricsSummary(24)),
    enabled: canViewPricing && !remote,
    staleTime: 60_000,
    retry: false,
    meta: { errorToast: false },
  })
  const configuredUrl = status?.server_address || status?.serverAddress
  const baseUrl =
    typeof configuredUrl === 'string' && configuredUrl.trim()
      ? configuredUrl.trim().replace(/\/+$/, '').replace(/\/v1$/, '')
      : window.location.origin
  const remoteModels = useMemo(() => {
    if (!remote) return undefined
    const vendors = new Map(
      remote.pricing.vendors.map((vendor) => [vendor.id, vendor])
    )
    return remote.pricing.data.map((model) => ({
      ...model,
      vendor_name: vendors.get(model.vendor_id ?? 0)?.name,
      group_ratio: remote.pricing.group_ratio,
    }))
  }, [remote])
  const models = remoteModels ?? pricing.models
  const allVendors = remote?.pricing.vendors ?? pricing.vendors
  const vendors = useMemo(() => {
    const activeVendorIds = new Set(models.map((model) => model.vendor_id))
    return allVendors.filter((vendor) => activeVendorIds.has(vendor.id))
  }, [models, allVendors])
  return {
    ...pricing,
    ...(remote && {
      models: remoteModels ?? [],
      vendors: remote.pricing.vendors,
      groupRatio: remote.pricing.group_ratio,
      usableGroup: remote.pricing.usable_group,
      endpointMap: remote.pricing.supported_endpoint,
      autoGroups: remote.pricing.auto_groups,
      isLoading: false,
      error: null,
    }),
    vendors,
    canViewPricing: remote ? true : canViewPricing,
    pricingEnabled: remote ? true : access.enabled,
    baseUrl: remote?.baseUrl ?? baseUrl,
    status: remote?.status ?? status,
    connected: remote ? true : !!status && !loading,
    performance: remote ? undefined : performance.data?.data,
  }
}
