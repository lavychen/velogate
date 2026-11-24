import { skipToken, useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { ErrorState } from '@/components/error-state'
import { SectionPageLayout } from '@/components/layout'
import { LoadingState } from '@/components/loading-state'
import { ModelSelector } from '@/components/model-group-selector'
import { Card, CardContent } from '@/components/ui/card'
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
} from '@/components/ui/field'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { getServerErrorMessage } from '@/lib/server-error-message'
import { useAuthStore } from '@/stores/auth-store'

import { getGenerationKey, getGenerationOptions } from './api'
import { ImageGenerator } from './image-generator'
import { VideoGenerator } from './video-generator'

export function MediaGeneration(props: { mode: 'image' | 'video' }) {
  const { t } = useTranslation()
  const userId = useAuthStore((state) => state.auth.user?.id)
  const [keySelection, setKeySelection] = useState('')
  const [modelSelection, setModelSelection] = useState('')
  const keys = useQuery({
    queryKey: ['media-generation-options', userId, props.mode],
    queryFn: ({ signal }) => getGenerationOptions(props.mode, signal),
  })
  const selectedKey =
    keys.data?.find((key) => String(key.id) === keySelection) ?? keys.data?.[0]
  const keyId = selectedKey?.id
  const credential = useQuery({
    queryKey: ['media-generation-key', userId, keyId],
    queryFn: keyId ? () => getGenerationKey(keyId) : skipToken,
    staleTime: 5 * 60 * 1000,
    gcTime: 5 * 60 * 1000,
    retry: false,
  })
  const apiKey = credential.data
  const availableModels = (selectedKey?.models ?? []).map((name) => ({
    label: name,
    value: name,
  }))
  const selectedModel =
    availableModels.find((model) => model.value === modelSelection)?.value ??
    availableModels[0]?.value ??
    ''
  const title =
    props.mode === 'image' ? t('Image generation') : t('Video generation')

  const setupError = keys.error ?? credential.error
  const noKeys = keys.isSuccess && !keys.data.length
  const isReady =
    !setupError &&
    credential.isSuccess &&
    keys.isSuccess &&
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
          disabled={keys.isFetching || !availableModels.length}
          className='h-9 w-full justify-start px-3 sm:w-full [&>span]:block [&>span]:text-sm'
        />
      </Field>
    </FieldGroup>
  )

  let setupState
  if (noKeys) {
    setupState = <EmptyState title={t('No available models')} />
  } else if (setupError) {
    setupState = (
      <ErrorState
        description={getServerErrorMessage(setupError)}
        onRetry={() => {
          if (keys.isError) void keys.refetch()
          if (keyId && credential.isError) void credential.refetch()
        }}
      />
    )
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
