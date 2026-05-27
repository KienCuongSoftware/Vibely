import React, { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { IoChevronBack, IoChevronForward, IoCompass, IoEllipsisHorizontal, IoHome, IoNotifications, IoPaperPlane, IoPeople, IoPerson, IoVideocam } from 'react-icons/io5'
import { MdOutlineFileUpload } from 'react-icons/md'
import { apiClient } from '../api/client'
import { Sidebar } from '../components/Sidebar'
import { feedPrefetchManager } from '../feed/FeedPrefetchManager.js'
import { resolveFeedPlaybackUrl } from '../feed/feedPlayback.js'
import { DEFAULT_COVER, SoundGridVideoCard } from './SoundPage.jsx'
import { useAuth } from '../state/useAuth'
import { buildProfileVideoUrl } from '../utils/videoPublicId.js'

const EXPLORE_PAGE_TITLE = 'Khám phá - Tìm video bạn thích trên Vibely'

export function ExplorePage() {
  const navigate = useNavigate()
  const { token, user, logout } = useAuth()
  const [categories, setCategories] = useState([])
  const [activeSlug, setActiveSlug] = useState('all')
  const [items, setItems] = useState([])
  const [cursor, setCursor] = useState(null)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(false)
  const [playingId, setPlayingId] = useState(null)
  const categoryScrollRef = useRef(null)
  const allCategoryButtonRef = useRef(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(false)

  const categoriesWithAll = useMemo(() => {
    const rows = Array.isArray(categories) ? categories : []
    const withoutAll = rows.filter((row) => row?.slug !== 'all')
    const allFromApi = rows.find((row) => row?.slug === 'all')
    return [allFromApi ?? { slug: 'all', name: 'Tất cả', videoCount: 0 }, ...withoutAll]
  }, [categories])

  const menuItems = useMemo(() => [
    { id: 'latest', label: 'Đề xuất', icon: IoHome },
    { id: 'explore', label: 'Khám phá', icon: IoCompass },
    { id: 'following', label: 'Đã follow', icon: IoPeople },
    ...(token ? [{ id: 'friends', label: 'Bạn bè', icon: IoPeople }, { id: 'messages', label: 'Tin nhắn', icon: IoPaperPlane }, { id: 'activity', label: 'Hoạt động', icon: IoNotifications }] : []),
    { id: 'live', label: 'LIVE', icon: IoVideocam },
    { id: 'upload', label: 'Tải lên', icon: MdOutlineFileUpload },
    { id: 'profile', label: 'Hồ sơ', icon: IoPerson },
    { id: 'more', label: 'Thêm', icon: IoEllipsisHorizontal },
  ], [token])

  useEffect(() => {
    document.title = EXPLORE_PAGE_TITLE
  }, [])

  useEffect(() => {
    apiClient.getExploreCategories().then((res) => {
      const rows = Array.isArray(res) ? res : []
      setCategories(rows)
      setActiveSlug('all')
    }).catch(() => setCategories([{ slug: 'all', name: 'Tất cả', videoCount: 0 }]))
  }, [])

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
    const shift = Math.max(140, Math.floor(el.clientWidth * 0.6))
    el.scrollBy({ left: direction * shift, behavior: 'smooth' })
  }, [])

  useEffect(() => {
    updateCategoryScrollState()
    const handleResize = () => updateCategoryScrollState()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [updateCategoryScrollState, categoriesWithAll.length])

  useEffect(() => {
    const scroller = categoryScrollRef.current
    if (scroller) {
      if (typeof scroller.scrollTo === 'function') {
        scroller.scrollTo({ left: 0, behavior: 'smooth' })
      } else {
        scroller.scrollLeft = 0
      }
      updateCategoryScrollState()
    }
    const focusTimer = window.setTimeout(() => {
      allCategoryButtonRef.current?.focus({ preventScroll: true })
    }, 120)
    return () => window.clearTimeout(focusTimer)
  }, [updateCategoryScrollState])

  const load = React.useCallback((nextCursor = null, append = false) => {
    setLoading(true)
    const req = activeSlug === 'all'
      ? apiClient.getExploreTrending({ cursor: nextCursor, size: 24 })
      : apiClient.getExploreCategory(activeSlug, { cursor: nextCursor, size: 24 })
    req.then((res) => {
      const rows = Array.isArray(res?.items) ? res.items : []
      setItems((prev) => (append ? [...prev, ...rows] : rows))
      setCursor(res?.nextCursor ?? null)
      setHasNext(Boolean(res?.hasNext))
    }).finally(() => setLoading(false))
  }, [activeSlug])

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

  const handleSelectMenu = (id) => {
    if (id === 'profile') return navigate(token ? '/profile' : '/login')
    if (id === 'upload') return navigate('/vibelystudio/upload')
    if (id === 'explore') return navigate('/explore')
    navigate('/foryou')
  }

  const handleOpenVideo = React.useCallback((video) => {
    const exploreContext = {
      slug: activeSlug,
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
    }
  }, [activeSlug, cursor, hasNext, items, navigate])

  return (
    <section className="flex h-dvh max-h-dvh min-h-0 bg-black text-zinc-100">
      <Sidebar menuItems={menuItems} activeMenu="explore" onSelectMenu={handleSelectMenu} token={token} user={user} onLogout={token ? logout : undefined} />
      <div className="scrollbar-none min-w-0 flex-1 overflow-y-auto overscroll-y-contain px-6 py-5">
        <div className="mx-auto w-full max-w-[1240px]">
          <h1 className="text-3xl font-extrabold">Khám phá</h1>
          <div className="mt-3 flex items-start gap-2">
            <button
              type="button"
              onClick={() => scrollCategories(-1)}
              disabled={!canScrollLeft}
              aria-label="Cuộn danh mục sang trái"
              className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-base font-bold text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IoChevronBack />
            </button>
            <div
              ref={categoryScrollRef}
              onScroll={updateCategoryScrollState}
              className="scrollbar-none min-w-0 flex-1 overflow-x-auto"
            >
              <div className="flex w-max gap-2 pb-1">
                {categoriesWithAll.map((cat) => (
                  <button
                    key={cat.slug}
                    ref={cat.slug === 'all' ? allCategoryButtonRef : undefined}
                    type="button"
                    onClick={() => setActiveSlug(cat.slug)}
                    className={`cursor-pointer whitespace-nowrap rounded-full border px-4 py-1.5 text-sm font-semibold transition ${activeSlug === cat.slug ? 'border-white bg-white font-bold text-black' : 'border-zinc-800 bg-zinc-900 text-zinc-200 hover:bg-zinc-800'}`}
                  >
                    {cat.name}
                  </button>
                ))}
              </div>
            </div>
            <button
              type="button"
              onClick={() => scrollCategories(1)}
              disabled={!canScrollRight}
              aria-label="Cuộn danh mục sang phải"
              className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border border-zinc-700 bg-zinc-900 text-base font-bold text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <IoChevronForward />
            </button>
          </div>
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
          {hasNext ? (
            <button disabled={loading} onClick={() => load(cursor, true)} className="mt-6 cursor-pointer rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-900 disabled:opacity-50">
              {loading ? 'Đang tải...' : 'Tải thêm'}
            </button>
          ) : null}
        </div>
      </div>
    </section>
  )
}
