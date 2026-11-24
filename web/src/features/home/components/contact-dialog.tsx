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
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { Dialog } from '@/components/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'

export function ContactDialog(props: { onClose: () => void }) {
  const { t } = useTranslation()
  const [company, setCompany] = useState('')
  const [email, setEmail] = useState('')
  const [details, setDetails] = useState('')
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) props.onClose()
      }}
      title={t('Contact an enterprise architect')}
      contentClassName='home-dialog sm:max-w-md'
    >
      <form className='space-y-3' action='mailto:ops@velogate.ai' method='get'>
        <Input
          required
          aria-label={t('Company or name')}
          placeholder={t('Company or name')}
          value={company}
          onChange={(event) => setCompany(event.target.value)}
          name='subject'
          className='h-10 text-xs'
        />
        <Input
          required
          type='email'
          aria-label={t('Work email')}
          placeholder={t('Work email')}
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          className='h-10 text-xs'
        />
        <Textarea
          aria-label={t('Expected concurrency or deployment needs (optional)')}
          placeholder={t('Expected concurrency or deployment needs (optional)')}
          value={details}
          onChange={(event) => setDetails(event.target.value)}
          rows={3}
          className='text-xs'
        />
        <input type='hidden' name='body' value={`${email}\n\n${details}`} />
        <div className='flex justify-end gap-2 pt-1'>
          <Button variant='outline' onClick={props.onClose}>
            {t('Cancel')}
          </Button>
          <Button type='submit' className='home-primary'>
            {t('Create email')}
          </Button>
        </div>
      </form>
    </Dialog>
  )
}
