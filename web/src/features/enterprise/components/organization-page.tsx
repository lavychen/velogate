import { useMutation } from '@tanstack/react-query'
import { KeyRound, Plus, Search, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { ConfirmDialog } from '@/components/confirm-dialog'
import {
  StaticDataTable,
  StaticRowActions,
  type StaticDataTableColumn,
} from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { toIntlLocale } from '@/i18n/languages'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { formatNumber } from '@/lib/format'
import { requireServerSuccess } from '@/lib/server-error-message'

import { deleteDepartment, deleteEmployee, unassignToken } from '../api'
import type { Employee, TokenAssignment } from '../api-types'
import { useOrganization, useRefreshEnterprise } from '../hooks/use-enterprise'
import { useKeyDialogStore } from '../key-dialog-store'
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
import { KeyOwnershipCell } from './key-ownership-cell'
import {
  OrganizationEditor,
  type OrganizationTarget,
} from './organization-editor'

export function OrganizationPage(props: {
  section: 'employees' | 'departments' | 'keys'
}) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const { departments, employees, assignments } = useOrganization()
  const refresh = useRefreshEnterprise()
  const showKey = useKeyDialogStore((state) => state.show)
  const [editor, setEditor] = useState<OrganizationTarget | null>(null)
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [removeTarget, setRemoveTarget] = useState<{
    id: number
    name: string
  } | null>(null)
  const deletion = useMutation({
    mutationFn: async () => {
      if (!removeTarget) return
      if (props.section === 'employees') {
        return requireServerSuccess(await deleteEmployee(removeTarget.id))
      }
      if (props.section === 'departments') {
        return requireServerSuccess(await deleteDepartment(removeTarget.id))
      }
      return requireServerSuccess(await unassignToken(removeTarget.id))
    },
    onSuccess: async () => {
      await refresh()
      setRemoveTarget(null)
    },
  })
  const money = (value: number) =>
    formatBillingCurrencyFromUSD(value, { locale, digitsLarge: 2 })
  const matches = (value: string) =>
    value.toLowerCase().includes(search.trim().toLowerCase())
  const employeeRows = (employees.data ?? []).filter(
    (row) =>
      (!departmentId || row.department_id === Number(departmentId)) &&
      matches(`${row.name} ${row.email ?? ''} ${row.employee_no ?? ''}`)
  )
  const keyRows = (assignments.data ?? []).filter(
    (row) =>
      (!departmentId || row.department_id === Number(departmentId)) &&
      matches(
        `${row.token_name ?? ''} ${row.employee_name ?? ''} ${row.department_name ?? ''}`
      )
  )
  const employeeColumns: StaticDataTableColumn<Employee>[] = [
    {
      id: 'name',
      header: t('Employee'),
      cell: (row) => (
        <div className='flex items-center gap-3'>
          <span className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl text-xs font-semibold'>
            {row.name.slice(0, 1)}
          </span>
          <div className='min-w-0'>
            <p className='truncate font-medium'>{row.name}</p>
            <p className='text-muted-foreground truncate text-xs'>
              {row.email || row.employee_no || '—'}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'department',
      header: t('Department'),
      cell: (row) => row.department_name || '—',
    },
    {
      id: 'keys',
      header: t('API Keys'),
      cell: (row) => formatNumber(row.key_count ?? 0, locale),
    },
    {
      id: 'calls',
      header: t('Requests'),
      cell: (row) => formatNumber(row.request_count ?? 0, locale),
    },
    {
      id: 'cost',
      header: t('Usage cost'),
      cell: (row) => money(row.cost ?? 0),
    },
    {
      id: 'status',
      header: t('Status'),
      cell: (row) => (
        <StatusBadge
          variant={row.status === 1 ? 'success' : 'neutral'}
          label={row.status === 1 ? t('Enabled') : t('Disabled')}
          copyable={false}
        />
      ),
    },
    {
      id: 'actions',
      header: t('Actions'),
      cell: (row) => (
        <div className='flex justify-end gap-1'>
          <Button
            variant='ghost'
            size='sm'
            disabled={
              row.status !== 1 ||
              !departments.data?.some(
                (department) =>
                  department.id === row.department_id && department.status === 1
              )
            }
            aria-label={t('Assign key to {{name}}', { name: row.name })}
            onClick={() => showKey(row.id)}
          >
            <KeyRound aria-hidden='true' />
            {t('Assign Key')}
          </Button>
          <StaticRowActions
            editLabel={t('Edit {{name}}', { name: row.name })}
            deleteLabel={t('Delete')}
            menuLabel={t('Actions for {{name}}', { name: row.name })}
            onEdit={() => setEditor({ kind: 'employees', value: row })}
            onDelete={() => setRemoveTarget(row)}
          />
        </div>
      ),
    },
  ]
  const keyColumns: StaticDataTableColumn<TokenAssignment>[] = [
    {
      id: 'name',
      header: t('Name'),
      cell: (row) => (
        <div>
          <p className='font-medium'>{row.token_name}</p>
          <code className='text-muted-foreground text-xs'>
            {row.masked_key}
          </code>
        </div>
      ),
    },
    {
      id: 'department',
      header: t('Department'),
      cell: (row) => row.department_name || '—',
    },
    {
      id: 'employee',
      header: t('Employee'),
      cell: (row) => row.employee_name || t('Department key'),
    },
    {
      id: 'status',
      header: t('Status'),
      cell: (row) => (
        <StatusBadge
          variant={row.status === 1 ? 'success' : 'neutral'}
          label={row.status === 1 ? t('Enabled') : t('Disabled')}
          copyable={false}
        />
      ),
    },
    {
      id: 'actions',
      header: t('Actions'),
      cell: (row) => (
        <div className='flex items-center gap-3'>
          <KeyOwnershipCell tokenId={row.token_id} />
          <Button
            variant='outline'
            size='sm'
            onClick={() =>
              setRemoveTarget({
                id: row.token_id,
                name: row.token_name || String(row.token_id),
              })
            }
          >
            {t('Unassign')}
          </Button>
        </div>
      ),
    },
  ]
  const pending =
    departments.isPending || employees.isPending || assignments.isPending
  const failed = departments.isError || employees.isError || assignments.isError
  return (
    <div className='space-y-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-xl font-semibold tracking-tight'>
            {props.section === 'keys'
              ? t('Enterprise keys')
              : t('Organization & members')}
          </h2>
          <p className='text-muted-foreground mt-1 text-sm'>
            {t('Manage departments, employees and API key ownership')}
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={() => showKey()}>
            <KeyRound aria-hidden='true' />
            {t('Assign Key')}
          </Button>
          {props.section !== 'keys' && (
            <Button
              onClick={() =>
                setEditor({
                  kind:
                    props.section === 'departments'
                      ? 'departments'
                      : 'employees',
                })
              }
            >
              <Plus aria-hidden='true' />
              {props.section === 'employees'
                ? t('Add employee')
                : t('Add department')}
            </Button>
          )}
        </div>
      </div>
      <div className='enterprise-panel flex flex-wrap gap-3 p-3'>
        <div className='relative min-w-0 flex-1 sm:max-w-sm'>
          <Search
            className='text-muted-foreground absolute top-2.5 left-2.5 size-4'
            aria-hidden='true'
          />
          <Input
            className='pl-8'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={t('Search organization')}
            placeholder={t('Search')}
          />
        </div>
        {props.section !== 'departments' && (
          <NativeSelect
            aria-label={t('Department')}
            value={departmentId}
            onChange={(event) => setDepartmentId(event.target.value)}
          >
            <NativeSelectOption value=''>
              {t('All departments')}
            </NativeSelectOption>
            {departments.data?.map((row) => (
              <NativeSelectOption key={row.id} value={row.id}>
                {row.name}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </div>
      {pending && <LoadingState />}
      {failed && (
        <ErrorState
          onRetry={() => {
            void departments.refetch()
            void employees.refetch()
            void assignments.refetch()
          }}
        />
      )}
      {!pending && !failed && (
        <>
          {props.section === 'employees' && (
            <div className='enterprise-panel p-2'>
              <StaticDataTable
                data={employeeRows}
                columns={employeeColumns}
                getRowKey={(row) => row.id}
                tableClassName='min-w-[850px]'
                emptyContent={<EmptyState title={t('No results found.')} />}
              />
            </div>
          )}
          {props.section === 'keys' && (
            <div className='enterprise-panel p-2'>
              <StaticDataTable
                data={keyRows}
                columns={keyColumns}
                getRowKey={(row) => row.token_id}
                tableClassName='min-w-[640px]'
                emptyContent={<EmptyState title={t('No results found.')} />}
              />
            </div>
          )}
          {props.section === 'departments' && (
            <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
              {departments.data
                ?.filter((row) => matches(row.name))
                .map((row) => (
                  <section key={row.id} className='enterprise-panel p-5'>
                    <div className='flex items-start justify-between gap-3'>
                      <div className='flex min-w-0 items-center gap-3'>
                        <span className='bg-primary/10 text-primary flex size-10 shrink-0 items-center justify-center rounded-xl'>
                          <Users className='size-5' aria-hidden='true' />
                        </span>
                        <h3 className='truncate font-semibold'>{row.name}</h3>
                      </div>
                      <StaticRowActions
                        editLabel={t('Edit {{name}}', { name: row.name })}
                        deleteLabel={t('Delete')}
                        menuLabel={t('Actions for {{name}}', {
                          name: row.name,
                        })}
                        onEdit={() =>
                          setEditor({ kind: 'departments', value: row })
                        }
                        onDelete={() => setRemoveTarget(row)}
                      />
                    </div>
                    <p className='text-muted-foreground mt-4 line-clamp-2 min-h-10 text-sm'>
                      {row.description || '—'}
                    </p>
                    <div className='mt-4 grid grid-cols-3 gap-3 border-t pt-4 text-sm'>
                      <div>
                        <p className='text-muted-foreground text-xs'>
                          {t('Employees')}
                        </p>
                        <p className='mt-1 font-semibold'>
                          {formatNumber(row.employee_count ?? 0, locale)}
                        </p>
                      </div>
                      <div>
                        <p className='text-muted-foreground text-xs'>
                          {t('API Keys')}
                        </p>
                        <p className='mt-1 font-semibold'>
                          {formatNumber(row.key_count ?? 0, locale)}
                        </p>
                      </div>
                      <div>
                        <p className='text-muted-foreground text-xs'>
                          {t('Usage cost')}
                        </p>
                        <p className='mt-1 font-semibold'>
                          {money(row.cost ?? 0)}
                        </p>
                      </div>
                    </div>
                  </section>
                ))}
              {!departments.data?.some((row) => matches(row.name)) && (
                <EmptyState title={t('No results found.')} />
              )}
            </div>
          )}
        </>
      )}
      {editor && (
        <OrganizationEditor
          target={editor}
          departments={departments.data ?? []}
          onClose={() => setEditor(null)}
        />
      )}
      <ConfirmDialog
        open={!!removeTarget}
        onOpenChange={(open) => {
          if (!open && !deletion.isPending) setRemoveTarget(null)
        }}
        title={t('Delete {{name}}?', { name: removeTarget?.name })}
        desc={
          props.section === 'keys'
            ? t(
                'Remove this assignment? The API key remains available in Key management.'
              )
            : t(
                'Remove this organization record? Existing usage history is preserved.'
              )
        }
        destructive
        confirmText={props.section === 'keys' ? t('Unassign') : t('Delete')}
        isLoading={deletion.isPending}
        handleConfirm={() => deletion.mutate()}
      />
    </div>
  )
}
