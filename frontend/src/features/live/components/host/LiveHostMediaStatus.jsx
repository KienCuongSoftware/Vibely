import React from 'react'
import { useTranslation } from 'react-i18next'
import { LiveSpinner } from '@/features/live/components/LiveStateView.jsx'
import { mediaErrorMessageKey } from '@/features/live/media/mediaErrorMessages.js'

/**
 * Host media banner: capture/publish progress and recoverable errors with a retry.
 * Renders nothing while everything is fine (or for the mock controller).
 */
export function LiveHostMediaStatus({ state, isLive, onRetry }) {
  const { t } = useTranslation()
  const { status, error } = state

  if (status === 'error' && error) {
    return (
      <div className="flex items-center gap-3 rounded-lg bg-[#fe2c55]/15 px-3 py-2 text-[12px] text-[#fe2c55]" role="alert">
        <p className="min-w-0 flex-1">{t(mediaErrorMessageKey(error.code))}</p>
        <button
          type="button"
          onClick={onRetry}
          className="shrink-0 cursor-pointer rounded-full bg-[#fe2c55] px-3 py-1 text-[12px] font-semibold text-white hover:bg-[#e6284c]"
        >
          {t('livePage.media.retry')}
        </button>
      </div>
    )
  }

  const progressKey = (() => {
    if (status === 'preparing') return 'livePage.media.host.requestingAccess'
    if (status === 'connecting' && isLive) return 'livePage.media.host.connecting'
    if (status === 'reconnecting') return 'livePage.media.host.reconnecting'
    return null
  })()

  if (progressKey) {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-[12px] text-zinc-200" role="status" aria-live="polite">
        <LiveSpinner className="h-3.5 w-3.5" />
        <p className="min-w-0 flex-1">
          {t(progressKey, { attempt: state.reconnectAttempt, max: state.maxReconnectAttempts })}
          {status === 'reconnecting' && error ? ` · ${t(mediaErrorMessageKey(error.code))}` : ''}
        </p>
      </div>
    )
  }

  if (error?.stage === 'device') {
    return (
      <p className="rounded-lg bg-amber-500/15 px-3 py-2 text-[12px] text-amber-300" role="alert">
        {t(mediaErrorMessageKey(error.code))}
      </p>
    )
  }

  return null
}
