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
import { Play } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  formatLatency,
  formatThroughput,
  formatUptimePct,
} from '@/features/performance-metrics/lib/format'
import type { PerfModelSummary } from '@/features/performance-metrics/types'
import { CodeSamplesSection } from '@/features/pricing/components/model-details-api'
import type { PricingModel } from '@/features/pricing/types'
import { cn } from '@/lib/utils'

export function ProductStage(props: {
  models: PricingModel[]
  selectedModel?: PricingModel
  onSelect: (name: string) => void
  endpointMap: Record<string, { path?: string; method?: string }>
  metrics?: PerfModelSummary
  performanceModels?: PerfModelSummary[]
  mode: string
  onModeChange: (value: string) => void
}) {
  const { t } = useTranslation()
  const [streamLength, setStreamLength] = useState<number | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined)
  const reply = t(
    'One endpoint connects your application to the selected model. Create an API key to send a real request in the playground.'
  )
  const streaming = streamLength !== null && streamLength < reply.length
  useEffect(() => () => clearInterval(timer.current), [])
  const model = props.selectedModel
  return (
    <div id='stage' className='mt-16 scroll-mt-24 lg:mt-20'>
      <Tabs
        value={props.mode}
        onValueChange={(value) => {
          clearInterval(timer.current)
          setStreamLength(null)
          props.onModeChange(value)
        }}
        className='home-stage overflow-hidden rounded-2xl border border-slate-800/90 bg-[#0d1117] text-slate-100 shadow-2xl shadow-slate-900/20 dark:shadow-black/60'
      >
        <div className='flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#111622] px-5 py-3'>
          <div className='flex min-w-0 items-center gap-2'>
            <span
              aria-hidden='true'
              className='size-2.5 shrink-0 rounded-full bg-rose-500/80'
            />
            <span
              aria-hidden='true'
              className='size-2.5 shrink-0 rounded-full bg-amber-400/80'
            />
            <span
              aria-hidden='true'
              className='size-2.5 shrink-0 rounded-full bg-emerald-500/80'
            />
            <span className='ml-2 truncate font-mono text-xs text-slate-400'>
              velogate-router · {model?.model_name || '—'}
            </span>
          </div>
          <TabsList
            className='home-stage-tabs h-auto gap-1 rounded-lg border border-white/10 bg-white/[0.06] p-0.5'
            aria-label={t('Developer workspace')}
          >
            <TabsTrigger
              value='stream'
              className='rounded-md px-3 py-1 text-xs font-medium'
            >
              {t('Live stream routing demo')}
            </TabsTrigger>
            <TabsTrigger
              value='code'
              className='rounded-md px-3 py-1 text-xs font-medium'
            >
              {t('Integration code')}
            </TabsTrigger>
          </TabsList>
        </div>
        <div className='grid grid-cols-1 lg:grid-cols-12'>
          <aside className='flex min-w-0 flex-col justify-between gap-4 border-b border-white/10 bg-[#0b0f17] p-4 sm:p-5 lg:col-span-4 lg:border-r lg:border-b-0'>
            <div className='space-y-1.5'>
              <p className='px-2 pb-2 font-mono text-[11px] tracking-wider text-slate-500 uppercase'>
                {t('Core models · live latency')}
              </p>
              {props.models.slice(0, 5).map((item) => (
                <Button
                  key={item.model_name}
                  variant='ghost'
                  aria-pressed={item.model_name === model?.model_name}
                  title={item.model_name}
                  className={cn(
                    'h-auto w-full justify-between rounded-xl border border-transparent px-3.5 py-2.5 text-left text-slate-300 hover:bg-white/[0.04] hover:text-white',
                    item.model_name === model?.model_name &&
                      'border-[#4f46e5] bg-[#4f46e5]/15 text-white'
                  )}
                  onClick={() => {
                    clearInterval(timer.current)
                    setStreamLength(null)
                    props.onSelect(item.model_name)
                  }}
                >
                  <span className='min-w-0'>
                    <span className='block truncate font-mono text-xs font-semibold'>
                      {item.model_name}
                    </span>
                    <span className='mt-0.5 block text-[11px] text-slate-400'>
                      {item.vendor_name || '—'}
                    </span>
                  </span>
                  <span className='ml-2 shrink-0 font-mono text-[11px] text-emerald-400 tabular-nums'>
                    {formatLatency(
                      props.performanceModels?.find(
                        (metric) => metric.model_name === item.model_name
                      )?.avg_latency_ms ?? 0
                    )}
                  </span>
                </Button>
              ))}
            </div>
            <div className='flex items-center justify-between border-t border-white/10 px-2 pt-3 font-mono text-[11px] text-slate-400'>
              <span>{t('Model access')}</span>
              <span>{t('OpenAI compatible')}</span>
            </div>
          </aside>
          <div className='flex min-w-0 flex-col justify-between lg:col-span-8'>
            {!model && <EmptyState title={t('No Models Found')} />}
            {model && (
              <>
                <TabsContent
                  value='stream'
                  className='m-0 flex min-h-[340px] flex-1 flex-col'
                >
                  <div className='flex-1 space-y-5 p-5 sm:p-6'>
                    <div className='flex flex-wrap items-center justify-between gap-2'>
                      <div className='inline-flex items-center gap-2 font-mono text-xs text-slate-400'>
                        <span className='rounded bg-white/[0.06] px-2 py-0.5 text-slate-200'>
                          POST
                        </span>
                        <span>/v1/chat/completions</span>
                      </div>
                      <Button
                        size='sm'
                        className='home-primary h-auto rounded-lg px-3.5 py-1.5 text-xs font-semibold'
                        disabled={streaming}
                        onClick={() => {
                          clearInterval(timer.current)
                          if (
                            window.matchMedia(
                              '(prefers-reduced-motion: reduce)'
                            ).matches
                          ) {
                            setStreamLength(reply.length)
                            return
                          }
                          setStreamLength(0)
                          let length = 0
                          timer.current = setInterval(() => {
                            length += 3
                            setStreamLength(Math.min(length, reply.length))
                            if (length >= reply.length) {
                              clearInterval(timer.current)
                            }
                          }, 22)
                        }}
                      >
                        <Play
                          aria-hidden='true'
                          className='size-3 fill-current'
                        />
                        {streaming
                          ? t('Streaming...')
                          : t('Trigger stream demo')}
                      </Button>
                    </div>
                    <div className='rounded-xl border border-white/10 bg-white/[0.03] p-4 font-mono text-xs text-slate-300'>
                      <span className='text-slate-500'>User: </span>
                      {t('Check routing for {{model}}', {
                        model: model.model_name,
                      })}
                    </div>
                    <div className='min-h-28 rounded-xl border border-white/10 bg-[#090c12] p-4 font-mono text-xs leading-relaxed whitespace-pre-wrap text-slate-200 sm:p-5 sm:text-[13px]'>
                      <div className='mb-2 text-[11px] text-[#f97316]'>
                        Assistant · {model.model_name}
                      </div>
                      <div aria-live='polite'>
                        {streaming ? reply.slice(0, streamLength ?? 0) : reply}
                      </div>
                      {streaming && (
                        <span
                          aria-hidden='true'
                          className='ml-1 inline-block h-3.5 w-1.5 animate-pulse bg-[#f97316] align-middle'
                        />
                      )}
                    </div>
                  </div>
                  <p className='px-5 pb-3 font-mono text-[10px] text-slate-500 sm:px-6'>
                    {t(
                      'Preview only. No API request is sent and no credits are used.'
                    )}
                  </p>
                </TabsContent>
                <TabsContent
                  value='code'
                  className='m-0 min-h-[340px] flex-1 overflow-hidden p-5 sm:p-6'
                >
                  {model.supported_endpoint_types?.some(
                    (type) => props.endpointMap[type]?.path
                  ) ? (
                    <CodeSamplesSection
                      key={model.model_name}
                      model={model}
                      endpointMap={props.endpointMap}
                      presentation='terminal'
                    />
                  ) : (
                    <EmptyState title={t('No Data')} />
                  )}
                </TabsContent>
              </>
            )}
            <div className='flex flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#090c12] px-5 py-3.5 font-mono text-[11px] tabular-nums sm:px-6'>
              <div className='flex flex-wrap items-center gap-2'>
                <span className='rounded bg-emerald-500/15 px-2 py-0.5 text-emerald-400'>
                  {t('Latency')}{' '}
                  {formatLatency(props.metrics?.avg_latency_ms ?? 0)}
                </span>
                <span className='rounded bg-indigo-500/20 px-2 py-0.5 text-indigo-300'>
                  {formatThroughput(props.metrics?.avg_tps ?? 0)}
                </span>
                <span className='rounded bg-white/[0.06] px-2 py-0.5 text-slate-300'>
                  {t('Success rate')}:{' '}
                  {props.metrics
                    ? formatUptimePct(props.metrics.success_rate)
                    : '—'}
                </span>
              </div>
              <span className='text-slate-400'>{t('Last 24 hours')}</span>
            </div>
          </div>
        </div>
      </Tabs>
    </div>
  )
}
