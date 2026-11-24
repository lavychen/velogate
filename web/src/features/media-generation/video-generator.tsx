import { zodResolver } from '@hookform/resolvers/zod'
import { skipToken, useMutation, useQuery } from '@tanstack/react-query'
import { Download, Sparkles, Video } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useForm } from 'react-hook-form'
import { useTranslation } from 'react-i18next'
import { z } from 'zod'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { LoadingState } from '@/components/loading-state'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import { getServerErrorMessage } from '@/lib/server-error-message'

import { generateVideo, getVideoContent, getVideoTask } from './api'

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
        render={<a href={url} download={`${props.taskId}.mp4`} />}
      >
        <Download className='size-4' />
        {t('Download')}
      </Button>
    </div>
  )
}

export function VideoGenerator(props: {
  apiKey: string
  keyId: number
  model: string
}) {
  const { t } = useTranslation()
  const schema = z.object({
    prompt: z.string().trim().min(1, t('Please enter a prompt')),
    seconds: z.enum(['4', '8', '12']),
    size: z.enum(['1280x720', '720x1280']),
  })
  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      prompt: '',
      seconds: '4' as const,
      size: '1280x720' as const,
    },
  })
  const submit = useMutation({
    mutationFn: async (values: z.infer<typeof schema>) => {
      const task = await generateVideo(props.apiKey, {
        model: props.model,
        ...values,
      })
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
    meta: { errorToast: false },
    retry: false,
  })
  const currentTask = task.data ?? submit.data
  const isGenerating =
    submit.isPending ||
    (!!currentTask && ['queued', 'in_progress'].includes(currentTask.status))
  const requestError = submit.error ?? task.error

  return (
    <div className='grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]'>
      <Card>
        <CardContent>
          <form
            className='space-y-5'
            onSubmit={form.handleSubmit((values) => submit.mutate(values))}
          >
            <fieldset
              disabled={isGenerating && !task.isError}
              className='space-y-5'
            >
              <div className='grid gap-2'>
                <Label htmlFor='video-prompt'>{t('Prompt')}</Label>
                <Textarea
                  id='video-prompt'
                  rows={6}
                  {...form.register('prompt')}
                  placeholder={t('Describe the video you want to generate')}
                  aria-invalid={Boolean(form.formState.errors.prompt)}
                  aria-describedby={
                    form.formState.errors.prompt
                      ? 'video-prompt-error'
                      : undefined
                  }
                />
                {form.formState.errors.prompt && (
                  <p
                    id='video-prompt-error'
                    role='alert'
                    className='text-destructive text-sm'
                  >
                    {form.formState.errors.prompt.message}
                  </p>
                )}
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='video-duration'>{t('Duration')}</Label>
                <NativeSelect
                  id='video-duration'
                  className='w-full'
                  {...form.register('seconds')}
                >
                  {['4', '8', '12'].map((seconds) => (
                    <NativeSelectOption key={seconds} value={seconds}>
                      {t('{{count}} seconds', { count: Number(seconds) })}
                    </NativeSelectOption>
                  ))}
                </NativeSelect>
              </div>
              <div className='grid gap-2'>
                <Label htmlFor='video-size'>{t('Video size')}</Label>
                <NativeSelect
                  id='video-size'
                  className='w-full'
                  {...form.register('size')}
                >
                  <NativeSelectOption value='1280x720'>
                    1280 × 720 (16:9)
                  </NativeSelectOption>
                  <NativeSelectOption value='720x1280'>
                    720 × 1280 (9:16)
                  </NativeSelectOption>
                </NativeSelect>
              </div>
              <Button type='submit' className='w-full'>
                <Sparkles className='size-4' />
                {t('Generate video')}
              </Button>
            </fieldset>
          </form>
        </CardContent>
      </Card>
      <Card className='min-w-0'>
        <CardContent aria-live='polite'>
          {!currentTask && !submit.isPending && !requestError && (
            <EmptyState
              icon={Video}
              title={t('Video generation')}
              description={t('Generated videos will appear here.')}
            />
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
              <Progress
                value={Math.min(100, Math.max(0, currentTask?.progress ?? 0))}
                aria-label={t('Generation progress')}
              />
            </div>
          )}
          {requestError && (
            <ErrorState
              title={t('Generation failed')}
              description={getServerErrorMessage(requestError)}
              onRetry={task.isError ? () => void task.refetch() : undefined}
            />
          )}
          {!submit.isPending && currentTask?.status === 'failed' && (
            <ErrorState
              title={t('Generation failed')}
              description={currentTask.error?.message}
            />
          )}
          {!submit.isPending && currentTask?.status === 'completed' && (
            <VideoResult
              apiKey={props.apiKey}
              key={currentTask.id}
              keyId={props.keyId}
              taskId={currentTask.id}
            />
          )}
        </CardContent>
      </Card>
    </div>
  )
}
