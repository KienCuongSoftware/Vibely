import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoClose } from 'react-icons/io5'
import { useSearch } from '../../hooks/useSearch'
import { useSearchHistory } from '../../hooks/useSearchHistory'
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
  const navigate = useNavigate()
  const { token } = useAuth()
  const inputRef = useRef(null)
  const [activeKey, setActiveKey] = useState(null)

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
    clearing: historyClearing,
    record: recordHistory,
    clearAll: clearHistory,
    canUseHistory,
  } = useSearchHistory({ token, enabled: open && Boolean(token) })

  const navItems = useMemo(
    () =>
      buildSearchNavItems({
        showHistory: showHistory && canUseHistory,
        historyItems,
        suggest,
      }),
    [canUseHistory, historyItems, showHistory, suggest],
  )

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
      const normalized = normalizeSearchQuery(rawQuery)
      if (!normalized) return
      if (token) {
        await recordHistory(normalized)
      }
      setQuery(normalized)
    },
    [recordHistory, setQuery, token],
  )

  const navigateWithHistory = useCallback(
    async (rawQuery, to) => {
      const normalized = normalizeSearchQuery(rawQuery)
      if (normalized && token) {
        await recordHistory(normalized)
      }
      onClose?.()
      navigate(to)
    },
    [navigate, onClose, recordHistory, token],
  )

  const activateItem = useCallback(
    (item) => {
      if (!item) return
      if (item.type === 'history') {
        setQuery(item.payload?.query ?? '')
        return
      }
      if (item.type === 'trending') {
        void commitSearch(item.payload?.keyword ?? '')
        return
      }
      if (item.type === 'user') {
        void navigateWithHistory(
          item.payload?.username,
          buildProfileHref(item.payload?.username),
        )
        return
      }
      if (item.type === 'hashtag') {
        void navigateWithHistory(
          item.payload?.tag,
          buildHashtagHref(item.payload?.tag),
        )
        return
      }
      if (item.type === 'video') {
        void navigateWithHistory(
          item.payload?.title || item.payload?.description || query,
          buildVideoHref(item.payload?.publicId),
        )
      }
    },
    [commitSearch, navigateWithHistory, query, setQuery],
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
          <SearchInput
            ref={inputRef}
            value={query}
            onChange={setQuery}
            onClear={() => setQuery('')}
            onKeyDown={handleInputKeyDown}
          />
        </header>

        <SearchSuggestionList
          showHistory={showHistory && canUseHistory}
          historyItems={historyItems}
          historyLoading={historyLoading}
          historyClearing={historyClearing}
          onHistorySelect={(row) => setQuery(row?.query ?? '')}
          onClearHistory={() => void clearHistory()}
          suggest={suggest}
          loading={loading}
          error={error}
          isEmpty={isEmpty}
          activeKey={activeKey}
          onTrendingSelect={(row) => void commitSearch(row?.keyword ?? '')}
          onUserSelect={(row) =>
            void navigateWithHistory(
              row?.username,
              buildProfileHref(row?.username),
            )}
          onHashtagSelect={(row) =>
            void navigateWithHistory(
              row?.tag,
              buildHashtagHref(row?.tag),
            )}
          onVideoSelect={(row) =>
            void navigateWithHistory(
              row?.title || row?.description || query,
              buildVideoHref(row?.publicId),
            )}
        />

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
