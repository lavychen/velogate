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
import { Link } from '@tanstack/react-router'
import { ArrowRight, Code2, Tag } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { StaticDataTable } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ModelPriceCell } from '@/features/pricing/components/model-price-cell'
import { SearchBar } from '@/features/pricing/components/search-bar'
import { filterBySearch } from '@/features/pricing/lib/filters'
import { getDisplayGroupRatio } from '@/features/pricing/lib/model-helpers'
import type { PricingModel } from '@/features/pricing/types'
import { toIntlLocale } from '@/i18n/languages'
import { formatNumber } from '@/lib/format'

import type { useHomeCatalog } from '../hooks/use-home-catalog'

export function ModelCatalog(props: {
  catalog: ReturnType<typeof useHomeCatalog>
  onIntegrate: (name: string) => void
  onCalculate: (model: PricingModel) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const [search, setSearch] = useState('')
  const [group, setGroup] = useState('all')
  const catalog = props.catalog
  const filtered = filterBySearch(catalog.models, search.trim()).filter(
    (model) => group === 'all' || model.enable_groups.includes(group)
  )
  const groups = Object.keys(catalog.usableGroup).filter(
    (name) => name !== 'auto'
  )

  let content = (
    <EmptyState
      title={t('No Models Found')}
      description={t('No models match your current filters.')}
    />
  )
  if (!catalog.canViewPricing) {
    content = (
      <EmptyState
        title={t('Sign in required')}
        action={
          <Button render={<Link to='/sign-in' search={{ redirect: '/' }} />}>
            {t('Sign in')}
          </Button>
        }
      />
    )
  } else if (catalog.isLoading) {
    content = <LoadingState />
  } else if (catalog.error) {
    content = (
      <ErrorState
        onRetry={() => {
          void catalog.refetch()
        }}
      />
    )
  } else if (filtered.length > 0) {
    content = (
      <StaticDataTable<PricingModel>
        className='home-surface rounded-2xl border'
        tableClassName='min-w-[780px]'
        tableProps={{ 'aria-label': t('Model pricing') }}
        headerRowClassName='bg-muted/35'
        getRowKey={(model) => model.model_name}
        getRowClassName={() => 'hover:bg-muted/25'}
        data={filtered.slice(0, 8)}
        columns={[
          {
            id: 'model',
            header: t('Model'),
            className: 'px-6 py-4',
            cellClassName: 'px-6 py-4',
            cell: (model) => (
              <div className='flex max-w-72 items-center gap-2'>
                <div className='min-w-0'>
                  <p
                    className='truncate font-mono text-xs font-semibold'
                    title={model.model_name}
                  >
                    {model.model_name}
                  </p>
                  <p className='text-muted-foreground mt-1 text-xs'>
                    {model.vendor_name || '—'}
                  </p>
                </div>
                <CopyButton value={model.model_name} className='size-7' />
              </div>
            ),
          },
          {
            id: 'discount',
            header: t('Discount Rate'),
            cell: (model) => {
              const ratio = getDisplayGroupRatio(model)
              if (ratio < 0 || ratio >= 1) {
                return <span className='text-muted-foreground'>—</span>
              }
              const percent = formatNumber((1 - ratio) * 100, locale)
              return (
                <Badge variant='secondary' className='text-primary gap-1.5'>
                  <Tag aria-hidden='true' className='size-3' />
                  {t('{{percent}}% OFF', { percent })}
                </Badge>
              )
            },
          },
          {
            id: 'price',
            header: t('Model pricing'),
            className: 'min-w-64',
            cell: (model) => (
              <ModelPriceCell
                model={model}
                options={{
                  tokenUnit: 'M',
                  selectedGroup: group,
                  priceRate: catalog.priceRate,
                  usdExchangeRate: catalog.usdExchangeRate,
                }}
                showExpression={false}
              />
            ),
          },
          {
            id: 'actions',
            header: t('Actions'),
            className: 'px-6 text-right',
            cellClassName: 'px-6 text-right',
            cell: (model) => (
              <div className='flex justify-end gap-2'>
                <Button
                  variant='outline'
                  size='sm'
                  onClick={() => props.onCalculate(model)}
                >
                  {t('Estimate')}
                </Button>
                <Button
                  size='sm'
                  variant='secondary'
                  className='bg-indigo-500/10 text-indigo-600 hover:bg-indigo-500/20 dark:text-indigo-300'
                  onClick={() => props.onIntegrate(model.model_name)}
                >
                  <Code2 aria-hidden='true' className='size-3.5' />
                  {t('Integrate')}
                </Button>
              </div>
            ),
          },
        ]}
      />
    )
  }
  if (!catalog.pricingEnabled) return null
  return (
    <section id='models' className='scroll-mt-20 px-6 py-20 lg:py-24'>
      <div className='mx-auto max-w-[1240px]'>
        <div className='mb-8 flex flex-wrap items-end justify-between gap-5'>
          <div>
            <p className='mb-3 font-mono text-xs font-semibold tracking-[0.16em] text-indigo-600 uppercase dark:text-indigo-400'>
              {t('Model Marketplace')}
            </p>
            <h2 className='text-3xl font-bold tracking-tight sm:text-4xl'>
              {t('Transparent model pricing')}
            </h2>
          </div>
          <Button variant='outline' render={<Link to='/pricing' />}>
            {t('View all models')}
            <ArrowRight aria-hidden='true' className='size-4' />
          </Button>
        </div>
        {catalog.canViewPricing && (
          <div className='mb-5 flex flex-wrap items-center gap-3'>
            <NativeSelect
              value={group}
              onChange={(event) => setGroup(event.target.value)}
              aria-label={t('Group')}
            >
              <NativeSelectOption value='all'>
                {t('All Groups')}
              </NativeSelectOption>
              {groups.map((name) => (
                <NativeSelectOption key={name} value={name}>
                  {name} · {formatNumber(catalog.groupRatio[name] ?? 1, locale)}
                  ×
                </NativeSelectOption>
              ))}
            </NativeSelect>
            <SearchBar
              value={search}
              onChange={setSearch}
              onClear={() => setSearch('')}
              className='w-full sm:ml-auto sm:w-72'
            />
          </div>
        )}
        {content}
        {catalog.canViewPricing && filtered.length > 8 && (
          <p className='text-muted-foreground mt-4 text-center text-xs'>
            {t('Showing {{shown}} of {{total}} models', {
              shown: formatNumber(8, locale),
              total: formatNumber(filtered.length, locale),
            })}
          </p>
        )}
      </div>
    </section>
  )
}
