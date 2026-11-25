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
import { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { PublicLayout } from '@/components/layout'
import { PageTransition } from '@/components/page-transition'

import {
  LoadingSkeleton,
  EmptyState,
  SearchBar,
  PricingTable,
  PricingSidebar,
  PricingToolbar,
  ModelCardGrid,
  ModelDetailsDrawer,
} from './components'
import { EXCLUDED_GROUPS, VIEW_MODES } from './constants'
import { useFilters } from './hooks/use-filters'
import { usePricingData } from './hooks/use-pricing-data'

export function Pricing() {
  const { t } = useTranslation()
  const [selectedModelName, setSelectedModelName] = useState<string | null>(
    null
  )

  const {
    models,
    vendors,
    groupRatio,
    usableGroup,
    endpointMap,
    autoGroups,
    isLoading,
    priceRate,
    usdExchangeRate,
  } = usePricingData()

  const {
    searchInput,
    sortBy,
    vendorFilter,
    groupFilter,
    quotaTypeFilter,
    endpointTypeFilter,
    tagFilter,
    tokenUnit,
    viewMode,
    showRechargePrice,
    setSearchInput,
    setSortBy,
    setVendorFilter,
    setGroupFilter,
    setQuotaTypeFilter,
    setEndpointTypeFilter,
    setTagFilter,
    setTokenUnit,
    setViewMode,
    setShowRechargePrice,
    filteredModels,
    hasActiveFilters,
    activeFilterCount,
    availableTags,
    clearFilters,
    clearSearch,
  } = useFilters(models || [])

  const handleModelClick = useCallback((modelName: string) => {
    setSelectedModelName(modelName)
  }, [])

  const selectedModel = useMemo(
    () =>
      selectedModelName
        ? (models || []).find(
            (model) => model.model_name === selectedModelName
          ) || null
        : null,
    [models, selectedModelName]
  )

  const availableGroups = useMemo(
    () =>
      Object.keys(usableGroup || {}).filter(
        (g) => !EXCLUDED_GROUPS.includes(g)
      ),
    [usableGroup]
  )

  const handleClearAll = useCallback(() => {
    clearFilters()
    clearSearch()
  }, [clearFilters, clearSearch])

  const renderPricingContent = () => {
    if (filteredModels.length === 0) {
      return (
        <EmptyState
          searchQuery={searchInput}
          hasActiveFilters={hasActiveFilters}
          onClearFilters={handleClearAll}
        />
      )
    }

    if (viewMode === VIEW_MODES.CARD) {
      return (
        <ModelCardGrid
          models={filteredModels}
          onModelClick={handleModelClick}
          priceRate={priceRate}
          usdExchangeRate={usdExchangeRate}
          tokenUnit={tokenUnit}
          showRechargePrice={showRechargePrice}
          selectedGroup={groupFilter}
        />
      )
    }

    return (
      <PricingTable
        models={filteredModels}
        priceRate={priceRate}
        usdExchangeRate={usdExchangeRate}
        tokenUnit={tokenUnit}
        showRechargePrice={showRechargePrice}
        selectedGroup={groupFilter}
        onModelClick={handleModelClick}
      />
    )
  }

  if (isLoading) {
    return (
      <div className='model-square'>
        <PublicLayout
          showMainContainer={false}
          headerProps={{ className: 'model-square-nav' }}
        >
          <div className='mx-auto w-full max-w-[1380px] px-4 py-6 sm:px-6'>
            <LoadingSkeleton viewMode={viewMode} />
          </div>
        </PublicLayout>
      </div>
    )
  }

  return (
    <div className='model-square'>
      <PublicLayout
        showMainContainer={false}
        headerProps={{ className: 'model-square-nav' }}
      >
        <PageTransition>
          <header className='model-square-hero relative isolate overflow-hidden border-b'>
            <div
              aria-hidden
              className='model-square-grid pointer-events-none absolute inset-0 -z-10'
            />
            <div className='mx-auto flex w-full max-w-[1380px] flex-col justify-between gap-4 px-4 py-6 sm:px-6 md:flex-row md:items-center'>
              <div className='min-w-0'>
                <div className='flex flex-wrap items-center gap-3'>
                  <h1 className='text-2xl leading-tight font-bold tracking-tight sm:text-[28px]'>
                    {t('Model Marketplace')}
                  </h1>
                  <span
                    className='bg-card inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs'
                    aria-label={t(
                      'This site currently has {{count}} models enabled',
                      { count: models?.length || 0 }
                    )}
                  >
                    <span
                      aria-hidden
                      className='size-1.5 rounded-full bg-emerald-500'
                    />
                    <span className='font-mono font-semibold tabular-nums'>
                      {models?.length || 0}
                    </span>
                    <span className='text-muted-foreground'>{t('models')}</span>
                  </span>
                </div>
                <p className='text-muted-foreground mt-2 max-w-2xl text-xs leading-relaxed sm:text-[13px]'>
                  {t(
                    'Discover curated AI models, compare pricing and capabilities, and choose the right model for every scenario.'
                  )}
                </p>
              </div>
              <SearchBar
                value={searchInput}
                onChange={setSearchInput}
                onClear={clearSearch}
                placeholder={t(
                  'Search model name, provider, endpoint, or tag...'
                )}
                className='w-full shrink-0 md:w-[340px] lg:w-[380px]'
              />
            </div>
          </header>

          <div className='mx-auto w-full max-w-[1380px] px-4 py-6 sm:px-6'>
            <div className='grid items-start gap-6 lg:grid-cols-[256px_minmax(0,1fr)]'>
              <PricingSidebar
                stickyWhenFits
                quotaTypeFilter={quotaTypeFilter}
                endpointTypeFilter={endpointTypeFilter}
                vendorFilter={vendorFilter}
                groupFilter={groupFilter}
                tagFilter={tagFilter}
                onQuotaTypeChange={setQuotaTypeFilter}
                onEndpointTypeChange={setEndpointTypeFilter}
                onVendorChange={setVendorFilter}
                onGroupChange={setGroupFilter}
                onTagChange={setTagFilter}
                vendors={vendors || []}
                groups={availableGroups}
                groupRatios={groupRatio}
                tags={availableTags}
                models={models || []}
                hasActiveFilters={hasActiveFilters}
                onClearFilters={clearFilters}
                className='hidden self-start lg:block'
              />

              <main className='min-w-0 space-y-4'>
                <PricingToolbar
                  filteredCount={filteredModels.length}
                  totalCount={models?.length}
                  sortBy={sortBy}
                  onSortChange={setSortBy}
                  tokenUnit={tokenUnit}
                  onTokenUnitChange={setTokenUnit}
                  showRechargePrice={showRechargePrice}
                  onRechargePriceChange={setShowRechargePrice}
                  viewMode={viewMode}
                  onViewModeChange={setViewMode}
                  quotaTypeFilter={quotaTypeFilter}
                  endpointTypeFilter={endpointTypeFilter}
                  vendorFilter={vendorFilter}
                  groupFilter={groupFilter}
                  tagFilter={tagFilter}
                  onQuotaTypeChange={setQuotaTypeFilter}
                  onEndpointTypeChange={setEndpointTypeFilter}
                  onVendorChange={setVendorFilter}
                  onGroupChange={setGroupFilter}
                  onTagChange={setTagFilter}
                  vendors={vendors || []}
                  groups={availableGroups}
                  groupRatios={groupRatio}
                  tags={availableTags}
                  models={models || []}
                  hasActiveFilters={hasActiveFilters}
                  activeFilterCount={activeFilterCount}
                  onClearFilters={clearFilters}
                />

                {renderPricingContent()}
              </main>
            </div>
          </div>

          {selectedModel && (
            <ModelDetailsDrawer
              open={Boolean(selectedModel)}
              onOpenChange={(open) => {
                if (!open) setSelectedModelName(null)
              }}
              model={selectedModel}
              groupRatio={groupRatio || {}}
              usableGroup={usableGroup || {}}
              endpointMap={
                (endpointMap as Record<
                  string,
                  { path?: string; method?: string }
                >) || {}
              }
              autoGroups={autoGroups || []}
              priceRate={priceRate ?? 1}
              usdExchangeRate={usdExchangeRate ?? 1}
              tokenUnit={tokenUnit}
              showRechargePrice={showRechargePrice}
            />
          )}
        </PageTransition>
      </PublicLayout>
    </div>
  )
}
