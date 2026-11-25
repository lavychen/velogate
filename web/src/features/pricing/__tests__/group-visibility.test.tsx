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
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, renderHook, screen, within } from '@testing-library/react'
import type { ReactNode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { api } from '@/lib/api'

import { ModelCard } from '../components/model-card'
import { ModelDetailsContent } from '../components/model-details'
import { PricingTable } from '../components/pricing-table'
import { usePricingData } from '../hooks/use-pricing-data'

vi.mock('@visactor/react-vchart', () => ({ VChart: () => null }))

let client: QueryClient

function Wrapper(props: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client}>{props.children}</QueryClientProvider>
  )
}

const model = {
  id: 1,
  model_name: 'catalog-model',
  quota_type: 0,
  model_ratio: 1,
  completion_ratio: 1,
  enable_groups: ['default', '企业分组'],
}

beforeEach(() => {
  client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 } },
  })
  client.setQueryData(['status'], { price: 1, usd_exchange_rate: 1 })
  client.setQueryData(['pricing'], {
    success: true,
    data: [model],
    vendors: [],
    group_ratio: { default: 0.75, group_1: 1 },
    usable_group: { default: 'Default group', group_1: '' },
  })
  vi.spyOn(api, 'get').mockResolvedValue({
    data: { success: true, data: { groups: [] } },
  })
})

afterEach(() => {
  client.clear()
})

describe('marketplace group visibility', () => {
  it('hides non-selectable groups in cards, table cells and model details even when the API includes them', () => {
    const { result } = renderHook(() => usePricingData(false), {
      wrapper: Wrapper,
    })
    const catalog = result.current
    render(
      <Wrapper>
        <section aria-label='card'>
          <ModelCard model={catalog.models[0]} onClick={vi.fn()} />
        </section>
        <section aria-label='table'>
          <PricingTable models={catalog.models} />
        </section>
        <section aria-label='details'>
          <ModelDetailsContent
            model={catalog.models[0]}
            groupRatio={catalog.groupRatio}
            usableGroup={catalog.usableGroup}
            endpointMap={{}}
            autoGroups={[]}
            priceRate={1}
            usdExchangeRate={1}
            tokenUnit='M'
          />
        </section>
      </Wrapper>
    )

    for (const name of ['card', 'table', 'details']) {
      const view = within(screen.getByRole('region', { name }))
      expect(view.getAllByText('default').length).toBeGreaterThan(0)
      expect(view.queryByText('企业分组')).not.toBeInTheDocument()
      expect(view.queryByText('+1')).not.toBeInTheDocument()
    }
    expect(model.enable_groups).toEqual(['default', '企业分组'])
  })

  it.each([
    { name: 'missing', usableGroups: undefined },
    { name: 'empty', usableGroups: {} },
  ])(
    'hides unavailable models when usable groups are $name',
    ({ usableGroups }) => {
      client.setQueryData(['pricing'], {
        success: true,
        data: [model],
        vendors: [],
        usable_group: usableGroups,
      })
      const { result } = renderHook(() => usePricingData(false), {
        wrapper: Wrapper,
      })
      expect(result.current.models).toEqual([])
    }
  )

  it('expands models available to all groups into the selectable groups only', () => {
    client.setQueryData(['pricing'], {
      success: true,
      data: [{ ...model, enable_groups: ['all'] }],
      vendors: [],
      usable_group: { default: 'Default', vip: 'VIP', auto: 'Auto' },
    })
    const { result } = renderHook(() => usePricingData(false), {
      wrapper: Wrapper,
    })
    expect(result.current.models[0].enable_groups).toEqual(['default', 'vip'])
  })
})
