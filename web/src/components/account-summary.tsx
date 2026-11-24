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
import { useQuery } from '@tanstack/react-query'
import { ChevronRight } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'

import { CopyButton } from '@/components/copy-button'
import { Dialog } from '@/components/dialog'
import { StatusBadge } from '@/components/status-badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { useWorkspace } from '@/features/enterprise/hooks/use-enterprise'
import { getUserProfile } from '@/features/profile/api'
import { useTwoFA } from '@/features/security/hooks/use-two-fa'
import { useStatus } from '@/hooks/use-status'
import { useUserDisplay } from '@/hooks/use-user-display'
import { toIntlLocale } from '@/i18n/languages'
import { getUserAvatarFallback } from '@/lib/avatar'
import { formatQuotaWithCurrency } from '@/lib/currency'
import { requireServerSuccess } from '@/lib/server-error-message'
import { useAuthStore } from '@/stores/auth-store'

export function AccountSummary() {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const user = useAuthStore((state) => state.auth.user)
  const { displayName, roleLabel } = useUserDisplay(user)
  const workspace = useWorkspace()
  const { status } = useStatus()
  const serverAddress =
    (typeof status?.server_address === 'string' &&
      status.server_address.trim()) ||
    window.location.origin
  const baseAddress = serverAddress.replace(/\/+$/, '')
  const baseUrl = baseAddress.endsWith('/v1')
    ? baseAddress
    : `${baseAddress}/v1`
  const workspaceName = workspace.data?.name

  return (
    <Dialog
      open={open}
      onOpenChange={setOpen}
      title={t('Account & workspace information')}
      titleClassName='pr-6 text-base font-semibold'
      contentClassName='z-70 rounded-2xl sm:max-w-md'
      overlayClassName='z-70 bg-black/40'
      footerClassName='mx-0 mb-0 flex-row justify-end rounded-none border-0 bg-transparent p-0 sm:mx-0 sm:mb-0 sm:p-0'
      trigger={
        <Button
          variant='ghost'
          aria-label={t('Account & workspace information')}
          className='h-auto w-full min-w-0 justify-start gap-3 rounded-xl px-3 py-3 text-start group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:px-0'
        >
          <Avatar className='size-9 shrink-0 rounded-xl group-data-[collapsible=icon]:size-8 after:rounded-xl'>
            <AvatarFallback className='rounded-xl bg-orange-500 font-semibold text-white'>
              {getUserAvatarFallback(displayName)}
            </AvatarFallback>
          </Avatar>
          <span className='flex min-w-0 flex-1 flex-col gap-1 group-data-[collapsible=icon]:hidden'>
            <span className='truncate text-sm font-semibold'>
              {displayName}
            </span>
            <span className='w-fit max-w-full truncate rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] leading-tight text-orange-700 dark:text-orange-300'>
              {roleLabel}
              {workspaceName ? ` · ${workspaceName}` : ''}
            </span>
          </span>
          <ChevronRight
            aria-hidden='true'
            className='text-muted-foreground size-4 group-data-[collapsible=icon]:hidden'
          />
        </Button>
      }
      footer={
        <>
          <CopyButton
            value={baseUrl}
            variant='outline'
            size='default'
            tooltip={t('Copy Base URL')}
          >
            {t('Copy Base URL')}
          </CopyButton>
          <Button
            aria-label={t('Close account information')}
            onClick={() => setOpen(false)}
          >
            {t('Close')}
          </Button>
        </>
      }
    >
      {open && <AccountSummaryDetails key={user?.id} baseUrl={baseUrl} />}
    </Dialog>
  )
}

function AccountSummaryDetails(props: { baseUrl: string }) {
  const { t, i18n } = useTranslation()
  const user = useAuthStore((state) => state.auth.user)
  const { displayName, roleLabel } = useUserDisplay(user)
  const workspace = useWorkspace()
  const twoFA = useTwoFA()
  const profile = useQuery({
    queryKey: ['account-summary', user?.id, 'profile'],
    queryFn: async () => requireServerSuccess(await getUserProfile()).data,
    enabled: !!user?.id,
  })
  const locale = toIntlLocale(i18n.resolvedLanguage || i18n.language)
  let twoFAStatus = t('Loading...')
  if (twoFA.error) twoFAStatus = t('Unavailable')
  else if (!twoFA.loading) {
    twoFAStatus = twoFA.status.enabled ? t('Enabled') : t('Disabled')
  }
  let balance = t('Loading...')
  if (profile.isError) balance = t('Unavailable')
  else if (profile.data) {
    balance = formatQuotaWithCurrency(profile.data.quota, {
      locale,
      abbreviate: false,
    })
  }

  return (
    <div className='space-y-4'>
      <div className='flex min-w-0 items-center gap-3'>
        <Avatar className='size-12 shrink-0 rounded-xl after:rounded-xl'>
          <AvatarFallback className='rounded-xl bg-orange-500 text-lg font-semibold text-white'>
            {getUserAvatarFallback(displayName)}
          </AvatarFallback>
        </Avatar>
        <div className='min-w-0 flex-1 space-y-1'>
          <p className='text-sm font-semibold break-words'>
            {displayName}
            {user?.username ? ` (${user.username})` : ''}
          </p>
          {user?.email && (
            <p className='text-muted-foreground text-xs break-all'>
              {user.email}
            </p>
          )}
          <div className='flex flex-wrap gap-1.5'>
            <StatusBadge
              label={roleLabel}
              variant='purple'
              copyable={false}
              className='bg-violet-500/10 text-[10px] text-violet-700 dark:text-violet-300'
            />
            {workspace.data?.name && (
              <StatusBadge
                label={workspace.data.name}
                variant='orange'
                copyable={false}
                className='h-auto max-w-full bg-orange-500/10 py-0.5 text-[10px] whitespace-normal [&>span]:break-words [&>span]:whitespace-normal'
              />
            )}
          </div>
        </div>
      </div>
      <dl className='bg-muted/60 grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] items-start gap-x-4 gap-y-2 rounded-xl border p-3.5 text-xs'>
        <dt className='text-muted-foreground'>{t('User ID')}</dt>
        <dd className='text-end font-mono'>#{user?.id}</dd>
        <dt className='text-muted-foreground'>{t('Current Balance')}</dt>
        <dd
          className='text-success text-end font-mono font-medium break-all'
          aria-live='polite'
        >
          {balance}
        </dd>
        <dt className='text-muted-foreground'>
          {t('Unified gateway Base URL')}
        </dt>
        <dd className='text-end font-mono break-all'>{props.baseUrl}</dd>
        <dt className='text-muted-foreground'>
          {t('Two-factor authentication (2FA)')}
        </dt>
        <dd
          className={
            twoFA.status.enabled && !twoFA.error && !twoFA.loading
              ? 'text-success text-end'
              : 'text-muted-foreground text-end'
          }
          aria-live='polite'
        >
          {twoFAStatus}
        </dd>
      </dl>
    </div>
  )
}
