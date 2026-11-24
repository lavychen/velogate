import { History, ImageIcon, VideoIcon } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function GenerationHistory(props: {
  entries: { id: string; prompt: string; thumbnail?: string }[]
  selectedId?: string
  onSelect: (id: string) => void
  disabled: boolean
  mode: 'image' | 'video'
}) {
  const { t } = useTranslation()
  if (!props.entries.length) return null
  const Icon = props.mode === 'image' ? ImageIcon : VideoIcon

  return (
    <div className='bg-background/95 min-w-0 shrink-0 border-t px-5 py-3'>
      <h3 className='text-muted-foreground mb-3 flex items-center gap-2 text-xs font-medium'>
        <History className='size-3.5' aria-hidden='true' />
        {t('Session history')}
      </h3>
      <div
        role='group'
        aria-label={t('Session history')}
        className='flex gap-2 overflow-x-auto pb-1'
      >
        {props.entries.map((entry, index) => (
          <Button
            key={entry.id}
            variant='outline'
            className={cn(
              'relative size-16 overflow-hidden rounded-xl p-0',
              entry.id === props.selectedId &&
                'border-primary ring-primary/20 ring-2'
            )}
            disabled={props.disabled}
            aria-pressed={entry.id === props.selectedId}
            aria-label={t('View generation {{number}}', {
              number: props.entries.length - index,
            })}
            title={entry.prompt}
            onClick={() => props.onSelect(entry.id)}
          >
            {entry.thumbnail ? (
              <img
                src={entry.thumbnail}
                alt=''
                loading='lazy'
                className='size-full object-cover'
              />
            ) : (
              <Icon
                className='text-muted-foreground size-5'
                aria-hidden='true'
              />
            )}
          </Button>
        ))}
      </div>
    </div>
  )
}
