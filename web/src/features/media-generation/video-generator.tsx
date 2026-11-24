import { zodResolver } from '@hookform/resolvers/zod'
import { Download01Icon, MagicWand01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { skipToken, useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { CopyButton } from '@/components/copy-button'
import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
  FieldSet,
} from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { getServerErrorMessage } from '@/lib/server-error-message'

import { generateVideo, getVideoContent, getVideoTask } from './api'
import { GenerationWorkspace } from './generation-workspace'

function VideoResult(props: { apiKey: string; keyId: number; taskId: string }) {
  const { t } = useTranslation()
  const [url, setUrl] = useState('')
  const content = useQuery({
    queryKey: ['generated-video-content', props.keyId, props.taskId],
    queryFn: ({ signal }) =>
      getVideoContent(props.apiKey, props.taskId, signal),
    meta: { errorToast: false },
    retry: false,
    gcTime: 0,
    staleTime: Infinity,
  })
  useEffect(() => {
    if (!content.data) return
    const objectUrl = URL.createObjectURL(content.data)
    setUrl(objectUrl)
    return () => URL.revokeObjectURL(objectUrl)
  }, [content.data])
  if (content.isError) {
    return (
      <ErrorState
        description={getServerErrorMessage(content.error)}
        onRetry={() => void content.refetch()}
      />
    )
  }
  if (!url) return <LoadingState />
  return (
    <div className='space-y-4'>
      <video
        src={url}
        controls
        playsInline
        className='max-h-[65vh] w-full rounded-lg bg-black'
        aria-label={t('Generated video')}
      />
      <Button
        variant='outline'
        role='link'
        render={<a href={url} download={`${props.taskId}.mp4`} />}
      >
        <HugeiconsIcon
          icon={Download01Icon}
          data-icon='inline-start'
          aria-hidden='true'
        />
        {t('Download')}
      </Button>
    </div>
  )
}

export function VideoGenerator(props: {
  apiKey: string
  keyId: number
  model: string
  connectionFields: ReactNode
}) {
  const { t } = useTranslation()
  const isSora = /^sora-2(?:-|$)/i.test(props.model)
  const schema = z.object({
    prompt: z.string().trim().min(1, t('Please enter a prompt')),
    seconds: z.enum(['', '4', '8', '12']),
    size: z.enum(['', '1280x720', '720x1280']),
  })
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      prompt: '',
      seconds: isSora ? ('4' as const) : ('' as const),
      size: isSora ? ('1280x720' as const) : ('' as const),
    },
  })
  const submit = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const body: Record<string, string> = {
        model: props.model,
        prompt: values.prompt,
      }
      if (values.seconds) body.seconds = values.seconds
      if (values.size) body.size = values.size
      const task = await generateVideo(props.apiKey, body)
      if (!task.id) {
        throw new Error(
          t('The response did not include a task ID or video URL.')
        )
      }
      return task
    },
    meta: { errorToast: false },
  })
  const taskId = submit.data?.id
  const task = useQuery({
    queryKey: ['generated-video-task', props.keyId, taskId],
    queryFn: taskId
      ? ({ signal }) => getVideoTask(props.apiKey, taskId, signal)
      : skipToken,
    enabled: Boolean(taskId) && !submit.isPending,
    initialData: submit.data,
    refetchInterval: (query) => {
      const status = query.state.data?.status
      if (query.state.error || status === 'completed' || status === 'failed') {
        return false
      }
      return 5000
    },
    refetchOnWindowFocus: false,
    gcTime: 0,
    meta: { errorToast: false },
    retry: false,
  })
  const currentTask = task.data ?? submit.data
  const isGenerating =
    submit.isPending ||
    (!!currentTask && ['queued', 'in_progress'].includes(currentTask.status))
  const requestError = submit.error ?? task.error

  return (
    <GenerationWorkspace
      pending={isGenerating && !requestError}
      settings={
        <form onSubmit={form.handleSubmit((values) => submit.mutate(values))}>
          <FieldSet disabled={isGenerating}>
            {props.connectionFields}
            <Separator />
            <FieldGroup>
              <Field data-invalid={Boolean(form.formState.errors.prompt)}>
                <FieldLabel htmlFor='video-prompt'>{t('Prompt')}</FieldLabel>
                <Textarea
                  id='video-prompt'
                  rows={6}
                  className='min-h-36 resize-y'
                  {...form.register('prompt')}
                  placeholder={t('Describe the video you want to generate')}
                  aria-invalid={Boolean(form.formState.errors.prompt)}
                  aria-describedby={
                    form.formState.errors.prompt
                      ? 'video-prompt-error'
                      : undefined
                  }
                />
                <FieldError
                  id='video-prompt-error'
                  errors={[form.formState.errors.prompt]}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor='video-duration'>
                  {t('Duration')}
                </FieldLabel>
                <NativeSelect
                  id='video-duration'
                  className='w-full'
                  {...form.register('seconds')}
                >
                  <NativeSelectOption value=''>
                    {t('Default')}
                  </NativeSelectOption>
                  {['4', '8', '12'].map((seconds) => (
                    <NativeSelectOption key={seconds} value={seconds}>
                      {t('{{count}} seconds', { count: Number(seconds) })}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </Field>
              <Field>
                <FieldLabel htmlFor='video-size'>{t('Video size')}</FieldLabel>
                <NativeSelect
                  id='video-size'
                  className='w-full'
                  {...form.register('size')}
                >
                  <NativeSelectOption value=''>
                    {t('Default')}
                  </NativeSelectOption>
                  <NativeSelectOption value='1280x720'>
                    1280 × 720 (16:9)
                  </NativeSelectOption>
                  <NativeSelectOption value='720x1280'>
                    720 × 1280 (9:16)
                  </NativeSelectOption>
                </NativeSelect>
              </Field>
              <Button type='submit' className='w-full'>
                <HugeiconsIcon
                  icon={MagicWand01Icon}
                  data-icon='inline-start'
                  aria-hidden='true'
                />
                {isGenerating && !requestError
                  ? t('Generating video...')
                  : t('Generate video')}
              </Button>
            </FieldGroup>
          </FieldSet>
        </form>
      }
    >
      {!currentTask && !submit.isPending && !requestError && (
        <EmptyState
          title={t('Video generation')}
          description={t('Generated videos will appear here.')}
        />
      )}
      {currentTask && !submit.isPending && (
        <div className='mb-4 flex min-w-0 items-center gap-2 text-xs'>
          <span className='text-muted-foreground shrink-0'>{t('Task ID')}</span>
          <span className='min-w-0 truncate font-mono' title={currentTask.id}>
            {currentTask.id}
          </span>
          <CopyButton value={currentTask.id} />
          {currentTask.status === 'completed' && (
            <Badge variant='secondary'>{t('Completed')}</Badge>
          )}
        </div>
      )}
      {isGenerating && !requestError && (
        <div className='space-y-3'>
          <LoadingState
            message={
              currentTask?.status === 'queued'
                ? t('Queued')
                : t('Generating video...')
            }
          />
          {typeof currentTask?.progress === 'number' &&
            Number.isFinite(currentTask.progress) && (
              <Progress
                value={Math.min(100, Math.max(0, currentTask.progress))}
                aria-label={t('Generation progress')}
              />
            )}
        </div>
      )}
      {requestError && (
        <ErrorState
          title={t('Generation failed')}
          description={getServerErrorMessage(requestError)}
          onRetry={task.isError ? () => void task.refetch() : undefined}
        />
      )}
      {!submit.isPending &&
        !requestError &&
        currentTask?.status === 'failed' && (
          <ErrorState
            title={t('Generation failed')}
            description={currentTask.error?.message}
          />
        )}
      {!submit.isPending &&
        !requestError &&
        currentTask?.status === 'completed' && (
          <VideoResult
            apiKey={props.apiKey}
            key={currentTask.id}
            keyId={props.keyId}
            taskId={currentTask.id}
          />
        )}
    </GenerationWorkspace>
  )
}
