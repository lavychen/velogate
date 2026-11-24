/*
Copyright (C) 2023-2026 QuantumNous

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU Affero General Public License as
published by the Free Software Foundation, either version 3 of the
License, or (at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
GNU Affero General Public License for more details.

You should have received a copy of the GNU Affero General Public License
along with this program. If not, see <https://www.gnu.org/licenses/>.

For commercial licensing, please contact support@quantumnous.com
*/
import { RefreshCw } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

import { connectGateway, type GatewaySnapshot } from '../lib/gateway-tools'

export function ConnectGatewayDialog(props: {
  baseUrl: string
  onClose: () => void
  onConnect: (snapshot: GatewaySnapshot) => void
  onReset: () => void
}) {
  const { t } = useTranslation()
  const [url, setUrl] = useState(props.baseUrl)
  const [syncing, setSyncing] = useState(false)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  useEffect(() => () => request.current?.abort(), [])
  const sync = async () => {
    request.current?.abort()
    const controller = new AbortController()
    request.current = controller
    setError('')
    setSyncing(true)
    try {
      const snapshot = await connectGateway(url, controller.signal)
      if (!controller.signal.aborted) {
        props.onConnect(snapshot)
        props.onClose()
      }
    } catch {
      if (!controller.signal.aborted) {
        setError(
          t(
            'Connection failed. Check the HTTPS gateway address and CORS settings.'
          )
        )
      }
    } finally {
      if (request.current === controller) setSyncing(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
      title={t('Connect a New API site')}
      contentClassName='home-dialog sm:max-w-lg'
      headerClassName='border-b pb-4'
      footer={
        <div className='flex w-full items-center justify-between'>
          <Button variant='ghost' onClick={props.onReset}>
            {t('Restore current site')}
          </Button>
          <Button
            className='home-primary'
            disabled={syncing}
            onClick={() => {
              void sync()
            }}
          >
            <RefreshCw
              aria-hidden='true'
              className={syncing ? 'size-3.5 animate-spin' : 'size-3.5'}
            />
            {syncing ? t('Syncing...') : t('Test and sync')}
          </Button>
        </div>
      }
    >
      <div className='space-y-4'>
        <div className='space-y-1.5'>
          <Label htmlFor='connect-base' className='text-xs font-semibold'>
            {t('New API backend root URL')}
          </Label>
          <Input
            id='connect-base'
            type='url'
            className='h-10 rounded-xl font-mono text-xs'
            value={url}
            onChange={(event) => {
              request.current?.abort()
              setSyncing(false)
              setError('')
              setUrl(event.target.value)
            }}
            placeholder='https://api.velogate.ai'
          />
        </div>
        {error && (
          <p
            role='alert'
            className='border-destructive/20 text-destructive rounded-xl border p-3 text-xs'
          >
            {error}
          </p>
        )}
      </div>
    </Dialog>
  )
}
