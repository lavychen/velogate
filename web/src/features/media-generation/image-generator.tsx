import { zodResolver } from '@hookform/resolvers/zod'
import { Download01Icon, MagicWand01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation } from '@tanstack/react-query'
import { nanoid } from 'nanoid'
import type { ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { getServerErrorMessage } from '@/lib/server-error-message'

import { generateImages } from './api'
import { GenerationDetails } from './generation-details'
import { GenerationEmptyState } from './generation-empty-state'
import { GenerationHistory } from './generation-history'
import { GenerationSizePicker } from './generation-size-picker'
import { GenerationWorkspace } from './generation-workspace'
import { useGenerationHistory } from './use-generation-history'

export function ImageGenerator(props: {
  apiKey: string
  model: string
  connectionFields: ReactNode
}) {
  const { t } = useTranslation()
  const isDallE2 = /dall-e-2/i.test(props.model)
  const isDallE3 = /dall-e-3/i.test(props.model)
  const isGptImage = /gpt-image/i.test(props.model)
  const supportsNegativePrompt = !isDallE2 && !isDallE3 && !isGptImage
  let sizes = ['1024x1024', '1280x720', '720x1280', '1152x864']
  if (isDallE2) sizes = ['256x256', '512x512', '1024x1024']
  if (isDallE3) sizes = ['1024x1024', '1792x1024', '1024x1792']
  if (isGptImage) sizes = ['1024x1024', '1536x1024', '1024x1536']
  let qualities: { value: string; label: string }[] = []
  if (isGptImage) {
    qualities = [
      { value: 'auto', label: t('Auto') },
      { value: 'low', label: t('Low') },
      { value: 'medium', label: t('Medium') },
      { value: 'high', label: t('High') },
    ]
  } else if (isDallE3) {
    qualities = [
      { value: 'standard', label: t('Standard') },
      { value: 'hd', label: 'HD' },
    ]
  }
  const schema = z.object({
    prompt: z.string().trim().min(1, t('Please enter a prompt')),
    negativePrompt: z.string(),
    size: z.string().refine((value) => sizes.includes(value)),
    count: z.coerce
      .number<number>()
      .int()
      .min(1)
      .max(isDallE3 ? 1 : 4),
    quality: z.string(),
  })
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      prompt: '',
      negativePrompt: '',
      size: '1024x1024',
      count: 1,
      quality: '',
    },
  })
  const size = useWatch({ control: form.control, name: 'size' })
  const history = useGenerationHistory<{
    id: string
    images: { id: string; url: string }[]
    prompt: string
    values: z.infer<typeof schema>
  }>()
  const submit = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const body: Record<string, unknown> = {
        model: props.model,
        prompt: values.prompt,
        size: values.size,
        n: values.count,
      }
      if (supportsNegativePrompt && values.negativePrompt.trim()) {
        body.negative_prompt = values.negativePrompt.trim()
      }
      if (qualities.some((quality) => quality.value === values.quality)) {
        body.quality = values.quality
      }
      const images = await generateImages(props.apiKey, body)
      if (!images.length) {
        throw new Error(t('The response did not include any images.'))
      }
      return {
        id: nanoid(),
        values,
        images: images.map((url) => ({ id: nanoid(), url })),
        prompt: values.prompt,
      }
    },
    onSuccess: history.add,
    meta: { errorToast: false },
  })

  const result = history.selected
  let status = t('Ready')
  if (result) status = t('Completed')
  if (submit.isPending) status = t('Generating images...')
  if (submit.isError) status = t('Generation failed')

  return (
    <GenerationWorkspace
      mode='image'
      model={props.model}
      status={status}
      pending={submit.isPending}
      history={
        <GenerationHistory
          mode='image'
          entries={history.entries.map((entry) => ({
            ...entry,
            thumbnail: entry.images[0]?.url,
          }))}
          selectedId={result?.id}
          onSelect={(id) => {
            history.select(id)
            submit.reset()
          }}
          disabled={submit.isPending}
        />
      }
      settings={
        <form
          className='flex min-h-0 flex-1 flex-col'
          onSubmit={form.handleSubmit((values) => submit.mutate(values))}
        >
          <FieldSet
            disabled={submit.isPending}
            className='min-h-0 flex-1 gap-0'
          >
            <div className='flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5'>
              {props.connectionFields}
              <Separator />
              <FieldGroup>
                <Field data-invalid={Boolean(form.formState.errors.prompt)}>
                  <FieldLabel htmlFor='image-prompt'>{t('Prompt')}</FieldLabel>
                  <Textarea
                    id='image-prompt'
                    rows={6}
                    className='bg-muted/20 min-h-36 resize-y rounded-xl p-3 text-sm'
                    {...form.register('prompt')}
                    placeholder={t('Describe the image you want to generate')}
                    aria-invalid={Boolean(form.formState.errors.prompt)}
                    aria-describedby={
                      form.formState.errors.prompt
                        ? 'image-prompt-error'
                        : undefined
                    }
                  />
                  <FieldError
                    id='image-prompt-error'
                    errors={[form.formState.errors.prompt]}
                  />
                </Field>
                {supportsNegativePrompt && (
                  <Field>
                    <FieldLabel htmlFor='image-negative-prompt'>
                      {t('Negative prompt')}
                    </FieldLabel>
                    <Input
                      id='image-negative-prompt'
                      {...form.register('negativePrompt')}
                    />
                  </Field>
                )}
                <Field>
                  <FieldLabel id='image-size-label'>
                    {t('Image size')}
                  </FieldLabel>
                  <GenerationSizePicker
                    labelId='image-size-label'
                    value={size}
                    sizes={sizes}
                    onChange={(value) =>
                      form.setValue('size', value, { shouldDirty: true })
                    }
                    disabled={submit.isPending}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor='image-count'>
                    {t('Image count')}
                  </FieldLabel>
                  <NativeSelect
                    id='image-count'
                    className='w-full [&_select]:h-10 [&_select]:rounded-xl'
                    {...form.register('count', { valueAsNumber: true })}
                  >
                    {(isDallE3 ? [1] : [1, 2, 3, 4]).map((count) => (
                      <NativeSelectOption key={count} value={count}>
                        {count}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                {qualities.length > 0 && (
                  <Field>
                    <FieldLabel htmlFor='image-quality'>
                      {t('Quality')}
                    </FieldLabel>
                    <NativeSelect
                      id='image-quality'
                      className='w-full [&_select]:h-10 [&_select]:rounded-xl'
                      {...form.register('quality')}
                    >
                      <NativeSelectOption value=''>
                        {t('Default')}
                      </NativeSelectOption>
                      {qualities.map((quality) => (
                        <NativeSelectOption
                          key={quality.value}
                          value={quality.value}
                        >
                          {quality.label}
                        </NativeSelectOption>
                      ))}
                    </NativeSelect>
                  </Field>
                )}
              </FieldGroup>
            </div>
            <div className='bg-background shrink-0 border-t p-4'>
              <Button
                type='submit'
                className='h-11 w-full rounded-xl'
                disabled={submit.isPending}
              >
                <HugeiconsIcon
                  icon={MagicWand01Icon}
                  data-icon='inline-start'
                  aria-hidden='true'
                />
                {submit.isPending
                  ? t('Generating images...')
                  : t('Generate image')}
              </Button>
            </div>
          </FieldSet>
        </form>
      }
    >
      {submit.isPending && <LoadingState message={t('Generating images...')} />}
      {submit.isError && (
        <ErrorState
          title={t('Generation failed')}
          description={getServerErrorMessage(submit.error)}
        />
      )}
      {!result && submit.isIdle && (
        <GenerationEmptyState
          mode='image'
          onPrompt={(prompt) => {
            form.setValue('prompt', prompt, {
              shouldDirty: true,
              shouldValidate: true,
            })
            form.setFocus('prompt')
          }}
        />
      )}
      {result && !submit.isPending && !submit.isError && (
        <div className='mx-auto flex w-full max-w-4xl flex-col gap-4'>
          <div
            className={
              result.images.length === 1
                ? 'grid gap-4'
                : 'grid gap-4 sm:grid-cols-2'
            }
          >
            {result.images.map((image, index) => (
              <figure
                key={image.id}
                className='bg-background min-w-0 overflow-hidden rounded-xl border shadow-sm'
              >
                <div className='bg-background/60 p-2 sm:p-3'>
                  <img
                    src={image.url}
                    alt={result.prompt}
                    className='max-h-[55vh] w-full rounded-lg object-contain'
                    loading='lazy'
                  />
                </div>
                <figcaption className='flex items-center justify-end border-t px-3 py-2'>
                  <Button
                    variant='ghost'
                    role='link'
                    size='sm'
                    render={
                      <a
                        href={image.url}
                        download={`image-${index + 1}.png`}
                        target='_blank'
                        rel='noopener noreferrer'
                      />
                    }
                  >
                    <HugeiconsIcon
                      icon={Download01Icon}
                      data-icon='inline-start'
                      aria-hidden='true'
                    />
                    {t('Download')}
                  </Button>
                </figcaption>
              </figure>
            ))}
          </div>
          <GenerationDetails
            prompt={result.prompt}
            metadata={
              <>
                <span>{props.model}</span>
                <span>{result.values.size.replace('x', ' × ')}</span>
              </>
            }
            onReuse={() => {
              form.reset(result.values)
              requestAnimationFrame(() => form.setFocus('prompt'))
            }}
          />
        </div>
      )}
    </GenerationWorkspace>
  )
}
