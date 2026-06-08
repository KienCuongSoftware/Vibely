import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { IoHeart, IoPlayOutline } from 'react-icons/io5'
import { apiClient } from '../api/client'
import { Sidebar } from '../components/Sidebar'
import { SearchInput } from '../components/search/SearchInput'
import {
  buildProfileHref,
  buildSearchResultsHref,
  DEFAULT_AVATAR_URL,
  normalizeSearchQuery,
  resolveVideoSearchCaption,
} from '../components/search/searchUtils'
import { useSearchHistory } from '../hooks/useSearchHistory'
import { useAuth } from '../state/useAuth'
import { buildProfileVideoUrl, videoPublicIdOf } from '../utils/videoPublicId.js'
import { handleSidebarMenuSelect } from '../utils/sidebarNavigation.js'
import { buildMainSidebarMenuItems } from '../utils/mainSidebarMenuItems.js'

function formatCompactCount(value) {
  const count = Number(value ?? 0)
  if (count >= 1_000_000) {
    const formatted =
      count >= 10_000_000
        ? (count / 1_000_000).toFixed(0)
        : (count / 1_000_000).toFixed(1)
    return `${formatted.replace(/\.0$/, '')}M`
  }
  if (count >= 10_000) return `${Math.round(count / 1000)}K`
  if (count >= 1000) return `${(count / 1000).toFixed(1).replace(/\.0$/, '')}K`
  return String(count)
}

const SEARCH_TABS = [
  { id: 'top', label: 'Top' },
  { id: 'users', label: 'Người dùng' },
  { id: 'videos', label: 'Video' },
]

function SearchUserRow({ row, token, currentUserId }) {
  const avatar = row.avatarUrl?.trim() || DEFAULT_AVATAR_URL
  const isSelf =
    currentUserId != null && row.id != null && Number(row.id) === Number(currentUserId)

  return (
    <li className="flex items-center gap-4 py-2">
      <Link
        to={buildProfileHref(row.username)}
        className="flex min-w-0 flex-1 items-center gap-4 rounded-lg transition hover:bg-zinc-900/50"
      >
        <img
          src={avatar}
          alt=""
          className="h-14 w-14 shrink-0 rounded-full object-cover ring-1 ring-zinc-700"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_AVATAR_URL
          }}
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[17px] font-bold leading-tight text-white">
            {row.displayName || row.username}
          </span>
          <span className="mt-0.5 block truncate text-[15px] text-zinc-400">
            @{row.username}
          </span>
        </span>
      </Link>
      {!isSelf && token && row.id ? (
        <Link
          to={buildProfileHref(row.username)}
          className="shrink-0 rounded-md bg-[#fe2c55] px-5 py-2 text-[15px] font-semibold text-white transition hover:bg-[#ff4d70]"
        >
          Theo dõi
        </Link>
      ) : (
        <Link
          to={buildProfileHref(row.username)}
          className="shrink-0 rounded-md border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-zinc-400"
        >
          Xem hồ sơ
        </Link>
      )}
    </li>
  )
}

export function SearchResultsPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const { token, user, logout } = useAuth()
  const qFromUrl = normalizeSearchQuery(searchParams.get('q') ?? '')
  const [inputQuery, setInputQuery] = useState(qFromUrl)
  const [activeTab, setActiveTab] = useState('top')
  const [users, setUsers] = useState([])
  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const { record: recordSearchHistory } = useSearchHistory({
    token,
    enabled: false,
  })

  const menuItems = useMemo(() => buildMainSidebarMenuItems(token), [token])

  const handleSelectMenu = useCallback(
    (id) => handleSidebarMenuSelect(navigate, id, { token, user }),
    [navigate, token, user],
  )

  useEffect(() => {
    document.title = qFromUrl
      ? `${qFromUrl} | Tìm kiếm trên Vibely`
      : 'Tìm kiếm | Vibely'
  }, [qFromUrl])

  useEffect(() => {
    setInputQuery(qFromUrl)
  }, [qFromUrl])

  useEffect(() => {
    if (!qFromUrl) {
      setUsers([])
      setVideos([])
      setError('')
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setError('')
    if (token) {
      void recordSearchHistory(qFromUrl)
    }
    Promise.all([
      apiClient.getSearchUsers(qFromUrl, { limit: 20 }),
      apiClient.getSearchVideos(qFromUrl, { limit: 30 }),
    ])
      .then(([userRows, videoRows]) => {
        if (cancelled) return
        setUsers(Array.isArray(userRows) ? userRows : [])
        setVideos(Array.isArray(videoRows) ? videoRows : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Không tải được kết quả.')
          setUsers([])
          setVideos([])
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [qFromUrl, token, recordSearchHistory])

  const submitSearch = useCallback(
    (raw) => {
      const next = normalizeSearchQuery(raw)
      if (!next) return
      setSearchParams({ q: next })
    },
    [setSearchParams],
  )

  const openVideo = useCallback(
    (video) => {
      const id = videoPublicIdOf(video)
      const path = buildProfileVideoUrl(video?.authorUsername, id)
      if (path) navigate(path)
    },
    [navigate],
  )

  const showUsers = activeTab === 'top' || activeTab === 'users'
  const showVideos = activeTab === 'top' || activeTab === 'videos'
  const userPreview = activeTab === 'top' ? users.slice(0, 5) : users
  const videoList = videos
  const hasResults = users.length > 0 || videos.length > 0

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
        <header className="sticky top-0 z-20 border-b border-zinc-800/90 bg-black/95 px-6 py-4 backdrop-blur-md">
          <form
            className="mx-auto w-full max-w-[720px]"
            onSubmit={(e) => {
              e.preventDefault()
              submitSearch(inputQuery)
            }}
          >
            <SearchInput
              value={inputQuery}
              onChange={setInputQuery}
              onClear={() => setInputQuery('')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  submitSearch(inputQuery)
                }
              }}
              placeholder="Tìm kiếm"
              autoFocus={!qFromUrl}
              id="vibely-search-results-input"
            />
          </form>

          {qFromUrl ? (
            <div
              role="tablist"
              className="mx-auto mt-4 flex w-full max-w-[720px] gap-8"
            >
              {SEARCH_TABS.map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === tab.id}
                  className={`cursor-pointer pb-2.5 text-[16px] font-semibold transition ${
                    activeTab === tab.id
                      ? 'border-b-2 border-white text-white'
                      : 'border-b-2 border-transparent text-zinc-500 hover:text-zinc-300'
                  }`}
                  onClick={() => setActiveTab(tab.id)}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          ) : null}
        </header>

        <main className="mx-auto w-full max-w-[1280px] flex-1 px-6 py-6">
          {!qFromUrl ? (
            <p className="py-20 text-center text-[15px] text-zinc-500">
              Nhập từ khóa để tìm người dùng và video trên Vibely.
            </p>
          ) : loading ? (
            <p className="py-20 text-center text-[15px] text-zinc-500">Đang tải kết quả…</p>
          ) : error ? (
            <p className="py-20 text-center text-[15px] text-red-400">{error}</p>
          ) : !hasResults ? (
            <div className="py-20 text-center">
              <p className="text-[15px] font-medium text-zinc-300">Không có kết quả</p>
              <p className="mt-2 text-sm text-zinc-500">
                Thử từ khóa khác hoặc kiểm tra chính tả cho &quot;{qFromUrl}&quot;
              </p>
            </div>
          ) : (
            <>
              {showUsers ? (
                <section className="mb-10">
                  <div className="mb-4 flex items-center justify-between gap-2">
                    <h2 className="text-[17px] font-bold text-white">Người dùng</h2>
                    {activeTab === 'top' && users.length > 5 ? (
                      <button
                        type="button"
                        className="cursor-pointer text-[15px] font-semibold text-zinc-400 hover:text-white"
                        onClick={() => setActiveTab('users')}
                      >
                        Xem thêm ›
                      </button>
                    ) : null}
                  </div>
                  {userPreview.length === 0 ? (
                    <p className="text-sm text-zinc-500">Không tìm thấy người dùng.</p>
                  ) : (
                    <ul className="space-y-1">
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
                  {activeTab === 'top' && users.length > 0 ? (
                    <h2 className="mb-4 text-[17px] font-bold text-white">Video</h2>
                  ) : null}
                  {videoList.length === 0 ? (
                    <p className="text-sm text-zinc-500">Không tìm thấy video.</p>
                  ) : (
                    <ul className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {videoList.map((v) => {
                        const id = videoPublicIdOf(v)
                        const thumb = v.thumbnailUrl?.trim()
                        const authorAvatar = v.authorAvatarUrl?.trim() || DEFAULT_AVATAR_URL
                        return (
                          <li key={id ?? v.title}>
                            <button
                              type="button"
                              onClick={() => openVideo(v)}
                              className="group w-full cursor-pointer text-left"
                            >
                              <div className="relative aspect-[9/16] overflow-hidden rounded-md bg-zinc-900">
                                {thumb ? (
                                  <img
                                    src={thumb}
                                    alt=""
                                    loading="lazy"
                                    className="h-full w-full object-cover transition group-hover:opacity-90"
                                  />
                                ) : (
                                  <div className="h-full w-full bg-zinc-800" />
                                )}
                                <div className="absolute inset-x-0 bottom-0 bg-linear-to-t from-black/90 via-black/40 to-transparent px-2 pb-2 pt-10">
                                  <div className="inline-flex items-center gap-1 text-[13px] font-semibold text-white">
                                    <IoPlayOutline className="text-sm" aria-hidden />
                                    {formatCompactCount(v.viewCount ?? 0)}
                                  </div>
                                  {(v.likeCount ?? 0) > 0 ? (
                                    <div className="mt-0.5 inline-flex items-center gap-1 text-[12px] font-semibold text-white/90">
                                      <IoHeart className="text-xs text-white" aria-hidden />
                                      {formatCompactCount(v.likeCount)}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              <p className="mt-2 line-clamp-2 text-[13px] leading-snug text-zinc-100">
                                {resolveVideoSearchCaption(v)}
                              </p>
                              <div className="mt-1.5 flex items-center gap-1.5">
                                <img
                                  src={authorAvatar}
                                  alt=""
                                  className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-zinc-700"
                                  referrerPolicy="no-referrer"
                                  onError={(e) => {
                                    e.currentTarget.src = DEFAULT_AVATAR_URL
                                  }}
                                />
                                <span className="truncate text-[12px] text-zinc-400">
                                  @{v.authorUsername ?? 'user'}
                                </span>
                              </div>
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  )}
                </section>
              ) : null}
            </>
          )}
        </main>
      </div>
    </section>
  )
}

export default SearchResultsPage
