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
import { useState } from 'react'

import { LoadingState } from '@/components/loading-state'
import { useSystemConfig } from '@/hooks/use-system-config'

import { useHomeCatalog } from '../hooks/use-home-catalog'
import { ContactDialog } from './contact-dialog'
import { DeveloperToolbox, type ToolboxTab } from './developer-toolbox'
import { HeroBackdrop } from './hero-backdrop'
import { HomeFooter } from './home-footer'
import { HomeHeader } from './home-header'
import { ModelCatalog } from './model-catalog'
import { ProductStage } from './product-stage'
import { CTA } from './sections/cta'
import { Features } from './sections/features'
import { Hero } from './sections/hero'
import { HowItWorks } from './sections/how-it-works'
import { Stats } from './sections/stats'

export function DefaultHome(props: { isAuthenticated: boolean }) {
  const catalog = useHomeCatalog(props.isAuthenticated)
  const config = useSystemConfig()
  const [selectedName, setSelectedName] = useState('')
  const [stageMode, setStageMode] = useState('stream')
  const [toolbox, setToolbox] = useState<{
    tab: ToolboxTab
    model?: string
  } | null>(null)
  const [contactOpen, setContactOpen] = useState(false)
  const selectedModel =
    catalog.models.find((model) => model.model_name === selectedName) ??
    catalog.models[0]
  const stageModels = catalog.models.slice(0, 5)
  if (selectedModel && !stageModels.includes(selectedModel)) {
    stageModels[4] = selectedModel
  }
  const name =
    typeof catalog.status?.system_name === 'string'
      ? catalog.status.system_name
      : config.systemName
  const version =
    typeof catalog.status?.version === 'string'
      ? catalog.status.version
      : 'New API'
  const exchangeRate =
    typeof catalog.status?.usd_exchange_rate === 'number'
      ? catalog.status.usd_exchange_rate
      : undefined
  return (
    <div className='home-portal min-h-screen font-sans antialiased'>
      <HomeHeader
        name={name}
        onToolbox={() => setToolbox({ tab: 'inspector' })}
      />
      <main id='top'>
        <section
          className='home-hero relative overflow-hidden border-b'
          onPointerMove={(event) => {
            const rect = event.currentTarget.getBoundingClientRect()
            event.currentTarget.style.setProperty(
              '--home-pointer-x',
              `${event.clientX - rect.left}px`
            )
            event.currentTarget.style.setProperty(
              '--home-pointer-y',
              `${event.clientY - rect.top}px`
            )
            event.currentTarget.dataset.pointer = 'true'
          }}
          onPointerLeave={(event) => {
            event.currentTarget.dataset.pointer = 'false'
          }}
        >
          <HeroBackdrop />
          <div className='relative z-10 mx-auto max-w-[1240px] px-6 pt-20 pb-20 lg:pt-28 lg:pb-24'>
            <Hero
              isAuthenticated={props.isAuthenticated}
              baseUrl={catalog.baseUrl}
              version={version}
            />
            {catalog.canViewPricing &&
              (catalog.isLoading ? (
                <LoadingState />
              ) : (
                <ProductStage
                  key={selectedModel?.model_name}
                  models={stageModels}
                  selectedModel={selectedModel}
                  onSelect={setSelectedName}
                  endpointMap={
                    catalog.endpointMap as Record<
                      string,
                      { path?: string; method?: string }
                    >
                  }
                  mode={stageMode}
                  onModeChange={setStageMode}
                  metrics={catalog.performance?.models.find(
                    (item) => item.model_name === selectedModel?.model_name
                  )}
                  performanceModels={catalog.performance?.models}
                />
              ))}
          </div>
        </section>
        <Stats
          modelCount={
            catalog.canViewPricing && !catalog.isLoading && !catalog.error
              ? catalog.models.length
              : undefined
          }
          vendorCount={
            catalog.canViewPricing && !catalog.isLoading && !catalog.error
              ? catalog.vendors.length
              : undefined
          }
          performance={
            catalog.canViewPricing ? catalog.performance?.summary : undefined
          }
        />
        <Features />
        <ModelCatalog
          catalog={catalog}
          onCalculate={(model) =>
            setToolbox({ tab: 'calculator', model: model.model_name })
          }
          onIntegrate={(modelName) => {
            setSelectedName(modelName)
            setStageMode('code')
            document.querySelector('#stage')?.scrollIntoView({
              behavior: window.matchMedia('(prefers-reduced-motion: reduce)')
                .matches
                ? 'instant'
                : 'smooth',
              block: 'start',
            })
          }}
        />
        <HowItWorks />
        <CTA />
      </main>
      <HomeFooter
        name={name}
        connected={catalog.connected}
        icp={typeof catalog.status?.icp === 'string' ? catalog.status.icp : ''}
        onToolbox={(tab) => setToolbox({ tab })}
        onContact={() => setContactOpen(true)}
      />
      {toolbox && (
        <DeveloperToolbox
          initialTab={toolbox.tab}
          initialModel={toolbox.model}
          models={catalog.canViewPricing ? catalog.models : []}
          baseUrl={catalog.baseUrl}
          exchangeRate={exchangeRate}
          onClose={() => setToolbox(null)}
        />
      )}
      {contactOpen && <ContactDialog onClose={() => setContactOpen(false)} />}
    </div>
  )
}
