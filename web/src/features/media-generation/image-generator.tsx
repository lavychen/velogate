import { zodResolver } from '@hookform/resolvers/zod'
import { Download01Icon, MagicWand01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { useMutation } from '@tanstack/react-query'
import { nanoid } from 'nanoid'
import type { ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { EmptyState } from '@/components/empty-state'
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
import { GenerationWorkspace } from './generation-workspace'

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
        images: images.map((url) => ({ id: nanoid(), url })),
        prompt: values.prompt,
      }
    },
    meta: { errorToast: false },
  })

  return (
    <GenerationWorkspace
      pending={submit.isPending}
      settings={
        <form onSubmit={form.handleSubmit((values) => submit.mutate(values))}>
          <FieldSet disabled={submit.isPending}>
            {props.connectionFields}
            <Separator />
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.prompt)}>
                <FieldLabel htmlFor='image-prompt'>{t('Prompt')}</FieldLabel>
                <Textarea
                  id='image-prompt'
                  rows={6}
                  className='min-h-36 resize-y'
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
              <div className='grid grid-cols-2 gap-3'>
                <Field>
                  <FieldLabel htmlFor='image-size'>
                    {t('Image size')}
                  </FieldLabel>
                  <NativeSelect
                    id='image-size'
                    className='w-full'
                    {...form.register('size')}
                  >
                    {sizes.map((size) => (
                      <NativeSelectOption key={size} value={size}>
                        {size.replace('x', ' × ')}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
                <Field>
                  <FieldLabel htmlFor='image-count'>
                    {t('Image count')}
                  </FieldLabel>
                  <NativeSelect
                    id='image-count'
                    className='w-full'
                    {...form.register('count', { valueAsNumber: true })}
                  >
                    {(isDallE3 ? [1] : [1, 2, 3, 4]).map((count) => (
                      <NativeSelectOption key={count} value={count}>
                        {count}
                      </NativeSelectOption>
                    ))}
                  </NativeSelect>
                </Field>
              </div>
              {qualities.length > 0 && (
                <Field>
                  <FieldLabel htmlFor='image-quality'>
                    {t('Quality')}
                  </FieldLabel>
                  <NativeSelect
                    id='image-quality'
                    className='w-full'
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
              <Button type='submit' className='w-full'>
                <HugeiconsIcon
                  icon={MagicWand01Icon}
                  data-icon='inline-start'
                  aria-hidden='true'
                />
                {submit.isPending
                  ? t('Generating images...')
                  : t('Generate image')}
              </Button>
            </FieldGroup>
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
      {submit.isIdle && (
        <EmptyState
          title={t('Image generation')}
          description={t('Generated images will appear here.')}
        />
      )}
      {submit.isSuccess && (
        <div className='space-y-4'>
          <p className='text-muted-foreground text-sm break-words whitespace-pre-wrap'>
            {submit.data.prompt}
          </p>
          <div
            className={
              submit.data.images.length === 1
                ? 'grid gap-4'
                : 'grid gap-4 sm:grid-cols-2'
            }
          >
            {submit.data.images.map((image, index) => (
              <figure
                key={image.id}
                className='bg-background min-w-0 space-y-3 rounded-lg border p-3'
              >
                <img
                  src={image.url}
                  alt={submit.data.prompt}
                  className='max-h-[60vh] w-full rounded-md object-contain'
                  loading='lazy'
                />
                <figcaption>
                  <Button
                    variant='outline'
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
        </div>
      )}
    </GenerationWorkspace>
  )
}
