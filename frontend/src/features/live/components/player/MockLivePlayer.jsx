import React from 'react'
import { useTranslation } from 'react-i18next'
import { AvatarImage } from '@/shared/components/AvatarImage.jsx'

/**
 * Stand-in for a real stream: blurred cover backdrop + portrait frame.
 * A LIVE without its own cover uses the host avatar. Same props as every LivePlayer.
 */
export function MockLivePlayer({ live, ended = false }) {
  const { t } = useTranslation()
  const portrait = live?.portraitCoverUrl || live?.coverUrl || live?.host?.avatarUrl || null

  return (
    <div className="vibely-keep-dark relative h-full w-full overflow-hidden bg-zinc-950">
      <AvatarImage
        src={portrait}
        alt=""
        className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-[0.35]"
      />
      <div className="relative flex h-full items-center justify-center">
        <AvatarImage src={portrait} alt={live?.title ?? ''} className="h-full w-full object-cover" />
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
