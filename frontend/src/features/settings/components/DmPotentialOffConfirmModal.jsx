import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { IoClose } from 'react-icons/io5'

/**
 * Xác nhận tắt Kết nối tiềm năng — đồng thời tắt Người khác (kiểu TikTok).
 */
export function DmPotentialOffConfirmModal({ open, saving = false, error = '', onClose, onConfirm }) {
  const { t } = useTranslation()

  useEffect(() => {
    if (!open) return undefined
    const onKey = (event) => {
      if (event.key === 'Escape' && !saving) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose, saving])

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center bg-black/70 px-4"
      role="presentation"
      onClick={() => {
        if (!saving) onClose?.()
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="dm-potential-off-title"
        className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-zinc-700/80 bg-[#1a1a1a] px-6 pb-5 pt-10 shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          disabled={saving}
          className="absolute left-3 top-3 rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
          aria-label={t('common.close')}
        >
          <IoClose className="text-xl" />
        </button>

        <h2
          id="dm-potential-off-title"
          className="text-center text-lg font-bold leading-snug text-zinc-100"
        >
          {t('settings.dm.potentialOffTitle')}
        </h2>
        <p className="mt-3 text-center text-sm leading-relaxed text-zinc-400">
          {t('settings.dm.potentialOffBody')}
        </p>

        {error ? (
          <p className="mt-4 rounded-lg bg-red-500/10 px-3 py-2 text-center text-sm text-red-300">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          disabled={saving}
          onClick={onConfirm}
          className="mt-6 w-full rounded-full bg-[#fe2c55] px-4 py-3 text-sm font-semibold text-white transition hover:bg-[#ff3b63] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? t('settings.dm.updating') : t('settings.dm.updateSettings')}
        </button>
        <button
          type="button"
          disabled={saving}
          onClick={onClose}
          className="mt-2 w-full rounded-full px-4 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {t('common.cancel')}
        </button>
      </div>
    </div>
  )
}
