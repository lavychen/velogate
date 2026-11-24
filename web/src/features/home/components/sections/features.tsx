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
import { Building2, Code2, Network, ArrowRight, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'

export function Features() {
  const { t } = useTranslation()
  return (
    <section
      id='architecture'
      className='bg-background scroll-mt-20 border-b px-6 py-20 lg:py-24'
    >
      <div className='mx-auto max-w-[1240px]'>
        <p className='mb-3 font-mono text-xs font-semibold tracking-[0.16em] text-indigo-600 uppercase dark:text-indigo-400'>
          {t('Architecture')}
        </p>
        <h2 className='mb-10 text-3xl font-bold tracking-tight sm:text-4xl'>
          {t('Built for production AI applications')}
        </h2>
        <div className='grid gap-6 lg:grid-cols-2'>
          <article className='home-surface grid items-center gap-8 rounded-2xl border p-7 sm:p-10 lg:col-span-2 lg:grid-cols-2'>
            <div>
              <Network
                aria-hidden='true'
                className='mb-5 size-10 rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400'
              />
              <h3 className='text-2xl font-bold tracking-tight'>
                {t('Multi-channel routing and failover')}
              </h3>
              <p className='text-muted-foreground mt-3 text-sm leading-relaxed'>
                {t(
                  'Support for high concurrency with automatic load balancing'
                )}
              </p>
            </div>
            <div className='bg-muted/30 rounded-xl border p-5'>
              <div className='mb-5 flex items-center justify-between gap-3 text-xs'>
                <span className='font-mono'>API REQUEST</span>
                <ArrowRight
                  aria-hidden='true'
                  className='size-4 text-indigo-500'
                />
                <span className='rounded-lg bg-indigo-500/10 px-3 py-2 font-semibold text-indigo-600 dark:text-indigo-400'>
                  {t('Load Balancing')}
                </span>
              </div>
              <div className='grid grid-cols-2 gap-3'>
                {['OpenAI', 'Anthropic', 'Google', 'DeepSeek'].map((name) => (
                  <div
                    key={name}
                    className='bg-background rounded-lg border px-3 py-3 text-xs font-medium'
                  >
                    {name}
                  </div>
                ))}
              </div>
              <p className='text-muted-foreground mt-4 text-xs'>
                {t('Routing illustration')}
              </p>
            </div>
          </article>
          <article className='home-surface rounded-2xl border p-7 sm:p-8'>
            <Building2
              aria-hidden='true'
              className='mb-5 size-10 rounded-xl bg-orange-500/10 p-2 text-orange-600 dark:text-orange-400'
            />
            <h3 className='text-xl font-bold'>
              {t('Enterprise workspaces and budgets')}
            </h3>
            <p className='text-muted-foreground mt-3 text-sm leading-relaxed'>
              {t('Multi-user management with flexible permission allocation')}
            </p>
            <div className='bg-muted/25 mt-6 space-y-3 rounded-xl border p-4'>
              {[t('Departments'), t('Budgets'), t('API Keys')].map((label) => (
                <div
                  key={label}
                  className='flex items-center justify-between text-xs'
                >
                  <span>{label}</span>
                  <Check
                    aria-hidden='true'
                    className='size-4 text-orange-500'
                  />
                </div>
              ))}
            </div>
          </article>
          <article className='home-surface rounded-2xl border p-7 sm:p-8'>
            <Code2
              aria-hidden='true'
              className='mb-5 size-10 rounded-xl bg-indigo-500/10 p-2 text-indigo-600 dark:text-indigo-400'
            />
            <h3 className='text-xl font-bold'>
              {t('Integrate with your existing SDK')}
            </h3>
            <p className='text-muted-foreground mt-3 text-sm leading-relaxed'>
              {t(
                'Connect through OpenAI, Claude, Gemini, and other compatible API routes'
              )}
            </p>
            <pre className='mt-6 overflow-x-auto rounded-xl border border-white/10 bg-[#0b0f17] p-5 font-mono text-xs leading-7 text-slate-300'>
              <code>
                <span className='text-indigo-300'>client = OpenAI(</span>
                {'\n'}
                {'    base_url='}
                <span className='text-emerald-300'>"&lt;BASE_URL&gt;/v1"</span>,
                {'\n'}
                {'    api_key='}
                <span className='text-orange-300'>"&lt;YOUR_API_KEY&gt;"</span>
                {'\n'})
              </code>
            </pre>
          </article>
        </div>
      </div>
    </section>
  )
}
