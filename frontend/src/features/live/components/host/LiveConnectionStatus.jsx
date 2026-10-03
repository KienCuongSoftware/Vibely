import React from 'react'
import { useTranslation } from 'react-i18next'
import { LIVE_CONNECTION_STATE } from '@/features/live/media/connectionState.js'

const DOT_CLASS = {
  [LIVE_CONNECTION_STATE.CONNECTED]: 'bg-emerald-400',
  [LIVE_CONNECTION_STATE.CONNECTING]: 'animate-pulse bg-amber-400',
  [LIVE_CONNECTION_STATE.RECONNECTING]: 'animate-pulse bg-amber-400',
  [LIVE_CONNECTION_STATE.DISCONNECTED]: 'bg-amber-400',
  [LIVE_CONNECTION_STATE.FAILED]: 'bg-[#fe2c55]',
  [LIVE_CONNECTION_STATE.ENDED]: 'bg-zinc-500',
}

/** The host's real WebRTC publish state (one of LIVE_CONNECTION_STATE). */
export function LiveConnectionStatus({ state }) {
  const { t } = useTranslation()
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full bg-black/40 px-2 py-0.5 text-[11px] font-semibold text-zinc-100"
      role="status"
      aria-live="polite"
      data-state={state}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${DOT_CLASS[state] ?? DOT_CLASS[LIVE_CONNECTION_STATE.DISCONNECTED]}`} aria-hidden />
      {t(`livePage.media.connection.${state.toLowerCase()}`)}
    </span>
  )
}
