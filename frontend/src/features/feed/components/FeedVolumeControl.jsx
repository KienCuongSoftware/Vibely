import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  IoVolumeHigh,
  IoVolumeLow,
  IoVolumeMedium,
  IoVolumeMute,
} from 'react-icons/io5'

const FEED_VOLUME_DEFAULT = 1

function FeedVolumeIcon({ soundOn, volume }) {
  if (!soundOn || volume === 0) {
    return <IoVolumeMute className="h-[22px] w-[22px]" aria-hidden />
  }
  if (volume < 0.34) {
    return <IoVolumeLow className="h-[22px] w-[22px]" aria-hidden />
  }
  if (volume < 0.67) {
    return <IoVolumeMedium className="h-[22px] w-[22px]" aria-hidden />
  }
  return <IoVolumeHigh className="h-[22px] w-[22px]" aria-hidden />
}

/**
 * TikTok For You volume:
 * - Muted → mute icon always visible (no video hover needed)
 * - Unmuted → speaker shows on video hover; slider only when hovering the control
 * Slider is unmounted when collapsed so the white track/thumb never leaks into the icon.
 */
export function FeedVolumeControl({
  volume,
  onVolumeChange,
  soundOn,
  onSoundOnChange,
  /** Theater chrome ngoài video — luôn hiện icon (không phụ thuộc hover khung video). */
  alwaysVisible = false,
}) {
  const { t } = useTranslation()
  const [pinned, setPinned] = useState(false)
  const [hovered, setHovered] = useState(false)
  const isMuted = !soundOn || volume <= 0
  const expanded = pinned || hovered

  useEffect(() => {
    if (!pinned) return undefined
    const release = () => setPinned(false)
    window.addEventListener('pointerup', release, { capture: true })
    window.addEventListener('pointercancel', release, { capture: true })
    return () => {
      window.removeEventListener('pointerup', release, { capture: true })
      window.removeEventListener('pointercancel', release, { capture: true })
    }
  }, [pinned])

  const stopFeedPointer = (e) => {
    e.stopPropagation()
  }

  const pinInteraction = (e) => {
    e.stopPropagation()
    setPinned(true)
  }

  const toggleSound = (e) => {
    e.stopPropagation()
    if (!isMuted) {
      onSoundOnChange(false)
      return
    }
    onSoundOnChange(true)
    if (volume === 0) {
      onVolumeChange(FEED_VOLUME_DEFAULT)
    }
  }

  const onSlider = (e) => {
    e.stopPropagation()
    const v = Number(e.target.value)
    onVolumeChange(v)
    onSoundOnChange(v > 0)
  }

  // Muted: always on. Unmuted: only with video hover (group) unless alwaysVisible / pinned / hovering vol.
  const shellVisibility =
    isMuted || alwaysVisible || pinned
      ? 'pointer-events-auto opacity-100'
      : 'pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100 focus-within:pointer-events-auto focus-within:opacity-100 group-has-[.feed-video-more-panel:hover]:pointer-events-none group-has-[.feed-video-more-panel:hover]:opacity-0'

  return (
    <div
      className={`feed-volume-control group/vol relative flex h-10 items-center transition-opacity duration-150 ease-out ${shellVisibility}`}
      onPointerDown={stopFeedPointer}
      onMouseDown={stopFeedPointer}
      onClick={stopFeedPointer}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div
        className={`feed-volume-control-shell flex h-10 items-center overflow-hidden rounded-full transition-[max-width,padding,box-shadow] duration-200 ease-out ${
          expanded
            ? 'max-w-[11.5rem] py-0 pl-1.5 pr-3 shadow-[0_4px_18px_rgba(0,0,0,0.35)] backdrop-blur-md'
            : 'max-w-10 p-0 shadow-[0_2px_10px_rgba(0,0,0,0.28)] backdrop-blur-[2px]'
        }`}
      >
        <button
          type="button"
          aria-label={isMuted ? t('feed.unmute') : t('feed.mute')}
          className="relative z-20 flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center text-white transition-opacity hover:opacity-90"
          onPointerDown={stopFeedPointer}
          onClick={toggleSound}
        >
          <FeedVolumeIcon soundOn={soundOn} volume={volume} />
        </button>
        {expanded ? (
          <div className="relative z-10 flex h-10 w-[7.25rem] shrink-0 items-center overflow-hidden">
            <div
              className="pointer-events-none absolute inset-y-0 left-0 right-0 flex items-center"
              aria-hidden
            >
              <div className="relative h-[4px] w-full overflow-hidden rounded-full bg-white/30">
                <div
                  className="absolute inset-y-0 left-0 rounded-full bg-white"
                  style={{
                    width: `${Math.min(100, Math.max(0, volume * 100))}%`,
                  }}
                />
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              aria-label={t('feed.volume')}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(volume * 100)}
              className="feed-volume-slider pointer-events-auto relative z-10 w-full cursor-pointer"
              onPointerDown={pinInteraction}
              onChange={onSlider}
              onInput={onSlider}
              onClick={stopFeedPointer}
            />
          </div>
        ) : null}
      </div>
    </div>
  )
}
