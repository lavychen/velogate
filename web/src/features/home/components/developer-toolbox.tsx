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
import { Calculator, KeyRound, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { sideDrawerContentClassName } from '@/components/drawer-layout'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { PricingModel } from '@/features/pricing/types'

import { CostEstimator } from './cost-estimator'
import { KeyInspector } from './key-inspector'

export type ToolboxTab = 'calculator' | 'inspector'

export function DeveloperToolbox(props: {
  initialTab: ToolboxTab
  models: PricingModel[]
  initialModel?: string
  baseUrl: string
  exchangeRate?: number
  onClose: () => void
}) {
  const { t } = useTranslation()
  const [modelName, setModelName] = useState(props.initialModel || '')
  const model =
    props.models.find((item) => item.model_name === modelName) ??
    props.models[0]
  return (
    <Sheet
      open
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
    >
      <SheetContent
        className={sideDrawerContentClassName(
          'home-toolbox w-full max-w-md shadow-2xl sm:max-w-md'
        )}
        showCloseButton={false}
      >
        <SheetHeader className='flex-row items-center justify-between border-b px-6 py-4'>
          <SheetTitle className='text-sm font-bold'>
            {t('Developer toolbox')}
          </SheetTitle>
          <SheetDescription className='sr-only'>
            {t('Token inspector and cost estimator')}
          </SheetDescription>
          <SheetClose
            render={
              <Button
                variant='ghost'
                size='icon'
                className='size-7 rounded-lg'
                aria-label={t('Close')}
              />
            }
          >
            <X aria-hidden='true' className='size-4' />
          </SheetClose>
        </SheetHeader>
        <Tabs defaultValue={props.initialTab} className='min-h-0 flex-1 gap-0'>
          <div className='px-6 pt-4 pb-2'>
            <TabsList className='home-toolbox-tabs grid w-full shrink-0 grid-cols-2 rounded-xl border p-1 group-data-horizontal/tabs:h-11'>
              <TabsTrigger
                value='calculator'
                className='h-full rounded-lg py-2 text-xs font-semibold'
              >
                <Calculator aria-hidden='true' className='size-3.5' />
                {t('Cost estimator')}
              </TabsTrigger>
              <TabsTrigger
                value='inspector'
                className='h-full rounded-lg py-2 text-xs font-semibold'
              >
                <KeyRound aria-hidden='true' className='size-3.5' />
                {t('Token inspector')}
              </TabsTrigger>
            </TabsList>
          </div>
          <TabsContent
            value='calculator'
            className='min-h-0 overflow-y-auto p-6'
          >
            {model ? (
              <>
                <div className='mb-6 space-y-2'>
                  <label
                    htmlFor='calculator-model'
                    className='block text-xs font-semibold'
                  >
                    {t('Select model')}
                  </label>
                  <NativeSelect
                    id='calculator-model'
                    className='w-full'
                    value={model.model_name}
                    onChange={(event) => setModelName(event.target.value)}
                  >
                    {props.models.map((item) => (
                      <NativeSelectOption
                        key={item.model_name}
                        value={item.model_name}
                      >
                        {item.model_name}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </div>
                <CostEstimator
                  key={model.model_name}
                  model={model}
                  exchangeRate={props.exchangeRate}
                />
              </>
            ) : (
              <EmptyState title={t('No Models Found')} />
            )}
          </TabsContent>
          <TabsContent
            value='inspector'
            className='min-h-0 overflow-y-auto p-6'
          >
            <KeyInspector baseUrl={props.baseUrl} />
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
