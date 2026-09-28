import React from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { AvatarImage } from '@/shared/components/AvatarImage.jsx'
import { LiveVerifiedBadge } from '@/features/live/components/LiveVerifiedBadge.jsx'

/** Host avatar, name, verified badge and follow button. */
export function LiveHostInfo({ host, subtitle, following, followBusy, onToggleFollow, showFollow = true, overlay = false }) {
  const { t } = useTranslation()
  if (!host) return null
  const name = host.displayName || host.username
  const profilePath = host.username ? `/@${encodeURIComponent(host.username)}` : null
  const avatar = (
    <AvatarImage
      src={host.avatarUrl}
      className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-[#fe2c55]"
    />
  )

  return (
    <div
      className={`flex min-w-0 items-center gap-2.5 ${
        overlay ? 'rounded-full bg-black/35 py-1 pl-1 pr-1.5 backdrop-blur-sm' : ''
      }`}
    >
      {profilePath ? (
        <Link to={profilePath} aria-label={t('livePage.room.viewProfile', { name })} className="shrink-0">
          {avatar}
        </Link>
      ) : (
        avatar
      )}
      <div className="min-w-0 flex-1">
        <p className="flex min-w-0 items-center gap-1 text-[14px] font-semibold text-white">
          <span className="truncate">{name}</span>
          {host.verified ? <LiveVerifiedBadge /> : null}
        </p>
        {subtitle ? <p className="truncate text-[12px] text-zinc-300">{subtitle}</p> : null}
      </div>
      {showFollow ? (
        <button
          type="button"
          onClick={onToggleFollow}
          disabled={followBusy}
          aria-pressed={following}
          className={`shrink-0 cursor-pointer rounded-full px-3.5 py-1.5 text-[13px] font-semibold transition disabled:cursor-wait disabled:opacity-70 ${
            following
              ? 'bg-white/15 text-white hover:bg-white/25'
              : 'bg-[#fe2c55] text-white hover:bg-[#e6284c]'
          }`}
        >
          {following ? t('livePage.room.following') : t('livePage.room.follow')}
        </button>
      ) : null}
    </div>
  )
}
