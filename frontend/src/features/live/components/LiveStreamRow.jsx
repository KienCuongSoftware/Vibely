import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { IoChevronBack, IoChevronForward } from 'react-icons/io5'
import { LiveStreamCard } from '@/features/live/components/LiveStreamCard.jsx'

export function LiveStreamRow({ title, streams, onSelectStream }) {
  const { t } = useTranslation()
  const scrollRef = useRef(null)

  const scrollBy = (direction) => {
    scrollRef.current?.scrollBy({ left: direction * 420, behavior: 'smooth' })
  }

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

      <div className="relative">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label={t('livePage.scrollRowLeft')}
          className="absolute -left-1 top-[38%] z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-zinc-700 bg-zinc-900/95 text-zinc-100 shadow-lg transition hover:bg-zinc-800 lg:grid"
        >
          <IoChevronBack aria-hidden />
        </button>

        <div
          ref={scrollRef}
          className="scrollbar-none flex gap-3 overflow-x-auto pb-1 pr-1"
        >
          {streams.map((stream) => (
            <LiveStreamCard
              key={stream.id}
              stream={stream}
              onSelect={onSelectStream}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label={t('livePage.scrollRowRight')}
          className="absolute -right-1 top-[38%] z-10 hidden h-9 w-9 -translate-y-1/2 place-items-center rounded-full border border-zinc-700 bg-zinc-900/95 text-zinc-100 shadow-lg transition hover:bg-zinc-800 lg:grid"
        >
          <IoChevronForward aria-hidden />
        </button>
      </div>
    </section>
  )
}
