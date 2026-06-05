import React from 'react'
import { IoClose, IoTimeOutline } from 'react-icons/io5'

export function SearchHistorySection({
  items = [],
  loading = false,
  onSelect,
  onRemove,
  removingId = null,
  activeKey,
  getItemKey = (item) => `history-${item?.id ?? item?.query}`,
}) {
  if (loading) {
    return (
      <section className="px-4 py-6 text-center text-sm text-zinc-500" aria-live="polite">
        Đang tải lịch sử...
      </section>
    )
  }

  if (!items.length) {
    return (
      <section className="px-4 py-8 text-center text-sm text-zinc-500">
        Chưa có lịch sử tìm kiếm
      </section>
    )
  }

  return (
    <section className="px-2 py-2" aria-label="Lịch sử tìm kiếm">
      <h3 className="mb-2 flex items-center gap-2 px-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <IoTimeOutline aria-hidden />
        Lịch sử
      </h3>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const key = getItemKey(item)
          const active = activeKey === key
          const removing = removingId != null && item?.id === removingId
          return (
            <li
              key={key}
              className={`group flex items-center rounded-lg transition ${
                active ? 'bg-zinc-800' : 'hover:bg-zinc-900'
              }`}
            >
              <button
                type="button"
                data-search-nav-key={key}
                onClick={() => onSelect?.(item)}
                className={`flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2.5 text-left text-sm ${
                  active ? 'text-white' : 'text-zinc-200'
                }`}
              >
                <IoTimeOutline className="shrink-0 text-lg text-zinc-500" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{item.query}</span>
              </button>
              <button
                type="button"
                aria-label={`Xóa "${item.query}"`}
                disabled={removing}
                onClick={(event) => {
                  event.stopPropagation()
                  onRemove?.(item)
                }}
                className="mr-1 flex h-9 w-9 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-500 transition hover:bg-zinc-800 hover:text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <IoClose className="text-xl" aria-hidden />
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
