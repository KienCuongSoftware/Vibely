import React from 'react'
import { IoEllipse } from 'react-icons/io5'
import { MdOutlineTrendingUp } from 'react-icons/md'
import { normalizeSearchQuery } from '@/features/search/utils/searchUtils'

export function SearchTrendingSection({
  items = [],
  activeKey,
  onSelect,
  getItemKey = (item, index) => `trend-${item?.keyword ?? index}`,
  title = null,
}) {
  if (!items.length) return null

  return (
    <section className="px-1 py-1" aria-label={title || 'Xu hướng'}>
      {title ? (
        <h3 className="px-3 pb-1.5 pt-2 text-[15px] font-bold text-zinc-100">{title}</h3>
      ) : null}
      <ul>
        {items.map((item, index) => {
          const key = getItemKey(item, index)
          const active = activeKey === key
          const keyword = normalizeSearchQuery(item?.keyword)
          const isHot = index < 3
          return (
            <li key={key}>
              <button
                type="button"
                data-search-nav-key={key}
                onClick={() => onSelect?.(item)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left transition ${
                  active
                    ? 'bg-zinc-800/90 text-white'
                    : 'text-zinc-100 hover:bg-zinc-900/80'
                }`}
              >
                {isHot ? (
                  <MdOutlineTrendingUp
                    className="h-[18px] w-[18px] shrink-0 text-[#FE2C55]"
                    aria-hidden
                  />
                ) : (
                  <IoEllipse
                    className="mx-[6px] h-[6px] w-[6px] shrink-0 text-zinc-500"
                    aria-hidden
                  />
                )}
                <span className="min-w-0 flex-1 truncate text-[15px] font-medium">
                  {keyword}
                </span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
