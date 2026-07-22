import React from 'react'
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
        Cảm ơn bạn đã báo cáo
      </p>
      <p className="mt-3 max-w-[280px] text-[15px] leading-snug text-white/70">
        Để nâng cao trải nghiệm của bạn, video này đã được ẩn đi. Chúng tôi sẽ
        hiển thị cho bạn ít video như thế này hơn.
      </p>
      <button
        type="button"
        className="mt-8 cursor-pointer rounded-md bg-[#2f2f2f] px-8 py-2.5 text-[15px] font-semibold text-white transition hover:bg-[#3a3a3a]"
        onClick={() => onShowVideo?.()}
      >
        Hiển thị video
      </button>
    </div>
  )
}
