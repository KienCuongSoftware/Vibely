import React, { useRef } from 'react'
import { useTranslation } from 'react-i18next'

export function LiveCategoryTabs({ categories, activeId, onSelect }) {
  const { t } = useTranslation()
  const scrollRef = useRef(null)

  return (
    <div className="live-category-bar flex shrink-0 border-b border-white/5 px-3 py-3 lg:px-5">
      <div
        ref={scrollRef}
        className="scrollbar-none min-w-0 flex-1 overflow-x-auto touch-pan-x"
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
    </div>
  )
}
