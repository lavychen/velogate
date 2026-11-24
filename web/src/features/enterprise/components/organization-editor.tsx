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
import { useMutation } from '@tanstack/react-query'
import { useId } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Field, FieldLabel, FieldError } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { requireServerSuccess } from '@/lib/server-error-message'

import {
  createDepartment,
  updateDepartment,
  createEmployee,
  updateEmployee,
} from '../api'
import type { Department, Employee } from '../api-types'
import { useRefreshEnterprise } from '../hooks/use-enterprise'

export type OrganizationTarget =
  | { kind: 'employees'; value?: Employee; departmentId?: number }
  | { kind: 'departments'; value?: Department }
export function OrganizationEditor(props: {
  target: OrganizationTarget
  departments: Department[]
  onClose: () => void
}) {
  const { t } = useTranslation()
  const formId = useId()
  const refresh = useRefreshEnterprise()
  const employee =
    props.target.kind === 'employees' ? props.target.value : undefined
  const department =
    props.target.kind === 'departments' ? props.target.value : undefined
  const schema = z.object({
    name: z
      .string()
      .trim()
      .min(1, t('Name is required'))
      .max(100, t('Maximum 100 characters')),
    email: z
      .string()
      .trim()
      .max(254)
      .refine(
        (value) => !value || z.email().safeParse(value).success,
        t('Please enter a valid email address')
      ),
    employee_no: z.string().trim().max(100),
    remark: z.string().trim().max(1000),
    parent_id: z.string(),
    sort: z.number().int().min(-1_000_000).max(1_000_000),
    department_id: z
      .string()
      .refine(
        (value) =>
          props.target.kind !== 'employees' ||
          props.departments.some(
            (row) => row.id === Number(value) && row.status === 1
          ),
        t('Select a department')
      ),
    enabled: z.boolean(),
  })
  type Values = z.infer<typeof schema>
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: props.target.value?.name ?? '',
      email: employee?.email ?? '',
      employee_no: employee?.employee_no ?? '',
      remark: employee?.remark ?? department?.description ?? '',
      department_id: String(
        employee?.department_id ??
          (props.target.kind === 'employees'
            ? props.target.departmentId
            : undefined) ??
          props.departments.find((row) => row.status === 1)?.id ??
          ''
      ),
      parent_id: String(department?.parent_id ?? ''),
      sort: department?.sort ?? 0,
      enabled: (props.target.value?.status ?? 1) === 1,
    },
  })
  const mutation = useMutation({
    mutationFn: async (values: Values) => {
      if (props.target.kind === 'departments') {
        const input = {
          name: values.name,
          description: values.remark,
          parent_id: values.parent_id ? Number(values.parent_id) : null,
          sort: values.sort,
          status: values.enabled ? 1 : 0,
        }
        return requireServerSuccess(
          await (props.target.value
            ? updateDepartment(props.target.value.id, input)
            : createDepartment(input))
        )
      }
      const input = {
        name: values.name,
        email: values.email,
        employee_no: values.employee_no,
        remark: values.remark,
        department_id: Number(values.department_id),
        status: values.enabled ? 1 : 0,
      }
      return requireServerSuccess(
        await (props.target.value
          ? updateEmployee(props.target.value.id, input)
          : createEmployee(input))
      )
    },
    onSuccess: async () => {
      await refresh()
      props.onClose()
    },
  })
  const textFields = [{ name: 'name', label: t('Name') }] as {
    name: 'name' | 'email' | 'employee_no' | 'remark'
    label: string
  }[]
  if (props.target.kind === 'employees') {
    textFields.push(
      { name: 'email', label: t('Email') },
      { name: 'employee_no', label: t('Employee number') }
    )
  }
  textFields.push({ name: 'remark', label: t('Remark') })
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !mutation.isPending) props.onClose()
      }}
      title={
        props.target.kind === 'employees'
          ? t('Employee details')
          : t('Department details')
      }
      footer={
        <>
          <Button
            variant='outline'
            disabled={mutation.isPending}
            onClick={props.onClose}
          >
            {t('Cancel')}
          </Button>
          <Button type='submit' form={formId} disabled={mutation.isPending}>
            {t('Save')}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={form.handleSubmit((values) => mutation.mutate(values))}
        noValidate
        className='space-y-4'
      >
        {textFields.map((field) => (
          <Field key={field.name}>
            <FieldLabel htmlFor={`${formId}-${field.name}`}>
              {field.label}
            </FieldLabel>
            <Input
              id={`${formId}-${field.name}`}
              {...form.register(field.name)}
              aria-invalid={!!form.formState.errors[field.name]}
              aria-describedby={`${formId}-${field.name}-error`}
            />
            <FieldError
              id={`${formId}-${field.name}-error`}
              errors={[form.formState.errors[field.name]]}
            />
          </Field>
        ))}
        {props.target.kind === 'employees' ? (
          <Field>
            <FieldLabel htmlFor={`${formId}-department`}>
              {t('Department')}
            </FieldLabel>
            <NativeSelect
              id={`${formId}-department`}
              {...form.register('department_id')}
              aria-invalid={!!form.formState.errors.department_id}
            >
              <NativeSelectOption value=''>
                {t('Select a department')}
              </NativeSelectOption>
              {props.departments
                .filter((row) => row.status === 1)
                .map((row) => (
                  <NativeSelectOption key={row.id} value={row.id}>
                    {row.name}
                  </NativeSelectOption>
                ))}
            </NativeSelect>
            <FieldError errors={[form.formState.errors.department_id]} />
          </Field>
        ) : (
          <>
            <Field>
              <FieldLabel htmlFor={`${formId}-parent`}>
                {t('Parent department')}
              </FieldLabel>
              <NativeSelect
                id={`${formId}-parent`}
                {...form.register('parent_id')}
              >
                <NativeSelectOption value=''>{t('None')}</NativeSelectOption>
                {props.departments
                  .filter(
                    (row) => row.id !== department?.id && row.status === 1
                  )
                  .map((row) => (
                    <NativeSelectOption key={row.id} value={row.id}>
                      {row.name}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
            </Field>
            <Field>
              <FieldLabel htmlFor={`${formId}-sort`}>
                {t('Sort order')}
              </FieldLabel>
              <Input
                id={`${formId}-sort`}
                type='number'
                {...form.register('sort', { valueAsNumber: true })}
                aria-invalid={!!form.formState.errors.sort}
              />
              <FieldError errors={[form.formState.errors.sort]} />
            </Field>
          </>
        )}
        <div className='flex items-center justify-between'>
          <label htmlFor={`${formId}-enabled`} className='text-sm'>
            {t('Enabled')}
          </label>
          <Switch
            id={`${formId}-enabled`}
            checked={form.watch('enabled')}
            onCheckedChange={(checked) => form.setValue('enabled', checked)}
          />
        </div>
      </form>
    </Dialog>
  )
}
