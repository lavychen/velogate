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
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'

import { getTokenAssignments } from '../api'
import { useKeyDialogStore } from '../key-dialog-store'

export function KeyOwnershipCell(props: { tokenId: number }) {
  const { t } = useTranslation()
  const userId = useAuthStore((state) => state.auth.user?.id)
  const assignments = useQuery({
    queryKey: ['enterprise', userId, 'assignments'],
    queryFn: getTokenAssignments,
    enabled: !!userId,
  })
  const show = useKeyDialogStore((state) => state.showExisting)
  const assignment = assignments.data?.find(
    (row) => row.token_id === props.tokenId
  )
  return (
    <div className='flex min-w-0 flex-col items-start gap-1'>
      {assignment && (
        <p className='max-w-40 truncate text-xs'>
          {assignment.employee_name || assignment.department_name}
        </p>
      )}
      <Button
        variant='link'
        size='sm'
        className='h-auto p-0 text-xs'
        onClick={() => show(props.tokenId)}
        disabled={assignments.isPending || assignments.isError}
      >
        {assignment ? t('Reassign Key') : t('Assign Key')}
      </Button>
    </div>
  )
}
