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
import { KeyRound, Plus, Search, Users } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'

import { ConfirmDialog } from '@/components/confirm-dialog'
import { CopyButton } from '@/components/copy-button'
import {
  StaticDataTable,
  StaticRowActions,
  type StaticDataTableColumn,
} from '@/components/data-table'
import { EmptyState } from '@/components/empty-state'
import { StatusBadge } from '@/components/status-badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Progress } from '@/components/ui/progress'
import { Switch } from '@/components/ui/switch'
import { toIntlLocale } from '@/i18n/languages'
import { formatBillingCurrencyFromUSD } from '@/lib/currency'
import { formatNumber } from '@/lib/format'

import { DEMO_USAGE } from '../demo-data'
import { useEnterpriseDemoStore } from '../store'
import type { Department, EnterpriseKey, Member } from '../types'
import { EntityEditor, type EditorTarget } from './entity-editor'

export function OrganizationManagement(props: {
  section: 'members' | 'departments' | 'keys'
}) {
  const { t, i18n } = useTranslation()
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  const departments = useEnterpriseDemoStore((state) => state.departments)
  const members = useEnterpriseDemoStore((state) => state.members)
  const keys = useEnterpriseDemoStore((state) => state.keys)
  const [search, setSearch] = useState('')
  const [departmentId, setDepartmentId] = useState('')
  const [editor, setEditor] = useState<EditorTarget | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    id: string
    name: string
  } | null>(null)
  const money = (value: number) =>
    formatBillingCurrencyFromUSD(value, { locale, digitsLarge: 2 })
  const titles = {
    members: t('Organization & members'),
    departments: t('Departments'),
    keys: t('Enterprise keys'),
  }
  const addLabels = {
    members: t('Add member'),
    departments: t('Add department'),
    keys: t('Assign demo key'),
  }
  const matches = (text: string) =>
    text.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase())
  const actions = (row: { id: string; name: string }) => (
    <StaticRowActions
      editLabel={t('Edit {{name}}', { name: row.name })}
      deleteLabel={t('Delete')}
      menuLabel={t('Actions for {{name}}', { name: row.name })}
      onEdit={() => setEditor({ kind: props.section, id: row.id })}
      onDelete={() => setDeleteTarget(row)}
    />
  )
  const memberColumns: StaticDataTableColumn<Member>[] = [
    {
      id: 'name',
      header: t('Member'),
      cell: (row) => (
        <div className='flex items-center gap-3'>
          <span className='flex size-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-xs font-semibold text-indigo-600 dark:text-indigo-400'>
            {row.name.slice(0, 1)}
          </span>
          <div className='min-w-0'>
            <p className='truncate font-medium'>{row.name}</p>
            <p className='text-muted-foreground truncate text-xs'>
              {row.email}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'department',
      header: t('Department'),
      cell: (row) =>
        t(departments.find((item) => item.id === row.departmentId)?.name ?? ''),
    },
    { id: 'role', header: t('Job title'), cell: (row) => t(row.role) || '—' },
    {
      id: 'budget',
      header: t('Monthly budget'),
      cell: (row) => money(row.budget),
    },
    {
      id: 'keys',
      header: t('API Keys'),
      cell: (row) =>
        formatNumber(
          keys.filter((key) => key.memberId === row.id).length,
          locale
        ),
    },
    {
      id: 'status',
      header: t('Status'),
      cell: (row) => (
        <Switch
          checked={row.enabled}
          aria-label={t('Enable {{name}}', { name: row.name })}
          onCheckedChange={(enabled) =>
            useEnterpriseDemoStore.getState().saveMember({ ...row, enabled })
          }
        />
      ),
    },
    {
      id: 'actions',
      header: t('Actions'),
      cell: (row) => (
        <div className='flex items-center justify-end gap-1'>
          <Button
            variant='ghost'
            size='icon-sm'
            disabled={!row.enabled}
            aria-label={t('Assign key to {{name}}', { name: row.name })}
            onClick={() => setEditor({ kind: 'keys', memberId: row.id })}
          >
            <KeyRound aria-hidden='true' />
          </Button>
          {actions(row)}
        </div>
      ),
    },
  ]
  const keyColumns: StaticDataTableColumn<EnterpriseKey>[] = [
    {
      id: 'name',
      header: t('Name'),
      cell: (row) => (
        <div className='min-w-0'>
          <p className='truncate font-medium'>{row.name}</p>
          <span className='text-muted-foreground font-mono text-xs'>
            {row.id}
          </span>
        </div>
      ),
    },
    {
      id: 'member',
      header: t('Assigned member'),
      cell: (row) =>
        members.find((item) => item.id === row.memberId)?.name ?? '—',
    },
    {
      id: 'models',
      header: t('Allowed models'),
      cell: (row) => (
        <div className='flex flex-wrap gap-1'>
          {row.models.map((model) => (
            <StatusBadge
              key={model}
              label={model}
              variant='neutral'
              copyable={false}
            />
          ))}
        </div>
      ),
    },
    {
      id: 'budget',
      header: t('Monthly budget'),
      cell: (row) => money(row.budget),
    },
    {
      id: 'expires',
      header: t('Expiration date'),
      cell: (row) => row.expiresAt || t('Never expires'),
    },
    {
      id: 'status',
      header: t('Status'),
      cell: (row) => (
        <Switch
          checked={row.enabled}
          disabled={
            !members.find((member) => member.id === row.memberId)?.enabled
          }
          aria-label={t('Enable {{name}}', { name: row.name })}
          onCheckedChange={(enabled) =>
            useEnterpriseDemoStore.getState().saveKey({ ...row, enabled })
          }
        />
      ),
    },
    {
      id: 'actions',
      header: t('Actions'),
      cell: (row) => (
        <div className='flex items-center justify-end gap-1'>
          <CopyButton
            value={row.id}
            aria-label={t('Copy assignment ID')}
            className='size-7'
          />
          {actions(row)}
        </div>
      ),
    },
  ]
  const remove = () => {
    if (!deleteTarget) return
    const store = useEnterpriseDemoStore.getState()
    let removed = true
    if (props.section === 'members') {
      removed = store.removeMember(deleteTarget.id)
    }
    if (props.section === 'departments') {
      removed = store.removeDepartment(deleteTarget.id)
    }
    if (props.section === 'keys') store.removeKey(deleteTarget.id)
    if (!removed) {
      toast.error(
        t('Move members or remove their key assignments before deleting.')
      )
    }
    setDeleteTarget(null)
  }
  const visibleMembers = members.filter(
    (row) =>
      (!departmentId || row.departmentId === departmentId) &&
      matches(`${row.name} ${row.email} ${row.role}`)
  )
  const visibleKeys = keys.filter(
    (row) =>
      (!departmentId ||
        members.find((member) => member.id === row.memberId)?.departmentId ===
          departmentId) &&
      matches(
        `${row.name} ${members.find((member) => member.id === row.memberId)?.name ?? ''}`
      )
  )
  const visibleDepartments: Department[] = departments.filter((row) =>
    matches(`${t(row.name)} ${row.manager}`)
  )

  return (
    <div className='space-y-5'>
      <div className='flex flex-wrap items-center justify-between gap-3'>
        <div>
          <h2 className='text-xl font-semibold tracking-tight'>
            {titles[props.section]}
          </h2>
          <p className='text-muted-foreground mt-1 text-sm'>
            {t('Organize teams and preview member budgets and model access')}
          </p>
        </div>
        <Button
          onClick={() => setEditor({ kind: props.section })}
          disabled={
            (props.section === 'members' && departments.length === 0) ||
            (props.section === 'keys' &&
              !members.some((member) => member.enabled))
          }
        >
          <Plus aria-hidden='true' />
          {addLabels[props.section]}
        </Button>
      </div>
      <div className='enterprise-panel flex flex-wrap gap-3 p-3'>
        <div className='relative min-w-0 flex-1 sm:max-w-sm'>
          <Search
            className='text-muted-foreground absolute top-2.5 left-2.5 size-3.5'
            aria-hidden='true'
          />
          <Input
            aria-label={t('Search organization')}
            placeholder={t('Search')}
            className='pl-8'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
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
            {departments.map((item) => (
              <NativeSelectOption key={item.id} value={item.id}>
                {t(item.name)}
              </NativeSelectOption>
            ))}
          </NativeSelect>
        )}
      </div>
      {props.section === 'members' && (
        <div className='enterprise-panel p-2'>
          <StaticDataTable
            data={visibleMembers}
            columns={memberColumns}
            getRowKey={(row) => row.id}
            tableClassName='min-w-[850px]'
            emptyContent={<EmptyState title={t('No results found.')} />}
          />
        </div>
      )}
      {props.section === 'keys' && (
        <>
          <div className='text-muted-foreground rounded-lg border border-indigo-500/20 bg-indigo-500/5 p-3 text-xs'>
            {t(
              'These are assignment records, not usable API keys. Manage real credentials in API Keys.'
            )}
          </div>
          <div className='enterprise-panel p-2'>
            <StaticDataTable
              data={visibleKeys}
              columns={keyColumns}
              getRowKey={(row) => row.id}
              tableClassName='min-w-[900px]'
              emptyContent={<EmptyState title={t('No results found.')} />}
            />
          </div>
        </>
      )}
      {props.section === 'departments' && (
        <div className='grid gap-4 md:grid-cols-2 xl:grid-cols-3'>
          {visibleDepartments.map((row) => {
            const count = members.filter(
              (member) => member.departmentId === row.id
            ).length
            const used = DEMO_USAGE.filter(
              (record) => record.departmentId === row.id
            ).reduce((total, record) => total + record.cost, 0)
            return (
              <section key={row.id} className='enterprise-panel p-5'>
                <div className='flex items-start justify-between gap-3'>
                  <div className='flex min-w-0 items-center gap-2'>
                    <span className='flex size-9 shrink-0 items-center justify-center rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400'>
                      <Users className='size-4' aria-hidden='true' />
                    </span>
                    <h3 className='truncate font-semibold'>{t(row.name)}</h3>
                  </div>
                  {actions(row)}
                </div>
                <p className='text-muted-foreground mt-4 text-xs'>
                  {t('Department manager')}: {row.manager || '—'}
                </p>
                <div className='my-5 flex items-baseline justify-between gap-2'>
                  <span className='text-lg font-semibold tabular-nums'>
                    {money(used)}
                  </span>
                  <span className='text-muted-foreground text-xs'>
                    {t('of {{amount}} budget', { amount: money(row.budget) })}
                  </span>
                </div>
                <Progress
                  value={
                    row.budget > 0
                      ? Math.min(100, (used / row.budget) * 100)
                      : 0
                  }
                  aria-label={t('Budget used')}
                />
                <p className='text-muted-foreground mt-4 text-xs'>
                  {t('{{count}} members', { count })}
                </p>
              </section>
            )
          })}
          {visibleDepartments.length === 0 && (
            <EmptyState
              className='md:col-span-2 xl:col-span-3'
              title={t('No results found.')}
            />
          )}
        </div>
      )}
      <p className='text-muted-foreground text-xs'>
        {t(
          'Budgets and key limits are illustrative and are not enforced by the gateway.'
        )}
      </p>
      {editor && (
        <EntityEditor target={editor} onClose={() => setEditor(null)} />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        title={t('Delete {{name}}?', { name: deleteTarget?.name })}
        desc={t('This removes the record from the demo workspace only.')}
        destructive
        confirmText={t('Delete')}
        handleConfirm={remove}
      />
    </div>
  )
}
