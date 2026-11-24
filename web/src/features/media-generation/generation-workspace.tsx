import {
  ImageIcon,
  LoaderCircle,
  SlidersHorizontal,
  VideoIcon,
} from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Badge } from '@/components/ui/badge'

export function GenerationWorkspace(props: {
  settings: ReactNode
  children: ReactNode
  pending: boolean
  mode: 'image' | 'video'
  model?: string
  status?: string
  history?: ReactNode
}) {
  const { t } = useTranslation()
  const Icon = props.mode === 'image' ? ImageIcon : VideoIcon

  return (
    <div className='bg-background grid min-h-full min-w-0 overflow-hidden rounded-2xl border shadow-sm lg:h-full lg:min-h-0 lg:grid-cols-[340px_minmax(0,1fr)] xl:grid-cols-[370px_minmax(0,1fr)]'>
      <aside
        aria-labelledby='generation-settings-title'
        className='flex min-h-0 min-w-0 flex-col border-b lg:border-r lg:border-b-0'
      >
        <div className='flex shrink-0 items-start gap-3 border-b p-5'>
          <div className='bg-primary/10 text-primary flex size-9 shrink-0 items-center justify-center rounded-xl'>
            <SlidersHorizontal className='size-4' aria-hidden='true' />
          </div>
          <div className='min-w-0'>
            <h2
              id='generation-settings-title'
              className='text-sm font-semibold'
            >
              {t('Generation settings')}
            </h2>
            <p className='text-muted-foreground mt-1 text-xs leading-relaxed'>
              {props.mode === 'image'
                ? t('Generate images from a text prompt.')
                : t('Generate videos from a text prompt.')}
            </p>
          </div>
        </div>
        {props.settings}
      </aside>
      <section
        aria-labelledby='generation-preview-title'
        aria-busy={props.pending}
        className='media-generation-canvas flex min-h-[480px] min-w-0 flex-col lg:min-h-0'
      >
        <div className='bg-background/90 flex min-h-14 shrink-0 flex-wrap items-center justify-between gap-2 border-b px-4 py-3 backdrop-blur-sm sm:px-5'>
          <div className='flex items-center gap-2'>
            <Icon className='text-muted-foreground size-4' aria-hidden='true' />
            <h2 id='generation-preview-title' className='text-xs font-semibold'>
              {t('Preview')}
            </h2>
            <Badge variant='secondary' aria-live='polite'>
              {props.pending && (
                <LoaderCircle
                  className='motion-safe:animate-spin'
                  aria-hidden='true'
                />
              )}
              {props.status ?? t('Ready')}
            </Badge>
          </div>
          {props.model && (
            <span
              className='text-muted-foreground max-w-48 truncate font-mono text-[11px]'
              title={props.model}
            >
              {props.model}
            </span>
          )}
        </div>
        <div className='flex min-h-0 flex-1 flex-col overflow-y-auto p-4 sm:p-6'>
          <div className='my-auto w-full min-w-0'>{props.children}</div>
        </div>
        {props.history}
      </section>
    </div>
  )
}
