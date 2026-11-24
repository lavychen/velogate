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
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Slider } from '@/components/ui/slider'
import { ModelPriceCell } from '@/features/pricing/components/model-price-cell'
import { compileBillingExpression } from '@/features/pricing/lib/billing-expression/parser'
import { evaluateBillingExpression } from '@/features/pricing/lib/billing-expression/runtime'
import { getDisplayGroupRatio } from '@/features/pricing/lib/model-helpers'
import { calculateTokenPrice } from '@/features/pricing/lib/price'
import type { PricingModel } from '@/features/pricing/types'
import { toIntlLocale } from '@/i18n/languages'
import { formatLocalCurrencyAmount } from '@/lib/currency'
import { formatNumber } from '@/lib/format'

export function CostEstimator(props: {
  model: PricingModel
  exchangeRate?: number
}) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const [input, setInput] = useState(4000)
  const [output, setOutput] = useState(1200)
  const [dailyRequests, setDailyRequests] = useState(500)
  const [group, setGroup] = useState(props.model.enable_groups[0] || 'all')
  const model = props.model
  const expression = useMemo(
    () =>
      model.billing_mode === 'tiered_expr' && model.billing_expr
        ? compileBillingExpression(model.billing_expr)
        : null,
    [model.billing_mode, model.billing_expr]
  )
  const standalone =
    !model.billing_plugin_variants?.length && !model.billing_usage_schema
  const predictableExpression =
    expression?.status === 'ready' &&
    !expression.variables.has('image_count') &&
    !['param', 'header', 'u', 'hour', 'minute', 'weekday', 'month', 'day'].some(
      (name) => expression.functions.has(name)
    )
  const simple =
    standalone &&
    (predictableExpression ||
      (!expression &&
        model.billing_mode !== 'tiered_expr' &&
        !model.billing_expr))
  const tokenBased =
    expression?.status === 'ready'
      ? expression.variables.size > 0
      : model.quota_type === 0
  const ratio = getDisplayGroupRatio(model, group)
  let perRequest = Number.NaN
  if (simple && expression?.status === 'ready') {
    const result = evaluateBillingExpression(expression, {
      tokens: {
        p: input,
        c: output,
        len: input,
        cr: 0,
        cc: 0,
        cc1h: 0,
        cc12h: 0,
        img: 0,
        img_cr: 0,
        img_o: 0,
        ai: 0,
        ao: 0,
      },
    })
    if (result.status === 'success') {
      perRequest = (result.cost / 1_000_000) * ratio
    }
  } else if (simple) {
    if (tokenBased) {
      perRequest =
        (calculateTokenPrice(model, 'input', ratio) * input +
          calculateTokenPrice(model, 'output', ratio) * output) /
        1_000_000
    } else if (typeof model.model_price === 'number') {
      perRequest = model.model_price * ratio
    }
  }
  const available = Number.isFinite(perRequest) && perRequest >= 0
  const monthly = perRequest * dailyRequests * 30
  const rate = props.exchangeRate
  return (
    <div className='space-y-6'>
      {!simple && (
        <>
          <ModelPriceCell model={model} showExpression={false} />
          <p className='text-muted-foreground text-sm'>
            {t(
              'This model uses conditional or usage-based pricing. View its pricing details for the applicable rates.'
            )}
          </p>
          <Button
            variant='outline'
            render={
              <Link
                to='/pricing/$modelId'
                params={{ modelId: model.model_name }}
              />
            }
          >
            {t('View Details')}
          </Button>
        </>
      )}
      {simple && (
        <>
          <div className='space-y-2'>
            <Label htmlFor='estimate-group' className='text-xs'>
              {t('Group')}
            </Label>
            <NativeSelect
              id='estimate-group'
              value={group}
              onChange={(event) => setGroup(event.target.value)}
              className='w-full'
            >
              {model.enable_groups.length === 0 && (
                <NativeSelectOption value='all'>
                  {t('Default')}
                </NativeSelectOption>
              )}
              {model.enable_groups.map((name) => (
                <NativeSelectOption key={name} value={name}>
                  {name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          {tokenBased && (
            <>
              <div>
                <div className='mb-2 flex justify-between text-xs'>
                  <Label
                    htmlFor='estimate-input'
                    className='text-muted-foreground text-xs'
                  >
                    {t('Input tokens per request')}
                  </Label>
                  <span className='font-mono font-semibold'>
                    {formatNumber(input, locale)}
                  </span>
                </div>
                <Slider
                  id='estimate-input'
                  aria-label={t('Input tokens per request')}
                  min={200}
                  max={64000}
                  step={200}
                  value={[input]}
                  onValueChange={(value) =>
                    setInput(Array.isArray(value) ? value[0] : value)
                  }
                />
              </div>
              <div>
                <div className='mb-2 flex justify-between text-xs'>
                  <Label
                    htmlFor='estimate-output'
                    className='text-muted-foreground text-xs'
                  >
                    {t('Output tokens per request')}
                  </Label>
                  <span className='font-mono font-semibold'>
                    {formatNumber(output, locale)}
                  </span>
                </div>
                <Slider
                  id='estimate-output'
                  aria-label={t('Output tokens per request')}
                  min={100}
                  max={16000}
                  step={100}
                  value={[output]}
                  onValueChange={(value) =>
                    setOutput(Array.isArray(value) ? value[0] : value)
                  }
                />
              </div>
            </>
          )}
          <div>
            <div className='mb-2 flex justify-between text-xs'>
              <Label
                htmlFor='estimate-daily'
                className='text-muted-foreground text-xs'
              >
                {t('Daily requests')}
              </Label>
              <span className='font-mono font-semibold text-[#f97316]'>
                {formatNumber(dailyRequests, locale)} {t('requests/day')}
              </span>
            </div>
            <Slider
              id='estimate-daily'
              aria-label={t('Daily requests')}
              min={10}
              max={10000}
              step={10}
              value={[dailyRequests]}
              onValueChange={(value) =>
                setDailyRequests(Array.isArray(value) ? value[0] : value)
              }
              className='[--primary:#f97316]'
            />
          </div>
          <div
            role='status'
            className='space-y-4 rounded-2xl bg-gradient-to-br from-[#121629] via-[#1b1f3b] to-[#0f1322] p-5 text-white'
          >
            <p className='font-mono text-[11px] text-slate-400'>
              {t('Group multiplier')}: {group} ({formatNumber(ratio, locale)}×)
            </p>
            <div className='grid grid-cols-2 gap-4'>
              {[
                { label: t('Per-request estimate'), value: perRequest },
                { label: t('Monthly estimate (30 days)'), value: monthly },
              ].map((item, index) => (
                <div
                  key={item.label}
                  className={index === 1 ? 'border-l border-white/10 pl-4' : ''}
                >
                  <p className='text-[11px] text-slate-400'>{item.label}</p>
                  <p className='mt-0.5 font-mono text-xl font-bold break-all tabular-nums'>
                    {available
                      ? `$${formatLocalCurrencyAmount(item.value, { showSymbol: false, digitsLarge: 4, digitsSmall: 4, abbreviate: false, locale })}`
                      : '—'}
                  </p>
                  {available &&
                    typeof rate === 'number' &&
                    Number.isFinite(rate) &&
                    rate > 0 && (
                      <p className='font-mono text-[11px] text-slate-300'>
                        ≈ ¥
                        {formatLocalCurrencyAmount(item.value * rate, {
                          showSymbol: false,
                          digitsLarge: 4,
                          digitsSmall: 4,
                          abbreviate: false,
                          locale,
                        })}
                      </p>
                    )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
