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
import { useId } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { Dialog } from '@/components/dialog'
import { MultiSelect } from '@/components/multi-select'
import { Button } from '@/components/ui/button'
import { Field, FieldError, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'

import { DEMO_MODELS } from '../demo-data'
import { useEnterpriseDemoStore } from '../store'
import type { Department, EnterpriseKey, Member } from '../types'

export type EditorTarget = {
  kind: 'members' | 'departments' | 'keys'
  id?: string
  memberId?: string
}

export function EntityEditor(props: {
  target: EditorTarget
  onClose: () => void
}) {
  const { t } = useTranslation()
  const formId = useId()
  const departments = useEnterpriseDemoStore((state) => state.departments)
  const members = useEnterpriseDemoStore((state) => state.members)
  const keys = useEnterpriseDemoStore((state) => state.keys)
  const kind = props.target.kind
  const department = departments.find((item) => item.id === props.target.id)
  const member = members.find((item) => item.id === props.target.id)
  const key = keys.find((item) => item.id === props.target.id)
  let value: Department | Member | EnterpriseKey | undefined
  if (kind === 'departments') value = department
  if (kind === 'members') value = member
  if (kind === 'keys') value = key
  const schema = z
    .object({
      name: z
        .string()
        .trim()
        .min(1, t('Name is required'))
        .max(100, t('Maximum 100 characters')),
      budget: z
        .number()
        .finite()
        .min(0, t('Budget must be zero or greater'))
        .max(1000000, t('Budget must not exceed 1,000,000 USD')),
      email: z.string().trim(),
      departmentId: z.string(),
      memberId: z.string(),
      role: z.string().trim().max(100, t('Maximum 100 characters')),
      manager: z.string().trim().max(100, t('Maximum 100 characters')),
      models: z.array(z.string()),
      expiresAt: z.string(),
    })
    .superRefine((values, context) => {
      if (kind === 'members') {
        if (!z.email().safeParse(values.email).success) {
          context.addIssue({
            code: 'custom',
            path: ['email'],
            message: t('Please enter a valid email address'),
          })
        }
        if (
          members.some(
            (item) =>
              item.id !== props.target.id &&
              item.email.toLowerCase() === values.email.toLowerCase()
          )
        ) {
          context.addIssue({
            code: 'custom',
            path: ['email'],
            message: t('This email is already used in the demo organization'),
          })
        }
        if (!departments.some((item) => item.id === values.departmentId)) {
          context.addIssue({
            code: 'custom',
            path: ['departmentId'],
            message: t('Select a department'),
          })
        }
      }
      if (
        kind === 'departments' &&
        departments.some(
          (item) =>
            item.id !== props.target.id &&
            item.name.toLowerCase() === values.name.toLowerCase()
        )
      ) {
        context.addIssue({
          code: 'custom',
          path: ['name'],
          message: t('Department name already exists'),
        })
      }
      if (kind === 'keys') {
        if (
          !members.some((item) => item.id === values.memberId && item.enabled)
        ) {
          context.addIssue({
            code: 'custom',
            path: ['memberId'],
            message: t('Select an active member'),
          })
        }
        if (values.models.length === 0) {
          context.addIssue({
            code: 'custom',
            path: ['models'],
            message: t('Select at least one model'),
          })
        }
        if (
          values.expiresAt &&
          (!Number.isFinite(Date.parse(values.expiresAt)) ||
            new Date(`${values.expiresAt}T23:59:59`) < new Date())
        ) {
          context.addIssue({
            code: 'custom',
            path: ['expiresAt'],
            message: t('Expiration must be in the future'),
          })
        }
      }
    })
  type Values = z.infer<typeof schema>
  const form = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      name: value?.name ?? '',
      budget: value?.budget ?? 30,
      email: member?.email ?? '',
      departmentId: member?.departmentId ?? departments[0]?.id ?? '',
      memberId: key?.memberId ?? props.target.memberId ?? '',
      role: member?.role ?? '',
      manager: department?.manager ?? '',
      models: key?.models ?? [],
      expiresAt: key?.expiresAt ?? '',
    },
  })
  const errors = form.formState.errors
  const save = (values: Values) => {
    const id = props.target.id ?? crypto.randomUUID()
    const store = useEnterpriseDemoStore.getState()
    if (kind === 'departments') {
      store.saveDepartment({
        id,
        name: values.name,
        manager: values.manager,
        budget: values.budget,
      })
    }
    if (kind === 'members') {
      store.saveMember({
        id,
        name: values.name,
        email: values.email,
        departmentId: values.departmentId,
        role: values.role,
        budget: values.budget,
        enabled: member?.enabled ?? true,
      })
    }
    if (kind === 'keys') {
      store.saveKey({
        id,
        name: values.name,
        memberId: values.memberId,
        budget: values.budget,
        models: values.models,
        expiresAt: values.expiresAt,
        enabled: key?.enabled ?? true,
      })
    }
    props.onClose()
  }
  const titles = {
    members: t('Member details'),
    departments: t('Department details'),
    keys: t('Key assignment'),
  }

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
      title={titles[kind]}
      description={t(
        'Demo changes only. No invitations are sent and no API credentials are created.'
      )}
      footer={
        <>
          <Button variant='outline' onClick={props.onClose}>
            {t('Cancel')}
          </Button>
          <Button type='submit' form={formId}>
            {t('Save demo changes')}
          </Button>
        </>
      }
    >
      <form
        id={formId}
        onSubmit={form.handleSubmit(save)}
        noValidate
        className='space-y-4'
      >
        <Field>
          <FieldLabel htmlFor={`${formId}-name`}>{t('Name')}</FieldLabel>
          <Input
            id={`${formId}-name`}
            {...form.register('name')}
            aria-invalid={!!errors.name}
            aria-describedby={`${formId}-name-error`}
          />
          <FieldError id={`${formId}-name-error`} errors={[errors.name]} />
        </Field>
        {kind === 'members' && (
          <>
            <Field>
              <FieldLabel htmlFor={`${formId}-email`}>{t('Email')}</FieldLabel>
              <Input
                id={`${formId}-email`}
                type='email'
                {...form.register('email')}
                aria-invalid={!!errors.email}
                aria-describedby={`${formId}-email-error`}
              />
              <FieldError
                id={`${formId}-email-error`}
                errors={[errors.email]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${formId}-department`}>
                {t('Department')}
              </FieldLabel>
              <NativeSelect
                id={`${formId}-department`}
                {...form.register('departmentId')}
                aria-invalid={!!errors.departmentId}
                aria-describedby={`${formId}-department-error`}
                className='w-full'
              >
                <NativeSelectOption value=''>
                  {t('Select a department')}
                </NativeSelectOption>
                {departments.map((item) => (
                  <NativeSelectOption key={item.id} value={item.id}>
                    {t(item.name)}
                  </NativeSelectOption>
                ))}
              </NativeSelect>
              <FieldError
                id={`${formId}-department-error`}
                errors={[errors.departmentId]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${formId}-role`}>
                {t('Job title')}
              </FieldLabel>
              <Input
                id={`${formId}-role`}
                {...form.register('role')}
                aria-invalid={!!errors.role}
                aria-describedby={`${formId}-role-error`}
              />
              <FieldError id={`${formId}-role-error`} errors={[errors.role]} />
            </Field>
          </>
        )}
        {kind === 'departments' && (
          <Field>
            <FieldLabel htmlFor={`${formId}-manager`}>
              {t('Department manager')}
            </FieldLabel>
            <Input
              id={`${formId}-manager`}
              {...form.register('manager')}
              aria-invalid={!!errors.manager}
              aria-describedby={`${formId}-manager-error`}
            />
            <FieldError
              id={`${formId}-manager-error`}
              errors={[errors.manager]}
            />
          </Field>
        )}
        {kind === 'keys' && (
          <>
            <Field>
              <FieldLabel htmlFor={`${formId}-member`}>
                {t('Assigned member')}
              </FieldLabel>
              <NativeSelect
                id={`${formId}-member`}
                {...form.register('memberId')}
                aria-invalid={!!errors.memberId}
                aria-describedby={`${formId}-member-error`}
                className='w-full'
              >
                <NativeSelectOption value=''>
                  {t('Select an active member')}
                </NativeSelectOption>
                {members
                  .filter((item) => item.enabled)
                  .map((item) => (
                    <NativeSelectOption key={item.id} value={item.id}>
                      {item.name}
                    </NativeSelectOption>
                  ))}
              </NativeSelect>
              <FieldError
                id={`${formId}-member-error`}
                errors={[errors.memberId]}
              />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${formId}-models`}>
                {t('Allowed models')}
              </FieldLabel>
              <Controller
                control={form.control}
                name='models'
                render={({ field }) => (
                  <MultiSelect
                    id={`${formId}-models`}
                    placeholder={t('Allowed models')}
                    options={DEMO_MODELS.map((model) => ({
                      label: model,
                      value: model,
                    }))}
                    selected={field.value}
                    onChange={field.onChange}
                  />
                )}
              />
              <FieldError errors={[errors.models]} />
            </Field>
            <Field>
              <FieldLabel htmlFor={`${formId}-expires`}>
                {t('Expiration date')}
              </FieldLabel>
              <Input
                id={`${formId}-expires`}
                type='date'
                {...form.register('expiresAt')}
                aria-invalid={!!errors.expiresAt}
                aria-describedby={`${formId}-expires-error`}
              />
              <p className='text-muted-foreground text-xs'>
                {t('Leave empty for no expiration')}
              </p>
              <FieldError
                id={`${formId}-expires-error`}
                errors={[errors.expiresAt]}
              />
            </Field>
          </>
        )}
        <Field>
          <FieldLabel htmlFor={`${formId}-budget`}>
            {t('Monthly budget (USD)')}
          </FieldLabel>
          <Input
            id={`${formId}-budget`}
            type='number'
            min={0}
            max={1000000}
            step='0.01'
            {...form.register('budget', { valueAsNumber: true })}
            aria-invalid={!!errors.budget}
            aria-describedby={`${formId}-budget-error`}
          />
          <FieldError id={`${formId}-budget-error`} errors={[errors.budget]} />
        </Field>
      </form>
    </Dialog>
  )
}
