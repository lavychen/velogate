import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation } from '@tanstack/react-query'
import { Download, Image, Sparkles } from 'lucide-react'
import { nanoid } from 'nanoid'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Textarea } from '@/components/ui/textarea'
import { getServerErrorMessage } from '@/lib/server-error-message'

import { generateImages } from './api'

export function ImageGenerator(props: { apiKey: string; model: string }) {
  const { t } = useTranslation()
  const schema = z.object({
    prompt: z.string().trim().min(1, t('Please enter a prompt')),
    negativePrompt: z.string(),
    size: z.string(),
    count: z.coerce.number<number>().int().min(1).max(4),
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
  const isDallE3 = /dall-e-3/i.test(props.model)
  const isGptImage = /gpt-image/i.test(props.model)
  let sizes = ['1024x1024', '1280x720', '720x1280', '1152x864']
  if (/dall-e-2/i.test(props.model)) sizes = ['256x256', '512x512', '1024x1024']
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
  } else if (!/dall-e-2/i.test(props.model)) {
    qualities = [
      { value: 'standard', label: t('Standard') },
      { value: 'hd', label: 'HD' },
    ]
  }
  const submit = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const body: Record<string, unknown> = {
        model: props.model,
        prompt: values.prompt,
        size: sizes.includes(values.size) ? values.size : sizes[0],
        n: isDallE3 ? 1 : values.count,
      }
      if (values.negativePrompt.trim()) {
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
    <div className='grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]'>
      <Card>
        <CardContent>
          <form
            className='space-y-5'
            onSubmit={form.handleSubmit((values) => submit.mutate(values))}
          >
            <fieldset disabled={submit.isPending} className='space-y-5'>
              <div className='grid gap-2'>
                <Label htmlFor='image-prompt'>{t('Prompt')}</Label>
                <Textarea
                  id='image-prompt'
                  rows={6}
                  {...form.register('prompt')}
                  placeholder={t('Describe the image you want to generate')}
                  aria-invalid={Boolean(form.formState.errors.prompt)}
                  aria-describedby={
                    form.formState.errors.prompt
                      ? 'image-prompt-error'
                      : undefined
                  }
                />
                {form.formState.errors.prompt && (
                  <p
                    id='image-prompt-error'
                    role='alert'
                    className='text-destructive text-sm'
                  >
                    {form.formState.errors.prompt.message}
                  </p>
                )}
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='image-negative-prompt'>
                  {t('Negative prompt')}
                </Label>
                <Input
                  id='image-negative-prompt'
                  {...form.register('negativePrompt')}
                />
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='image-size'>{t('Image size')}</Label>
                <NativeSelect
                  id='image-size'
                  className='w-full'
                  {...form.register('size')}
                >
                  {sizes.map((size) => (
                    <NativeSelectOption key={size} value={size}>
                      {size}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='image-count'>{t('Image count')}</Label>
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
              </div>
              {qualities.length > 0 && (
                <div className='grid gap-2'>
                  <Label htmlFor='image-quality'>{t('Quality')}</Label>
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
                </div>
              )}
              <Button type='submit' className='w-full'>
                <Sparkles className='size-4' />
                {t('Generate image')}
              </Button>
            </fieldset>
          </form>
        </CardContent>
      </Card>
      <Card className='min-w-0'>
        <CardContent aria-live='polite'>
          {submit.isPending && (
            <LoadingState message={t('Generating images...')} />
          )}
          {submit.isError && (
            <ErrorState
              title={t('Generation failed')}
              description={getServerErrorMessage(submit.error)}
            />
          )}
          {submit.isIdle && (
            <EmptyState
              icon={Image}
              title={t('Image generation')}
              description={t('Generated images will appear here.')}
            />
          )}
          {submit.isSuccess && (
            <div className='grid gap-4 sm:grid-cols-2'>
              {submit.data.images.map((image, index) => (
                <div key={image.id} className='space-y-2'>
                  <img
                    src={image.url}
                    alt={submit.data.prompt}
                    className='w-full rounded-lg border object-contain'
                    loading='lazy'
                  />
                  <Button
                    variant='outline'
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
                    <Download className='size-4' />
                    {t('Download')}
                  </Button>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
