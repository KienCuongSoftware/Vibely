import React, { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { IoClose } from 'react-icons/io5'
import { LiveSpinner, LiveStateView } from '@/features/live/components/LiveStateView.jsx'

/** Bottom sheet listing gifts. Coins/wallet are out of scope until payments exist. */
export function LiveGiftPanel({ open, onClose, catalog, onLoad, onSend, sendingId, lastSent }) {
  const { t } = useTranslation()

  useEffect(() => {
    if (open && catalog.status === 'idle') onLoad()
  }, [open, catalog.status, onLoad])

  useEffect(() => {
    if (!open) return undefined
    const onKeyDown = (event) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="absolute inset-0 z-30 flex items-end" role="dialog" aria-modal="true" aria-label={t('livePage.gifts.title')}>
      <button type="button" className="absolute inset-0 cursor-default bg-black/40" aria-label={t('common.close')} onClick={onClose} />
      <div className="vibely-keep-dark relative w-full rounded-t-2xl bg-zinc-900 p-4 text-white shadow-2xl">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[15px] font-bold">{t('livePage.gifts.title')}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-full hover:bg-white/10"
          >
            <IoClose className="text-lg" aria-hidden />
          </button>
        </div>

        {catalog.status === 'loading' || catalog.status === 'idle' ? (
          <div className="flex justify-center py-8" role="status">
            <LiveSpinner />
          </div>
        ) : catalog.status === 'error' ? (
          <LiveStateView variant="error" description={t('livePage.gifts.loadError')} onAction={onLoad} className="py-6" />
        ) : (
          <ul className="grid grid-cols-4 gap-2 sm:grid-cols-8">
            {catalog.items.map((gift) => (
              <li key={gift.id}>
                <button
                  type="button"
                  onClick={() => onSend(gift.id)}
                  disabled={Boolean(sendingId)}
                  className="flex w-full cursor-pointer flex-col items-center gap-1 rounded-xl p-2 transition hover:bg-white/10 disabled:cursor-wait disabled:opacity-60"
                >
                  <span className="text-3xl leading-none" aria-hidden>{gift.icon}</span>
                  <span className="w-full truncate text-center text-[12px]">{gift.name}</span>
                  <span className="text-[11px] text-amber-300">{t('livePage.gifts.coins', { count: gift.coinPrice })}</span>
                  {sendingId === gift.id ? <LiveSpinner className="h-3 w-3" /> : null}
                </button>
              </li>
            ))}
          </ul>
        )}

        {lastSent ? (
          <p className="mt-3 text-center text-[12px] text-zinc-400" role="status">
            {t('livePage.gifts.sent', { name: lastSent.name })}
          </p>
        ) : null}
      </div>
    </div>
  )
}
