import React from 'react'
import { IoClose, IoEllipse, IoTimeOutline } from 'react-icons/io5'
import { MdOutlineTrendingUp } from 'react-icons/md'
import { normalizeSearchQuery } from '@/features/search/utils/searchUtils'

function SectionLabel({ children }) {
  return (
    <h3 className="px-3 pb-1 pt-3 text-[13px] font-semibold text-zinc-500">
      {children}
    </h3>
  )
}

/**
 * TikTok-style idle search list:
 * "Tìm kiếm gần đây" + "Bạn có thể thích".
 */
export function SearchYouMightLikeSection({
  historyItems = [],
  historyLoading = false,
  onHistorySelect,
  onRemoveHistory,
  removingHistoryId = null,
  trendingItems = [],
  onTrendingSelect,
  activeKey,
}) {
  const hasHistory = historyItems.length > 0
  const hasTrending = trendingItems.length > 0

  if (historyLoading && !hasHistory && !hasTrending) {
    return (
      <div className="flex flex-col gap-1 px-2 py-3" aria-busy="true" aria-live="polite">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-10 animate-pulse rounded-md bg-zinc-900/80" />
        ))}
      </div>
    )
  }

  if (!hasHistory && !hasTrending) {
    return (
      <p className="px-5 py-10 text-center text-sm text-zinc-500">
        Chưa có gợi ý tìm kiếm
      </p>
    )
  }

  return (
    <div className="px-1 pb-2">
      {hasHistory ? (
        <section aria-label="Tìm kiếm gần đây">
          <SectionLabel>Tìm kiếm gần đây</SectionLabel>
          <ul>
            {historyItems.map((item) => {
              const query = normalizeSearchQuery(item?.query)
              if (!query) return null
              const key = `history-${item?.id ?? query}`
              const active = activeKey === key
              const removing =
                removingHistoryId != null && item?.id === removingHistoryId
              return (
                <li
                  key={key}
                  className={`group flex items-center rounded-md ${
                    active ? 'bg-zinc-800/90' : 'hover:bg-zinc-900/80'
                  }`}
                >
                  <button
                    type="button"
                    data-search-nav-key={key}
                    onClick={() => onHistorySelect?.(item)}
                    className="flex min-w-0 flex-1 cursor-pointer items-center gap-3 px-3 py-2.5 text-left"
                  >
                    <IoTimeOutline
                      className="h-[18px] w-[18px] shrink-0 text-zinc-500"
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-zinc-100">
                      {query}
                    </span>
                  </button>
                  <button
                    type="button"
                    aria-label={`Xóa "${query}"`}
                    disabled={removing}
                    onClick={(event) => {
                      event.stopPropagation()
                      onRemoveHistory?.(item)
                    }}
                    className="mr-1.5 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-500 opacity-80 transition hover:bg-zinc-800 hover:text-zinc-200 group-hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <IoClose className="text-lg" aria-hidden />
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}

      {hasTrending ? (
        <section aria-label="Bạn có thể thích">
          <SectionLabel>Bạn có thể thích</SectionLabel>
          <ul>
            {trendingItems.map((item, index) => {
              const keyword = normalizeSearchQuery(item?.keyword)
              if (!keyword) return null
              const key = `trend-${item?.keyword ?? index}`
              const active = activeKey === key
              const isHot = index < 3
              return (
                <li key={key}>
                  <button
                    type="button"
                    data-search-nav-key={key}
                    onClick={() => onTrendingSelect?.(item)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-md px-3 py-2.5 text-left transition ${
                      active ? 'bg-zinc-800/90' : 'hover:bg-zinc-900/80'
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
                    <span className="min-w-0 flex-1 truncate text-[15px] font-medium text-zinc-100">
                      {keyword}
                    </span>
                  </button>
                </li>
              )
            })}
          </ul>
        </section>
      ) : null}
    </div>
  )
}
