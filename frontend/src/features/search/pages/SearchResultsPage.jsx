import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { apiClient } from '@/shared/api/client'
import { Sidebar } from '@/shared/components/Sidebar'
import {
  isMobileFeedLayout,
  MobileFeedBottomNav,
} from '@/features/feed/components/MobileFeedShell.jsx'
import { MobileSearchBar } from '@/features/search/components/MobileSearchBar'
import {
  SearchSuggestionList,
} from '@/features/search/components/SearchSuggestionList'
import { SearchResultsSkeleton } from '@/features/search/components/SearchResultsSkeleton'
import { SearchVideoCard } from '@/features/search/components/SearchVideoCard'
import {
  buildProfileHref,
  normalizeSearchQuery,
  DEFAULT_AVATAR_URL,
} from '@/features/search/utils/searchUtils'
import { useSearch } from '@/features/search/hooks/useSearch'
import { useSearchHistory } from '@/features/search/hooks/useSearchHistory'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { buildProfileVideoUrl, videoPublicIdOf } from '@/features/post/utils/videoPublicId.js'
import { handleSidebarMenuSelect } from '@/shared/utils/sidebarNavigation.js'
import { buildMainSidebarMenuItems } from '@/shared/utils/mainSidebarMenuItems.js'

const SEARCH_TAB_IDS = [
  { id: 'top', labelKey: 'searchPage.tabTop' },
  { id: 'users', labelKey: 'searchPage.tabUsers' },
  { id: 'videos', labelKey: 'searchPage.tabVideos' },
]

function SearchUserRow({ row, token, currentUserId }) {
  const { t } = useTranslation()
  const avatar = row.avatarUrl?.trim() || DEFAULT_AVATAR_URL
  const isSelf =
    currentUserId != null && row.id != null && Number(row.id) === Number(currentUserId)

  return (
    <li className="flex items-center gap-4 py-2.5">
      <Link
        to={buildProfileHref(row.username)}
        className="flex min-w-0 flex-1 items-center gap-3 rounded-lg transition hover:bg-zinc-900/50"
      >
        <img
          src={avatar}
          alt=""
          className="h-14 w-14 shrink-0 rounded-full object-cover"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_AVATAR_URL
          }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-bold leading-tight text-white">
            {row.displayName || row.username}
          </span>
          <span className="mt-0.5 block truncate text-[14px] text-zinc-400">
            @{row.username}
          </span>
        </span>
      </Link>
      {!isSelf && token && row.id ? (
        <Link
          to={buildProfileHref(row.username)}
          className="shrink-0 rounded-full bg-[#fe2c55] px-6 py-1.5 text-[15px] font-semibold text-white transition hover:bg-[#ff4d70]"
        >
          {t('searchPage.follow')}
        </Link>
      ) : (
        <Link
          to={buildProfileHref(row.username)}
          className="shrink-0 rounded-full border border-zinc-600 px-5 py-1.5 text-[14px] font-semibold text-zinc-200 transition hover:border-zinc-400"
        >
          {t('searchPage.viewProfile')}
        </Link>
      )}
    </li>
  )
}

function SearchResultsBody({
  qFromUrl,
  loading,
  error,
  hasResults,
  activeTab,
  showUsers,
  showVideos,
  userPreview,
  videoList,
  matchedTags = [],
  token,
  user,
  openVideo,
  mobileLayout = false,
}) {
  const { t } = useTranslation()
  if (!qFromUrl) {
    if (mobileLayout) return null
    return (
      <p className="py-20 text-center text-[15px] text-zinc-500">
        {t('searchUi.sidebarHint')}
      </p>
    )
  }

  if (loading) {
    return <SearchResultsSkeleton activeTab={activeTab} />
  }

  if (error) {
    return <p className="py-20 text-center text-[15px] text-red-400">{error}</p>
  }

  if (!hasResults) {
    return (
      <div className="py-20 text-center">
        <p className="text-[15px] font-medium text-zinc-300">{t('searchUi.noResults')}</p>
        <p className="mt-2 text-sm text-zinc-500">
          {t('searchUi.tryOtherQuery', { query: qFromUrl })}
        </p>
      </div>
    )
  }

  return (
    <>
      {matchedTags.length > 0 && showVideos ? (
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-medium text-zinc-500">{t('searchUi.related')}</span>
          {matchedTags.slice(0, 8).map((slug) => (
            <Link
              key={slug}
              to={`/search?q=${encodeURIComponent(slug)}`}
              className="rounded-full border border-zinc-800 bg-zinc-950 px-2.5 py-0.5 text-[12px] font-semibold text-zinc-300 transition hover:border-zinc-600 hover:text-white"
            >
              #{slug}
            </Link>
          ))}
        </div>
      ) : null}

      {showUsers ? (
        <section>
          {userPreview.length === 0 ? (
            <p className="text-sm text-zinc-500">{t('searchUi.noUsers')}</p>
          ) : (
            <ul className="space-y-0.5">
              {userPreview.map((row) => (
                <SearchUserRow
                  key={row.id ?? row.username}
                  row={row}
                  token={token}
                  currentUserId={user?.id}
                />
              ))}
            </ul>
          )}
        </section>
      ) : null}

      {showVideos ? (
        <section>
          {videoList.length === 0 ? (
            <p className="text-sm text-zinc-500">{t('searchUi.noVideos')}</p>
          ) : (
            <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
              {videoList.map((v) => {
                const id = videoPublicIdOf(v)
                return (
                  <li key={id ?? v.title}>
                    <SearchVideoCard video={v} onOpen={openVideo} />
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      ) : null}
    </>
  )
}

export function SearchResultsPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { token, user, logout, authReady } = useAuth()
  const qFromUrl = normalizeSearchQuery(searchParams.get('q') ?? '')
  const fromExplore = searchParams.get('from') === 'explore'
  const [inputQuery, setInputQuery] = useState(qFromUrl)
  const [activeTab, setActiveTab] = useState('top')
  const [users, setUsers] = useState([])
  const [videos, setVideos] = useState([])
  const [matchedTags, setMatchedTags] = useState([])
  const [usersLoading, setUsersLoading] = useState(() => Boolean(qFromUrl))
  const [videosLoading, setVideosLoading] = useState(() => Boolean(qFromUrl))
  const [error, setError] = useState('')
  const [mobileLayout, setMobileLayout] = useState(() => isMobileFeedLayout())
  const recordHistoryRef = useRef(null)

  const mobileSearchMode = mobileLayout && !qFromUrl

  const {
    query: suggestQuery,
    setQuery: setSuggestQuery,
    debouncedQuery,
    suggest,
    loading: suggestLoading,
    error: suggestError,
    showHistory,
    isEmpty: suggestEmpty,
  } = useSearch({ enabled: mobileSearchMode, token })

  const {
    items: historyItems,
    loading: historyLoading,
    removingId: historyRemovingId,
    remove: removeHistoryItem,
    canUseHistory,
  } = useSearchHistory({
    token,
    enabled: mobileSearchMode && Boolean(token) && authReady,
  })

  const { record: recordSearchHistory } = useSearchHistory({
    token,
    enabled: false,
  })

  recordHistoryRef.current = recordSearchHistory

  const menuItems = useMemo(() => buildMainSidebarMenuItems(token), [token])

  const handleSelectMenu = useCallback(
    (id) => handleSidebarMenuSelect(navigate, id, { token, user }),
    [navigate, token, user],
  )

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setMobileLayout(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    document.title = qFromUrl
      ? t('searchPage.pageTitleWithQuery', { query: qFromUrl })
      : t('searchPage.pageTitle')
  }, [qFromUrl, t])

  /** Rewrite URL if q still has uppercase / unsafe chars from old links. */
  useEffect(() => {
    const raw = searchParams.get('q')
    if (raw == null || raw === '') return
    const normalized = normalizeSearchQuery(raw)
    if (normalized === raw) return
    const params = {}
    if (normalized) params.q = normalized
    if (fromExplore) params.from = 'explore'
    setSearchParams(params, { replace: true })
  }, [fromExplore, searchParams, setSearchParams])

  useEffect(() => {
    setInputQuery(qFromUrl)
    if (!qFromUrl) setSuggestQuery('')
  }, [qFromUrl, setSuggestQuery])

  useEffect(() => {
    if (!qFromUrl) {
      setUsers([])
      setVideos([])
      setMatchedTags([])
      setError('')
      setUsersLoading(false)
      setVideosLoading(false)
      return undefined
    }

    let cancelled = false
    setUsers([])
    setVideos([])
    setMatchedTags([])
    setError('')
    setUsersLoading(true)
    setVideosLoading(true)

    if (token) {
      void recordHistoryRef.current?.(qFromUrl)
    }

    // Load independently so the active tab can render as soon as its data arrives.
    void apiClient
      .getSearchUsers(qFromUrl, { limit: 20 })
      .then((userRows) => {
        if (cancelled) return
        setUsers(Array.isArray(userRows) ? userRows : [])
      })
      .catch((err) => {
        if (cancelled) return
        setUsers([])
        setError(err instanceof Error ? err.message : 'Không tải được kết quả.')
      })
      .finally(() => {
        if (!cancelled) setUsersLoading(false)
      })

    void apiClient
      .getSearchSemantic(qFromUrl, { limit: 30 })
      .then((semantic) => {
        if (cancelled) return
        setVideos(Array.isArray(semantic?.videos) ? semantic.videos : [])
        setMatchedTags(Array.isArray(semantic?.matchedTags) ? semantic.matchedTags : [])
      })
      .catch((err) => {
        if (cancelled) return
        setVideos([])
        setMatchedTags([])
        setError((prev) => prev || (err instanceof Error ? err.message : 'Không tải được kết quả.'))
      })
      .finally(() => {
        if (!cancelled) setVideosLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [qFromUrl, token])

  const submitSearch = useCallback(
    (raw) => {
      const next = normalizeSearchQuery(raw)
      if (!next) return
      const params = { q: next }
      if (fromExplore) params.from = 'explore'
      setSearchParams(params)
    },
    [fromExplore, setSearchParams],
  )

  const handleBack = useCallback(() => {
    if (mobileLayout && qFromUrl) {
      const params = fromExplore ? { from: 'explore' } : {}
      setSearchParams(params)
      return
    }
    if (fromExplore) {
      navigate('/explore')
      return
    }
    navigate(-1)
  }, [fromExplore, mobileLayout, navigate, qFromUrl, setSearchParams])

  const openVideo = useCallback(
    (video) => {
      const id = videoPublicIdOf(video)
      const path = buildProfileVideoUrl(video?.authorUsername, id)
      if (path) navigate(path)
    },
    [navigate],
  )

  const showUsers = activeTab === 'users'
  const showVideos = activeTab === 'top' || activeTab === 'videos'
  const userPreview = users
  const videoList =
    activeTab === 'top'
      ? [...videos].sort(
          (a, b) => Number(b.viewCount ?? 0) - Number(a.viewCount ?? 0),
        )
      : videos

  // Only wait on the data the active tab needs — render as soon as that arrives.
  const loading =
    (showUsers && usersLoading) || (showVideos && videosLoading)
  const hasResults =
    (showUsers && users.length > 0) || (showVideos && videos.length > 0)

  const barValue = mobileSearchMode ? suggestQuery : inputQuery
  const barOnChange = mobileSearchMode ? setSuggestQuery : setInputQuery

  const resultsBody = (
    <SearchResultsBody
      qFromUrl={qFromUrl}
      loading={loading}
      error={error}
      hasResults={hasResults}
      activeTab={activeTab}
      showUsers={showUsers}
      showVideos={showVideos}
      userPreview={userPreview}
      videoList={videoList}
      matchedTags={matchedTags}
      token={token}
      user={user}
      openVideo={openVideo}
      mobileLayout={mobileLayout}
    />
  )

  if (mobileLayout) {
    return (
      <section className="flex h-dvh max-h-dvh min-h-0 flex-col bg-black text-zinc-100">
        <MobileSearchBar
          value={barValue}
          onChange={barOnChange}
          onSubmit={submitSearch}
          onBack={handleBack}
          autoFocus
        />

        {qFromUrl ? (
          <div
            role="tablist"
            className="flex shrink-0 gap-6 border-b border-zinc-800 px-4"
          >
            {SEARCH_TAB_IDS.map((tab) => (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={activeTab === tab.id}
                className={`cursor-pointer pb-2.5 text-[15px] font-semibold transition ${
                  activeTab === tab.id
                    ? 'border-b-2 border-white text-white'
                    : 'border-b-2 border-transparent text-zinc-500'
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {t(tab.labelKey)}
              </button>
            ))}
          </div>
        ) : null}

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto">
          {mobileSearchMode ? (
            <SearchSuggestionList
              showHistory={showHistory}
              historyItems={canUseHistory ? historyItems : []}
              historyLoading={historyLoading}
              onHistorySelect={(row) => submitSearch(row?.query ?? '')}
              onRemoveHistory={(row) => void removeHistoryItem(row)}
              removingHistoryId={historyRemovingId}
              suggest={suggest}
              loading={suggestLoading}
              error={suggestError}
              isEmpty={suggestEmpty}
              activeKey={null}
              onSearchAllSelect={(q) => submitSearch(q)}
              searchAllQuery={!showHistory ? normalizeSearchQuery(debouncedQuery) : ''}
              onTrendingSelect={(row) => submitSearch(row?.keyword ?? '')}
              onUserSelect={(row) => navigate(buildProfileHref(row?.username))}
              onHashtagSelect={(row) =>
                navigate(`/tag/${encodeURIComponent(String(row?.tag ?? '').replace(/^#/, ''))}`)
              }
              onVideoSelect={(row) => {
                const path = buildProfileVideoUrl(row?.authorUsername, row?.publicId)
                if (path) navigate(path)
              }}
            />
          ) : (
            <main className="px-4 py-4">{resultsBody}</main>
          )}
        </div>

        <MobileFeedBottomNav
          token={token}
          user={user}
          activeId={fromExplore ? 'explore' : 'latest'}
          onSelectMenu={handleSelectMenu}
        />
      </section>
    )
  }

  return (
    <section className="flex h-dvh max-h-dvh min-h-0 bg-black text-zinc-100">
      <Sidebar
        menuItems={menuItems}
        activeMenu={null}
        onSelectMenu={handleSelectMenu}
        token={token}
        user={user}
        onLogout={token ? logout : undefined}
      />

      <div className="scrollbar-none flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto">
        {qFromUrl ? (
          <header className="sticky top-0 z-20 border-b border-zinc-800/90 bg-black/95 px-6 pt-3 backdrop-blur-md">
            <div role="tablist" className="flex w-full gap-8">
              {SEARCH_TAB_IDS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`cursor-pointer pb-3 text-[16px] font-semibold transition ${
                    activeTab === tab.id
                      ? 'border-b-2 border-white text-white'
                      : 'border-b-2 border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {t(tab.labelKey)}
                </button>
              ))}
            </div>
          </header>
        ) : null}

        <main className="mx-auto w-full max-w-7xl flex-1 px-6 py-6">{resultsBody}</main>
      </div>
    </section>
  )
}

export default SearchResultsPage
