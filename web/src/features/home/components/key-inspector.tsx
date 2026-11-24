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
import { Eye, EyeOff, Lock } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toIntlLocale } from '@/i18n/languages'
import { formatLocalCurrencyAmount } from '@/lib/currency'
import { formatNumber } from '@/lib/format'

import { inspectGatewayKey, type KeyInspection } from '../lib/gateway-tools'

export function KeyInspector(props: { baseUrl: string }) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const [baseUrl, setBaseUrl] = useState(props.baseUrl)
  const [apiKey, setApiKey] = useState('')
  const [visible, setVisible] = useState(false)
  const [testing, setTesting] = useState(false)
  const [result, setResult] = useState<KeyInspection | null>(null)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  const resetResult = () => {
    request.current?.abort()
    request.current = null
    setTesting(false)
    setResult(null)
    setError('')
  }
  const runCheck = async () => {
    resetResult()
    const controller = new AbortController()
    request.current = controller
    setTesting(true)
    try {
      const report = await inspectGatewayKey(baseUrl, apiKey, controller.signal)
      if (!controller.signal.aborted) setResult(report)
    } catch {
      if (!controller.signal.aborted) {
        setError(
          t(
            'Key check failed. Check the key, HTTPS gateway address, and CORS settings.'
          )
        )
      }
    } finally {
      if (request.current === controller) {
        setTesting(false)
        request.current = null
      }
    }
  }
  let unit = result?.unit || ''
  if (unit === 'TOKENS') unit = t('Tokens')
  if (unit === 'Gateway units') unit = t('Gateway units')
  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-3 text-xs text-emerald-700 dark:text-emerald-300'>
        <Lock aria-hidden='true' className='size-4 shrink-0' />
        <span>
          {t(
            'Browser-only direct connection. No third-party server receives your key.'
          )}
        </span>
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='inspector-base' className='text-xs font-semibold'>
          {t('Gateway address (Base URL)')}
        </Label>
        <Input
          id='inspector-base'
          value={baseUrl}
          onChange={(event) => {
            resetResult()
            setBaseUrl(event.target.value)
          }}
          className='h-10 rounded-xl font-mono text-xs'
          autoComplete='off'
        />
      </div>
      <div className='space-y-1.5'>
        <Label htmlFor='inspector-key' className='text-xs font-semibold'>
          API Key
        </Label>
        <div className='relative'>
          <Input
            id='inspector-key'
            type={visible ? 'text' : 'password'}
            value={apiKey}
            onChange={(event) => {
              resetResult()
              setApiKey(event.target.value)
            }}
            placeholder='sk-xxxxxxxxxxxxxxxx'
            autoComplete='off'
            spellCheck={false}
            className='h-10 rounded-xl pr-10 font-mono text-xs'
          />
          <Button
            variant='ghost'
            size='icon'
            className='text-muted-foreground absolute top-1/2 right-1 size-8 -translate-y-1/2'
            aria-label={visible ? t('Hide API key') : t('Show API key')}
            aria-pressed={visible}
            onClick={() => setVisible(!visible)}
          >
            {visible ? (
              <EyeOff aria-hidden='true' className='size-4' />
            ) : (
              <Eye aria-hidden='true' className='size-4' />
            )}
          </Button>
        </div>
      </div>
      <div className='flex gap-2'>
        <Button
          className='home-primary h-auto flex-1 rounded-xl py-2.5 text-xs font-semibold'
          disabled={testing || !apiKey.trim()}
          onClick={() => {
            void runCheck()
          }}
        >
          {testing ? t('Checking...') : t('Check now')}
        </Button>
        <Button
          variant='outline'
          disabled={testing}
          className='h-auto rounded-xl px-4 py-2.5 text-xs font-medium'
          onClick={() => {
            resetResult()
            setResult({
              total: 150,
              used: 38.45,
              remaining: 111.55,
              latency: 184,
              unit: 'USD',
              simulated: true,
            })
          }}
        >
          {t('Run simulated check')}
        </Button>
      </div>
      {error && (
        <p
          role='alert'
          className='border-destructive/20 bg-destructive/5 text-destructive rounded-xl border p-4 text-xs'
        >
          {error}
        </p>
      )}
      {result && (
        <div
          role='status'
          className='home-subtle space-y-3 rounded-2xl border p-4'
        >
          <div className='flex items-center justify-between font-mono text-xs'>
            <span className='font-semibold text-emerald-600 dark:text-emerald-400'>
              {result.simulated ? t('Simulated result') : '200 OK'} · {unit}
            </span>
            <span>{formatNumber(result.latency, locale)}ms</span>
          </div>
          <div className='grid grid-cols-3 gap-2 text-center'>
            {[
              { label: t('Total quota'), amount: result.total },
              { label: t('Used'), amount: result.used },
              { label: t('Remaining'), amount: result.remaining },
            ].map((item) => (
              <div
                key={item.label}
                className='home-surface rounded-xl border p-2.5'
              >
                <div className='text-muted-foreground text-[10px]'>
                  {item.label}
                </div>
                <div className='mt-0.5 font-mono text-xs font-bold break-all'>
                  {formatLocalCurrencyAmount(item.amount, {
                    showSymbol: false,
                    digitsLarge: 2,
                    digitsSmall: 2,
                    abbreviate: false,
                    locale,
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
