import { skipToken, useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { ModelSelector } from '@/components/model-group-selector'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { getPricing } from '@/features/pricing/api'
import {
  getServerErrorMessage,
  requireServerSuccess,
} from '@/lib/server-error-message'
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

  const setupError =
    keys.error ?? credential.error ?? models.error ?? catalog.error
  const noKeys = keys.isSuccess && !keys.data.length
  const isReady =
    !setupError &&
    credential.isSuccess &&
    models.isSuccess &&
    catalog.isSuccess &&
    Boolean(selectedModel)
  const connectionFields = (
    <FieldGroup>
      <Field>
        <FieldLabel htmlFor='generation-key'>{t('API Key')}</FieldLabel>
        <NativeSelect
          id='generation-key'
          className='w-full'
          value={keyId ?? ''}
          disabled={keys.isPending || noKeys}
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
      </Field>
      <Field aria-labelledby='generation-model-label'>
        <FieldLabel id='generation-model-label'>{t('Model')}</FieldLabel>
        <ModelSelector
          selectedModel={selectedModel}
          models={availableModels}
          onModelChange={setModelSelection}
          disabled={models.isFetching || !availableModels.length}
          className='h-9 w-full justify-start px-3 sm:w-full [&>span]:block [&>span]:text-sm'
        />
      </Field>
    </FieldGroup>
  )

  let setupState
  if (noKeys) {
    setupState = (
      <EmptyState
        title={t('No enabled API keys found. Create or enable one first.')}
        action={<Button render={<Link to='/keys' />}>{t('API Keys')}</Button>}
      />
    )
  } else if (setupError) {
    setupState = (
      <ErrorState
        description={getServerErrorMessage(setupError)}
        onRetry={() => {
          void keys.refetch()
          if (keyId) void credential.refetch()
          if (apiKey) void models.refetch()
          void catalog.refetch()
        }}
      />
    )
  } else if (models.isSuccess && catalog.isSuccess && !availableModels.length) {
    setupState = <EmptyState title={t('No available models')} />
  } else {
    setupState = <LoadingState />
  }

  return (
    <SectionPageLayout>
      <SectionPageLayout.Title>{title}</SectionPageLayout.Title>
      <SectionPageLayout.Content>
        <div className='space-y-4'>
          <FieldDescription>
            {props.mode === 'image'
              ? t('Generate images from a text prompt.')
              : t('Generate videos from a text prompt.')}
          </FieldDescription>
          {isReady && keyId && apiKey ? (
            <div key={`${userId}-${keyId}-${props.mode}-${selectedModel}`}>
              {props.mode === 'image' ? (
                <ImageGenerator
                  apiKey={apiKey}
                  model={selectedModel}
                  connectionFields={connectionFields}
                />
              ) : (
                <VideoGenerator
                  apiKey={apiKey}
                  keyId={keyId}
                  model={selectedModel}
                  connectionFields={connectionFields}
                />
              )}
            </div>
          ) : (
            <Card>
              <CardContent>
                <div className='max-w-sm'>{connectionFields}</div>
                {setupState}
              </CardContent>
            </Card>
          )}
        </div>
      </SectionPageLayout.Content>
    </SectionPageLayout>
  )
}
