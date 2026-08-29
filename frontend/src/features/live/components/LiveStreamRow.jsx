import React from 'react'
import { useTranslation } from 'react-i18next'
import { LiveStreamCard } from '@/features/live/components/LiveStreamCard.jsx'

export function LiveStreamRow({ title, streams, onSelectStream }) {
  const { t } = useTranslation()

  if (!streams?.length) return null

  return (
    <section className="mt-6 lg:mt-8">
      <div className="mb-3 flex items-center justify-between gap-3 px-1">
        <h2 className="live-section-title text-[17px] font-bold text-zinc-100 lg:text-lg">{title}</h2>
        <button
          type="button"
          className="live-see-all cursor-pointer text-[13px] font-semibold text-zinc-500 transition hover:text-zinc-300"
        >
          {t('livePage.seeAll')}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 lg:gap-x-4">
        {streams.map((stream) => (
          <LiveStreamCard
            key={stream.id}
            stream={stream}
            onSelect={onSelectStream}
          />
        ))}
      </div>
    </section>
  )
}
