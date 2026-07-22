import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { IoCheckmarkCircle, IoChevronForward, IoClose } from 'react-icons/io5'
import { apiClient } from '../../api/client.js'
import { isVideoPublicId, normalizeVideoPublicId } from '../../utils/videoPublicId.js'

/** Lý do báo cáo — thứ tự gần TikTok web (VI). */
export const FEED_REPORT_REASONS = [
  'Liên quan đến mua sắm',
  'Bán hàng giả',
  'Bạo lực, lạm dụng và bóc lột để phạm tội',
  'Thù ghét và quấy rối',
  'Tự tử và tự làm hại bản thân',
  'Cách ăn uống không lành mạnh và hình ảnh cơ thể ốm yếu',
  'Hoạt động và thử thách nguy hiểm',
  'Hình ảnh khỏa thân hoặc nội dung tình dục',
  'Nội dung gây sốc và phản cảm',
  'Thông tin sai lệch',
  'Hành vi lừa đảo và gửi nội dung rác',
  'Hàng hóa và hoạt động được kiểm soát',
  'Gian lận và lừa đảo',
  'Chia sẻ thông tin cá nhân',
  'Sản phẩm nhái và quyền sở hữu trí tuệ',
  'Khác',
]

/**
 * Modal báo cáo video kiểu TikTok — mở từ mục «Báo cáo» trong menu ⋯.
 *
 * @param {{
 *   open: boolean
 *   onClose: () => void
 *   videoPublicId?: string | number | null
 *   token?: string | null
 *   onRequireAuth?: () => void
 *   onSubmitted?: (reason: string) => void
 * }} props
 */
export function FeedReportModal({
  open,
  onClose,
  videoPublicId,
  token,
  onRequireAuth,
  onSubmitted,
}) {
  const [phase, setPhase] = useState('pick') // 'pick' | 'submitting' | 'done'
  const [error, setError] = useState('')
  const [busyReason, setBusyReason] = useState('')

  useEffect(() => {
    if (!open) return
    setPhase('pick')
    setError('')
    setBusyReason('')
  }, [open, videoPublicId])

  useEffect(() => {
    if (!open) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && phase !== 'submitting') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, phase])

  useEffect(() => {
    if (!open || phase !== 'done') return undefined
    const timer = window.setTimeout(() => onClose(), 2200)
    return () => window.clearTimeout(timer)
  }, [open, phase, onClose])

  const submitReason = async (reason) => {
    if (phase === 'submitting') return
    if (!token) {
      onRequireAuth?.()
      onClose()
      return
    }
    const publicId = normalizeVideoPublicId(videoPublicId)
    if (!isVideoPublicId(publicId)) {
      setError('Không xác định được video để báo cáo.')
      return
    }

    setError('')
    setBusyReason(reason)
    setPhase('submitting')
    try {
      await apiClient.reportVideo(publicId, reason, token)
      setPhase('done')
      onSubmitted?.(reason)
    } catch (err) {
      const message =
        typeof err?.message === 'string' && err.message.trim()
          ? err.message.trim()
          : 'Không gửi được báo cáo. Thử lại sau.'
      setError(message)
      setPhase('pick')
      setBusyReason('')
    }
  }

  if (!open || typeof document === 'undefined') return null

  return createPortal(
    <div className="fixed inset-0 z-[220] flex items-center justify-center px-4">
      <button
        type="button"
        aria-label="Đóng báo cáo"
        className="absolute inset-0 cursor-default bg-black/55"
        onClick={() => {
          if (phase !== 'submitting') onClose()
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Báo cáo"
        className="relative z-10 flex max-h-[min(72vh,560px)] w-full max-w-[480px] flex-col overflow-hidden rounded-xl bg-[#252525] shadow-[0_16px_48px_rgba(0,0,0,0.55)]"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/[0.08] px-5 py-3.5">
          <h2 className="text-[17px] font-bold text-white">Báo cáo</h2>
          <button
            type="button"
            aria-label="Đóng"
            disabled={phase === 'submitting'}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full text-white/80 transition hover:bg-white/10 hover:text-white disabled:cursor-wait disabled:opacity-50"
            onClick={onClose}
          >
            <IoClose className="text-2xl" aria-hidden />
          </button>
        </div>

        {phase === 'done' ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-14 text-center">
            <IoCheckmarkCircle className="h-14 w-14 text-[#00f2ea]" aria-hidden />
            <p className="text-[17px] font-semibold text-white">Cảm ơn bạn đã báo cáo</p>
            <p className="max-w-sm text-[14px] leading-snug text-white/55">
              Chúng tôi sẽ xem xét video này và thực hiện hành động phù hợp nếu vi phạm Nguyên tắc Cộng đồng.
            </p>
          </div>
        ) : (
          <>
            <p className="shrink-0 px-5 pb-1 pt-3 text-[13px] text-white/45">
              Vui lòng chọn tình huống
            </p>
            {error ? (
              <p className="shrink-0 px-5 pb-2 text-[13px] text-rose-300" role="alert">
                {error}
              </p>
            ) : null}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-2">
              <ul className="divide-y divide-white/[0.06]">
                {FEED_REPORT_REASONS.map((reason) => {
                  const busy = phase === 'submitting' && busyReason === reason
                  return (
                    <li key={reason}>
                      <button
                        type="button"
                        disabled={phase === 'submitting'}
                        className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left transition-colors hover:bg-white/[0.06] active:bg-white/[0.09] disabled:cursor-wait disabled:opacity-60"
                        onClick={() => void submitReason(reason)}
                      >
                        <span className="min-w-0 flex-1 text-[15px] leading-snug text-white">
                          {busy ? 'Đang gửi…' : reason}
                        </span>
                        <IoChevronForward
                          className="h-4 w-4 shrink-0 text-white/35"
                          aria-hidden
                        />
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>,
    document.body,
  )
}
