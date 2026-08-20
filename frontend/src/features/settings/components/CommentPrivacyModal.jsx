import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoClose } from 'react-icons/io5'

export const COMMENT_AUDIENCE_OPTIONS = [
  { value: 'EVERYONE', labelKey: 'settings.commentsPrivacy.everyone' },
  { value: 'FRIENDS', labelKey: 'settings.commentsPrivacy.friends' },
]

export function commentAudienceLabel(value, t) {
  const found = COMMENT_AUDIENCE_OPTIONS.find((item) => item.value === value)
  return t(found?.labelKey || 'settings.commentsPrivacy.everyone')
}

/**
 * Modal chọn ai được bình luận — kiểu TikTok (radio, lưu khi chọn).
 */
export function CommentPrivacyModal({
  open,
  value = 'EVERYONE',
  saving = false,
  error = '',
  onClose,
  onSelect,
}) {
  const { t } = useTranslation()
  const [selected, setSelected] = useState(value)

  useEffect(() => {
    if (!open) return undefined
    setSelected(value)
    const onKey = (event) => {
      if (event.key === 'Escape' && !saving) onClose?.()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, value, onClose, saving])

  if (!open) return null

  const handleSelect = (next) => {
    if (saving || next === selected) return
    setSelected(next)
    onSelect?.(next)
  }

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
        aria-labelledby="comment-privacy-title"
        className="w-full max-w-md overflow-hidden rounded-xl border border-zinc-700/80 bg-[#1a1a1a] shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="relative border-b border-zinc-800 px-5 pb-3 pt-4">
          <h2 id="comment-privacy-title" className="pr-10 text-base font-semibold text-zinc-100">
            {t('settings.commentsPrivacy.title')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="absolute right-3 top-3 rounded-full p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100 disabled:cursor-not-allowed disabled:opacity-50"
            aria-label={t('common.close')}
          >
            <IoClose className="text-xl" />
          </button>
        </div>

        <ul className="px-2 py-2" role="radiogroup" aria-label={t('settings.commentsPrivacy.aria')}>
          {COMMENT_AUDIENCE_OPTIONS.map((option) => {
            const checked = selected === option.value
            return (
              <li key={option.value}>
                <button
                  type="button"
                  role="radio"
                  aria-checked={checked}
                  disabled={saving}
                  onClick={() => handleSelect(option.value)}
                  className="flex w-full cursor-pointer items-center justify-between gap-3 rounded-lg px-3 py-3 text-left transition hover:bg-zinc-800/80 disabled:cursor-not-allowed disabled:opacity-70"
                >
                  <span className="text-sm text-zinc-100">{t(option.labelKey)}</span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      checked ? 'border-red-500' : 'border-zinc-500'
                    }`}
                    aria-hidden
                  >
                    {checked ? <span className="h-2.5 w-2.5 rounded-full bg-red-500" /> : null}
                  </span>
                </button>
              </li>
            )
          })}
        </ul>

        <div className="border-t border-zinc-800 px-5 py-4">
          {error ? (
            <p className="mb-3 rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
          ) : null}
          <p className="text-xs leading-relaxed text-zinc-500">
            {t('settings.commentsPrivacy.hint')}
          </p>
        </div>
      </div>
    </div>
  )
}
