import React, { useEffect, useMemo, useRef } from 'react'
import { SearchHashtagSection } from './SearchHashtagSection'
import { SearchHistorySection } from './SearchHistorySection'
import { SearchTrendingSection } from './SearchTrendingSection'
import { SearchUserSection } from './SearchUserSection'
import { SearchVideoSection } from './SearchVideoSection'

export function buildSearchNavItems({
  showHistory,
  historyItems,
  suggest,
}) {
  const items = []
  if (showHistory) {
    for (const row of historyItems) {
      items.push({
        key: `history-${row?.id ?? row?.query}`,
        type: 'history',
        payload: row,
      })
    }
    return items
  }

  for (const [index, row] of (suggest?.trending ?? []).entries()) {
    items.push({
      key: `trend-${row?.keyword ?? index}`,
      type: 'trending',
      payload: row,
    })
  }
  for (const row of suggest?.users ?? []) {
    items.push({
      key: `user-${row?.id ?? row?.username}`,
      type: 'user',
      payload: row,
    })
  }
  for (const row of suggest?.hashtags ?? []) {
    items.push({
      key: `hashtag-${row?.id ?? row?.tag}`,
      type: 'hashtag',
      payload: row,
    })
  }
  for (const row of suggest?.videos ?? []) {
    items.push({
      key: `video-${row?.publicId}`,
      type: 'video',
      payload: row,
    })
  }
  return items
}

export function SearchSuggestionList({
  showHistory,
  historyItems,
  historyLoading,
  historyClearing,
  onHistorySelect,
  onClearHistory,
  suggest,
  loading,
  error,
  isEmpty,
  activeKey,
  onTrendingSelect,
  onUserSelect,
  onHashtagSelect,
  onVideoSelect,
}) {
  const listRef = useRef(null)

  useEffect(() => {
    if (!activeKey || !listRef.current) return
    const node = listRef.current.querySelector(`[data-search-nav-key="${activeKey}"]`)
    node?.scrollIntoView({ block: 'nearest' })
  }, [activeKey])

  const sectionLabel = useMemo(() => {
    if (showHistory) return 'Lịch sử và gợi ý'
    return 'Kết quả gợi ý'
  }, [showHistory])

  if (loading) {
    return (
      <div className="flex flex-col gap-3 px-4 py-6" aria-live="polite" aria-busy="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="h-11 animate-pulse rounded-lg bg-zinc-900"
          />
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="px-4 py-10 text-center text-sm text-red-400" role="alert">
        {error}
      </div>
    )
  }

  if (isEmpty) {
    return (
      <div className="px-4 py-12 text-center">
        <p className="text-sm font-medium text-zinc-300">Không có kết quả</p>
        <p className="mt-1 text-xs text-zinc-500">Thử từ khóa khác hoặc kiểm tra chính tả</p>
      </div>
    )
  }

  return (
    <div
      ref={listRef}
      className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain pb-6"
      aria-label={sectionLabel}
    >
      {showHistory ? (
        <SearchHistorySection
          items={historyItems}
          loading={historyLoading}
          clearing={historyClearing}
          onSelect={onHistorySelect}
          onClearAll={onClearHistory}
          activeKey={activeKey}
        />
      ) : null}

      {!showHistory ? (
        <>
          <SearchTrendingSection
            items={suggest?.trending ?? []}
            activeKey={activeKey}
            onSelect={onTrendingSelect}
          />
          <SearchUserSection
            items={suggest?.users ?? []}
            activeKey={activeKey}
            onSelect={onUserSelect}
          />
          <SearchHashtagSection
            items={suggest?.hashtags ?? []}
            activeKey={activeKey}
            onSelect={onHashtagSelect}
          />
          <SearchVideoSection
            items={suggest?.videos ?? []}
            activeKey={activeKey}
            onSelect={onVideoSelect}
          />
        </>
      ) : null}

      {showHistory && (suggest?.trending?.length ?? 0) > 0 ? (
        <SearchTrendingSection
          items={suggest.trending}
          activeKey={activeKey}
          onSelect={onTrendingSelect}
        />
      ) : null}
    </div>
  )
}
