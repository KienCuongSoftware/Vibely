import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IoClose } from 'react-icons/io5'
import { useSearch } from '../../hooks/useSearch'
import { useSearchHistory } from '../../hooks/useSearchHistory'
import { useSearchNavigation } from '../../hooks/useSearchNavigation'
import { useAuth } from '../../state/useAuth'
import { SearchInput } from './SearchInput'
import {
  buildSearchNavItems,
  SearchSuggestionList,
} from './SearchSuggestionList'
import {
  buildHashtagHref,
  buildProfileHref,
  buildVideoHref,
  normalizeSearchQuery,
} from './searchUtils'

export function SearchModal({ open, onClose }) {
  const { token, authReady } = useAuth()
  const inputRef = useRef(null)
  const [activeKey, setActiveKey] = useState(null)

  const { goToSearchResults, navigateTo } = useSearchNavigation({
    token,
    onBeforeNavigate: onClose,
  })

  const {
    query,
    setQuery,
    debouncedQuery,
    suggest,
    loading,
    error,
    isEmpty,
    showHistory,
    refresh,
  } = useSearch({ enabled: open, token })

  const {
    items: historyItems,
    loading: historyLoading,
    removingId: historyRemovingId,
    remove: removeHistoryItem,
    canUseHistory,
  } = useSearchHistory({
    token,
    enabled: open && Boolean(token) && authReady,
  })

  const navItems = useMemo(() => {
    const base = buildSearchNavItems({
      showHistory: showHistory && canUseHistory,
      historyItems,
      suggest,
    })
    const q = normalizeSearchQuery(debouncedQuery)
    if (!showHistory && q) {
      return [
        { key: `search-all-${q}`, type: 'search', payload: { query: q } },
        ...base,
      ]
    }
    return base
  }, [canUseHistory, debouncedQuery, historyItems, showHistory, suggest])

  useEffect(() => {
    if (!open) return undefined
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const timer = window.setTimeout(() => inputRef.current?.focus(), 50)
    return () => {
      window.clearTimeout(timer)
      document.body.style.overflow = previousOverflow
    }
  }, [open])

  useEffect(() => {
    if (!open) {
      setQuery('')
      setActiveKey(null)
    }
  }, [open, setQuery])

  useEffect(() => {
    setActiveKey(navItems[0]?.key ?? null)
  }, [debouncedQuery, navItems])

  const commitSearch = useCallback(
    async (rawQuery) => {
      await goToSearchResults(rawQuery)
    },
    [goToSearchResults],
  )

  const activateItem = useCallback(
    (item) => {
      if (!item) return
      if (item.type === 'history') {
        void goToSearchResults(item.payload?.query ?? '')
        return
      }
      if (item.type === 'search' || item.type === 'trending') {
        void goToSearchResults(
          item.payload?.query ?? item.payload?.keyword ?? '',
        )
        return
      }
      if (item.type === 'user') {
        void navigateTo(
          item.payload?.username,
          buildProfileHref(item.payload?.username),
        )
        return
      }
      if (item.type === 'hashtag') {
        void navigateTo(item.payload?.tag, buildHashtagHref(item.payload?.tag))
        return
      }
      if (item.type === 'video') {
        void navigateTo(
          item.payload?.title || item.payload?.description || query,
          buildVideoHref(item.payload?.publicId),
        )
      }
    },
    [goToSearchResults, navigateTo, query],
  )

  const moveActive = useCallback(
    (delta) => {
      if (!navItems.length) return
      const currentIndex = navItems.findIndex((row) => row.key === activeKey)
      const nextIndex =
        currentIndex < 0
          ? delta > 0
            ? 0
            : navItems.length - 1
          : (currentIndex + delta + navItems.length) % navItems.length
      setActiveKey(navItems[nextIndex]?.key ?? null)
    },
    [activeKey, navItems],
  )

  const handleInputKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault()
      moveActive(1)
      return
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault()
      moveActive(-1)
      return
    }
    if (event.key === 'Enter') {
      event.preventDefault()
      const active = navItems.find((row) => row.key === activeKey)
      if (active) {
        void activateItem(active)
        return
      }
      void commitSearch(query)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      onClose?.()
    }
  }

  useEffect(() => {
    if (!open) return undefined
    const onDocKeyDown = (event) => {
      if (event.key === 'Escape') {
        event.preventDefault()
        onClose?.()
      }
    }
    document.addEventListener('keydown', onDocKeyDown)
    return () => document.removeEventListener('keydown', onDocKeyDown)
  }, [open, onClose])

  if (!open) return null

  const normalizedQuery = normalizeSearchQuery(debouncedQuery)

  return (
    <div className="fixed inset-0 z-[120] flex" role="presentation">
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-[1px]"
        aria-label="Đóng tìm kiếm"
        onClick={onClose}
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="vibely-search-title"
        className="relative z-10 flex h-full w-full max-w-full flex-col border-r border-zinc-800/80 bg-zinc-950 text-zinc-100 shadow-2xl sm:max-w-[min(100%,420px)] md:max-w-[400px]"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="shrink-0 border-b border-zinc-800/80 px-4 pb-3 pt-4 sm:px-5 sm:pt-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 id="vibely-search-title" className="text-lg font-bold text-white sm:text-xl">
              Tìm kiếm
            </h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng"
              className="flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
            >
              <IoClose className="text-2xl" aria-hidden />
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault()
              void commitSearch(query)
            }}
          >
            <SearchInput
              ref={inputRef}
              value={query}
              onChange={setQuery}
              onClear={() => setQuery('')}
              onKeyDown={handleInputKeyDown}
            />
          </form>
        </header>

        {isEmpty && normalizedQuery ? (
          <div className="flex flex-1 flex-col px-4 py-6">
            <p className="text-center text-sm text-zinc-500">
              Không có gợi ý nhanh cho &quot;{normalizedQuery}&quot;
            </p>
            <button
              type="button"
              onClick={() => void commitSearch(normalizedQuery)}
              className="mt-4 w-full cursor-pointer rounded-lg bg-zinc-900 py-3 text-sm font-semibold text-white transition hover:bg-zinc-800"
            >
              Xem tất cả kết quả
            </button>
          </div>
        ) : (
          <SearchSuggestionList
            showHistory={showHistory && canUseHistory}
            historyItems={historyItems}
            historyLoading={historyLoading}
            onHistorySelect={(row) => void goToSearchResults(row?.query ?? '')}
            onRemoveHistory={(row) => void removeHistoryItem(row)}
            removingHistoryId={historyRemovingId}
            suggest={suggest}
            loading={loading}
            error={error}
            isEmpty={isEmpty}
            activeKey={activeKey}
            onSearchAllSelect={(q) => void goToSearchResults(q)}
            searchAllQuery={!showHistory ? normalizedQuery : ''}
            onTrendingSelect={(row) => void goToSearchResults(row?.keyword ?? '')}
            onUserSelect={(row) =>
              void navigateTo(
                row?.username,
                buildProfileHref(row?.username),
              )}
            onHashtagSelect={(row) =>
              void navigateTo(row?.tag, buildHashtagHref(row?.tag))}
            onVideoSelect={(row) =>
              void navigateTo(
                row?.title || row?.description || query,
                buildVideoHref(row?.publicId),
              )}
          />
        )}

        {showHistory && !canUseHistory ? (
          <p className="px-5 pb-6 text-center text-xs text-zinc-500">
            Đăng nhập để lưu lịch sử tìm kiếm
          </p>
        ) : null}

        {error && debouncedQuery ? (
          <div className="shrink-0 border-t border-zinc-800 px-4 py-3">
            <button
              type="button"
              onClick={() => void refresh()}
              className="w-full cursor-pointer rounded-full bg-zinc-800 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              Thử lại
            </button>
          </div>
        ) : null}
      </aside>
    </div>
  )
}
