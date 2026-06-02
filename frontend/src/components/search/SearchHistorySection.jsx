import React from 'react'
import { IoTimeOutline } from 'react-icons/io5'

export function SearchHistorySection({
  items = [],
  loading = false,
  clearing = false,
  onSelect,
  onClearAll,
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
      <div className="mb-2 flex items-center justify-between px-2">
        <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
          <IoTimeOutline aria-hidden />
          Lịch sử
        </h3>
        <button
          type="button"
          onClick={onClearAll}
          disabled={clearing}
          className="cursor-pointer text-xs font-medium text-zinc-400 transition hover:text-zinc-200 disabled:opacity-50"
        >
          {clearing ? 'Đang xóa...' : 'Xóa tất cả'}
        </button>
      </div>
      <ul className="space-y-0.5">
        {items.map((item) => {
          const key = getItemKey(item)
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
                <IoTimeOutline className="shrink-0 text-lg text-zinc-500" aria-hidden />
                <span className="min-w-0 flex-1 truncate">{item.query}</span>
              </button>
            </li>
          )
        })}
      </ul>
    </section>
  )
}
