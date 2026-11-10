import React from 'react'
import { useTranslation } from 'react-i18next'
import { LuArrowDownToLine, LuGauge } from 'react-icons/lu'
import {
  FEED_MORE_MENU_BADGE_ICON_CLASS,
  FEED_MORE_MENU_INLINE_ICON_CLASS,
  FEED_MORE_MENU_ROW_CLASS,
  FEED_MORE_SPEED_PILL_ACTIVE_CLASS,
  FEED_MORE_SPEED_PILL_CLASS,
  FEED_MORE_SPEED_PILL_IDLE_CLASS,
  FEED_MORE_SPEED_TRACK_CLASS,
} from '@/features/feed/utils/feedLayout.js'
import {
  FEED_PLAYBACK_SPEEDS,
  formatPlaybackSpeedOption,
} from '@/features/feed/utils/feedPlaybackSpeedStorage.js'

/** Nhãn pill tốc độ trong menu (1 → 1.0). */
export function formatFeedSpeedPillLabel(rate) {
  const n = Number(rate)
  if (n === 1) return '1.0'
  if (n === 2) return '2.0'
  if (Number.isInteger(n)) return String(n)
  return formatPlaybackSpeedOption(rate)
}

export function FeedMoreMenuDivider() {
  return <div className="mx-3 my-1 border-t border-white/10" aria-hidden />
}

/**
 * Hàng nút menu chuẩn (PiP / phụ đề / tải / …).
 * @param {{ icon?: React.ReactNode, label: React.ReactNode, onClick?: () => void, disabled?: boolean, role?: string }} props
 */
export function FeedMoreMenuRowButton({
  icon,
  label,
  onClick,
  disabled = false,
  role = 'menuitem',
}) {
  return (
    <button
      type="button"
      role={role}
      disabled={disabled}
      className={FEED_MORE_MENU_ROW_CLASS}
      onClick={onClick}
    >
      {icon ?? null}
      <span className="flex-1">{label}</span>
    </button>
  )
}

export function FeedMoreSubtitlesIcon() {
  return (
    <span className={FEED_MORE_MENU_BADGE_ICON_CLASS} aria-hidden>
      Aa
    </span>
  )
}

/** Hàng tốc độ + segmented pills. */
export function FeedMoreSpeedRow({
  playbackSpeed = 1,
  onPlaybackSpeedChange,
  radio = false,
}) {
  const { t } = useTranslation()
  return (
    <div className={FEED_MORE_MENU_ROW_CLASS}>
      <LuGauge
        strokeWidth={1.75}
        className={FEED_MORE_MENU_INLINE_ICON_CLASS}
        aria-hidden
      />
      <span className="shrink-0">{t('feedMenu.speed')}</span>
      <div
        className={FEED_MORE_SPEED_TRACK_CLASS}
        role="group"
        aria-label={t('feedMenu.speedGroup')}
      >
        {FEED_PLAYBACK_SPEEDS.map((rate) => {
          const selected = playbackSpeed === rate
          return (
            <button
              key={rate}
              type="button"
              role={radio ? 'menuitemradio' : undefined}
              aria-checked={radio ? selected : undefined}
              aria-pressed={radio ? undefined : selected}
              className={`${FEED_MORE_SPEED_PILL_CLASS} ${
                selected
                  ? FEED_MORE_SPEED_PILL_ACTIVE_CLASS
                  : FEED_MORE_SPEED_PILL_IDLE_CLASS
              }`}
              onClick={() => onPlaybackSpeedChange?.(rate)}
            >
              {formatFeedSpeedPillLabel(rate)}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/** Hàng cuộn tự động + switch. */
export function FeedMoreAutoScrollRow({
  autoScrollEnabled = false,
  onAutoScrollChange,
  showIcon = true,
}) {
  const { t } = useTranslation()
  return (
    <div className={FEED_MORE_MENU_ROW_CLASS}>
      {showIcon ? (
        <LuArrowDownToLine
          strokeWidth={1.75}
          className={FEED_MORE_MENU_INLINE_ICON_CLASS}
          aria-hidden
        />
      ) : null}
      <span className="min-w-0 flex-1">{t('feedMenu.autoScroll')}</span>
      <button
        type="button"
        role="switch"
        aria-checked={Boolean(autoScrollEnabled)}
        className={`relative h-[22px] w-[40px] shrink-0 cursor-pointer rounded-full transition-colors ${
          autoScrollEnabled ? 'bg-[#fe2c55]' : 'bg-white/25'
        }`}
        onClick={() => onAutoScrollChange?.((prev) => !prev)}
      >
        <span
          className={`absolute top-[2px] left-[2px] h-[18px] w-[18px] rounded-full bg-white shadow transition-transform duration-200 ${
            autoScrollEnabled ? 'translate-x-[18px]' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  )
}
