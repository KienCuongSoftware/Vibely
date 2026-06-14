import React from 'react'
import {
  IoCheckmark,
  IoChevronBack,
  IoChevronForward,
} from 'react-icons/io5'
import { LuArrowDownFromLine, LuFlag, LuGauge, LuHeartOff, LuPictureInPicture2 } from 'react-icons/lu'
import {
  FEED_MORE_MENU_BADGE_ICON_CLASS,
  FEED_MORE_MENU_CHEVRON_CLASS,
  FEED_MORE_MENU_INLINE_ICON_CLASS,
  FEED_MORE_MENU_ROW_CLASS,
  FEED_MORE_MENU_VALUE_CLASS,
  FEED_MORE_PANEL_CARET_CLASS,
  FEED_MORE_PANEL_SURFACE_CLASS,
  FEED_VIDEO_OVERLAY_BTN_CLASS,
} from '../../feed/feedLayout.js'
import {
  FEED_PLAYBACK_SPEEDS,
  formatPlaybackSpeedBadge,
  formatPlaybackSpeedOption,
} from '../../feed/feedPlaybackSpeedStorage.js'

function watchQualityLabel(mode) {
  if (mode === '720') return '720P'
  if (mode === '540') return '540P'
  return 'Tự động'
}

function WatchMoreSubpageHeader({ title, onBack }) {
  return (
    <div className="relative flex items-center border-b border-white/[0.06] px-2 py-2">
      <button
        type="button"
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-white transition-colors hover:bg-white/[0.06]"
        onClick={onBack}
        aria-label="Quay lại"
      >
        <IoChevronBack className="h-4 w-4" aria-hidden />
      </button>
      <span className="pointer-events-none absolute inset-x-0 text-center text-[13px] font-semibold text-white">
        {title}
      </span>
    </div>
  )
}

/**
 * Menu ⋯ trang xem video (TikTok desktop): tốc độ, chất lượng, cuộn tự động, PiP, …
 */
export function WatchVideoMoreMenu({
  open,
  onOpenChange,
  subpage,
  onSubpageChange,
  playbackSpeed,
  onPlaybackSpeedChange,
  videoQuality,
  onVideoQualityChange,
  qualityOptions,
  autoScrollEnabled,
  onAutoScrollChange,
  showAutoScroll = true,
  onTogglePip,
}) {
  if (!open) return null

  const closeMenu = () => onOpenChange(false)

  return (
    <>
      <button
        type="button"
        aria-label="Đóng menu"
        className="absolute inset-0 z-[45] cursor-default bg-black/45"
        onMouseDown={(e) => {
          e.preventDefault()
          closeMenu()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Menu video"
        className="watch-video-more-panel pointer-events-auto absolute top-14 right-3 z-[50] w-[min(220px,calc(100%-24px))] overflow-visible sm:top-[3.75rem] sm:right-4"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div
          aria-hidden
          className={`pointer-events-none absolute top-[-5px] right-[18px] z-10 h-2.5 w-2.5 rotate-45 rounded-[1px] shadow-sm ${FEED_MORE_PANEL_CARET_CLASS}`}
        />
        <div className={FEED_MORE_PANEL_SURFACE_CLASS}>
          {subpage === 'main' ? (
            <>
              <button
                type="button"
                className={FEED_MORE_MENU_ROW_CLASS}
                onClick={() => onSubpageChange('speed')}
              >
                <LuGauge strokeWidth={1.75} className={FEED_MORE_MENU_INLINE_ICON_CLASS} aria-hidden />
                <span className="min-w-0 flex-1">Tốc độ</span>
                <span className={FEED_MORE_MENU_VALUE_CLASS}>
                  {formatPlaybackSpeedBadge(playbackSpeed)}
                </span>
                <IoChevronForward className={FEED_MORE_MENU_CHEVRON_CLASS} aria-hidden />
              </button>

              <button
                type="button"
                className={FEED_MORE_MENU_ROW_CLASS}
                onClick={() => onSubpageChange('quality')}
              >
                <span className={FEED_MORE_MENU_BADGE_ICON_CLASS}>HD</span>
                <span className="min-w-0 flex-1">Chất lượng</span>
                <span className={FEED_MORE_MENU_VALUE_CLASS}>
                  {watchQualityLabel(videoQuality)}
                </span>
                <IoChevronForward className={FEED_MORE_MENU_CHEVRON_CLASS} aria-hidden />
              </button>

              {showAutoScroll ? (
                <div className={FEED_MORE_MENU_ROW_CLASS}>
                  <LuArrowDownFromLine
                    strokeWidth={1.75}
                    className={FEED_MORE_MENU_INLINE_ICON_CLASS}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">Cuộn tự động</span>
                  <button
                    type="button"
                    role="switch"
                    aria-checked={autoScrollEnabled}
                    className={`relative h-6 w-[46px] shrink-0 rounded-full transition-colors ${autoScrollEnabled ? 'bg-red-600' : 'bg-white/25'}`}
                    onClick={() => onAutoScrollChange((prev) => !prev)}
                  >
                    <span
                      className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform duration-200 ${autoScrollEnabled ? 'translate-x-5' : 'translate-x-0'}`}
                    />
                  </button>
                </div>
              ) : null}

              <button type="button" className={FEED_MORE_MENU_ROW_CLASS} onClick={() => void onTogglePip?.()}>
                <LuPictureInPicture2
                  strokeWidth={1.75}
                  className={FEED_MORE_MENU_INLINE_ICON_CLASS}
                  aria-hidden
                />
                <span className="flex-1">Trình phát nổi</span>
              </button>

              <button type="button" className={`${FEED_MORE_MENU_ROW_CLASS} border-b-0`}>
                <span className={FEED_MORE_MENU_BADGE_ICON_CLASS}>CC</span>
                <span className="flex-1">Phụ đề</span>
              </button>

              <div className="my-0.5 border-t border-white/[0.08]" aria-hidden />

              <button type="button" className={FEED_MORE_MENU_ROW_CLASS} onClick={closeMenu}>
                <LuHeartOff strokeWidth={1.75} className={FEED_MORE_MENU_INLINE_ICON_CLASS} aria-hidden />
                <span className="flex-1">Không quan tâm</span>
              </button>

              <button type="button" className={`${FEED_MORE_MENU_ROW_CLASS} border-b-0`} onClick={closeMenu}>
                <LuFlag strokeWidth={1.75} className={FEED_MORE_MENU_INLINE_ICON_CLASS} aria-hidden />
                <span className="flex-1">Báo cáo</span>
              </button>
            </>
          ) : subpage === 'speed' ? (
            <>
              <WatchMoreSubpageHeader title="Tốc độ" onBack={() => onSubpageChange('main')} />
              {FEED_PLAYBACK_SPEEDS.map((rate) => {
                const selected = playbackSpeed === rate
                return (
                  <button
                    key={rate}
                    type="button"
                    className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] text-white transition-colors hover:bg-white/[0.06] active:bg-white/10 ${selected ? 'bg-white/[0.08]' : ''}`}
                    onClick={() => {
                      onPlaybackSpeedChange(rate)
                      onSubpageChange('main')
                      closeMenu()
                    }}
                  >
                    <span>{formatPlaybackSpeedOption(rate)}</span>
                    {selected ? (
                      <IoCheckmark className="h-4 w-4 shrink-0 text-white" aria-hidden />
                    ) : (
                      <span className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                  </button>
                )
              })}
            </>
          ) : (
            <>
              <WatchMoreSubpageHeader title="Chất lượng" onBack={() => onSubpageChange('main')} />
              {qualityOptions.map((q) => {
                const selected = videoQuality === q
                return (
                  <button
                    key={q}
                    type="button"
                    className={`flex w-full items-center justify-between px-3 py-2.5 text-left text-[13px] text-white transition-colors hover:bg-white/[0.06] active:bg-white/10 ${selected ? 'bg-white/[0.08]' : ''}`}
                    onClick={() => {
                      onVideoQualityChange(q)
                      onSubpageChange('main')
                      closeMenu()
                    }}
                  >
                    <span>{watchQualityLabel(q)}</span>
                    {selected ? (
                      <IoCheckmark className="h-4 w-4 shrink-0 text-white" aria-hidden />
                    ) : (
                      <span className="h-4 w-4 shrink-0" aria-hidden />
                    )}
                  </button>
                )
              })}
            </>
          )}
        </div>
      </div>
    </>
  )
}

export { FEED_VIDEO_OVERLAY_BTN_CLASS as WATCH_MORE_TRIGGER_BTN_CLASS }
