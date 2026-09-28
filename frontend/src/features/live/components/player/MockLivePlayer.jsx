import React from 'react'
import { useTranslation } from 'react-i18next'
import { LiveBadge } from '@/features/live/components/LiveBadge.jsx'

/**
 * Stand-in for a real stream: blurred cover backdrop + portrait frame.
 * Same props as every LivePlayer implementation.
 */
export function MockLivePlayer({ live, ended = false }) {
  const { t } = useTranslation()
  const portrait = live?.portraitCoverUrl ?? live?.coverUrl ?? null
  const backdrop = live?.coverUrl ?? portrait

  return (
    <div className="vibely-keep-dark relative h-full w-full overflow-hidden bg-zinc-950">
      {backdrop ? (
        <img
          src={backdrop}
          alt=""
          className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-[0.35]"
          referrerPolicy="no-referrer"
        />
      ) : null}
      <div className="relative flex h-full items-center justify-center">
        {portrait ? (
          <img
            src={portrait}
            alt={live?.title ?? ''}
            className="h-full w-full object-cover"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex flex-col items-center gap-2 text-zinc-400">
            <LiveBadge />
            <p className="text-sm">{t('livePage.player.noCover')}</p>
          </div>
        )}
      </div>
      {ended ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <p className="rounded-full bg-black/60 px-4 py-2 text-sm font-semibold text-white">
            {t('livePage.player.ended')}
          </p>
        </div>
      ) : null}
    </div>
  )
}
