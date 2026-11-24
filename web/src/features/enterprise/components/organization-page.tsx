import { useMutation } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Building2, KeyRound, Plus, Search, Users, Wallet } from 'lucide-react'
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
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
  workspaceLabel?: string
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
      matches(
        `${row.name} ${row.id} ${row.email ?? ''} ${row.employee_no ?? ''}`
      )
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
              {t('ID')}: {row.id}
            </p>
            {(row.email || row.employee_no) && (
              <p className='text-muted-foreground truncate text-xs'>
                {row.email || row.employee_no}
              </p>
            )}
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
      className: 'text-right tabular-nums',
      cellClassName: 'text-right tabular-nums',
      cell: (row) => formatNumber(row.key_count ?? 0, locale),
    },
    {
      id: 'calls',
      header: t('Requests'),
      className: 'text-right tabular-nums',
      cellClassName: 'text-right tabular-nums',
      cell: (row) => formatNumber(row.request_count ?? 0, locale),
    },
    {
      id: 'cost',
      header: t('Usage cost'),
      className: 'text-right tabular-nums',
      cellClassName: 'text-right tabular-nums',
      cell: (row) => money(row.cost ?? 0),
    },
    {
      id: 'status',
      header: t('Status'),
      cell: (row) => (
        <StatusBadge
          showDot
          className={
            row.status === 1 ? 'bg-success/10 px-2.5' : 'bg-muted px-2.5'
          }
          variant={row.status === 1 ? 'success' : 'neutral'}
          label={row.status === 1 ? t('Enabled') : t('Disabled')}
          copyable={false}
        />
      ),
    },
    {
      id: 'actions',
      header: t('Actions'),
      className: 'text-right tabular-nums',
      cellClassName: 'text-right tabular-nums',
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
          <div className='flex flex-wrap items-center gap-2.5'>
            <h1 className='text-xl font-semibold tracking-tight'>
              {props.section === 'keys'
                ? t('Enterprise keys')
                : t('Organization & members')}
            </h1>
            {props.workspaceLabel && (
              <Badge
                variant='secondary'
                className='bg-primary/10 text-primary h-auto max-w-full rounded-md py-1 whitespace-normal'
              >
                <Building2 aria-hidden='true' />
                {props.workspaceLabel}
              </Badge>
            )}
          </div>
          <p className='text-muted-foreground mt-1 text-sm'>
            {t('Manage departments, employees and API key ownership')}
          </p>
        </div>
        <div className='flex flex-wrap gap-2'>
          {props.section === 'keys' && (
            <Button variant='outline' onClick={() => showKey()}>
              <KeyRound aria-hidden='true' />
              {t('Assign Key')}
            </Button>
          )}
          {props.section !== 'keys' && (
            <Button variant='outline' render={<Link to='/wallet' />}>
              <Wallet aria-hidden='true' />
              {t('Wallet & billing')}
            </Button>
          )}
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
      <Tabs
        value={props.section}
        className='enterprise-panel gap-0 overflow-hidden'
      >
        <div className='flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3'>
          {props.section !== 'keys' && (
            <TabsList variant='line' aria-label={t('Organization & members')}>
              <TabsTrigger
                value='employees'
                nativeButton={false}
                render={
                  <Link
                    to='/enterprise/$section'
                    params={{ section: 'employees' }}
                  />
                }
              >
                {t('Employees')}
              </TabsTrigger>
              <TabsTrigger
                value='departments'
                nativeButton={false}
                render={
                  <Link
                    to='/enterprise/$section'
                    params={{ section: 'departments' }}
                  />
                }
              >
                {t('Departments')}
              </TabsTrigger>
            </TabsList>
          )}
          <div className='flex w-full flex-wrap items-center gap-3 sm:w-auto'>
            <div className='relative min-w-0 flex-1 sm:w-56'>
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
              <div className='p-2'>
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
              <div className='p-2'>
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
              <div className='grid gap-4 p-4 md:grid-cols-2 xl:grid-cols-3'>
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
      </Tabs>
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
