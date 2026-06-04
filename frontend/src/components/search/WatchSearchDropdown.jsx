import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { IoCloseCircle, IoSearchOutline } from 'react-icons/io5'
import { useSearch } from '../../hooks/useSearch'
import { useSearchNavigation } from '../../hooks/useSearchNavigation'
import { useAuth } from '../../state/useAuth'
import { normalizeSearchQuery, suggestKeywordMatchesQuery } from './searchUtils'

function WatchSearchQueryRows({ items, activeKey, onSelect }) {
  if (!items.length) return null
  return (
    <ul className="py-1">
      {items.map((row) => {
        const active = activeKey === row.key
        return (
          <li key={row.key}>
            <button
              type="button"
              data-search-nav-key={row.key}
              onClick={() => onSelect?.(row)}
              className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left text-[15px] transition ${
                active ? 'bg-zinc-800/90 text-white' : 'text-zinc-100 hover:bg-zinc-900'
              }`}
            >
              <IoSearchOutline className="shrink-0 text-lg text-zinc-400" aria-hidden />
              <span className="min-w-0 flex-1 truncate">{row.label}</span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}

/** Gợi ý từ khóa khi đã gõ — chỉ mục liên quan tới query, không lịch sử. */
function buildWatchSearchQueryRows(query, suggest = {}) {
  const nq = normalizeSearchQuery(query)
  if (!nq) return []

  const rows = []
  const seen = new Set()
  const add = (key, type, label, payload) => {
    const text = String(label ?? '').trim()
    if (!text || !suggestKeywordMatchesQuery(text, nq)) return
    const dedupeKey = text.toLowerCase()
    if (seen.has(dedupeKey)) return
    seen.add(dedupeKey)
    rows.push({ key, type, label: text, payload })
  }

  add('search-query', 'search', nq, { query: nq })

  for (const [index, item] of (suggest?.trending ?? []).entries()) {
    const keyword = String(item?.keyword ?? '').trim()
    if (!keyword) continue
    add(`trend-${keyword}-${index}`, 'trending', keyword, item)
  }

  for (const user of suggest?.users ?? []) {
    const username = String(user?.username ?? '').trim()
    if (username) {
      add(`user-q-${user?.id ?? username}`, 'search', username, { query: username })
    }
    const name = String(user?.displayName ?? '').trim()
    if (name && name.toLowerCase() !== username.toLowerCase()) {
      add(`user-name-${user?.id ?? name}`, 'search', name, { query: name })
    }
  }

  for (const tagRow of suggest?.hashtags ?? []) {
    const tag = String(tagRow?.tag ?? '').trim()
    if (!tag) continue
    add(`tag-${tagRow?.id ?? tag}`, 'search', tag, { query: tag })
  }

  return rows
}

export function WatchSearchDropdown({
  className = '',
  placeholder = 'Tìm nội dung liên quan',
  maxWidthClass = 'max-w-[360px]',
}) {
  const { token } = useAuth()
  const containerRef = useRef(null)
  const inputRef = useRef(null)
  const [open, setOpen] = useState(false)
  const [activeKey, setActiveKey] = useState(null)

  const closePanel = useCallback(() => setOpen(false), [])

  const {
    query,
    setQuery,
    debouncedQuery,
    suggest,
    loading,
    error,
    isEmpty,
    refresh,
  } = useSearch({ enabled: open, token, skipFetchWhenEmpty: true })

  const hasQuery = normalizeSearchQuery(query).length > 0

  const { goToSearchResults, activateNavItem } = useSearchNavigation({
    token,
    onBeforeNavigate: closePanel,
  })

  const queryRows = useMemo(() => buildWatchSearchQueryRows(query, suggest), [query, suggest])

  const navItems = queryRows

  useEffect(() => {
    setActiveKey(navItems[0]?.key ?? null)
  }, [debouncedQuery, navItems])

  useEffect(() => {
    if (!open) return undefined
    const onPointerDown = (event) => {
      const el = containerRef.current
      if (el && event.target instanceof Node && !el.contains(event.target)) {
        setOpen(false)
      }
    }
    document.addEventListener('pointerdown', onPointerDown, true)
    return () => document.removeEventListener('pointerdown', onPointerDown, true)
  }, [open])

  const handleActivate = useCallback(
    (item) => {
      const result = activateNavItem(item, { fallbackQuery: query })
      if (result?.action === 'fill') {
        setQuery(result.query ?? '')
        inputRef.current?.focus()
      }
    },
    [activateNavItem, query, setQuery],
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

  const handleKeyDown = (event) => {
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
        handleActivate(active)
        return
      }
      void goToSearchResults(query)
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      setOpen(false)
    }
  }

  const showPanel =
    open &&
    hasQuery &&
    (loading || Boolean(error) || queryRows.length > 0 || isEmpty)

  return (
    <div ref={containerRef} className={`relative w-full ${maxWidthClass} ${className}`.trim()}>
      <form
        onSubmit={(e) => {
          e.preventDefault()
          void goToSearchResults(query)
        }}
        className="flex h-11 w-full items-center rounded-full border border-white/10 bg-zinc-900/55 px-4 shadow-lg backdrop-blur-md"
      >
        <input
          ref={inputRef}
          type="text"
          value={query}
          onChange={(e) => {
            const next = e.target.value
            setQuery(next)
            setOpen(normalizeSearchQuery(next).length > 0)
          }}
          onFocus={() => {
            if (hasQuery) setOpen(true)
          }}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          enterKeyHint="search"
          className="min-w-0 flex-1 bg-transparent text-[15px] text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
          aria-label={placeholder}
          aria-expanded={showPanel}
          aria-controls="watch-search-suggest-panel"
          aria-autocomplete="list"
        />
        {query ? (
          <button
            type="button"
            onClick={() => {
              setQuery('')
              setOpen(false)
            }}
            aria-label="Xóa từ khóa"
            className="mx-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-full text-zinc-400 transition hover:bg-zinc-800/80 hover:text-zinc-100"
          >
            <IoCloseCircle className="text-xl" aria-hidden />
          </button>
        ) : null}
        <span className="mx-1 h-5 w-px shrink-0 bg-zinc-500/80" aria-hidden />
        <button
          type="submit"
          className="flex shrink-0 cursor-pointer items-center justify-center rounded-full p-1 text-xl text-zinc-300 transition hover:text-zinc-100"
          aria-label="Tìm kiếm"
        >
          <IoSearchOutline aria-hidden />
        </button>
      </form>

      {showPanel ? (
        <div
          id="watch-search-suggest-panel"
          role="listbox"
          className="absolute left-0 right-0 top-[calc(100%+8px)] z-[80] max-h-[min(380px,52dvh)] overflow-hidden rounded-xl border border-zinc-700/90 bg-zinc-950 shadow-2xl"
        >
          <div className="scrollbar-none max-h-[min(380px,52dvh)] overflow-y-auto overscroll-contain py-1">
            {loading && !queryRows.length ? (
              <p className="px-4 py-6 text-center text-sm text-zinc-500" aria-busy="true">
                Đang tải gợi ý…
              </p>
            ) : null}

            {error ? (
              <div className="px-4 py-4 text-center">
                <p className="text-sm text-red-400">{error}</p>
                <button
                  type="button"
                  onClick={() => void refresh()}
                  className="mt-2 cursor-pointer text-xs font-semibold text-zinc-300 hover:text-white"
                >
                  Thử lại
                </button>
              </div>
            ) : null}

            {!loading && !error ? (
              <>
                <WatchSearchQueryRows
                  items={queryRows}
                  activeKey={activeKey}
                  onSelect={handleActivate}
                />

                {isEmpty && debouncedQuery ? (
                  <p className="px-4 py-6 text-center text-sm text-zinc-500">
                    Không có gợi ý — nhấn Enter để tìm
                  </p>
                ) : null}

              </>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
