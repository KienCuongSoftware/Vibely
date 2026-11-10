import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  IoEllipsisHorizontal,
  IoPause,
  IoPlay,
  IoVolumeHigh,
  IoVolumeLow,
  IoVolumeMedium,
  IoVolumeMute,
} from 'react-icons/io5'
import { LuFlag, LuHeartOff, LuPictureInPicture2 } from 'react-icons/lu'
import {
  FeedMoreMenuDivider,
  FeedMoreMenuRowButton,
  FeedMoreSubtitlesIcon,
} from '@/features/feed/components/FeedMoreMenuPrimitives.jsx'
import {
  readFeedSubtitlesPrefs,
  writeFeedSubtitlesPrefs,
} from '@/features/feed/components/FeedSubtitlesModal.jsx'
import {
  FEED_PLAYBACK_SPEEDS,
  formatPlaybackSpeedBadge,
} from '@/features/feed/utils/feedPlaybackSpeedStorage.js'
import {
  FEED_CONTROL_BAR_HEIGHT_PX,
  FEED_MORE_MENU_INLINE_ICON_CLASS,
} from '@/features/feed/utils/feedLayout.js'
import { formatPlaybackTime } from '@/features/feed/utils/videoDuration.js'
import { TooltipHoverWrap } from '@/shared/components/TooltipControls.jsx'

const FEED_VOLUME_DEFAULT = 1

/**
 * Thanh điều khiển dưới video (play / time / auto-scroll / speed / CC / volume / ⋯).
 * Speed + volume popover là state nội bộ; báo stage qua onLocalPopoverChange.
 */
export function FeedControlBar({
  controlPopoverOpen = false,
  userPaused = false,
  playbackClock = { current: 0, duration: 0 },
  toggleFeedPlayback,
  feedAutoScrollEnabled = false,
  setFeedAutoScrollEnabled,
  feedPlaybackSpeed = 1,
  setFeedPlaybackSpeed,
  captionsEnabled = false,
  timedCaptionsAvailable = false,
  feedSoundOn = false,
  setFeedSoundOn,
  feedVolume = 0,
  setFeedVolume,
  feedMoreMenuOpen = false,
  setFeedMoreMenuOpen,
  toggleFeedPictureInPicture,
  onOpenSubtitles,
  onNotInterested,
  onOpenReport,
  onLocalPopoverChange,
  /** Tăng khi stage muốn đóng speed/volume (đổi slide / tap ngoài). */
  dismissEpoch = 0,
}) {
  const { t } = useTranslation()
  const [speedMenuOpen, setSpeedMenuOpen] = useState(false)
  const [volumeMenuOpen, setVolumeMenuOpen] = useState(false)
  const speedHoverCloseTimerRef = useRef(null)
  const volumeHoverCloseTimerRef = useRef(null)

  const clearSpeedHoverClose = useCallback(() => {
    if (speedHoverCloseTimerRef.current != null) {
      window.clearTimeout(speedHoverCloseTimerRef.current)
      speedHoverCloseTimerRef.current = null
    }
  }, [])

  const clearVolumeHoverClose = useCallback(() => {
    if (volumeHoverCloseTimerRef.current != null) {
      window.clearTimeout(volumeHoverCloseTimerRef.current)
      volumeHoverCloseTimerRef.current = null
    }
  }, [])

  const openSpeedMenu = useCallback(() => {
    clearSpeedHoverClose()
    clearVolumeHoverClose()
    setFeedMoreMenuOpen?.(false)
    setVolumeMenuOpen(false)
    setSpeedMenuOpen(true)
  }, [clearSpeedHoverClose, clearVolumeHoverClose, setFeedMoreMenuOpen])

  const scheduleCloseSpeedMenu = useCallback(() => {
    clearSpeedHoverClose()
    speedHoverCloseTimerRef.current = window.setTimeout(() => {
      setSpeedMenuOpen(false)
      speedHoverCloseTimerRef.current = null
    }, 180)
  }, [clearSpeedHoverClose])

  const openVolumeMenu = useCallback(() => {
    clearVolumeHoverClose()
    clearSpeedHoverClose()
    setFeedMoreMenuOpen?.(false)
    setSpeedMenuOpen(false)
    setVolumeMenuOpen(true)
  }, [clearSpeedHoverClose, clearVolumeHoverClose, setFeedMoreMenuOpen])

  const scheduleCloseVolumeMenu = useCallback(() => {
    clearVolumeHoverClose()
    volumeHoverCloseTimerRef.current = window.setTimeout(() => {
      setVolumeMenuOpen(false)
      volumeHoverCloseTimerRef.current = null
    }, 180)
  }, [clearVolumeHoverClose])

  useEffect(() => {
    return () => {
      clearSpeedHoverClose()
      clearVolumeHoverClose()
    }
  }, [clearSpeedHoverClose, clearVolumeHoverClose])

  useEffect(() => {
    onLocalPopoverChange?.(speedMenuOpen || volumeMenuOpen)
  }, [onLocalPopoverChange, speedMenuOpen, volumeMenuOpen])

  useEffect(() => {
    if (!feedMoreMenuOpen) return
    setSpeedMenuOpen(false)
    setVolumeMenuOpen(false)
  }, [feedMoreMenuOpen])

  useEffect(() => {
    setSpeedMenuOpen(false)
    setVolumeMenuOpen(false)
  }, [dismissEpoch])

  return (
    <div
      className={`vibely-keep-dark pointer-events-auto absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-2.5 text-white ${
        controlPopoverOpen ? 'z-90' : 'z-70'
      }`}
      style={{ height: FEED_CONTROL_BAR_HEIGHT_PX }}
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label={userPaused ? t('upload.play') : t('upload.pause')}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-white hover:bg-white/10"
          onClick={(e) => {
            e.stopPropagation()
            toggleFeedPlayback?.(e)
          }}
        >
          {userPaused ? (
            <IoPlay className="ml-0.5 h-5 w-5" aria-hidden />
          ) : (
            <IoPause className="h-5 w-5" aria-hidden />
          )}
        </button>
        <span className="truncate text-[12px] font-semibold tabular-nums text-white/95">
          {formatPlaybackTime(playbackClock.current)} /{' '}
          {formatPlaybackTime(playbackClock.duration)}
        </span>
      </div>

      <div className="relative flex shrink-0 items-center gap-1.5">
        <div className="flex shrink-0 items-center gap-1.5 pr-0.5">
          <span className="text-[12px] font-medium leading-none whitespace-nowrap text-white/95">
            {t('feedMenu.autoScroll')}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={Boolean(feedAutoScrollEnabled)}
            aria-label={t('feedMenu.autoScroll')}
            className={`relative h-[22px] w-[40px] shrink-0 cursor-pointer rounded-full transition-colors ${
              feedAutoScrollEnabled ? 'bg-[#fe2c55]' : 'bg-white/25'
            }`}
            onClick={(e) => {
              e.stopPropagation()
              setFeedAutoScrollEnabled?.((prev) => !prev)
            }}
          >
            <span
              className={`absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200 ${
                feedAutoScrollEnabled ? 'translate-x-[18px]' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        <div
          className="relative"
          onMouseEnter={openSpeedMenu}
          onMouseLeave={scheduleCloseSpeedMenu}
        >
          <button
            type="button"
            aria-label={t('feedMenu.speedGroup')}
            aria-expanded={speedMenuOpen}
            className="flex h-8 min-w-8 cursor-pointer items-center justify-center rounded-md px-1.5 text-[12px] font-bold text-white hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation()
              if (speedMenuOpen) {
                clearSpeedHoverClose()
                setSpeedMenuOpen(false)
                return
              }
              openSpeedMenu()
            }}
          >
            {formatPlaybackSpeedBadge(feedPlaybackSpeed)}
          </button>
          {speedMenuOpen ? (
            <div
              className="absolute bottom-full left-1/2 z-80 -translate-x-1/2 pb-6"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <div
                role="menu"
                aria-label={t('feedMenu.speedGroup')}
                className="feed-dark-popover vibely-keep-dark min-w-[5.5rem] overflow-hidden rounded-xl py-1 text-white shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
              >
                <p className="feed-dark-popover-label px-3 py-1.5 text-[11px] font-medium">
                  {t('feedMenu.speedGroup')}
                </p>
                {FEED_PLAYBACK_SPEEDS.map((rate) => {
                  const selected = feedPlaybackSpeed === rate
                  return (
                    <button
                      key={rate}
                      type="button"
                      role="menuitemradio"
                      aria-checked={selected}
                      className={`feed-dark-popover-item flex w-full items-center justify-center px-3 py-2 text-[13px] font-semibold tabular-nums transition-colors ${
                        selected ? 'is-selected' : ''
                      }`}
                      onClick={() => {
                        setFeedPlaybackSpeed?.(rate)
                        setSpeedMenuOpen(false)
                      }}
                    >
                      {formatPlaybackSpeedBadge(rate)}
                    </button>
                  )
                })}
              </div>
            </div>
          ) : null}
        </div>

        <TooltipHoverWrap
          tip={
            timedCaptionsAvailable
              ? t('feedMenu.subtitles')
              : t('feedMenu.noSubtitles')
          }
          placement="top"
          hoverOnly
          className="pointer-events-auto"
        >
          <button
            type="button"
            aria-label={
              timedCaptionsAvailable
                ? t('feedMenu.subtitles')
                : t('feedMenu.noSubtitles')
            }
            aria-pressed={captionsEnabled}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-[11px] font-bold tracking-wide text-white hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation()
              const next = !captionsEnabled
              writeFeedSubtitlesPrefs({
                ...readFeedSubtitlesPrefs(),
                captionsEnabled: next,
              })
            }}
          >
            {/* Bật: viền sáng · Tắt: khối đặc sáng (TikTok), không xám */}
            <span
              className={`rounded-[3px] px-[3px] py-px leading-none ${
                captionsEnabled
                  ? 'border border-white bg-transparent text-white'
                  : 'border border-transparent bg-white text-[#121212]'
              }${!timedCaptionsAvailable ? ' opacity-50' : ''}`}
            >
              CC
            </span>
          </button>
        </TooltipHoverWrap>

        <div
          className="relative"
          onMouseEnter={openVolumeMenu}
          onMouseLeave={scheduleCloseVolumeMenu}
        >
          <button
            type="button"
            aria-label={feedSoundOn ? t('feed.mute') : t('feed.unmute')}
            aria-expanded={volumeMenuOpen}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation()
              if (feedSoundOn && feedVolume > 0) {
                setFeedSoundOn?.(false)
                return
              }
              setFeedSoundOn?.(true)
              if ((Number(feedVolume) || 0) <= 0) {
                setFeedVolume?.(FEED_VOLUME_DEFAULT)
              }
            }}
          >
            {feedSoundOn && feedVolume > 0 ? (
              feedVolume < 0.35 ? (
                <IoVolumeLow className="h-5 w-5" aria-hidden />
              ) : feedVolume < 0.7 ? (
                <IoVolumeMedium className="h-5 w-5" aria-hidden />
              ) : (
                <IoVolumeHigh className="h-5 w-5" aria-hidden />
              )
            ) : (
              <IoVolumeMute className="h-5 w-5" aria-hidden />
            )}
          </button>
          {volumeMenuOpen ? (
            <div
              className="absolute bottom-full left-1/2 z-80 flex -translate-x-1/2 flex-col items-center pb-6"
              onMouseDown={(e) => e.stopPropagation()}
              onClick={(e) => e.stopPropagation()}
            >
              <div
                className="feed-volume-popover feed-dark-popover flex h-[7.75rem] w-11 items-center justify-center rounded-xl py-3 shadow-[0_8px_28px_rgba(0,0,0,0.45)]"
                style={{ backgroundColor: '#3a3a3a', colorScheme: 'dark' }}
              >
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={
                    feedSoundOn
                      ? Math.min(1, Math.max(0, Number(feedVolume) || 0))
                      : 0
                  }
                  aria-label={t('feed.volume')}
                  className="watch-volume-slider-vertical"
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setFeedVolume?.(v)
                    setFeedSoundOn?.(v > 0)
                  }}
                />
              </div>
            </div>
          ) : null}
        </div>

        <div className="relative">
          <button
            type="button"
            aria-label="Menu video"
            aria-expanded={feedMoreMenuOpen}
            aria-haspopup="dialog"
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white hover:bg-white/10"
            onClick={(e) => {
              e.stopPropagation()
              setSpeedMenuOpen(false)
              setVolumeMenuOpen(false)
              setFeedMoreMenuOpen?.((open) => !open)
            }}
          >
            <IoEllipsisHorizontal className="h-5 w-5" aria-hidden />
          </button>
          {feedMoreMenuOpen ? (
            <div
              role="dialog"
              aria-modal="true"
              aria-label="Menu video"
              className="feed-dark-popover vibely-keep-dark absolute bottom-[calc(100%+10px)] right-0 z-80 w-[min(240px,calc(100vw-24px))] overflow-hidden rounded-xl py-1 text-white shadow-[0_12px_40px_rgba(0,0,0,0.45)]"
              onMouseDown={(e) => e.stopPropagation()}
            >
              <FeedMoreMenuRowButton
                role={undefined}
                icon={
                  <LuPictureInPicture2
                    strokeWidth={1.75}
                    className={FEED_MORE_MENU_INLINE_ICON_CLASS}
                    aria-hidden
                  />
                }
                label={t('feedMenu.pip')}
                onClick={() => {
                  setFeedMoreMenuOpen?.(false)
                  void toggleFeedPictureInPicture?.()
                }}
              />
              <FeedMoreMenuRowButton
                role={undefined}
                icon={<FeedMoreSubtitlesIcon />}
                label={t('feedMenu.subtitles')}
                onClick={() => {
                  setFeedMoreMenuOpen?.(false)
                  onOpenSubtitles?.()
                }}
              />
              <FeedMoreMenuDivider />
              <FeedMoreMenuRowButton
                role={undefined}
                icon={
                  <LuHeartOff
                    strokeWidth={1.75}
                    className={FEED_MORE_MENU_INLINE_ICON_CLASS}
                    aria-hidden
                  />
                }
                label={t('feedMenu.notInterested')}
                onClick={() => {
                  setFeedMoreMenuOpen?.(false)
                  onNotInterested?.()
                }}
              />
              <FeedMoreMenuRowButton
                role={undefined}
                icon={
                  <LuFlag
                    strokeWidth={1.75}
                    className={FEED_MORE_MENU_INLINE_ICON_CLASS}
                    aria-hidden
                  />
                }
                label={t('feedMenu.report')}
                onClick={() => {
                  setFeedMoreMenuOpen?.(false)
                  onOpenReport?.()
                }}
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
