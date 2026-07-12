import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { IoChevronBack, IoChevronForward, IoHeart, IoPlay, IoPlayOutline, IoSearch } from 'react-icons/io5'
import { apiClient } from '../api/client'
import { Sidebar } from '../components/Sidebar'
import {
  isMobileFeedLayout,
  MobileFeedBottomNav,
} from '../components/feed/MobileFeedShell.jsx'
import { handleSidebarMenuSelect } from '../utils/sidebarNavigation.js'
import { buildMainSidebarMenuItems } from '../utils/mainSidebarMenuItems.js'
import { feedPrefetchManager } from '../feed/FeedPrefetchManager.js'
import { resolveFeedPlaybackUrl } from '../feed/feedPlayback.js'
import { DEFAULT_COVER, SoundGridVideoCard } from './SoundPage.jsx'
import { useAuth } from '../state/useAuth'
import { buildProfileVideoUrl } from '../utils/videoPublicId.js'
import { formatRelativeTimeVi } from '../utils/relativeTimeVi.js'

const EXPLORE_PAGE_TITLE = 'Khám phá - Tìm video bạn thích trên Vibely'
const ALL_TAB = { slug: 'all', name: 'Tất cả', kind: 'category', videoCount: 0 }

function normalizeExploreTabs(rows) {
  const filtered = rows.filter((tab) => {
    const kind = tab.kind ?? 'category'
    if (tab.slug === 'all') return true
    if (kind === 'for_you' || kind === 'topic') return true
    // Keep all enabled explore categories (including empty ones) for discovery.
    return kind === 'category'
  })
  const allTab = filtered.find((tab) => tab.slug === 'all') ?? ALL_TAB
  const rest = filtered.filter((tab) => tab.slug !== 'all')
  return [allTab, ...rest]
}

function formatCompactCount(value) {
  const count = Number(value ?? 0)
  if (count >= 1_000_000) {
    return `${(count / 1_000_000).toFixed(count >= 10_000_000 ? 0 : 1).replace(/\.0$/, '')}M`
  }
  if (count >= 1_000) {
    return `${(count / 1_000).toFixed(count >= 10_000 ? 0 : 1).replace(/\.0$/, '')}K`
  }
  return String(count)
}

function ExploreMobileVideoCard({ video, coverFallback, onOpen }) {
  const poster = String(video?.thumbnailUrl ?? '').trim() || coverFallback || DEFAULT_COVER
  const avatar =
    String(video?.authorAvatarUrl ?? video?.avatarUrl ?? '').trim() || DEFAULT_COVER
  const username = String(video?.authorUsername ?? 'user')
    .trim()
    .replace(/^@/, '')

  return (
    <button
      type="button"
      onClick={() => onOpen(video)}
      className="group w-full cursor-pointer text-left"
    >
      <div className="relative aspect-[9/16] overflow-hidden rounded-lg bg-zinc-900">
        <img
          src={poster}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover transition group-active:opacity-90"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_COVER
          }}
        />
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <IoPlay className="text-[34px] text-white/90 drop-shadow-[0_2px_8px_rgba(0,0,0,0.65)]" aria-hidden />
        </div>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/35 to-transparent px-2 pb-2 pt-8">
          <div className="flex items-end justify-between gap-2">
            <div className="inline-flex items-center gap-1 text-[12px] font-semibold text-white drop-shadow-md">
              <IoPlayOutline className="text-sm" aria-hidden />
              {formatCompactCount(video?.viewCount ?? 0)}
            </div>
            {video?.createdAt ? (
              <span className="text-[11px] font-medium text-white/90 drop-shadow-md">
                {formatRelativeTimeVi(video.createdAt)}
              </span>
            ) : null}
          </div>
        </div>
      </div>
      <div className="mt-2 flex min-w-0 items-center gap-1.5">
        <img
          src={avatar}
          alt=""
          className="h-5 w-5 shrink-0 rounded-full object-cover ring-1 ring-zinc-700"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_COVER
          }}
        />
        <span className="min-w-0 flex-1 truncate text-[12px] font-medium text-zinc-200">
          {username}
        </span>
        {(video?.likeCount ?? 0) > 0 ? (
          <span className="inline-flex shrink-0 items-center gap-0.5 text-[12px] font-semibold text-zinc-300">
            <IoHeart className="text-xs" aria-hidden />
            {formatCompactCount(video.likeCount)}
          </span>
        ) : null}
      </div>
    </button>
  )
}

export function ExplorePage() {
  const navigate = useNavigate()
  const { token, user, logout } = useAuth()
  const [tabs, setTabs] = useState([])
  const [activeTab, setActiveTab] = useState({ slug: 'all', kind: 'category' })
  const [items, setItems] = useState([])
  const [cursor, setCursor] = useState(null)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [playingId, setPlayingId] = useState(null)
  const categoryScrollRef = useRef(null)
  const allCategoryButtonRef = useRef(null)
  const loadMoreSentinelRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)
  const loadGenerationRef = useRef(0)
  const openVideoLockRef = useRef(false)
  const [mobileLayout, setMobileLayout] = useState(() => isMobileFeedLayout())

  const menuItems = useMemo(() => buildMainSidebarMenuItems(token), [token])

  useEffect(() => {
    document.title = EXPLORE_PAGE_TITLE
  }, [])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const sync = () => setMobileLayout(mq.matches)
    sync()
    mq.addEventListener('change', sync)
    return () => mq.removeEventListener('change', sync)
  }, [])

  useEffect(() => {
    apiClient.getExploreTabs({ token }).then((res) => {
      const rows = normalizeExploreTabs(Array.isArray(res) ? res : [])
      setTabs(rows)
      setActiveTab({ slug: 'all', kind: 'category' })
    }).catch(() => {
      setTabs([ALL_TAB])
      setActiveTab({ slug: 'all', kind: 'category' })
    })
  }, [token])

  const updateCategoryScrollState = React.useCallback(() => {
    const el = categoryScrollRef.current
    if (!el) return
    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth)
    setCanScrollLeft(el.scrollLeft > 4)
    setCanScrollRight(el.scrollLeft < maxLeft - 4)
  }, [])

  const scrollCategories = React.useCallback((direction) => {
    const el = categoryScrollRef.current
    if (!el) return
    const maxLeft = Math.max(0, el.scrollWidth - el.clientWidth)
    if (direction > 0 && el.scrollLeft >= maxLeft - 4) {
      el.scrollTo({ left: 0, behavior: 'smooth' })
      return
    }
    if (direction < 0 && el.scrollLeft <= 4) {
      el.scrollTo({ left: maxLeft, behavior: 'smooth' })
      return
    }
    const shift = Math.max(140, Math.floor(el.clientWidth * 0.6))
    el.scrollBy({ left: direction * shift, behavior: 'smooth' })
  }, [])

  const scrollCategoriesToStart = React.useCallback(() => {
    const el = categoryScrollRef.current
    if (!el) return
    if (typeof el.scrollTo === 'function') {
      el.scrollTo({ left: 0, behavior: 'smooth' })
    } else {
      el.scrollLeft = 0
    }
    window.setTimeout(updateCategoryScrollState, 280)
  }, [updateCategoryScrollState])

  const handleSelectTab = React.useCallback((tab, index) => {
    setActiveTab({ slug: tab.slug, kind: tab.kind ?? 'category' })
    if (index === tabs.length - 1) {
      scrollCategoriesToStart()
    }
  }, [scrollCategoriesToStart, tabs.length])

  useEffect(() => {
    updateCategoryScrollState()
    const handleResize = () => updateCategoryScrollState()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateCategoryScrollState, tabs.length])

  const load = React.useCallback((nextCursor = null, append = false) => {
    const generation = ++loadGenerationRef.current
    setLoading(true)
    let req
    if (activeTab.kind === 'for_you') {
      req = apiClient.getExploreForYou({ cursor: nextCursor, size: 24, token })
    } else if (activeTab.kind === 'topic') {
      req = apiClient.getExploreTopic(activeTab.slug, { cursor: nextCursor, size: 24 })
    } else if (activeTab.slug === 'all') {
      req = apiClient.getExploreTrending({ cursor: nextCursor, size: 24 })
    } else {
      req = apiClient.getExploreCategory(activeTab.slug, { cursor: nextCursor, size: 24 })
    }
    req
      .then((res) => {
        if (generation !== loadGenerationRef.current) return
        const rows = Array.isArray(res?.items) ? res.items : []
        setItems((prev) => (append ? [...prev, ...rows] : rows))
        setCursor(res?.nextCursor ?? null)
        setHasNext(Boolean(res?.hasNext))
      })
      .finally(() => {
        if (generation === loadGenerationRef.current) setLoading(false)
      })
  }, [activeTab, token])

  useEffect(() => {
    load(null, false)
  }, [load])

  useEffect(() => {
    if (!items.length) return undefined
    items.slice(0, 12).forEach((row) => {
      const poster = row?.thumbnailUrl?.trim()
      if (poster) feedPrefetchManager.prefetchPoster(poster)
    })
    feedPrefetchManager.prefetchAround(items, 0, resolveFeedPlaybackUrl)
    return () => feedPrefetchManager.cancelPending()
  }, [items])

  useEffect(() => {
    if (!mobileLayout || !hasNext || loading) return undefined
    const el = loadMoreSentinelRef.current
    if (!el) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) load(cursor, true)
      },
      { rootMargin: '240px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [mobileLayout, hasNext, loading, cursor, load, items.length])

  const handleSelectMenu = (id) => {
    handleSidebarMenuSelect(navigate, id, {
      token,
      profilePath: token ? '/profile' : undefined,
    })
  }

  const handleOpenVideo = React.useCallback((video) => {
    if (openVideoLockRef.current) return
    openVideoLockRef.current = true
    const unlockTimer = window.setTimeout(() => {
      openVideoLockRef.current = false
    }, 500)

    const exploreContext = {
      slug: activeTab.slug,
      kind: activeTab.kind,
      seedItems: items.slice(0, 24),
      nextCursor: cursor,
      hasNext,
    }
    const profileVideoPath = buildProfileVideoUrl(video?.authorUsername, video?.publicId)
    if (profileVideoPath) {
      navigate(profileVideoPath, { state: { fromExplore: true, exploreContext } })
      return
    }
    if (video?.publicId) {
      navigate(`/explore/view/${video.publicId}`, { state: { fromExplore: true, exploreContext } })
      return
    }
    window.clearTimeout(unlockTimer)
    openVideoLockRef.current = false
  }, [activeTab, cursor, hasNext, items, navigate])

  return (
    <section className="flex h-dvh max-h-dvh min-h-0 flex-col bg-black text-zinc-100 lg:flex-row">
      <div className="hidden shrink-0 lg:block">
        <Sidebar
          menuItems={menuItems}
          activeMenu="explore"
          onSelectMenu={handleSelectMenu}
          token={token}
          user={user}
          onLogout={token ? logout : undefined}
        />
      </div>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col">
        <div className="sticky top-0 z-30 shrink-0 border-b border-white/5 bg-black px-3 py-2.5 lg:hidden">
          <Link
            to="/search?from=explore"
            className="flex h-10 items-center gap-2.5 rounded-full bg-zinc-800/95 px-3.5 text-zinc-400 transition hover:bg-zinc-800"
          >
            <IoSearch className="shrink-0 text-lg" aria-hidden />
            <span className="truncate text-[15px]">Tìm kiếm trên Vibely</span>
          </Link>
        </div>

        <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-3 py-3 lg:px-6 lg:py-5">
          <div className="mx-auto w-full max-w-[1240px]">
            <h1 className="hidden text-3xl font-extrabold lg:block">Khám phá</h1>

            <div className="mt-0 flex items-start gap-2 lg:mt-3">
              <button
                type="button"
                onClick={() => scrollCategories(-1)}
                disabled={!canScrollLeft}
                aria-label="Cuộn danh mục sang trái"
                className="mt-0.5 hidden h-8 w-8 shrink-0 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-base font-bold text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 lg:grid"
              >
                <IoChevronBack />
              </button>
              <div
                ref={categoryScrollRef}
                onScroll={updateCategoryScrollState}
                className="scrollbar-none min-w-0 flex-1 overflow-x-auto"
              >
                <div className="flex w-max gap-2 pb-1">
                  {tabs.map((tab, index) => (
                    <button
                      key={`${tab.kind}:${tab.slug}`}
                      ref={tab.slug === 'all' ? allCategoryButtonRef : undefined}
                      type="button"
                      onClick={() => handleSelectTab(tab, index)}
                      className={`cursor-pointer whitespace-nowrap rounded-full border px-3.5 py-1.5 text-[13px] font-semibold transition lg:px-4 lg:text-sm ${
                        activeTab.slug === tab.slug && activeTab.kind === (tab.kind ?? 'category')
                          ? 'border-white bg-white font-bold text-black'
                          : 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'
                      }`}
                    >
                      {tab.name}
                    </button>
                  ))}
                </div>
              </div>
              <button
                type="button"
                onClick={() => scrollCategories(1)}
                disabled={!canScrollRight}
                aria-label="Cuộn danh mục sang phải"
                className="mt-0.5 hidden h-8 w-8 shrink-0 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-base font-bold text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40 lg:grid"
              >
                <IoChevronForward />
              </button>
            </div>

            {mobileLayout ? (
              <ul className="mt-3 grid grid-cols-2 gap-x-2 gap-y-4 sm:gap-x-3">
                {items.map((video) => (
                  <li key={String(video.publicId)}>
                    <ExploreMobileVideoCard
                      video={video}
                      coverFallback={DEFAULT_COVER}
                      onOpen={handleOpenVideo}
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <div className="mt-5 grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {items.map((video) => (
                  <div
                    key={String(video.publicId)}
                    role="button"
                    tabIndex={0}
                    onClick={() => handleOpenVideo(video)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleOpenVideo(video)
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <SoundGridVideoCard
                      video={video}
                      coverFallback={DEFAULT_COVER}
                      wideSource={false}
                      soundPageHref={null}
                      soundOwnerVibelyId=""
                      narrowWidthClass="max-w-none"
                      playing={video.publicId === playingId}
                      onHoverPreview={setPlayingId}
                    />
                  </div>
                ))}
              </div>
            )}

            {mobileLayout && hasNext ? (
              <div ref={loadMoreSentinelRef} className="py-6 text-center text-sm text-zinc-500" aria-hidden>
                {loading ? 'Đang tải…' : ''}
              </div>
            ) : null}

            {!mobileLayout && hasNext ? (
              <button
                type="button"
                disabled={loading}
                onClick={() => load(cursor, true)}
                className="mt-6 cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
              >
                {loading ? 'Đang tải...' : 'Tải thêm'}
              </button>
            ) : null}
          </div>
        </div>

        <div className="shrink-0 lg:hidden">
          <MobileFeedBottomNav
            token={token}
            user={user}
            activeId="explore"
            onSelectMenu={handleSelectMenu}
          />
        </div>
      </div>
    </section>
  )
}
