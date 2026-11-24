import { skipToken, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { Image, Video } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { Main } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { ModelSelector } from '@/components/model-group-selector'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { getPricing } from '@/features/pricing/api'
import { requireServerSuccess } from '@/lib/server-error-message'
import { useAuthStore } from '@/stores/auth-store'

import { getGenerationKey, getGenerationKeys, getGenerationModels } from './api'
import { ImageGenerator } from './image-generator'
import { VideoGenerator } from './video-generator'

export function MediaGeneration(props: { mode: 'image' | 'video' }) {
  const { t } = useTranslation()
  const userId = useAuthStore((state) => state.auth.user?.id)
  const [keySelection, setKeySelection] = useState('')
  const [modelSelection, setModelSelection] = useState('')
  const keys = useQuery({
    queryKey: ['media-generation-keys', userId],
    queryFn: getGenerationKeys,
  })
  const selectedKey =
    keys.data?.find((key) => String(key.id) === keySelection) ?? keys.data?.[0]
  const keyId = selectedKey?.id
  const credential = useQuery({
    queryKey: ['media-generation-key', userId, keyId],
    queryFn: keyId ? () => getGenerationKey(keyId) : skipToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 0,
    retry: false,
  })
  const apiKey = credential.data
  const catalog = useQuery({
    queryKey: ['pricing'],
    queryFn: async () => requireServerSuccess(await getPricing()),
  })
  const models = useQuery({
    queryKey: ['media-generation-models', userId, keyId],
    queryFn: apiKey
      ? ({ signal }) => getGenerationModels(apiKey, signal)
      : skipToken,
    retry: false,
  })
  const availableModels = (models.data ?? []).filter((model) => {
    const metadata = catalog.data?.data.find(
      (item) => item.model_name === model.value
    )
    const endpoint =
      props.mode === 'image' ? 'image-generation' : 'openai-video'
    if (metadata?.supported_endpoint_types?.length) {
      return metadata.supported_endpoint_types.includes(endpoint)
    }
    return props.mode === 'image'
      ? /image|dall-e|flux|imagen|sdxl|stable-diffusion|recraft|ideogram|cogview/i.test(
          model.value
        )
      : /video|sora|veo|kling|seedance|wan|hailuo|runway|vidu|luma/i.test(
          model.value
        )
  })
  const selectedModel =
    availableModels.find((model) => model.value === modelSelection)?.value ??
    availableModels[0]?.value ??
    ''
  const title =
    props.mode === 'image' ? t('Image generation') : t('Video generation')

  return (
    <Main className='overflow-y-auto p-3 sm:p-6'>
      <div className='mx-auto w-full max-w-6xl space-y-6'>
        <header className='space-y-2'>
          <h1 className='text-2xl font-semibold tracking-tight'>{title}</h1>
          <p className='text-muted-foreground text-sm'>
            {props.mode === 'image'
              ? t('Generate images from a text prompt.')
              : t('Generate videos from a text prompt.')}
          </p>
        </header>
        <div className='flex flex-wrap items-end gap-4'>
          <div className='grid min-w-48 gap-2'>
            <Label htmlFor='generation-key'>{t('API Key')}</Label>
            <NativeSelect
              id='generation-key'
              className='w-full'
              value={keyId ?? ''}
              disabled={keys.isPending}
              onChange={(event) => setKeySelection(event.target.value)}
            >
              {!selectedKey && (
                <NativeSelectOption value=''>
                  {t('Select API Key')}
                </NativeSelectOption>
              )}
              {keys.data?.map((key) => (
                <NativeSelectOption key={key.id} value={key.id}>
                  {key.name}
                </NativeSelectOption>
              ))}
            </NativeSelect>
          </div>
          <div className='grid min-w-48 gap-2'>
            <Label>{t('Model')}</Label>
            <ModelSelector
              selectedModel={selectedModel}
              models={availableModels}
              onModelChange={setModelSelection}
              disabled={models.isFetching || !availableModels.length}
              className='w-full'
            />
          </div>
        </div>
        {(keys.isPending ||
          credential.isLoading ||
          models.isLoading ||
          catalog.isPending) && <LoadingState />}
        {(keys.isError ||
          credential.isError ||
          models.isError ||
          catalog.isError) && (
          <ErrorState
            onRetry={() => {
              void keys.refetch()
              if (keyId) void credential.refetch()
              if (credential.data) void models.refetch()
              void catalog.refetch()
            }}
          />
        )}
        {keys.isSuccess && !keys.data.length && (
          <EmptyState
            title={t('No enabled API keys found. Create or enable one first.')}
            action={
              <Button render={<Link to='/keys' />}>{t('API Keys')}</Button>
            }
          />
        )}
        {models.isSuccess && catalog.isSuccess && !availableModels.length && (
          <EmptyState
            icon={props.mode === 'image' ? Image : Video}
            title={t('No available models')}
          />
        )}
        {keyId && credential.data && selectedModel && (
          <div key={`${userId}-${keyId}-${props.mode}`}>
            {props.mode === 'image' ? (
              <ImageGenerator apiKey={credential.data} model={selectedModel} />
            ) : (
              <VideoGenerator
                apiKey={credential.data}
                keyId={keyId}
                model={selectedModel}
              />
            )}
          </div>
        )}
      </div>
    </Main>
  )
}
