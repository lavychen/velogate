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
import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Building2 } from 'lucide-react'
import { useId, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Dialog } from '@/components/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { provisionWorkspace } from '@/features/enterprise/api'
import { useAuthStore } from '@/stores/auth-store'

import { isUserDeleted } from '../constants'
import type { User } from '../types'

export function UserEnterpriseCell(props: { user: User; workspace?: string }) {
  const { t } = useTranslation()
  const client = useQueryClient()
  const id = useId()
  const [open, setOpen] = useState(false)
  const role = useAuthStore((state) => state.auth.user?.role ?? 0)
  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, t('Name is required'))
      .max(100, t('Maximum 100 characters')),
  })
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { name: '' },
  })
  const mutation = useMutation({
    mutationFn: (values: z.infer<typeof schema>) =>
      provisionWorkspace(props.user.id, values.name),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ['enterprise'] })
      setOpen(false)
    },
  })
  if (props.workspace) {
    return (
      <Badge variant='secondary'>
        <Building2 className='size-3' aria-hidden='true' />
        <span className='max-w-36 truncate'>{t(props.workspace)}</span>
      </Badge>
    )
  }
  if (
    props.user.role >= role ||
    props.user.status !== 1 ||
    isUserDeleted(props.user)
  ) {
    return <span className='text-muted-foreground'>—</span>
  }
  return (
    <>
      <Button variant='outline' size='sm' onClick={() => setOpen(true)}>
        {t('Enable enterprise workspace')}
      </Button>
      <Dialog
        open={open}
        onOpenChange={(value) => {
          if (!mutation.isPending) setOpen(value)
        }}
        title={t('Enable enterprise workspace')}
        description={t(
          'This workspace belongs to {{username}} and uses their existing NewAPI wallet.',
          { username: props.user.username }
        )}
        footer={
          <>
            <Button
              variant='outline'
              onClick={() => setOpen(false)}
              disabled={mutation.isPending}
            >
              {t('Cancel')}
            </Button>
            <Button type='submit' form={id} disabled={mutation.isPending}>
              {t('Enable')}
            </Button>
          </>
        }
      >
        <form
          id={id}
          onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
          noValidate
        >
          <Field>
            <FieldLabel htmlFor={`${id}-name`}>
              {t('Workspace name')}
            </FieldLabel>
            <Input
              id={`${id}-name`}
              {...form.register('name')}
              aria-invalid={!!form.formState.errors.name}
              aria-describedby={`${id}-error`}
            />
            <FieldError
              id={`${id}-error`}
              errors={[form.formState.errors.name]}
            />
          </Field>
        </form>
      </Dialog>
    </>
  )
}
