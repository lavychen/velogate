import { zodResolver } from '@hookform/resolvers/zod'
import { Download01Icon, MagicWand01Icon } from '@hugeicons/core-free-icons'
import { HugeiconsIcon } from '@hugeicons/react'
import { skipToken, useMutation, useQuery } from '@tanstack/react-query'
import { useEffect, useState, type ReactNode } from 'react'
import { useForm, useWatch } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { CopyButton } from '@/components/copy-button'
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
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Progress } from '@/components/ui/progress'
import { Separator } from '@/components/ui/separator'
import { Textarea } from '@/components/ui/textarea'
import { getServerErrorMessage } from '@/lib/server-error-message'

import { generateVideo, getVideoContent, getVideoTask } from './api'
import { GenerationDetails } from './generation-details'
import { GenerationEmptyState } from './generation-empty-state'
import { GenerationHistory } from './generation-history'
import { GenerationSizePicker } from './generation-size-picker'
import { GenerationWorkspace } from './generation-workspace'
import { useGenerationHistory } from './use-generation-history'

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
    <div className='flex flex-col items-center gap-3'>
      <video
        src={url}
        controls
        playsInline
        className='max-h-[55vh] w-full rounded-xl border bg-black shadow-sm'
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
  const size = useWatch({ control: form.control, name: 'size' })
  const history = useGenerationHistory<{
    id: string
    prompt: string
    values: z.infer<typeof schema>
  }>()
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
    onMutate: () => history.select(''),
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
  const addHistory = history.add
  useEffect(() => {
    if (
      currentTask?.status === 'completed' &&
      submit.variables &&
      !submit.isPending &&
      !requestError
    ) {
      addHistory({
        id: currentTask.id,
        prompt: submit.variables.prompt,
        values: submit.variables,
      })
    }
  }, [
    currentTask?.id,
    currentTask?.status,
    submit.variables,
    submit.isPending,
    requestError,
    addHistory,
  ])
  const result = history.selected
  let status = t('Ready')
  if (result) status = t('Completed')
  if (isGenerating) status = t('Generating video...')
  if (currentTask?.status === 'queued') status = t('Queued')
  if (!result && (requestError || currentTask?.status === 'failed')) {
    status = t('Generation failed')
  }

  return (
    <GenerationWorkspace
      mode='video'
      model={props.model}
      status={status}
      pending={isGenerating && !requestError}
      history={
        <GenerationHistory
          mode='video'
          entries={history.entries}
          selectedId={result?.id}
          onSelect={history.select}
          disabled={isGenerating}
        />
      }
      settings={
        <form
          className='flex min-h-0 flex-1 flex-col'
          onSubmit={form.handleSubmit((values) => submit.mutate(values))}
        >
          <FieldSet disabled={isGenerating} className='min-h-0 flex-1 gap-0'>
            <div className='flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto p-5'>
              {props.connectionFields}
              <Separator />
              <FieldGroup>
                <Field data-invalid={Boolean(form.formState.errors.prompt)}>
                  <FieldLabel htmlFor='video-prompt'>{t('Prompt')}</FieldLabel>
                  <Textarea
                    id='video-prompt'
                    rows={6}
                    className='bg-muted/20 min-h-36 resize-y rounded-xl p-3 text-sm'
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
                    className='w-full [&_select]:h-10 [&_select]:rounded-xl'
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
                  <FieldLabel id='video-size-label'>
                    {t('Video size')}
                  </FieldLabel>
                  <GenerationSizePicker
                    labelId='video-size-label'
                    value={size}
                    sizes={['', '1280x720', '720x1280']}
                    onChange={(value) =>
                      form.setValue(
                        'size',
                        value as z.infer<typeof schema>['size'],
                        { shouldDirty: true }
                      )
                    }
                    disabled={isGenerating}
                  />
                </Field>
              </FieldGroup>
            </div>
            <div className='bg-background shrink-0 border-t p-4'>
              <Button
                type='submit'
                className='h-11 w-full rounded-xl'
                disabled={isGenerating}
              >
                <HugeiconsIcon
                  icon={MagicWand01Icon}
                  data-icon='inline-start'
                  aria-hidden='true'
                />
                {isGenerating && !requestError
                  ? t('Generating video...')
                  : t('Generate video')}
              </Button>
            </div>
          </FieldSet>
        </form>
      }
    >
      {!currentTask && !submit.isPending && !requestError && !result && (
        <GenerationEmptyState
          mode='video'
          onPrompt={(prompt) => {
            form.setValue('prompt', prompt, {
              shouldDirty: true,
              shouldValidate: true,
            })
            form.setFocus('prompt')
          }}
        />
      )}
      {isGenerating && !requestError && (
        <div className='mx-auto flex w-full max-w-sm flex-col gap-3'>
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
      {requestError && !result && (
        <ErrorState
          title={t('Generation failed')}
          description={getServerErrorMessage(requestError)}
          onRetry={task.isError ? () => void task.refetch() : undefined}
        />
      )}
      {!submit.isPending &&
        !requestError &&
        !result &&
        currentTask?.status === 'failed' && (
          <ErrorState
            title={t('Generation failed')}
            description={currentTask.error?.message}
          />
        )}
      {!isGenerating && result && (
        <div className='mx-auto flex w-full max-w-4xl flex-col gap-4'>
          <VideoResult
            apiKey={props.apiKey}
            key={result.id}
            keyId={props.keyId}
            taskId={result.id}
          />
          <GenerationDetails
            prompt={result.prompt}
            metadata={
              <>
                <span>{props.model}</span>
                {result.values.seconds && (
                  <span>
                    {t('{{count}} seconds', {
                      count: Number(result.values.seconds),
                    })}
                  </span>
                )}
                {result.values.size && (
                  <span>{result.values.size.replace('x', ' × ')}</span>
                )}
              </>
            }
            onReuse={() => {
              form.reset(result.values)
              requestAnimationFrame(() => form.setFocus('prompt'))
            }}
          />
        </div>
      )}
      {currentTask && !submit.isPending && (
        <div className='bg-background/80 mx-auto mt-4 flex w-fit max-w-full items-center gap-2 rounded-lg border px-3 py-1 text-xs'>
          <span className='text-muted-foreground shrink-0'>{t('Task ID')}</span>
          <span
            className='min-w-0 truncate font-mono'
            title={result && !isGenerating ? result.id : currentTask.id}
          >
            {result && !isGenerating ? result.id : currentTask.id}
          </span>
          <CopyButton
            value={result && !isGenerating ? result.id : currentTask.id}
          />
        </div>
      )}
    </GenerationWorkspace>
  )
}
