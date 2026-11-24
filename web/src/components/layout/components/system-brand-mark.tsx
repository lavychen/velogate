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
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

type SystemBrandMarkProps = {
  logo: string
  name: string
  compact?: boolean
  showBadge?: boolean
}

export function SystemBrandMark(props: SystemBrandMarkProps) {
  const { t } = useTranslation()

  return (
    <span className='inline-flex min-w-0 items-center gap-2'>
      <img
        src={props.logo}
        alt={t('Logo')}
        className={cn(
          'shrink-0 rounded-lg object-contain',
          props.compact ? 'size-7' : 'size-8'
        )}
      />
      <span className='flex min-w-0 flex-1 items-center gap-2 group-data-[collapsible=icon]:hidden'>
        <span
          className={cn(
            'text-foreground truncate font-bold',
            props.compact ? 'text-sm' : 'text-base'
          )}
          title={props.name}
        >
          {props.name}
        </span>
        {props.showBadge !== false && (
          <Badge
            variant='secondary'
            className='text-muted-foreground rounded-md px-1.5 text-[10px] font-normal'
          >
            MaaS
          </Badge>
        )}
      </span>
    </span>
  )
}
