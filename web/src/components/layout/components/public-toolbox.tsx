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
import { DeveloperToolbox } from '@/features/home/components/developer-toolbox'
import { usePricingData } from '@/features/pricing/hooks/use-pricing-data'
import { useStatus } from '@/hooks/use-status'
import { getModuleAccessFromStatus } from '@/lib/nav-modules'
import { useAuthStore } from '@/stores/auth-store'

export default function PublicToolbox(props: { onClose: () => void }) {
  const { status, loading } = useStatus()
  const isAuthenticated = useAuthStore((state) => !!state.auth.user)
  const access = getModuleAccessFromStatus(status, 'pricing')
  const canViewPricing =
    !loading &&
    !!status &&
    access.enabled &&
    (!access.requireAuth || isAuthenticated)
  const pricing = usePricingData(canViewPricing)
  const configuredUrl = status?.server_address || status?.serverAddress
  const baseUrl =
    typeof configuredUrl === 'string' && configuredUrl.trim()
      ? configuredUrl.trim().replace(/\/+$/, '').replace(/\/v1$/, '')
      : window.location.origin

  return (
    <DeveloperToolbox
      initialTab='inspector'
      models={canViewPricing ? pricing.models : []}
      baseUrl={baseUrl}
      exchangeRate={
        typeof status?.usd_exchange_rate === 'number'
          ? status.usd_exchange_rate
          : undefined
      }
      onClose={props.onClose}
    />
  )
}
