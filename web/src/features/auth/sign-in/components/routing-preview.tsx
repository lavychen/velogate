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
import { Terminal, ChevronRight } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { useMediaQuery } from '@/hooks/use-media-query'
import { cn } from '@/lib/utils'

import { RoutingBeams } from './routing-beams'

const providers = [
  {
    model: 'gpt5.6-sol',
    location: 'OpenAI · us-east',
    latency: 180,
    color: 'text-emerald-400',
  },
  {
    model: 'Claude Fable 5',
    location: 'Anthropic · sg-edge',
    latency: 240,
    color: 'text-orange-400',
  },
  {
    model: 'Gemini 3.8 Flash',
    location: 'Google · jp-tokyo',
    latency: 210,
    color: 'text-blue-400',
  },
  {
    model: 'DeepSeek-V4',
    location: 'DeepSeek · cn-hk',
    latency: 170,
    color: 'text-sky-400',
  },
]
const logSamples = [
  { route: 'claude-fable-5', speed: '186 tok/s', latency: '210ms' },
  { route: 'gpt5.6-sol', speed: '214 tok/s', latency: '180ms' },
  { route: 'deepseek-v4', speed: '162 tok/s', latency: '160ms' },
  { route: 'gemini-3.8-flash', speed: '238 tok/s', latency: '220ms' },
]

export function RoutingPreview(props: { logo: string; name: string }) {
  const { t } = useTranslation()
  const previewId = useId()
  const animate = useMediaQuery(
    '(min-width: 1024px) and (prefers-reduced-motion: no-preference)'
  )
  const [sample, setSample] = useState({
    index: 0,
    throughput: '184.2',
    latencies: providers.map((provider) => provider.latency),
  })
  useEffect(() => {
    if (!animate) return
    const timer = window.setInterval(() => {
      const throughput = (182 + Math.random() * 8.5).toFixed(1)
      const latencies = providers.map(
        () => 150 + Math.floor(Math.random() * 151)
      )
      setSample((current) => ({
        index: (current.index + 1) % logSamples.length,
        throughput,
        latencies,
      }))
    }, 2600)
    return () => window.clearInterval(timer)
  }, [animate])
  const log = logSamples[sample.index]

  return (
    <section
      className='sign-in-topology overflow-hidden rounded-2xl'
      aria-label={t('AI routing preview')}
      aria-describedby={previewId}
    >
      <span id={previewId} className='sr-only'>
        {t('Illustrative preview')}
      </span>
      <header className='flex flex-wrap items-center justify-between gap-2 border-b border-white/7 bg-white/1.5 px-5 py-3.5'>
        <div className='flex items-center gap-2.5 text-xs font-medium tracking-wide text-slate-200'>
          <span
            className='size-2 rounded-full bg-indigo-400 shadow-[0_0_8px_#818cf8d9]'
            aria-hidden='true'
          />
          {t('Live Neural Routing Topology')}
        </div>
        <div className='flex items-center gap-3 font-mono text-[11px] text-slate-400'>
          <span>
            {t('Throughput')}:{' '}
            <strong className='font-medium text-slate-200 tabular-nums'>
              {sample.throughput}k
            </strong>{' '}
            tok/s
          </span>
          <span className='hidden text-white/15 xl:inline' aria-hidden='true'>
            |
          </span>
          <span className='hidden text-emerald-400 xl:inline'>
            99.9% {t('Uptime')}
          </span>
        </div>
      </header>

      <div className='px-5 py-6'>
        <div className='sign-in-topology-row'>
          <div className='sign-in-app-column'>
            <div className='sign-in-node w-full rounded-xl p-3.5'>
              <div className='mb-2.5 flex items-center justify-between gap-2'>
                <div className='flex min-w-0 items-center gap-2'>
                  <div className='flex size-6 shrink-0 items-center justify-center rounded-lg border border-indigo-400/25 bg-indigo-500/15 text-indigo-300'>
                    <Terminal className='size-3.5' aria-hidden='true' />
                  </div>
                  <span className='text-xs font-semibold'>{t('Your app')}</span>
                </div>
                <span
                  className='sign-in-status-dot bg-indigo-400'
                  aria-hidden='true'
                >
                  <span className='sign-in-ping bg-indigo-400' />
                </span>
              </div>
              <div className='rounded-lg border border-white/6 bg-[#050811]/80 px-2.5 py-2'>
                <div className='flex items-center justify-between'>
                  <span className='font-mono text-[10px] font-semibold text-emerald-400'>
                    POST
                  </span>
                  <CopyButton
                    value='/v1/chat/completions'
                    className='size-4 text-slate-400 hover:bg-white/10 hover:text-white'
                    iconClassName='size-3'
                  />
                </div>
                <div
                  className='mt-1 truncate font-mono text-[10px] text-slate-300 xl:text-[11px]'
                  title='/v1/chat/completions'
                >
                  /v1/chat/completions
                </div>
              </div>
              <div className='mt-2.5 flex items-center justify-between gap-1 font-mono text-[10px] text-slate-500'>
                <span>OpenAI SDK</span>
                <span className='text-indigo-300/80'>TLS 1.3</span>
              </div>
            </div>
          </div>

          <div className='sign-in-connector-in'>
            <RoutingBeams />
          </div>

          <div className='sign-in-router-column'>
            <div className='sign-in-hub relative max-w-full overflow-hidden rounded-2xl p-[1.5px]'>
              <div
                className='sign-in-hub-ring absolute -inset-[60%]'
                aria-hidden='true'
              />
              <div className='relative flex flex-col items-center rounded-[15px] bg-[#0b1122] px-3 py-4 text-center'>
                <img
                  src={props.logo}
                  alt=''
                  className='mb-2 size-9 object-contain'
                />
                <span
                  className='w-full truncate text-xs leading-tight font-semibold tracking-tight'
                  title={props.name}
                >
                  {props.name}
                </span>
                <span className='mt-0.5 font-mono text-[10px] text-slate-400'>
                  {t('Smart router')}
                </span>
                <span className='mt-2.5 inline-flex max-w-full items-center gap-1 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2 py-0.5 font-mono text-[9.5px] text-emerald-300'>
                  <span
                    className='size-1.5 shrink-0 rounded-full bg-emerald-400'
                    aria-hidden='true'
                  />
                  {t('Auto-failover')}
                </span>
              </div>
            </div>
          </div>

          <div className='sign-in-connector-out'>
            <RoutingBeams outbound />
          </div>

          <div className='sign-in-providers'>
            {providers.map((provider, index) => (
              <div
                key={provider.model}
                className='sign-in-node sign-in-provider flex min-w-0 items-center justify-between gap-2 rounded-xl px-3.5'
              >
                <div className='flex min-w-0 items-center gap-2.5'>
                  <span
                    className={cn('sign-in-provider-mark', provider.color)}
                    aria-hidden='true'
                  >
                    <span />
                  </span>
                  <div className='min-w-0'>
                    <div
                      className='truncate text-xs font-semibold'
                      title={provider.model}
                    >
                      {provider.model}
                    </div>
                    <div className='truncate font-mono text-[10px] text-slate-400'>
                      {provider.location}
                    </div>
                  </div>
                </div>
                <div className='flex shrink-0 items-center gap-2'>
                  <span className='sign-in-latency rounded border border-emerald-500/20 bg-emerald-500/10 px-1.5 py-0.5 font-mono text-[11px] text-emerald-300 tabular-nums'>
                    {sample.latencies[index]}ms
                  </span>
                  <span
                    className='sign-in-provider-status size-1.5 rounded-full bg-emerald-400'
                    aria-hidden='true'
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <footer className='flex items-center justify-between gap-3 border-t border-white/7 bg-[#04070f]/90 px-5 py-3 font-mono text-[11px]'>
        <div className='flex min-w-0 items-center gap-2.5'>
          <ChevronRight
            className='size-3 shrink-0 text-indigo-400'
            aria-hidden='true'
          />
          <span
            key={sample.index}
            className='sign-in-log truncate text-slate-300'
          >
            <span className='text-emerald-400'>[200 OK]</span> route:{' '}
            {log.route} → {log.speed} · {log.latency}
          </span>
        </div>
        <span className='hidden shrink-0 text-[10px] text-slate-500 xl:inline'>
          {t('Live stream')}
        </span>
      </footer>
    </section>
  )
}
