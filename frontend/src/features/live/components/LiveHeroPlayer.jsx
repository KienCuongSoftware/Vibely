import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  IoChevronDown,
  IoChevronUp,
  IoRefreshOutline,
  IoVolumeHighOutline,
  IoVolumeMuteOutline,
} from 'react-icons/io5'
import { AvatarImage } from '@/shared/components/AvatarImage.jsx'
import { LiveBadge } from '@/features/live/components/LiveBadge.jsx'
import { LiveVerifiedBadge } from '@/features/live/components/LiveVerifiedBadge.jsx'
import { LivePlayer } from '@/features/live/components/player/LivePlayer.jsx'
import { formatLiveViewerCount } from '@/features/live/utils/formatLiveCount.js'

function LiveAudioWaveIcon({ animated = false }) {
  const heights = [6, 10, 8, 12, 7]
  return (
    <span className="flex h-3.5 items-end gap-[3px]" aria-hidden>
      {heights.map((height, index) => (
        <span
          key={index}
          className={`w-[3px] rounded-full bg-white ${animated ? 'live-hero-wave-bar' : ''}`}
          style={{
            height: `${height}px`,
            animationDelay: animated ? `${index * 0.12}s` : undefined,
          }}
        />
      ))}
    </span>
  )
}

function HeroNavButton({ label, onClick, children }) {
  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className="live-hero-nav-btn flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-black/45 text-white backdrop-blur-sm transition hover:bg-black/65"
    >
      {children}
    </button>
  )
}

export function LiveHeroPlayer({ streams, onWatch, onStreamEnded }) {
  const { t } = useTranslation()
  const [index, setIndex] = useState(0)
  const [hovered, setHovered] = useState(false)
  const [muted, setMuted] = useState(true)

  const list = streams?.length ? streams : []
  const stream = list[index % list.length]
  const watch = () => {
    if (stream) onWatch?.(stream)
  }

  const goPrevious = useCallback(() => {
    if (list.length <= 1) return
    setIndex((value) => (value - 1 + list.length) % list.length)
  }, [list.length])

  const goNext = useCallback(() => {
    if (list.length <= 1) return
    setIndex((value) => (value + 1) % list.length)
  }, [list.length])

  if (!stream) return null

  const backdropUrl = stream.coverUrl ?? stream.portraitCoverUrl ?? stream.host?.avatarUrl
  const viewerLabel = t('livePage.viewersLabel', {
    count: formatLiveViewerCount(stream.viewerCount),
  })

  return (
    <div className="relative mx-auto w-full max-w-[960px]">
      <div
        className="vibely-keep-dark live-hero-player relative aspect-video w-full overflow-hidden rounded-2xl bg-zinc-950 shadow-[0_16px_48px_rgba(0,0,0,0.45)] ring-1 ring-white/10"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        {backdropUrl ? (
          <img
            src={backdropUrl}
            alt=""
            className="absolute inset-0 h-full w-full scale-110 object-cover blur-2xl brightness-[0.35] saturate-125"
            referrerPolicy="no-referrer"
          />
        ) : null}
        <div className="pointer-events-none absolute inset-0 bg-black/45" />

        {/* The featured LIVE itself, always playing (muted until the viewer unmutes) */}
        <div className="absolute inset-0 flex items-center justify-center px-14 pb-12 pt-4">
          <div className="relative aspect-[9/16] h-full max-h-[calc(100%-8px)] overflow-hidden rounded-md shadow-[0_8px_32px_rgba(0,0,0,0.55)] ring-1 ring-white/10">
            <LivePlayer
              key={stream.id}
              live={stream}
              muted={muted}
              className="h-full w-full"
              onEnded={() => onStreamEnded?.(stream)}
            />
            <button
              type="button"
              onClick={watch}
              aria-label={t('livePage.clickToWatchLive')}
              className="absolute inset-0 cursor-pointer"
            />
          </div>
        </div>

        {/* Hover — controls */}
        <div
          className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out ${
            hovered ? 'opacity-100' : 'opacity-0'
          }`}
        >
          <div className={`absolute inset-x-0 bottom-0 flex items-center justify-between px-4 pb-4 ${hovered ? 'pointer-events-auto' : ''}`}>
            <button
              type="button"
              aria-label={t('livePage.refreshLive')}
              onClick={goNext}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white transition hover:bg-white/10"
            >
              <IoRefreshOutline className="text-[22px]" aria-hidden />
            </button>

            <button
              type="button"
              aria-label={muted ? t('livePage.unmute') : t('livePage.mute')}
              aria-pressed={muted}
              onClick={() => setMuted((value) => !value)}
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-white transition hover:bg-white/10"
            >
              {muted ? (
                <IoVolumeMuteOutline className="text-[22px]" aria-hidden />
              ) : (
                <IoVolumeHighOutline className="text-[22px]" aria-hidden />
              )}
            </button>
          </div>
        </div>

        {/* Default — promo overlay */}
        <div
          className={`pointer-events-none absolute inset-0 transition-opacity duration-300 ease-out ${
            hovered ? 'opacity-0' : 'opacity-100'
          }`}
        >
          <div className="absolute inset-0 bg-linear-to-r from-black/75 via-black/20 to-transparent" />

          <div className="relative h-full px-5 py-5 sm:px-7 sm:py-6">
            <div className="max-w-[34%]">
              <LiveBadge />
              <h2 className="mt-4 text-[18px] font-bold leading-tight text-white sm:text-[22px] lg:text-[24px]">
                {t('livePage.heroHeadline')}
              </h2>
            </div>

            <div className="absolute bottom-5 left-5 flex min-w-0 items-center gap-3 sm:bottom-6 sm:left-7">
              <AvatarImage
                src={stream.host?.avatarUrl}
                className="h-10 w-10 shrink-0 rounded-full object-cover ring-2 ring-white/20"
              />
              <div className="min-w-0">
                <p className="flex min-w-0 items-center gap-1 text-[15px] font-semibold text-white">
                  <span className="truncate">{stream.host?.displayName || stream.host?.username}</span>
                  {stream.host?.verified ? <LiveVerifiedBadge /> : null}
                </p>
                <p className="truncate text-[13px] text-zinc-300">{viewerLabel}</p>
              </div>
            </div>

            <button
              type="button"
              onClick={watch}
              className="live-hero-cta pointer-events-auto absolute bottom-5 left-1/2 inline-flex -translate-x-1/2 cursor-pointer items-center gap-2 rounded-full bg-black/55 px-4 py-2.5 text-[13px] font-semibold text-white backdrop-blur-md transition hover:bg-black/70 sm:bottom-6 sm:text-[14px]"
            >
              <LiveAudioWaveIcon animated />
              {t('livePage.clickToWatchLive')}
            </button>
          </div>
        </div>

        {/* Stream switcher — always visible */}
        {list.length > 1 ? (
          <div className="absolute right-3 top-1/2 z-10 flex -translate-y-1/2 flex-col gap-2 sm:right-4">
            <HeroNavButton label={t('livePage.previousLive')} onClick={goPrevious}>
              <IoChevronUp className="text-lg" aria-hidden />
            </HeroNavButton>
            <HeroNavButton label={t('livePage.nextLive')} onClick={goNext}>
              <IoChevronDown className="text-lg" aria-hidden />
            </HeroNavButton>
          </div>
        ) : null}
      </div>
    </div>
  )
}
