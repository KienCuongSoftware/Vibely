import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { IoChevronForward, IoShieldCheckmark } from 'react-icons/io5'
import { apiClient } from '../../api/client.js'
import { useAuth } from '../../state/useAuth.js'
import { DEFAULT_AVATAR_URL, buildProfileHref, buildVideoHref } from '../search/searchUtils.js'
import {
  buildActivityActionText,
  buildActivityActorName,
  formatActivityTimestamp,
} from './activityUtils.js'

function VideoThumb({ publicId }) {
  return (
    <div
      className="h-12 w-9 shrink-0 overflow-hidden rounded-md bg-gradient-to-br from-zinc-700 via-zinc-800 to-zinc-900 ring-1 ring-white/10"
      aria-hidden
    >
      {publicId ? (
        <div className="flex h-full w-full items-center justify-center text-[8px] font-semibold uppercase tracking-wide text-zinc-500">
          Video
        </div>
      ) : null}
    </div>
  )
}

function FollowBackButton({ actorId, initialFollowing, onFollowed }) {
  const { token } = useAuth()
  const [following, setFollowing] = useState(Boolean(initialFollowing))
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    setFollowing(Boolean(initialFollowing))
  }, [initialFollowing])

  if (following || !actorId) return null

  const handleFollow = async (event) => {
    event.preventDefault()
    event.stopPropagation()
    if (!token || busy) return
    setBusy(true)
    try {
      await apiClient.follow(actorId, token)
      setFollowing(true)
      onFollowed?.()
    } catch {
      /* keep button for retry */
    } finally {
      setBusy(false)
    }
  }

  return (
    <button
      type="button"
      onClick={(event) => void handleFollow(event)}
      disabled={busy}
      className={`shrink-0 rounded-full bg-[#FE2C55] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#ea284f] ${
        busy ? 'cursor-wait opacity-80' : 'cursor-pointer'
      }`}
    >
      {busy ? 'Đang lưu...' : 'Follow lại'}
    </button>
  )
}

function ActivityAvatar({ item, isSystem }) {
  if (isSystem) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-sky-950 ring-1 ring-sky-800/60">
        <IoShieldCheckmark className="text-lg text-sky-400" aria-hidden />
      </div>
    )
  }

  return (
    <img
      src={item.actor?.avatarUrl?.trim() || DEFAULT_AVATAR_URL}
      alt=""
      className="h-10 w-10 rounded-full object-cover ring-1 ring-white/10"
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={(event) => {
        event.currentTarget.src = DEFAULT_AVATAR_URL
      }}
    />
  )
}

function ActivityText({ item, isSystem, actorName, actionText, timeLabel }) {
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[13px] leading-snug text-zinc-300">
        <span className="font-semibold text-white">{actorName}</span>
        {!isSystem ? (
          <>
            {' '}
            {actionText}
          </>
        ) : null}
      </p>
      {item.preview ? (
        <p className="mt-0.5 truncate text-xs text-zinc-500">{item.preview}</p>
      ) : null}
      {isSystem && item.body ? (
        <p className="mt-0.5 text-xs leading-snug text-zinc-500">{item.body}</p>
      ) : null}
      {timeLabel ? (
        <p className="mt-0.5 text-[11px] text-zinc-600">{timeLabel}</p>
      ) : null}
    </div>
  )
}

export function ActivityNotificationItem({ item, onNavigate }) {
  const isSystem = item.type === 'system'
  const isFollow = item.type === 'follow'
  const profileHref = !isSystem ? buildProfileHref(item.actor?.username) : null
  const videoHref = item.videoPublicId ? buildVideoHref(item.videoPublicId) : null
  const primaryHref = videoHref || profileHref || '/foryou'
  const actorName = buildActivityActorName(item)
  const actionText = buildActivityActionText(item)
  const timeLabel = formatActivityTimestamp(item.createdAt)
  const actorId = item.actor?.id ?? item.actorId ?? null

  if (isFollow) {
    return (
      <div className="flex items-center gap-2.5 rounded-lg px-2 py-2 transition hover:bg-zinc-900/80">
        <Link
          to={profileHref || '/foryou'}
          onClick={() => onNavigate?.()}
          className="flex min-w-0 flex-1 items-center gap-3"
        >
          <ActivityAvatar item={item} isSystem={false} />
          <ActivityText
            item={item}
            isSystem={false}
            actorName={actorName}
            actionText={actionText}
            timeLabel={timeLabel}
          />
        </Link>
        <FollowBackButton
          actorId={actorId}
          initialFollowing={item.viewerFollowsActor}
        />
      </div>
    )
  }

  const content = (
    <>
      <ActivityAvatar item={item} isSystem={isSystem} />
      <ActivityText
        item={item}
        isSystem={isSystem}
        actorName={actorName}
        actionText={actionText}
        timeLabel={timeLabel}
      />
      {videoHref ? (
        <VideoThumb publicId={item.videoPublicId} />
      ) : isSystem ? (
        <IoChevronForward className="mt-1 shrink-0 text-lg text-zinc-600" aria-hidden />
      ) : null}
    </>
  )

  return (
    <Link
      to={primaryHref}
      onClick={() => onNavigate?.()}
      className="flex w-full gap-2.5 rounded-lg px-2 py-2 text-left transition hover:bg-zinc-900/80"
    >
      {content}
    </Link>
  )
}
