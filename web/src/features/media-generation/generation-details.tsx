import { RotateCcw } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Button } from '@/components/ui/button'

export function GenerationDetails(props: {
  prompt: string
  metadata: ReactNode
  onReuse: () => void
}) {
  const { t } = useTranslation()
  return (
    <div className='bg-background flex flex-wrap items-center justify-between gap-3 rounded-xl border p-4 shadow-sm'>
      <div className='min-w-0 flex-1 basis-40'>
        <p className='line-clamp-3 text-sm break-words whitespace-pre-wrap'>
          {props.prompt}
        </p>
        <div className='text-muted-foreground mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs'>
          {props.metadata}
        </div>
      </div>
      <div className='flex shrink-0 items-center gap-1'>
        <CopyButton value={props.prompt} aria-label={t('Copy prompt')} />
        <Button variant='outline' size='sm' onClick={props.onReuse}>
          <RotateCcw aria-hidden='true' />
          {t('Reuse settings')}
        </Button>
      </div>
    </div>
  )
}
