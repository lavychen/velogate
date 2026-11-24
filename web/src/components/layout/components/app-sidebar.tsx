import { AnimatePresence, motion, useReducedMotion } from 'motion/react'
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

import { AccountSummary } from '@/components/account-summary'
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from '@/components/ui/sidebar'
import { useLayout } from '@/context/layout-provider'
import { useSidebarView } from '@/hooks/use-sidebar-view'
import { MOTION_TRANSITION, MOTION_VARIANTS } from '@/lib/motion'

import { NavGroup } from './nav-group'
import { SystemBrand } from './system-brand'

/** Persistent, flat console navigation on every page. */
export function AppSidebar() {
  const { t } = useTranslation()
  const { collapsible, variant } = useLayout()
  const { key, navGroups } = useSidebarView()
  const shouldReduce = useReducedMotion()

  return (
    <Sidebar collapsible={collapsible} variant={variant}>
      <SidebarHeader className='h-15 justify-center border-b px-3 group-data-[collapsible=icon]:px-1'>
        <SystemBrand />
      </SidebarHeader>

      <SidebarContent className='px-1 py-4 [&>div]:gap-5'>
        <AnimatePresence mode='wait' initial={false}>
          <motion.nav
            aria-label={t('Main navigation')}
            key={key}
            initial={
              shouldReduce ? false : MOTION_VARIANTS.sidebarSlide.initial
            }
            animate={MOTION_VARIANTS.sidebarSlide.animate}
            exit={shouldReduce ? undefined : MOTION_VARIANTS.sidebarSlide.exit}
            transition={MOTION_TRANSITION.fast}
            className='flex flex-col'
          >
            {navGroups.map((props) => (
              <NavGroup key={props.id || props.title} {...props} />
            ))}
          </motion.nav>
        </AnimatePresence>
      </SidebarContent>

      <SidebarFooter className='border-t p-2 group-data-[collapsible=icon]:p-1'>
        <AccountSummary />
      </SidebarFooter>

      <SidebarRail />
    </Sidebar>
  )
}
