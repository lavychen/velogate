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
import { Building2, Pencil, Plus, Search, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { StaticRowActions } from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toIntlLocale } from '@/i18n/languages'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { formatNumber } from '@/lib/format'
import { cn } from '@/lib/utils'

import type { Department } from '../api-types'

export function DepartmentDirectory(props: {
  departments: Department[]
  employeeCount: number
  selectedId?: number
  onSelect: (id?: number) => void
  onCreate: () => void
  onEdit: (department: Department) => void
  onDelete: (department: Department) => void
}) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const [search, setSearch] = useState('')
  const visibleDepartments = props.departments.filter((row) =>
    row.name.toLowerCase().includes(search.trim().toLowerCase())
  )

  return (
    <aside
      aria-label={t('Departments')}
      className='bg-muted/20 flex min-w-0 flex-col border-b md:w-[260px] md:shrink-0 md:border-r md:border-b-0'
    >
      <div className='flex items-center justify-between gap-3 px-4 pt-4 pb-3'>
        <h2 className='text-sm font-semibold'>{t('Departments')}</h2>
        <Button
          variant='ghost'
          size='icon-sm'
          aria-label={t('Add department')}
          onClick={props.onCreate}
        >
          <Plus aria-hidden='true' />
        </Button>
      </div>
      <div className='px-3 pb-3'>
        <div className='relative'>
          <Search
            className='text-muted-foreground absolute top-2.5 left-2.5 size-3.5'
            aria-hidden='true'
          />
          <Input
            className='pl-8'
            aria-label={t('Search departments')}
            placeholder={t('Search departments')}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
      </div>
      <nav aria-label={t('Department directory')} className='px-2 pb-3'>
        <Button
          variant='ghost'
          className='aria-pressed:bg-primary/10 aria-pressed:text-primary h-10 w-full justify-start gap-2 px-3'
          aria-pressed={!props.selectedId}
          onClick={() => props.onSelect()}
        >
          <Users aria-hidden='true' />
          <span className='min-w-0 flex-1 truncate text-left'>
            {t('All employees')}
          </span>
          <span className='text-xs tabular-nums'>
            {formatNumber(props.employeeCount, locale)}
          </span>
        </Button>
        <div className='mx-2 my-2 border-t' />
        <div className='max-h-60 space-y-1 overflow-y-auto md:max-h-[560px]'>
          {visibleDepartments.map((department) => {
            const selected = props.selectedId === department.id
            return (
              <div
                key={department.id}
                className={cn(
                  'group flex min-w-0 items-center rounded-lg hover:bg-muted',
                  selected && 'bg-primary/10 text-primary hover:bg-primary/10'
                )}
              >
                <Button
                  variant='ghost'
                  className='h-10 min-w-0 flex-1 justify-start gap-2 px-3 hover:bg-transparent'
                  aria-label={department.name}
                  aria-pressed={selected}
                  title={department.name}
                  onClick={() => props.onSelect(department.id)}
                >
                  <Building2 aria-hidden='true' />
                  <span className='min-w-0 flex-1 truncate text-left'>
                    {department.name}
                  </span>
                  <span className='text-muted-foreground text-xs tabular-nums'>
                    {formatNumber(department.employee_count ?? 0, locale)}
                  </span>
                </Button>
                <div
                  className={cn(
                    'shrink-0 pr-1 md:hidden md:group-focus-within:block md:group-hover:block md:has-[[aria-expanded=true]]:block',
                    selected && 'md:block'
                  )}
                >
                  <StaticRowActions
                    editLabel={t('Edit {{name}}', { name: department.name })}
                    deleteLabel={t('Delete')}
                    menuLabel={t('Actions for {{name}}', {
                      name: department.name,
                    })}
                    onEdit={() => props.onEdit(department)}
                    onDelete={() => props.onDelete(department)}
                  />
                </div>
              </div>
            )
          })}
          {visibleDepartments.length === 0 && (
            <EmptyState title={t('No results found.')} className='px-2 py-6' />
          )}
        </div>
      </nav>
    </aside>
  )
}

export function DepartmentOverview(props: {
  department?: Department
  departments: Department[]
  employeeCount: number
  onEdit: () => void
}) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  // Department totals include department-owned keys and their usage, which
  // cannot be recovered by summing only the employees in the visible table.
  const totals = (
    props.department ? [props.department] : props.departments
  ).reduce(
    (summary, row) => ({
      employees: summary.employees + (row.employee_count ?? 0),
      keys: summary.keys + (row.key_count ?? 0),
      cost: summary.cost + (row.cost ?? 0),
    }),
    { employees: 0, keys: 0, cost: 0 }
  )
  return (
    <section
      aria-label={t('Department overview')}
      className='flex flex-wrap items-start justify-between gap-5 border-b px-4 py-5 sm:px-6'
    >
      <div className='min-w-0 flex-1 basis-48'>
        <div className='flex min-w-0 items-center gap-2'>
          <h2 className='min-w-0 text-lg font-semibold wrap-anywhere'>
            {props.department?.name ?? t('All employees')}
          </h2>
          {props.department && (
            <Button
              variant='ghost'
              size='icon-sm'
              aria-label={t('Edit department information')}
              onClick={props.onEdit}
            >
              <Pencil aria-hidden='true' />
            </Button>
          )}
        </div>
        <p className='text-muted-foreground mt-1 text-sm wrap-anywhere whitespace-pre-wrap'>
          {props.department
            ? props.department.description || t('No department description')
            : t('View and manage all employees and API keys in this workspace')}
        </p>
      </div>
      <dl className='flex max-w-full flex-wrap gap-x-6 gap-y-3 text-sm'>
        <div>
          <dt className='text-muted-foreground text-xs'>{t('Employees')}</dt>
          <dd className='mt-1 font-semibold tabular-nums'>
            {formatNumber(
              props.department ? totals.employees : props.employeeCount,
              locale
            )}
          </dd>
        </div>
        <div>
          <dt className='text-muted-foreground text-xs'>{t('API Keys')}</dt>
          <dd className='mt-1 font-semibold tabular-nums'>
            {formatNumber(totals.keys, locale)}
          </dd>
        </div>
        <div>
          <dt className='text-muted-foreground text-xs'>{t('Usage cost')}</dt>
          <dd className='mt-1 font-semibold tabular-nums'>
            {formatBillingCurrencyFromUSD(totals.cost, {
              locale,
              digitsLarge: 2,
            })}
          </dd>
        </div>
      </dl>
    </section>
  )
}
