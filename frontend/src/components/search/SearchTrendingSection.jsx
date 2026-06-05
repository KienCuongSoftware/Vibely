import React from 'react'
import { IoFlame, IoTrendingUp } from 'react-icons/io5'

export function SearchTrendingSection({
  items = [],
  activeKey,
  onSelect,
  getItemKey = (item, index) => item?.keyword ?? `trend-${index}`,
}) {
  if (!items.length) return null

  return (
    <section className="px-2 py-2" aria-label="Xu hướng">
      <h3 className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <IoFlame className="text-base text-orange-400" aria-hidden />
        Trending
      </h3>
      <ul className="space-y-0.5">
        {items.map((item, index) => {
          const key = getItemKey(item, index)
          const active = activeKey === key
          return (
            <li key={key}>
              <button
                type="button"
                data-search-nav-key={key}
                onClick={() => onSelect?.(item)}
                className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  active
                    ? 'bg-zinc-800 text-white'
                    : 'text-zinc-200 hover:bg-zinc-900'
                }`}
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-zinc-400">
                  <IoTrendingUp className="text-base" aria-hidden />
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">{item.keyword}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
