import React from 'react'
import { useTranslation } from 'react-i18next'
import { IoCheckmarkCircle } from 'react-icons/io5'

/**
 * Overlay trên khung video sau khi báo cáo thành công (kiểu TikTok).
 *
 * @param {{
 *   onShowVideo?: () => void
 *   className?: string
 * }} props
 */
export function FeedReportedVideoOverlay({ onShowVideo, className = '' }) {
  const { t } = useTranslation()
  return (
    <div
      className={`absolute inset-0 z-40 flex flex-col items-center justify-center bg-black px-8 text-center ${className}`}
      role="status"
      aria-live="polite"
    >
      <IoCheckmarkCircle
        className="mb-5 h-[72px] w-[72px] text-[#20D563]"
        aria-hidden
      />
      <p className="text-[22px] font-bold leading-tight text-white">
        {t('feed.reportedTitle')}
      </p>
      <p className="mt-3 max-w-[280px] text-[15px] leading-snug text-white/70">
        {t('feed.reportedBody')}
      </p>
      <button
        type="button"
        className="mt-8 cursor-pointer rounded-md bg-[#2f2f2f] px-8 py-2.5 text-[15px] font-semibold text-white transition hover:bg-[#3a3a3a]"
        onClick={() => onShowVideo?.()}
      >
        {t('feed.showVideo')}
      </button>
    </div>
  )
}
