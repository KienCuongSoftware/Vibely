import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { IoChevronBack, IoChevronForward } from 'react-icons/io5'

export function LiveCategoryTabs({ categories, activeId, onSelect }) {
  const { t } = useTranslation()
  const scrollRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
  }, [])

  useEffect(() => {
    updateScrollState()
    window.addEventListener('resize', updateScrollState)
    return () => window.removeEventListener('resize', updateScrollState)
  }, [updateScrollState, categories])

  const scrollBy = (direction) => {
    const el = scrollRef.current
    if (!el) return
    el.scrollBy({ left: direction * 240, behavior: 'smooth' })
    window.setTimeout(updateScrollState, 280)
  }

  return (
    <div className="live-category-bar flex shrink-0 items-center gap-2 border-b border-white/5 px-3 py-3 lg:px-5">
      <button
        type="button"
        onClick={() => scrollBy(-1)}
        disabled={!canScrollLeft}
        aria-label={t('livePage.scrollCategoriesLeft')}
        className="hidden h-8 w-8 shrink-0 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35 lg:grid"
      >
        <IoChevronBack aria-hidden />
      </button>

      <div
        ref={scrollRef}
        onScroll={updateScrollState}
        className="scrollbar-none min-w-0 flex-1 overflow-x-auto"
      >
        <div className="flex w-max gap-2">
          {categories.map((cat) => {
            const active = cat.id === activeId
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => onSelect(cat.id)}
                className={`live-category-tab cursor-pointer whitespace-nowrap rounded-full px-4 py-2 text-[14px] font-semibold transition ${
                  active
                    ? 'live-category-tab--active bg-white font-bold text-black'
                    : 'live-category-tab--inactive bg-zinc-800/90 text-zinc-100 hover:bg-zinc-700'
                }`}
              >
                {t(cat.labelKey)}
              </button>
            )
          })}
        </div>
      </div>

      <button
        type="button"
        onClick={() => scrollBy(1)}
        disabled={!canScrollRight}
        aria-label={t('livePage.scrollCategoriesRight')}
        className="hidden h-8 w-8 shrink-0 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35 lg:grid"
      >
        <IoChevronForward aria-hidden />
      </button>
    </div>
  )
}
