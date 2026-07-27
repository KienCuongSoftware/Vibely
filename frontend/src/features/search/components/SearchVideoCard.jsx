import React from 'react'
import { IoHeart } from 'react-icons/io5'
import {
  DEFAULT_AVATAR_URL,
  resolveVideoSearchCaption,
} from '@/features/search/utils/searchUtils'
import { formatRelativeTimeVi } from '@/shared/utils/relativeTimeVi.js'

function formatCompactCount(value) {
  const count = Number(value ?? 0)
  if (count >= 1_000_000) {
    const formatted =
      count >= 10_000_000
        ? (count / 1_000_000).toFixed(0)
        : (count / 1_000_000).toFixed(1)
    return `${formatted.replace(/\.0$/, '')}M`
  }
  if (count >= 10_000) return `${Math.round(count / 1000)}K`
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(count)
}

/**
 * TikTok-style search thumbnail: blurred/darkened fill behind a contained sharp image.
 */
export function SearchVideoThumb({ src, likeCount = 0, alt = '' }) {
  const thumb = typeof src === 'string' ? src.trim() : ''

  return (
    <div className="relative aspect-3/4 overflow-hidden rounded-sm bg-[#121212]">
      {thumb ? (
        <>
          <img
            src={thumb}
            alt=""
            aria-hidden
            loading="lazy"
            decoding="async"
            className="pointer-events-none absolute inset-0 h-full w-full scale-125 object-cover opacity-[0.45] blur-2xl"
            referrerPolicy="no-referrer"
          />
          <div className="pointer-events-none absolute inset-0 bg-black/55" aria-hidden />
          <img
            src={thumb}
            alt={alt}
            loading="lazy"
            decoding="async"
            className="relative z-[1] h-full w-full object-contain"
            referrerPolicy="no-referrer"
          />
        </>
      ) : (
        <div className="h-full w-full bg-[#1a1a1a]" />
      )}

      <div className="pointer-events-none absolute bottom-2 left-2 z-[2] inline-flex items-center gap-1 text-[13px] font-semibold text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]">
        <IoHeart className="text-[14px]" aria-hidden />
        {formatCompactCount(likeCount)}
      </div>
    </div>
  )
}

export function SearchVideoCard({ video, onOpen }) {
  const thumb = video?.thumbnailUrl?.trim()
  const authorAvatar = video?.authorAvatarUrl?.trim() || DEFAULT_AVATAR_URL
  const caption = resolveVideoSearchCaption(video)
  const username = video?.authorUsername ?? 'user'
  const relative = video?.createdAt ? formatRelativeTimeVi(video.createdAt) : ''

  return (
    <button
      type="button"
      onClick={() => onOpen?.(video)}
      className="group w-full cursor-pointer text-left"
    >
      <SearchVideoThumb src={thumb} likeCount={video?.likeCount ?? 0} alt="" />
      <p className="mt-2 line-clamp-1 text-[13px] leading-snug text-zinc-100 group-hover:text-white">
        {caption}
      </p>
      <div className="mt-1.5 flex min-w-0 items-center gap-1.5">
        <img
          src={authorAvatar}
          alt=""
          className="h-5 w-5 shrink-0 rounded-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_AVATAR_URL
          }}
        />
        <span className="min-w-0 truncate text-[12px] text-zinc-400">
          @{username}
        </span>
        {relative ? (
          <span className="shrink-0 text-[12px] text-zinc-500">· {relative}</span>
        ) : null}
      </div>
    </button>
  )
}
