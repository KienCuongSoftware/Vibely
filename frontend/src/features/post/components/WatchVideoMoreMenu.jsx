import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  IoCheckmark,
  IoChevronBack,
  IoChevronForward,
} from 'react-icons/io5'
import { LuFlag, LuHeartOff, LuPictureInPicture2 } from 'react-icons/lu'
import {
  FeedMoreAutoScrollRow,
  FeedMoreMenuDivider,
  FeedMoreMenuRowButton,
  FeedMoreSpeedRow,
  FeedMoreSubtitlesIcon,
} from '@/features/feed/components/FeedMoreMenuPrimitives.jsx'
import {
  FEED_MORE_MENU_CHEVRON_CLASS,
  FEED_MORE_MENU_INLINE_ICON_CLASS,
  FEED_MORE_MENU_ROW_CLASS,
  FEED_MORE_MENU_VALUE_CLASS,
  FEED_MORE_PANEL_CARET_CLASS,
  FEED_MORE_PANEL_SURFACE_CLASS,
  FEED_VIDEO_OVERLAY_BTN_CLASS,
} from '@/features/feed/utils/feedLayout.js'
import { formatQualityLabel } from '@/features/feed/utils/hlsQualityUtils.js'
import { FeedSubtitlesModal } from '@/features/feed/components/FeedSubtitlesModal.jsx'
import { FeedReportModal } from '@/features/report/components/FeedReportModal.jsx'

function WatchMoreSubpageHeader({ title, onBack }) {
  const { t } = useTranslation()
  return (
    <div className="relative flex items-center border-b border-white/10 px-2 py-2.5">
      <button
        type="button"
        className="flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center rounded-md text-white transition-colors hover:bg-white/[0.06]"
        onClick={onBack}
        aria-label={t('common.back')}
      >
        <IoChevronBack className="h-4 w-4" aria-hidden />
      </button>
      <span className="pointer-events-none absolute inset-x-0 text-center text-[14px] font-semibold text-white">
        {title}
      </span>
    </div>
  )
}

/**
 * Menu ⋯ trang xem video (TikTok desktop): tốc độ pill, chất lượng, cuộn tự động, PiP, …
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
  onNotInterested,
  videoPublicId,
  reportToken,
  onReportRequireAuth,
  onReportSubmitted,
}) {
  const { t } = useTranslation()
  const [subtitlesOpen, setSubtitlesOpen] = useState(false)
  const [reportOpen, setReportOpen] = useState(false)

  if (!open && !subtitlesOpen && !reportOpen) return null

  const closeMenu = () => onOpenChange(false)

  return (
    <>
      {open ? (
        <>
          <button
            type="button"
            aria-label={t('feed.closeMenu')}
            className="absolute inset-0 z-[45] cursor-default bg-black/45"
            onMouseDown={(e) => {
              e.preventDefault()
              closeMenu()
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label={t('feedMenu.menuAria')}
            className="watch-video-more-panel pointer-events-auto absolute top-14 right-3 z-[50] w-[min(300px,calc(100%-24px))] overflow-visible sm:top-[3.75rem] sm:right-4"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div
              aria-hidden
              className={`pointer-events-none absolute top-[-5px] right-[18px] z-10 h-2.5 w-2.5 rotate-45 shadow-sm ${FEED_MORE_PANEL_CARET_CLASS}`}
            />
            <div className={FEED_MORE_PANEL_SURFACE_CLASS}>
              {subpage === 'quality' ? (
                <>
                  <WatchMoreSubpageHeader
                    title={t('feedMenu.quality')}
                    onBack={() => onSubpageChange('main')}
                  />
                  {qualityOptions.map((q) => {
                    const selected = videoQuality === q
                    return (
                      <button
                        key={q}
                        type="button"
                        className={`flex w-full items-center justify-between px-3.5 py-3 text-left text-[14px] text-white transition-colors hover:bg-white/[0.06] active:bg-white/10 ${selected ? 'bg-white/[0.08]' : ''}`}
                        onClick={() => {
                          onVideoQualityChange(q)
                          onSubpageChange('main')
                          closeMenu()
                        }}
                      >
                        <span>{formatQualityLabel(q)}</span>
                        {selected ? (
                          <IoCheckmark
                            className="h-4 w-4 shrink-0 text-white"
                            aria-hidden
                          />
                        ) : (
                          <span className="h-4 w-4 shrink-0" aria-hidden />
                        )}
                      </button>
                    )
                  })}
                </>
              ) : (
                <>
                  <FeedMoreSpeedRow
                    playbackSpeed={playbackSpeed}
                    onPlaybackSpeedChange={onPlaybackSpeedChange}
                  />

                  <button
                    type="button"
                    className={FEED_MORE_MENU_ROW_CLASS}
                    onClick={() => onSubpageChange('quality')}
                  >
                    <span className="min-w-0 flex-1">{t('feedMenu.quality')}</span>
                    <span className={FEED_MORE_MENU_VALUE_CLASS}>
                      {formatQualityLabel(videoQuality)}
                    </span>
                    <IoChevronForward
                      className={FEED_MORE_MENU_CHEVRON_CLASS}
                      aria-hidden
                    />
                  </button>

                  {showAutoScroll ? (
                    <FeedMoreAutoScrollRow
                      autoScrollEnabled={autoScrollEnabled}
                      onAutoScrollChange={onAutoScrollChange}
                      showIcon={false}
                    />
                  ) : null}

                  <FeedMoreMenuRowButton
                    icon={
                      <LuPictureInPicture2
                        strokeWidth={1.75}
                        className={FEED_MORE_MENU_INLINE_ICON_CLASS}
                        aria-hidden
                      />
                    }
                    label={t('feedMenu.pip')}
                    role={undefined}
                    onClick={() => void onTogglePip?.()}
                  />

                  <FeedMoreMenuRowButton
                    icon={<FeedMoreSubtitlesIcon />}
                    label={t('feedMenu.subtitles')}
                    role={undefined}
                    onClick={() => {
                      closeMenu()
                      setSubtitlesOpen(true)
                    }}
                  />

                  <FeedMoreMenuDivider />

                  <FeedMoreMenuRowButton
                    icon={
                      <LuHeartOff
                        strokeWidth={1.75}
                        className={FEED_MORE_MENU_INLINE_ICON_CLASS}
                        aria-hidden
                      />
                    }
                    label={t('feedMenu.notInterested')}
                    role={undefined}
                    onClick={() => {
                      closeMenu()
                      onNotInterested?.()
                    }}
                  />

                  <FeedMoreMenuRowButton
                    icon={
                      <LuFlag
                        strokeWidth={1.75}
                        className={FEED_MORE_MENU_INLINE_ICON_CLASS}
                        aria-hidden
                      />
                    }
                    label={t('feedMenu.report')}
                    role={undefined}
                    onClick={() => {
                      closeMenu()
                      setReportOpen(true)
                    }}
                  />
                </>
              )}
            </div>
          </div>
        </>
      ) : null}
      <FeedSubtitlesModal
        open={subtitlesOpen}
        onClose={() => setSubtitlesOpen(false)}
      />
      <FeedReportModal
        open={reportOpen}
        onClose={() => setReportOpen(false)}
        videoPublicId={videoPublicId}
        token={reportToken}
        onRequireAuth={onReportRequireAuth}
        onSubmitted={onReportSubmitted}
      />
    </>
  )
}

export { FEED_VIDEO_OVERLAY_BTN_CLASS as WATCH_MORE_TRIGGER_BTN_CLASS }
