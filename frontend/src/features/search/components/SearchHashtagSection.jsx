import React from 'react'
import { IoPricetagsOutline } from 'react-icons/io5'

export function SearchHashtagSection({
  items = [],
  activeKey,
  onSelect,
  getItemKey = (item) => `hashtag-${item?.id ?? item?.tag}`,
}) {
  if (!items.length) return null

  return (
    <section className="px-2 py-2" aria-label="Hashtag">
      <h3 className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <IoPricetagsOutline className="text-base" aria-hidden />
        Hashtags
      </h3>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const key = getItemKey(item)
          const active = activeKey === key
          const tag = String(item.tag ?? '').replace(/^#/, '')
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
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sky-400">
                  #
                </span>
                <span className="min-w-0 flex-1 truncate font-medium">#{tag}</span>
                {item.usageCount != null ? (
                  <span className="shrink-0 text-xs text-zinc-500">
                    {Number(item.usageCount).toLocaleString('vi-VN')} video
                  </span>
                ) : null}
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
