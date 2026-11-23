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
import { useMutation } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Dialog } from '@/components/dialog'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { ApiKeysMutateDrawer } from '@/features/keys/components/api-keys-mutate-drawer'
import { ApiKeysProvider } from '@/features/keys/components/api-keys-provider'
import { requireServerSuccess } from '@/lib/server-error-message'

import { updateTokenAssignment } from '../api'
import { useRefreshEnterprise, useOrganization } from '../hooks/use-enterprise'
import { useKeyDialogStore } from '../key-dialog-store'

function AssignmentFlow(props: {
  employeeId?: number
  tokenId?: number
  onClose: () => void
}) {
  const { t } = useTranslation()
  const { departments, employees } = useOrganization()
  const [employeeId, setEmployeeId] = useState(props.employeeId ?? 0)
  const [assignmentType, setAssignmentType] = useState<
    'employee' | 'department'
  >('employee')
  const [departmentId, setDepartmentId] = useState(0)
  const refresh = useRefreshEnterprise()
  const reassignment = useMutation({
    mutationFn: async () => {
      if (!props.tokenId) return
      return requireServerSuccess(
        await updateTokenAssignment(props.tokenId, {
          assignment_type: assignmentType,
          department_id:
            assignmentType === 'employee'
              ? (employee?.department_id ?? 0)
              : departmentId,
          employee_id: assignmentType === 'employee' ? employeeId : null,
        })
      )
    },
    onSuccess: async () => {
      await refresh()
      props.onClose()
    },
  })
  const [configure, setConfigure] = useState(!!props.employeeId)
  const [createdKey, setCreatedKey] = useState('')
  const employee = employees.data?.find((row) => row.id === employeeId)
  const eligible =
    employees.data?.filter(
      (row) =>
        row.status === 1 &&
        departments.data?.some(
          (department) =>
            department.id === row.department_id && department.status === 1
        )
    ) ?? []

  if (createdKey) {
    return (
      <Dialog
        open
        onOpenChange={(open) => {
          if (!open) props.onClose()
        }}
        title={t('Key created and assigned')}
        description={t(
          'Copy this key now. This creation dialog will not show it again after closing.'
        )}
        footer={<Button onClick={props.onClose}>{t('Done')}</Button>}
      >
        <div className='bg-muted flex items-start gap-2 rounded-lg border p-4'>
          <code
            className='min-w-0 flex-1 text-sm break-all'
            aria-label={t('New API key')}
          >
            {createdKey}
          </code>
          <CopyButton value={createdKey} aria-label={t('Copy API key')} />
        </div>
      </Dialog>
    )
  }
  if (configure && employee && eligible.some((row) => row.id === employee.id)) {
    return (
      <ApiKeysProvider>
        <ApiKeysMutateDrawer
          open
          onOpenChange={(open) => {
            if (!open && !createdKey) props.onClose()
          }}
          assignment={{
            assignment_type: 'employee',
            department_id: employee.department_id,
            employee_id: employee.id,
          }}
          onCreated={setCreatedKey}
        />
      </ApiKeysProvider>
    )
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
      title={t('Assign Key')}
      description={t(
        'The key uses the current NewAPI account wallet and is assigned to the selected employee.'
      )}
      footer={
        <Button
          disabled={
            reassignment.isPending ||
            (assignmentType === 'employee'
              ? !eligible.some((row) => row.id === employeeId)
              : !departments.data?.some(
                  (row) => row.id === departmentId && row.status === 1
                ))
          }
          onClick={() => {
            if (props.tokenId) reassignment.mutate()
            else setConfigure(true)
          }}
        >
          {t('Continue')}
        </Button>
      }
    >
      {(employees.isPending || departments.isPending) && <LoadingState />}
      {(employees.isError || departments.isError) && (
        <ErrorState
          onRetry={() => {
            void employees.refetch()
            void departments.refetch()
          }}
        />
      )}
      {!employees.isPending &&
        !departments.isPending &&
        !employees.isError &&
        !departments.isError && (
          <div className='space-y-3'>
            {props.tokenId && (
              <NativeSelect
                aria-label={t('Assignment type')}
                value={assignmentType}
                onChange={(event) =>
                  setAssignmentType(
                    event.target.value as 'employee' | 'department'
                  )
                }
              >
                <NativeSelectOption value='employee'>
                  {t('Employee')}
                </NativeSelectOption>
                <NativeSelectOption value='department'>
                  {t('Department')}
                </NativeSelectOption>
              </NativeSelect>
            )}
            {props.tokenId && assignmentType === 'department' && (
              <NativeSelect
                aria-label={t('Department')}
                value={departmentId}
                onChange={(event) =>
                  setDepartmentId(Number(event.target.value))
                }
              >
                <NativeSelectOption value={0}>
                  {t('Select a department')}
                </NativeSelectOption>
                {departments.data
                  ?.filter((row) => row.status === 1)
                  .map((row) => (
                    <NativeSelectOption key={row.id} value={row.id}>
                      {row.name}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
            )}

            {assignmentType === 'employee' && (
              <NativeSelect
                className='w-full'
                aria-label={t('Assigned employee')}
                value={employeeId}
                onChange={(event) => setEmployeeId(Number(event.target.value))}
              >
                <NativeSelectOption value={0}>
                  {t('Select an active employee')}
                </NativeSelectOption>
                {eligible.map((row) => (
                  <NativeSelectOption key={row.id} value={row.id}>
                    {row.name} · {row.department_name}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
            )}
            {eligible.length === 0 && (
              <p className='text-muted-foreground text-sm'>
                {t(
                  'Add an active department and employee before assigning a key.'
                )}
              </p>
            )}
          </div>
        )}
    </Dialog>
  )
}

export function KeyAssignmentDialog() {
  const open = useKeyDialogStore((state) => state.open)
  const employeeId = useKeyDialogStore((state) => state.employeeId)
  const tokenId = useKeyDialogStore((state) => state.tokenId)
  const close = useKeyDialogStore((state) => state.close)
  return open ? (
    <AssignmentFlow employeeId={employeeId} tokenId={tokenId} onClose={close} />
  ) : null
}
