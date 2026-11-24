import { ImageIcon, VideoIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { EmptyState } from '@/components/empty-state'
import { Button } from '@/components/ui/button'

export function GenerationEmptyState(props: {
  mode: 'image' | 'video'
  onPrompt: (prompt: string) => void
}) {
  const { t } = useTranslation()
  const examples =
    props.mode === 'image'
      ? [
          {
            label: t('Product photography'),
            prompt: t(
              'A frosted glass perfume bottle on a stone pedestal, soft morning light, minimalist product photography.'
            ),
          },
          {
            label: t('Dreamlike landscape'),
            prompt: t(
              'A floating island above the clouds, cascading waterfalls, warm sunset light, intricate digital art.'
            ),
          },
          {
            label: t('Architectural space'),
            prompt: t(
              'A quiet modern interior with curved walls, natural wood and soft shadows, architectural photography.'
            ),
          },
        ]
      : [
          {
            label: t('Cinematic aerial'),
            prompt: t(
              'A slow aerial shot over a coastal city at golden hour, smooth camera movement, cinematic lighting.'
            ),
          },
          {
            label: t('Nature close-up'),
            prompt: t(
              'Morning dew on a green leaf, a gentle breeze, slow macro camera movement, shallow depth of field.'
            ),
          },
          {
            label: t('Urban motion'),
            prompt: t(
              'A tracking shot through a neon-lit street on a rainy night, reflections on the pavement, cinematic atmosphere.'
            ),
          },
        ]

  return (
    <EmptyState
      icon={props.mode === 'image' ? ImageIcon : VideoIcon}
      title={
        props.mode === 'image' ? t('Image generation') : t('Video generation')
      }
      description={
        props.mode === 'image'
          ? t('Generated images will appear here.')
          : t('Generated videos will appear here.')
      }
      className='[&_[data-slot=empty-icon]]:bg-primary/10 [&_[data-slot=empty-icon]]:text-primary mx-auto max-w-lg gap-7 py-10 [&_[data-slot=empty-icon]]:size-16 [&_[data-slot=empty-icon]]:rounded-2xl'
      action={
        <div className='flex w-full flex-col gap-3'>
          <p className='text-muted-foreground text-xs'>
            {t('Start with an idea')}
          </p>
          <div className='flex flex-wrap justify-center gap-2'>
            {examples.map((example) => (
              <Button
                key={example.label}
                type='button'
                variant='outline'
                size='sm'
                className='h-auto min-h-8 whitespace-normal'
                onClick={() => props.onPrompt(example.prompt)}
              >
                {example.label}
              </Button>
            ))}
          </div>
        </div>
      }
    />
  )
}
