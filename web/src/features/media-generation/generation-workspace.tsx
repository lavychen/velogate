import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

export function GenerationWorkspace(props: {
  settings: ReactNode
  children: ReactNode
  pending: boolean
}) {
  const { t } = useTranslation()
  return (
    <div className='grid min-w-0 items-start gap-4 lg:grid-cols-[360px_minmax(0,1fr)]'>
      <Card className='min-w-0'>
        <CardHeader>
          <CardTitle>
            <h2>{t('Generation settings')}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>{props.settings}</CardContent>
      </Card>
      <Card className='min-w-0'>
        <CardHeader>
          <CardTitle>
            <h2 id='generation-preview-title'>{t('Preview')}</h2>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <section
            aria-labelledby='generation-preview-title'
            aria-live='polite'
            aria-busy={props.pending}
            className='bg-muted/30 min-h-[360px] min-w-0 rounded-lg border border-dashed p-3 sm:min-h-[480px] sm:p-4'
          >
            {props.children}
          </section>
        </CardContent>
      </Card>
    </div>
  )
}
