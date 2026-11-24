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
import { SystemBrandMark } from '@/components/layout/components/system-brand-mark'
import { DEFAULT_SYSTEM_NAME } from '@/lib/constants'
import { useSystemConfigStore } from '@/stores/system-config-store'

export function HomeBrand(props: { name: string; footer?: boolean }) {
  const logo = useSystemConfigStore((state) => state.config.logo)
  const name = props.name === DEFAULT_SYSTEM_NAME ? 'VeloGate' : props.name

  return (
    <SystemBrandMark
      logo={logo}
      name={name}
      compact={props.footer}
      showBadge={!props.footer}
    />
  )
}
