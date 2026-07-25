import { useEffect, useMemo, useState } from 'react'
import { IoClose } from 'react-icons/io5'
import { getRegionLabel, listAccountRegions } from '../../data/accountRegions'

/**
 * Modal chọn khu vực tài khoản — layout gần TikTok (radio list + Tiếp).
 */
export function AccountRegionModal({ open, currentCode, saving = false, error = '', onClose, onConfirm }) {
  const [selectedCode, setSelectedCode] = useState(currentCode)
  const regions = useMemo(() => listAccountRegions('en'), [])

  useEffect(() => {
    if (!open) return undefined
    setSelectedCode(currentCode)
    const onKey = (event) => {
      if (event.key === 'Escape' && !saving) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, currentCode, onClose, saving])

  if (!open) return null

  const currentLabel = getRegionLabel(currentCode, 'en')
  const canContinue = Boolean(selectedCode) && selectedCode !== currentCode && !saving

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 px-4"
      role="presentation"
      onClick={() => {
        if (!saving) onClose?.()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="account-region-title"
        className="flex max-h-[min(640px,86vh)] w-full max-w-md flex-col overflow-hidden rounded-xl border border-zinc-700/80 bg-[#1a1a1a] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative border-b border-zinc-800 px-5 pb-3 pt-4">
          <h2 id="account-region-title" className="pr-10 text-center text-base font-semibold text-zinc-100">
            Chọn quốc gia hoặc khu vực
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Đóng"
          >
            <IoClose className="text-xl" />
          </button>
          <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
            Khu vực hiện tại của bạn được đặt thành {currentLabel}, hãy chọn khu vực khác để cập nhật.
          </p>
        </div>

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto px-2 py-1">
          <ul className="py-1" role="radiogroup" aria-label="Quốc gia hoặc khu vực">
            {regions.map((region) => {
              const checked = selectedCode === region.code
              return (
                <li key={region.code}>
                  <label
                    className={`flex cursor-pointer items-center gap-3 rounded-lg px-3 py-3 transition hover:bg-zinc-800/80 ${
                      checked ? 'bg-zinc-800/50' : ''
                    } ${saving ? 'pointer-events-none opacity-70' : ''}`}
                  >
                    <span
                      className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                        checked ? 'border-sky-400' : 'border-zinc-500'
                      }`}
                      aria-hidden
                    >
                      {checked ? <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> : null}
                    </span>
                    <input
                      type="radio"
                      name="account-region"
                      value={region.code}
                      checked={checked}
                      disabled={saving}
                      onChange={() => setSelectedCode(region.code)}
                      className="sr-only"
                    />
                    <span className="text-sm text-zinc-100">{region.label}</span>
                  </label>
                </li>
              )
            })}
          </ul>
        </div>

        <div className="border-t border-zinc-800 px-5 py-4">
          {error ? (
            <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          ) : null}
          <div className="flex justify-end">
            <button
              type="button"
              disabled={!canContinue}
              onClick={() => onConfirm?.(selectedCode)}
              className="rounded-md bg-zinc-700 px-8 py-2 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-600 disabled:cursor-not-allowed disabled:bg-zinc-800 disabled:text-zinc-500"
            >
              {saving ? 'Đang lưu…' : 'Tiếp'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
