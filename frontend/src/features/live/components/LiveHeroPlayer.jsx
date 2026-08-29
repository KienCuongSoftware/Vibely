import React from 'react'
import { useTranslation } from 'react-i18next'
import { IoCheckmarkCircle, IoPlay, IoVolumeHighOutline } from 'react-icons/io5'
import { LiveBadge } from '@/features/live/components/LiveBadge.jsx'
import { formatLiveViewerCount } from '@/features/live/utils/formatLiveCount.js'

export function LiveHeroPlayer({ stream }) {
  const { t } = useTranslation()

  if (!stream) return null

  return (
    <div className="relative mx-auto w-full max-w-[960px]">
      <div className="vibely-keep-dark group relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-950 shadow-[0_16px_48px_rgba(0,0,0,0.45)] ring-1 ring-white/10">
        <img
          src={stream.coverUrl}
          alt=""
          className="h-full w-full object-cover"
          referrerPolicy="no-referrer"
        />

        <div className="pointer-events-none absolute inset-0 bg-linear-to-t from-black/50 via-transparent to-black/30" />

        <div className="absolute left-3 top-3 flex items-center gap-2 sm:left-4 sm:top-4">
          <LiveBadge />
          <span className="rounded-md bg-black/50 px-2 py-1 text-[12px] font-semibold tabular-nums text-white backdrop-blur-sm">
            {formatLiveViewerCount(stream.viewerCount)} {t('livePage.watching')}
          </span>
        </div>

        <div className="absolute left-3 top-14 max-w-[200px] rounded-xl border border-white/15 bg-black/75 px-3 py-2 text-[12px] font-semibold text-white shadow-lg backdrop-blur-md sm:left-4 sm:top-16 sm:max-w-none sm:text-[13px]">
          {t('livePage.openLiveStudio')}
          <span
            className="absolute -bottom-1.5 left-6 h-3 w-3 rotate-45 border-b border-r border-white/15 bg-black/75"
            aria-hidden
          />
        </div>

        {stream.webcamUrl ? (
          <div className="absolute bottom-16 left-3 overflow-hidden rounded-lg border-2 border-white/20 shadow-lg sm:bottom-20 sm:left-4">
            <img
              src={stream.webcamUrl}
              alt=""
              className="h-[72px] w-[96px] object-cover sm:h-[88px] sm:w-[118px]"
              referrerPolicy="no-referrer"
            />
          </div>
        ) : null}

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
          <span className="flex h-16 w-16 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
            <IoPlay className="ml-1 text-3xl" aria-hidden />
          </span>
        </div>

        <div className="absolute bottom-0 inset-x-0 flex items-end justify-between gap-3 bg-linear-to-t from-black/85 via-black/35 to-transparent px-3 pb-3 pt-16 sm:px-4 sm:pb-4">
          <div className="min-w-0 flex-1">
            <div className="flex min-w-0 items-center gap-2">
              <img
                src={stream.avatarUrl}
                alt=""
                className="h-9 w-9 shrink-0 rounded-full object-cover ring-2 ring-[#fe2c55]"
                referrerPolicy="no-referrer"
              />
              <div className="min-w-0">
                <div className="flex min-w-0 items-center gap-1">
                  <p className="truncate text-[14px] font-bold text-white sm:text-[15px]">
                    {stream.displayName}
                  </p>
                  {stream.verified ? (
                    <IoCheckmarkCircle className="shrink-0 text-sky-400" aria-hidden />
                  ) : null}
                </div>
                <p className="truncate text-[12px] text-zinc-300">@{stream.username}</p>
              </div>
            </div>
            <p className="mt-2 line-clamp-2 text-[13px] font-medium text-zinc-100 sm:text-[14px]">
              {stream.title}
            </p>
          </div>
          <button
            type="button"
            aria-label={t('livePage.unmute')}
            className="mb-0.5 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-800/90 text-white transition hover:bg-zinc-700"
          >
            <IoVolumeHighOutline className="text-lg" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  )
}
