import React from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import {
  watchTimeNearPlaythroughEnd,
  watchTimeQualifiesForViewRecord,
} from '../utils/watchQualifiesForViewRecord'
import { TooltipHoverWrap } from '../components/TooltipControls'
import { AccountActionsPill } from '../components/AccountActionsPill'
import { VideoShareModal } from '../components/VideoShareModal'
import { feedPrefetchManager } from '../feed/FeedPrefetchManager.js'
import { resolveFeedPlaybackUrl, isHlsPlaybackUrl } from '../feed/feedPlayback.js'
import { useAuth } from '../state/useAuth'
import { useRapidStepNavigation } from '../hooks/useRapidStepNavigation.js'
import {
  buildProfileVideoUrl,
  isVideoPublicId,
  normalizeVideoPublicId,
  videoPublicIdOf,
} from '../utils/videoPublicId.js'
import {
  IoArrowUp,
  IoBookmark,
  IoBookmarkOutline,
  IoChatbubbleEllipsesOutline,
  IoChevronDown,
  IoChevronUp,
  IoClose,
  IoEllipsisHorizontal,
  IoHappyOutline,
  IoHeart,
  IoHeartOutline,
  IoLogOutOutline,
  IoMusicalNotes,
  IoPerson,
  IoSearchOutline,
  IoShareOutline,
} from 'react-icons/io5'

const DEFAULT_USER_AVATAR_URL = '/images/users/default-avatar.jpeg'
const EXPLORE_PAGE_TITLE = 'Khám phá - Tìm video bạn thích trên Vibely'

function formatCompactCount(value) {
  const count = Number(value ?? 0)
  if (count >= 1_000_000) {
    const formatted =
      count >= 10_000_000
        ? (count / 1_000_000).toFixed(0)
        : (count / 1_000_000).toFixed(1)
    return `${formatted.replace(/\.0$/, '')}M`
  }
  if (count >= 1_000) {
    const formatted =
      count >= 10_000 ? (count / 1_000).toFixed(0) : (count / 1_000).toFixed(1)
    return `${formatted.replace(/\.0$/, '')}K`
  }
  return String(count)
}

function isJunkCaption(raw) {
  const s = String(raw ?? '').trim()
  if (!s) return true
  if (/https?:\/\//i.test(s)) return true
  if (/\.(mp4|webm|mov)(\?|$)/i.test(s)) return true
  if (
    /snaptik|snaplik|ssstik|tikmate|savetik|tiktokcdn|instagram|fbcdn|facebook\.com\//i.test(
      s,
    )
  )
    return true
  if (/^[a-z0-9][a-z0-9.-]*\.[a-z]{2,}[_-]\d{8,}$/i.test(s)) return true
  return false
}

function watchPageCaption(v) {
  const title = String(v?.title ?? '').trim()
  const desc = String(v?.description ?? '').trim()
  const pick = !isJunkCaption(title) ? title : !isJunkCaption(desc) ? desc : ''
  if (!pick) return ''
  if (pick.length > 220) return `${pick.slice(0, 217)}…`
  return pick
}

function renderInteractiveText(text) {
  const source = String(text ?? '')
  if (!source) return null
  const parts = source.split(/([#@][^\s#@]+)/g)
  return parts.map((part, idx) => {
    if (!part) return null
    if (/^#[^\s#@]+$/.test(part)) {
      const tag = part.slice(1)
      return (
        <Link
          key={`${part}-${idx}`}
          to={tag ? `/tag/${encodeURIComponent(tag)}` : '/foryou'}
          className="font-semibold text-sky-300 transition hover:text-sky-200 hover:underline"
        >
          {part}
        </Link>
      )
    }
    if (/^@[^\s#@]+$/.test(part)) {
      const user = part.slice(1)
      return (
        <Link
          key={`${part}-${idx}`}
          to={`/@${encodeURIComponent(user)}`}
          className="font-semibold text-sky-300 transition hover:text-sky-200 hover:underline"
        >
          {part}
        </Link>
      )
    }
    return <React.Fragment key={`${part}-${idx}`}>{part}</React.Fragment>
  })
}

function normalizeUsernameKey(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
}

function isWatchableVideo(video) {
  return isVideoPublicId(videoPublicIdOf(video))
}

function formatRelativeTime(iso) {
  if (!iso) return ''
  const t = new Date(iso).getTime()
  if (!Number.isFinite(t)) return ''
  const diff = Date.now() - t
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'Vừa xong'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min} phút trước`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h} giờ trước`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d} ngày trước`
  return new Date(t).toLocaleDateString('vi-VN')
}

const ACTION_ROW =
  'flex items-center gap-1.5 rounded-md px-0.5 py-1 text-zinc-100 transition hover:bg-zinc-900/80'

const WATCH_CHROME_BTN =
  'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-600/45 text-xl text-zinc-100 transition hover:bg-zinc-600/75'

function WatchSpinner() {
  return (
    <svg
      className="h-10 w-10 animate-spin text-rose-500"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M12 2a10 10 0 0 1 10 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  )
}

function resolveWatchOrientation(video, intrinsic) {
  const w = Number(video?.sourceWidthPx)
  const h = Number(video?.sourceHeightPx)
  if (Number.isFinite(w) && Number.isFinite(h) && w > 0 && h > 0) {
    return w >= h ? 'landscape' : 'portrait'
  }
  if (intrinsic?.width > 0 && intrinsic?.height > 0) {
    return intrinsic.width >= intrinsic.height ? 'landscape' : 'portrait'
  }
  return 'portrait'
}

function watchMediaPlacementClass(orientation) {
  if (orientation === 'landscape') {
    return 'inset-x-0 top-1/2 max-h-full w-full -translate-y-1/2'
  }
  return 'inset-y-0 left-1/2 h-full w-auto max-w-full -translate-x-1/2'
}

function watchVideoClass(orientation) {
  const placement = watchMediaPlacementClass(orientation)
  const fit = orientation === 'landscape' ? 'object-contain' : 'object-cover'
  return `${placement} z-[2] ${fit}`
}

function resolveWatchPlaybackUrl(video) {
  const progressive = String(video?.videoUrl ?? '').trim()
  const preferred = resolveFeedPlaybackUrl(video)
  if (preferred && isHlsPlaybackUrl(preferred)) {
    return progressive || preferred
  }
  return preferred || progressive || ''
}

function mergeExploreItems(existing, incoming) {
  const map = new Map()
  ;[...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])].forEach(
    (row) => {
      const key = normalizeVideoPublicId(row?.publicId)
      if (key) map.set(key, row)
    },
  )
  return Array.from(map.values())
}

export function VideoWatchPage() {
  const { username: usernameParam, publicId: publicIdParam } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { token, user, logout } = useAuth()
  const videoRef = useRef(null)
  /** Một lần / clip: qualify (~2s) và một lần gần xem hết (Studio % xem hết). */
  const watchQualifySentRef = useRef(false)
  const watchPlaythroughSentRef = useRef(false)
  const commentInputRef = useRef(null)

  const [video, setVideo] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [videoReady, setVideoReady] = useState(false)
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [commentPostError, setCommentPostError] = useState('')
  const [shareCopied, setShareCopied] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [intrinsicSize, setIntrinsicSize] = useState(null)
  const [exploreQueue, setExploreQueue] = useState([])
  const [exploreCursor, setExploreCursor] = useState(null)
  const [exploreHasNext, setExploreHasNext] = useState(false)
  const [exploreLoadingMore, setExploreLoadingMore] = useState(false)
  const accountMenuRef = useRef(null)
  const exploreInitRef = useRef(false)
  const videoDetailCacheRef = useRef(new Map())
  const displayPosterRef = useRef('')
  const exploreQueueRef = useRef(exploreQueue)
  exploreQueueRef.current = exploreQueue
  const exploreNavLockRef = useRef(false)
  const exploreNavGenRef = useRef(0)
  const detailPrefetchGenRef = useRef(0)
  const videoLoadGenRef = useRef(0)
  const moveToExploreVideoByOffsetRef = useRef(null)
  const currentExploreIndexRef = useRef(-1)
  const [exploreNavBusy, setExploreNavBusy] = useState(false)

  const routeSlug = useMemo(() => normalizeUsernameKey(usernameParam), [usernameParam])
  const publicIdFromRoute = useMemo(
    () => normalizeVideoPublicId(publicIdParam),
    [publicIdParam],
  )

  const profileBackPath = useMemo(() => {
    const slug = routeSlug
    return slug ? `/@${encodeURIComponent(slug)}` : '/foryou'
  }, [routeSlug])

  const isFromExplore = useMemo(
    () =>
      location.pathname.startsWith('/explore/view/') ||
      Boolean(location.state?.fromExplore),
    [location.pathname, location.state],
  )

  const resolvedVideo = useMemo(() => {
    const routeId = publicIdFromRoute
    if (!routeId) return null
    if (video && normalizeVideoPublicId(video.publicId) === routeId) return video
    const cached = videoDetailCacheRef.current.get(routeId)
    if (cached) return cached
    if (isFromExplore) {
      return (
        exploreQueue.find((row) => normalizeVideoPublicId(row?.publicId) === routeId) ?? null
      )
    }
    return null
  }, [exploreQueue, isFromExplore, publicIdFromRoute, video])

  const activeVideo = resolvedVideo ?? video
  const activePosterUrl = activeVideo?.thumbnailUrl?.trim() || ''
  const activePlaybackUrl = resolveWatchPlaybackUrl(activeVideo)

  if (
    activePosterUrl &&
    normalizeVideoPublicId(activeVideo?.publicId) === publicIdFromRoute
  ) {
    displayPosterRef.current = activePosterUrl
  }
  const displayPosterUrl = activePosterUrl || displayPosterRef.current

  useLayoutEffect(() => {
    exploreNavGenRef.current += 1
    setVideoReady(false)
    setIntrinsicSize(null)
    setExploreNavBusy(false)
    exploreNavLockRef.current = false
    const el = videoRef.current
    if (el) {
      el.pause()
      try {
        el.removeAttribute('src')
        el.load()
      } catch {
        /* noop */
      }
    }
  }, [publicIdFromRoute])

  const isVideoFrameReady =
    videoReady && normalizeVideoPublicId(activeVideo?.publicId) === publicIdFromRoute

  const watchOrientation = useMemo(
    () => resolveWatchOrientation(activeVideo, intrinsicSize),
    [activeVideo, intrinsicSize],
  )

  const watchVideoSizing = watchVideoClass(watchOrientation)
  const watchPosterSizing = `${watchMediaPlacementClass(watchOrientation)} z-[1] ${
    watchOrientation === 'landscape' ? 'object-contain' : 'object-cover'
  }`

  const backPath = isFromExplore ? '/explore' : profileBackPath
  const exploreContext = isFromExplore ? location.state?.exploreContext : null

  const loadExploreChunk = useCallback(
    async (nextCursor) => {
      const slug =
        String(exploreContext?.slug ?? '').trim() && exploreContext?.slug !== 'all'
          ? exploreContext.slug
          : 'all'
      return slug === 'all'
        ? apiClient.getExploreTrending({ cursor: nextCursor, size: 12 })
        : apiClient.getExploreCategory(slug, { cursor: nextCursor, size: 12 })
    },
    [exploreContext?.slug],
  )

  const buildExploreNavContext = useCallback(
    (queueOverride) => ({
      slug: exploreContext?.slug ?? 'all',
      seedItems: (queueOverride ?? exploreQueue).slice(0, 48),
      nextCursor: exploreCursor,
      hasNext: exploreHasNext,
    }),
    [exploreContext?.slug, exploreCursor, exploreHasNext, exploreQueue],
  )

  const appendExploreChunk = useCallback(async () => {
    if (!exploreHasNext || exploreLoadingMore) return null
    setExploreLoadingMore(true)
    try {
      const res = await loadExploreChunk(exploreCursor)
      const rows = Array.isArray(res?.items) ? res.items : []
      let merged = exploreQueue
      setExploreQueue((prev) => {
        merged = mergeExploreItems(prev, rows)
        return merged
      })
      setExploreCursor(res?.nextCursor ?? null)
      setExploreHasNext(Boolean(res?.hasNext))
      return merged
    } finally {
      setExploreLoadingMore(false)
    }
  }, [exploreCursor, exploreHasNext, exploreLoadingMore, exploreQueue, loadExploreChunk])

  const handleWatchSearch = (e) => {
    e.preventDefault()
    const q = searchQuery.trim()
    if (!q) return
    const tag = q.replace(/^#+/, '').trim()
    if (tag) {
      navigate(`/tag/${encodeURIComponent(tag)}`)
      return
    }
    navigate('/explore')
  }

  const authorProfilePath = useMemo(() => {
    const a = activeVideo?.authorUsername
    const slug = normalizeUsernameKey(a)
    return slug ? `/@${encodeURIComponent(slug)}` : profileBackPath
  }, [activeVideo?.authorUsername, profileBackPath])

  useEffect(() => {
    if (!isFromExplore || exploreInitRef.current) return
    exploreInitRef.current = true
    const seedItems = Array.isArray(exploreContext?.seedItems) ? exploreContext.seedItems : []
    const mergedSeed = mergeExploreItems(seedItems, video ? [video] : [])
    setExploreQueue(mergedSeed)
    setExploreCursor(exploreContext?.nextCursor ?? null)
    setExploreHasNext(Boolean(exploreContext?.hasNext))
  }, [exploreContext, isFromExplore, video])

  useEffect(() => {
    if (!isFromExplore || !video?.publicId) return
    setExploreQueue((prev) => mergeExploreItems(prev, [video]))
  }, [isFromExplore, video])

  useEffect(() => {
    if (!isFromExplore || exploreQueue.length > 0 || exploreLoadingMore) return
    let cancelled = false
    setExploreLoadingMore(true)
    loadExploreChunk(null)
      .then((res) => {
        if (cancelled) return
        const rows = Array.isArray(res?.items) ? res.items : []
        setExploreQueue((prev) => mergeExploreItems(prev, rows))
        setExploreCursor(res?.nextCursor ?? null)
        setExploreHasNext(Boolean(res?.hasNext))
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setExploreLoadingMore(false)
      })
    return () => {
      cancelled = true
    }
  }, [exploreLoadingMore, exploreQueue.length, isFromExplore, loadExploreChunk])

  useEffect(() => {
    if (!publicIdFromRoute) {
      setLoading(false)
      setLoadError('Liên kết video không hợp lệ.')
      setVideo(null)
      return
    }
    let cancelled = false
    const loadGen = ++videoLoadGenRef.current
    const cached = videoDetailCacheRef.current.get(publicIdFromRoute)
    const cardFromQueue = isFromExplore
      ? exploreQueueRef.current.find(
          (row) => normalizeVideoPublicId(row?.publicId) === publicIdFromRoute,
        )
      : null
    const optimistic = cached ?? cardFromQueue

    if (optimistic) {
      setVideo(optimistic)
      setLoadError('')
      setLoading(false)
    } else {
      setLoading(true)
      setLoadError('')
    }

    apiClient
      .getVideo(publicIdFromRoute, { token })
      .then((v) => {
        if (cancelled || loadGen !== videoLoadGenRef.current) return
        videoDetailCacheRef.current.set(publicIdFromRoute, v)
        setVideo(v)
        const authorKey = normalizeUsernameKey(v?.authorUsername)
        const canonical = buildProfileVideoUrl(authorKey, videoPublicIdOf(v))
        if (canonical && routeSlug && authorKey !== routeSlug) {
          navigate(canonical, {
            replace: true,
            state: location.state,
          })
        }
      })
      .catch((e) => {
        if (cancelled || loadGen !== videoLoadGenRef.current) return
        if (!optimistic) {
          setVideo(null)
          setLoadError(e instanceof Error ? e.message : 'Không tải được video.')
        }
      })
      .finally(() => {
        if (!cancelled && loadGen === videoLoadGenRef.current) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [isFromExplore, location.state, publicIdFromRoute, token, navigate, routeSlug])

  useEffect(() => {
    watchQualifySentRef.current = false
    watchPlaythroughSentRef.current = false
    const el = videoRef.current
    const routeId = publicIdFromRoute
    if (!el || !routeId) return undefined
    const key = routeId
    const onPlaybackSample = () => {
      const watchedMs = Math.floor(el.currentTime * 1000)
      const d = el.duration
      const durationMs =
        Number.isFinite(d) && d > 0 ? Math.floor(d * 1000) : null

      if (
        durationMs != null &&
        !watchPlaythroughSentRef.current &&
        watchTimeNearPlaythroughEnd(watchedMs, durationMs)
      ) {
        watchPlaythroughSentRef.current = true
        apiClient
          .recordVideoView(key, {
            watchedMs,
            durationMs,
          }, { token })
          .catch(() => {})
        return
      }

      if (watchQualifySentRef.current) return
      if (!watchTimeQualifiesForViewRecord(watchedMs, durationMs)) return
      watchQualifySentRef.current = true
      apiClient
        .recordVideoView(key, {
          watchedMs,
          ...(durationMs != null ? { durationMs } : {}),
        }, { token })
        .catch(() => {})
    }
    el.addEventListener('timeupdate', onPlaybackSample)
    el.addEventListener('seeked', onPlaybackSample)
    el.addEventListener('ended', onPlaybackSample)
    return () => {
      el.removeEventListener('timeupdate', onPlaybackSample)
      el.removeEventListener('seeked', onPlaybackSample)
      el.removeEventListener('ended', onPlaybackSample)
    }
  }, [publicIdFromRoute])

  useEffect(() => {
    const routeId = publicIdFromRoute
    if (!token || !routeId) return
    let cancelled = false
    apiClient
      .getVideoMeState(routeId, token)
      .then((s) => {
        if (cancelled || !s) return
        setLiked(Boolean(s.liked))
        setBookmarked(Boolean(s.bookmarked))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [publicIdFromRoute, token])

  useEffect(() => {
    const routeId = publicIdFromRoute
    if (!routeId) return
    let cancelled = false
    setCommentsLoading(true)
    setCommentsError('')
    apiClient
      .getComments(routeId, { token })
      .then((list) => {
        if (!cancelled) setComments(Array.isArray(list) ? list : [])
      })
      .catch((e) => {
        if (!cancelled) {
          setCommentsError(e instanceof Error ? e.message : 'Không tải bình luận.')
          setComments([])
        }
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [publicIdFromRoute, token])

  useEffect(() => {
    if (isFromExplore) {
      document.title = EXPLORE_PAGE_TITLE
      return
    }
    const display =
      String(video?.authorDisplayName ?? '').trim() || 'Người dùng Vibely'
    const id =
      normalizeUsernameKey(video?.authorUsername) || routeSlug || 'user'
    document.title = `${display} (@${id}) | Vibely`
  }, [isFromExplore, video?.authorDisplayName, video?.authorUsername, routeSlug])

  useEffect(() => {
    if (!showAccountMenu) return undefined
    const onDown = (e) => {
      const el = accountMenuRef.current
      if (el && e.target instanceof Node && !el.contains(e.target)) setShowAccountMenu(false)
    }
    document.addEventListener('pointerdown', onDown, true)
    return () => document.removeEventListener('pointerdown', onDown, true)
  }, [showAccountMenu])

  const patchVideo = useCallback((patch) => {
    setVideo((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const caption = watchPageCaption(activeVideo ?? {})
  const panelVideo = activeVideo ?? video
  const currentExploreIndex = useMemo(() => {
    const currentId = publicIdFromRoute
    if (!currentId) return -1
    return exploreQueue.findIndex((row) => normalizeVideoPublicId(row?.publicId) === currentId)
  }, [exploreQueue, publicIdFromRoute])
  currentExploreIndexRef.current = currentExploreIndex

  const hasPrevExplore = isFromExplore && currentExploreIndex > 0
  const hasNextExplore = isFromExplore && (
    currentExploreIndex >= 0
      ? currentExploreIndex < exploreQueue.length - 1 || exploreHasNext
      : exploreHasNext
  )

  useEffect(() => {
    if (!isFromExplore || currentExploreIndex < 0) return undefined
    const gen = ++detailPrefetchGenRef.current
    const timer = window.setTimeout(() => {
      if (gen !== detailPrefetchGenRef.current) return
      feedPrefetchManager.prefetchAround(exploreQueue, currentExploreIndex, resolveFeedPlaybackUrl)
      for (const offset of [-1, 1]) {
        const row = exploreQueue[currentExploreIndex + offset]
        const poster = row?.thumbnailUrl?.trim()
        if (poster) feedPrefetchManager.prefetchPoster(poster)
        const id = normalizeVideoPublicId(row?.publicId)
        if (!id || videoDetailCacheRef.current.has(id)) continue
        apiClient
          .getVideo(id, { token })
          .then((detail) => {
            if (gen !== detailPrefetchGenRef.current) return
            videoDetailCacheRef.current.set(id, detail)
          })
          .catch(() => {})
      }
    }, 280)
    return () => {
      window.clearTimeout(timer)
      feedPrefetchManager.cancelPending()
    }
  }, [currentExploreIndex, exploreQueue, isFromExplore, token])

  useEffect(() => {
    if (!isFromExplore || currentExploreIndex < 0 || !exploreHasNext || exploreLoadingMore) {
      return
    }
    if (exploreQueue.length - currentExploreIndex <= 3) {
      void appendExploreChunk()
    }
  }, [
    appendExploreChunk,
    currentExploreIndex,
    exploreHasNext,
    exploreLoadingMore,
    exploreQueue.length,
    isFromExplore,
  ])

  const moveToExploreVideoByOffset = useCallback(
    async (offsetSteps) => {
      if (!isFromExplore || !offsetSteps || exploreNavLockRef.current) return

      let targetIndex = currentExploreIndexRef.current + offsetSteps
      if (targetIndex < 0) return

      const navGen = ++exploreNavGenRef.current
      exploreNavLockRef.current = true
      setExploreNavBusy(true)
      let navigated = false
      try {
        let queue = exploreQueueRef.current
        if (targetIndex >= queue.length && exploreHasNext && !exploreLoadingMore) {
          const merged = await appendExploreChunk()
          if (navGen !== exploreNavGenRef.current) return
          if (merged) queue = merged
          targetIndex = currentExploreIndexRef.current + offsetSteps
          if (targetIndex >= queue.length) return
        }

        const nextVideo = queue[targetIndex]
        if (!nextVideo?.publicId) return
        if (navGen !== exploreNavGenRef.current) return
        const nextPath =
          buildProfileVideoUrl(nextVideo?.authorUsername, nextVideo?.publicId) ??
          `/explore/view/${encodeURIComponent(String(nextVideo.publicId))}`
        navigate(nextPath, {
          replace: true,
          state: {
            fromExplore: true,
            exploreContext: buildExploreNavContext(queue),
          },
        })
        navigated = true
      } finally {
        if (!navigated) {
          exploreNavLockRef.current = false
          setExploreNavBusy(false)
        }
      }
    },
    [
      appendExploreChunk,
      buildExploreNavContext,
      exploreHasNext,
      exploreLoadingMore,
      isFromExplore,
      navigate,
    ],
  )
  moveToExploreVideoByOffsetRef.current = moveToExploreVideoByOffset

  const { requestStep: requestExploreNavStep, reset: resetExploreNavPending } =
    useRapidStepNavigation({
      onStep: (steps) => {
        void moveToExploreVideoByOffsetRef.current?.(steps)
      },
      delayMs: 220,
      maxBurst: 3,
      cooldownMs: 320,
    })

  useLayoutEffect(() => {
    resetExploreNavPending()
  }, [publicIdFromRoute, resetExploreNavPending])

  const moveToExploreVideo = useCallback(
    (direction) => {
      requestExploreNavStep(direction === 'prev' ? -1 : 1)
    },
    [requestExploreNavStep],
  )

  useEffect(() => {
    if (!isFromExplore) return undefined
    const onKeyDown = (e) => {
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveToExploreVideo('prev')
      } else if (e.key === 'ArrowDown') {
        e.preventDefault()
        moveToExploreVideo('next')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isFromExplore, moveToExploreVideo])

  const copyShareLink = async () => {
    const url = typeof window !== 'undefined' ? window.location.href : ''
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      setShareCopied(false)
    }
  }

  const handleShareTap = () => {
    if (!isWatchableVideo(panelVideo)) return
    setShareModalOpen(true)
  }

  const handleShareCountChange = useCallback(
    (shareCount) => {
      if (shareCount != null) {
        patchVideo({ shareCount })
        return
      }
      patchVideo({ shareCount: Number(video?.shareCount ?? 0) + 1 })
    },
    [patchVideo, video?.shareCount],
  )

  const focusCommentField = () => {
    const el = commentInputRef.current
    if (!el) return
    el.focus()
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const showVideoSpinner =
    loading && !activePlaybackUrl && !displayPosterUrl && !loadError

  return (
    <section className="flex h-dvh min-h-0 bg-black text-zinc-100">
      <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        {token ? (
          <AccountActionsPill className="absolute right-6 top-4 z-20" tone="profile" showCoinAndApp={false}>
            <div className="relative" ref={accountMenuRef}>
              <TooltipHoverWrap tip="Tài khoản" tipHidden={showAccountMenu} hoverOnly>
                <button
                  type="button"
                  className="flex cursor-pointer rounded-full p-0.5 ring-1 ring-zinc-700 transition hover:ring-zinc-500"
                  aria-label="Menu tài khoản"
                  aria-expanded={showAccountMenu}
                  aria-haspopup="menu"
                  onClick={() => setShowAccountMenu((p) => !p)}
                >
                  <img
                    className="h-7 w-7 rounded-full object-cover"
                    src={
                      user?.avatarUrl && user.avatarUrl.trim()
                        ? user.avatarUrl
                        : DEFAULT_USER_AVATAR_URL
                    }
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_USER_AVATAR_URL
                    }}
                  />
                </button>
              </TooltipHoverWrap>
              {showAccountMenu ? (
                <div
                  className="absolute right-0 mt-2 w-44 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 py-1 shadow-2xl"
                  role="menu"
                >
                  <Link
                    to="/profile"
                    className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
                    role="menuitem"
                    onClick={() => setShowAccountMenu(false)}
                  >
                    <IoPerson className="text-base" />
                    Xem hồ sơ
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-700"
                    role="menuitem"
                    onClick={() => {
                      setShowAccountMenu(false)
                      logout?.()
                    }}
                  >
                    <IoLogOutOutline className="text-base" />
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          </AccountActionsPill>
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row lg:items-stretch">
          <div className="relative min-h-0 flex-1 overflow-hidden bg-black">
            <div className="absolute inset-0">
              {loadError ? (
                <div className="flex h-full items-center justify-center px-6">
                  <div className="max-w-sm text-center">
                    <p className="text-sm text-red-400">{loadError}</p>
                    <Link
                      to={backPath}
                      className="mt-4 inline-block rounded-full border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-900"
                    >
                      Quay lại
                    </Link>
                  </div>
                </div>
              ) : activePlaybackUrl || displayPosterUrl ? (
                <div className="relative h-full min-h-0 overflow-hidden">
                  {displayPosterUrl ? (
                    <div
                      className="pointer-events-none absolute inset-0 scale-110 bg-cover bg-center opacity-40 blur-3xl"
                      style={{ backgroundImage: `url(${displayPosterUrl})` }}
                      aria-hidden
                    />
                  ) : null}
                  {!isVideoFrameReady && displayPosterUrl ? (
                    <img
                      src={displayPosterUrl}
                      alt=""
                      className={`absolute bg-black ${watchPosterSizing}`}
                    />
                  ) : null}
                  {activePlaybackUrl ? (
                    <video
                      key={String(activeVideo?.publicId ?? publicIdFromRoute)}
                      ref={videoRef}
                      src={activePlaybackUrl}
                      className={`watch-video-el absolute bg-black transition-opacity duration-200 ${watchVideoSizing} ${isVideoFrameReady ? 'opacity-100' : 'opacity-0'}`}
                      controls={isVideoFrameReady}
                      controlsList="nofullscreen nodownload noremoteplayback noplaybackrate"
                      disablePictureInPicture
                      disableRemotePlayback
                      playsInline
                      muted
                      autoPlay
                      preload="auto"
                      poster={displayPosterUrl || undefined}
                      onDoubleClick={(e) => e.preventDefault()}
                      onLoadedData={() => setVideoReady(true)}
                      onCanPlay={() => setVideoReady(true)}
                      onPlaying={() => setVideoReady(true)}
                      onLoadedMetadata={(e) => {
                        const el = e.currentTarget
                        if (el.videoWidth > 0 && el.videoHeight > 0) {
                          setIntrinsicSize({
                            width: el.videoWidth,
                            height: el.videoHeight,
                          })
                        }
                      }}
                    />
                  ) : null}
                </div>
              ) : !loading ? (
                <div className="flex h-full items-center justify-center">
                  <p className="text-sm text-zinc-500">Video chưa sẵn sàng phát.</p>
                </div>
              ) : null}

              {showVideoSpinner ? (
                <div
                  className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center"
                  aria-busy="true"
                  aria-label={loading ? 'Đang tải video' : 'Đang tải dữ liệu phát'}
                >
                  <WatchSpinner />
                </div>
              ) : null}
            </div>

            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-16 items-center bg-gradient-to-b from-black/70 via-black/30 to-transparent px-6 sm:h-[4.5rem] sm:px-10">
              <div className="pointer-events-auto flex w-11 shrink-0 justify-start sm:w-12">
                <TooltipHoverWrap tip="Đóng" hoverOnly>
                  <button
                    type="button"
                    className={WATCH_CHROME_BTN}
                    aria-label="Đóng"
                    onClick={() => navigate(backPath)}
                  >
                    <IoClose />
                  </button>
                </TooltipHoverWrap>
              </div>

              <div className="pointer-events-auto flex min-w-0 flex-1 justify-center px-2 sm:px-4">
                <form
                  onSubmit={handleWatchSearch}
                  className="flex h-11 w-full max-w-[360px] items-center rounded-full border border-white/10 bg-zinc-900/55 px-4 shadow-lg backdrop-blur-md"
                >
                  <input
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tìm nội dung liên quan"
                    className="min-w-0 flex-1 bg-transparent text-[15px] text-zinc-100 placeholder:text-zinc-400 focus:outline-none"
                    aria-label="Tìm nội dung liên quan"
                  />
                  <span className="mx-3 h-5 w-px shrink-0 bg-zinc-500/80" aria-hidden />
                  <button
                    type="submit"
                    className="flex shrink-0 cursor-pointer items-center justify-center rounded-full p-1 text-xl text-zinc-300 transition hover:text-zinc-100"
                    aria-label="Tìm kiếm"
                  >
                    <IoSearchOutline />
                  </button>
                </form>
              </div>

              <div className="pointer-events-auto flex w-11 shrink-0 justify-end sm:w-12">
                <TooltipHoverWrap tip="Thêm" hoverOnly>
                  <button
                    type="button"
                    className={`${WATCH_CHROME_BTN} ${token ? 'invisible' : ''}`}
                    aria-label="Thêm"
                  >
                    <IoEllipsisHorizontal />
                  </button>
                </TooltipHoverWrap>
              </div>
            </div>

            {isFromExplore ? (
              <div className="pointer-events-none absolute right-3 top-1/2 z-30 flex -translate-y-1/2 flex-col gap-2 sm:right-4">
                <button
                  type="button"
                  className={`${WATCH_CHROME_BTN} pointer-events-auto ${hasPrevExplore && !exploreNavBusy ? '' : 'cursor-not-allowed opacity-45'}`}
                  aria-label="Video trước"
                  disabled={!hasPrevExplore || exploreNavBusy}
                  onClick={() => moveToExploreVideo('prev')}
                >
                  <IoChevronUp />
                </button>
                <button
                  type="button"
                  className={`${WATCH_CHROME_BTN} pointer-events-auto ${hasNextExplore && !exploreNavBusy ? '' : 'cursor-not-allowed opacity-45'}`}
                  aria-label="Video sau"
                  disabled={!hasNextExplore || exploreNavBusy}
                  onClick={() => moveToExploreVideo('next')}
                >
                  <IoChevronDown />
                </button>
              </div>
            ) : null}
          </div>

          <aside className="flex h-[min(46dvh,480px)] w-full shrink-0 flex-col border-t border-zinc-800 bg-black lg:h-auto lg:max-h-none lg:min-h-0 lg:w-[min(400px,34vw)] lg:border-l lg:border-t-0">
            {!activeVideo ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <p className="text-sm text-zinc-500">…</p>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-start gap-3 border-b border-zinc-800 p-4 pr-12">
                  <Link to={authorProfilePath} className="shrink-0">
                    <img
                      src={
                        panelVideo.authorAvatarUrl?.trim()
                          ? panelVideo.authorAvatarUrl
                          : DEFAULT_USER_AVATAR_URL
                      }
                      alt=""
                      className="h-12 w-12 rounded-full object-cover ring-1 ring-zinc-700"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_USER_AVATAR_URL
                      }}
                    />
                  </Link>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <Link
                        to={authorProfilePath}
                        className="truncate text-sm font-semibold text-zinc-100 hover:underline"
                      >
                        {String(panelVideo.authorDisplayName ?? '').trim() || 'Nhà sáng tạo'}
                      </Link>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {formatRelativeTime(panelVideo.createdAt)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-zinc-400">
                      @{normalizeUsernameKey(panelVideo.authorUsername) || 'user'}
                    </p>
                    {caption ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-snug text-zinc-200">
                        {renderInteractiveText(caption)}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
                      <IoMusicalNotes className="shrink-0 text-base text-zinc-500" aria-hidden />
                      <span className="truncate">
                        {panelVideo.audioTitle?.trim()
                          ? panelVideo.audioTitle
                          : `Âm thanh gốc — ${String(panelVideo.authorDisplayName ?? '').trim() || 'Nhà sáng tạo'}`}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="absolute right-4 top-4 rounded-full p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-200"
                    aria-label="Thêm"
                  >
                    <IoEllipsisHorizontal />
                  </button>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-1 border-b border-zinc-800 px-4 py-3">
                  <button
                    type="button"
                    className={ACTION_ROW}
                    aria-pressed={liked}
                    aria-label={liked ? 'Bỏ thích' : 'Thích'}
                    onClick={() => {
                      if (!token || !isWatchableVideo(panelVideo)) {
                        if (!token) navigate('/login')
                        return
                      }
                      const next = !liked
                      const prevCount = Number(panelVideo.likeCount ?? 0)
                      setLiked(next)
                      patchVideo({ likeCount: Math.max(0, prevCount + (next ? 1 : -1)) })
                      const req = next
                        ? apiClient.likeVideo(panelVideo.publicId, token)
                        : apiClient.unlikeVideo(panelVideo.publicId, token)
                      req.catch(() => {
                        setLiked(!next)
                        patchVideo({ likeCount: prevCount })
                      })
                    }}
                  >
                    {liked ? (
                      <IoHeart className="text-2xl text-[#FE2C55]" aria-hidden />
                    ) : (
                      <IoHeartOutline className="text-2xl text-white" aria-hidden />
                    )}
                    <span className="text-sm font-semibold tabular-nums text-white">
                      {formatCompactCount(panelVideo.likeCount ?? 0)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={ACTION_ROW}
                    aria-label="Bình luận"
                    onClick={focusCommentField}
                  >
                    <IoChatbubbleEllipsesOutline className="text-2xl text-white" aria-hidden />
                    <span className="text-sm font-semibold tabular-nums text-white">
                      {formatCompactCount(panelVideo.commentCount ?? 0)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={ACTION_ROW}
                    aria-pressed={bookmarked}
                    title={
                      bookmarked
                        ? 'Đã lưu. Xem tại Hồ sơ → Yêu thích → Bài đăng.'
                        : 'Lưu vào Yêu thích'
                    }
                    aria-label={bookmarked ? 'Bỏ lưu' : 'Lưu'}
                    onClick={() => {
                      if (!token || !isWatchableVideo(panelVideo)) {
                        if (!token) navigate('/login')
                        return
                      }
                      const next = !bookmarked
                      const prevCount = Number(panelVideo.bookmarkCount ?? 0)
                      setBookmarked(next)
                      patchVideo({ bookmarkCount: Math.max(0, prevCount + (next ? 1 : -1)) })
                      const req = next
                        ? apiClient.bookmarkVideo(panelVideo.publicId, token)
                        : apiClient.unbookmarkVideo(panelVideo.publicId, token)
                      req.catch(() => {
                        setBookmarked(!next)
                        patchVideo({ bookmarkCount: prevCount })
                      })
                    }}
                  >
                    {bookmarked ? (
                      <IoBookmark className="text-2xl text-[#FACE15]" aria-hidden />
                    ) : (
                      <IoBookmarkOutline className="text-2xl text-white" aria-hidden />
                    )}
                    <span className="text-sm font-semibold tabular-nums text-white">
                      {formatCompactCount(panelVideo.bookmarkCount ?? 0)}
                    </span>
                  </button>
                  <button
                    type="button"
                    className={ACTION_ROW}
                    aria-label="Chia sẻ"
                    onClick={() => void handleShareTap()}
                  >
                    <IoShareOutline className="text-2xl text-white" aria-hidden />
                    <span className="text-sm font-semibold tabular-nums text-white">
                      {formatCompactCount(panelVideo.shareCount ?? 0)}
                    </span>
                  </button>
                </div>

                <div className="shrink-0 border-b border-zinc-800 px-4 py-2">
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">
                      {typeof window !== 'undefined' ? window.location.href : ''}
                    </span>
                    <button
                      type="button"
                      onClick={() => void copyShareLink()}
                      className="shrink-0 rounded-md bg-zinc-800 px-2 py-1 text-xs font-semibold text-zinc-100 hover:bg-zinc-700"
                    >
                      {shareCopied ? 'Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                <div
                  role="tablist"
                  className="flex shrink-0 border-b border-zinc-800 bg-black px-2"
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected
                    className="min-w-0 flex-1 border-b-2 border-white px-2 py-3 text-left text-[15px] font-semibold text-zinc-100"
                  >
                    Bình luận{' '}
                    <span className="font-normal text-zinc-400">
                      ({formatCompactCount(panelVideo.commentCount ?? 0)})
                    </span>
                  </button>
                  <Link
                    to={authorProfilePath}
                    role="tab"
                    className="min-w-0 flex-1 border-b-2 border-transparent px-2 py-3 text-left text-[15px] font-semibold text-zinc-500 hover:text-zinc-300"
                  >
                    Video của nhà sáng tạo
                  </Link>
                </div>

                <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-3 py-3">
                  {commentsLoading ? (
                    <p className="py-6 text-center text-sm text-zinc-500">Đang tải bình luận…</p>
                  ) : commentsError ? (
                    <p className="py-6 text-center text-sm text-red-400">{commentsError}</p>
                  ) : comments.length === 0 ? (
                    <div className="flex flex-col items-center py-10 text-center text-sm text-zinc-500">
                      <p>Chưa có bình luận.</p>
                      <p className="mt-1 text-xs">Hãy mở đầu cuộc trò chuyện.</p>
                    </div>
                  ) : (
                    <ul className="space-y-3">
                      {comments.map((c) => (
                        <li key={c.id} className="flex gap-2">
                          <img
                            src={
                              c.authorAvatarUrl?.trim()
                                ? c.authorAvatarUrl
                                : DEFAULT_USER_AVATAR_URL
                            }
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-800"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.src = DEFAULT_USER_AVATAR_URL
                            }}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-zinc-300">
                              @{c.username ?? 'user'}
                            </p>
                            <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-100">
                              {renderInteractiveText(c.content)}
                            </p>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>

                <div className="shrink-0 border-t border-zinc-800 px-3 pt-2 pb-3">
                  {commentPostError ? (
                    <p className="mb-1 text-xs text-red-400">{commentPostError}</p>
                  ) : null}
                  <div className="flex items-end gap-2">
                    <img
                      className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-700"
                      src={
                        user?.avatarUrl && String(user.avatarUrl).trim()
                          ? user.avatarUrl
                          : DEFAULT_USER_AVATAR_URL
                      }
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = DEFAULT_USER_AVATAR_URL
                      }}
                    />
                    <div className="relative min-w-0 flex-1">
                      <input
                        ref={commentInputRef}
                        type="text"
                        value={commentDraft}
                        onChange={(e) => setCommentDraft(e.target.value)}
                        placeholder={
                          token ? 'Thêm bình luận...' : 'Đăng nhập để bình luận...'
                        }
                        disabled={!token || !isWatchableVideo(panelVideo)}
                        className="w-full rounded-full border border-zinc-700 bg-zinc-900 py-2.5 pl-4 pr-[5.25rem] text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600 disabled:opacity-50"
                      />
                      <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-0.5">
                        <button
                          type="button"
                          className="rounded-full px-2 py-1 text-sm font-semibold text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                          aria-label="Nhắc tên"
                        >
                          @
                        </button>
                        <button
                          type="button"
                          className="rounded-full p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                          aria-label="Biểu tượng cảm xúc"
                        >
                          <IoHappyOutline className="text-lg" aria-hidden />
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-md transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Gửi bình luận"
                      disabled={!commentDraft.trim() || !token || !isWatchableVideo(panelVideo)}
                      onClick={async () => {
                        const text = commentDraft.trim()
                        if (!text || !token || !isWatchableVideo(panelVideo)) return
                        setCommentPostError('')
                        try {
                          const created = await apiClient.addComment(panelVideo.publicId, text, token)
                          setCommentDraft('')
                          setComments((prev) => [created, ...prev])
                          const prevCc = Number(panelVideo.commentCount ?? 0)
                          patchVideo({ commentCount: prevCc + 1 })
                        } catch (e) {
                          setCommentPostError(
                            e instanceof Error ? e.message : 'Không gửi được bình luận.',
                          )
                        }
                      }}
                    >
                      <IoArrowUp className="text-xl" aria-hidden />
                    </button>
                  </div>
                </div>
              </>
            )}
          </aside>
        </div>
      </div>

      <VideoShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        videoId={panelVideo?.publicId}
        videoTitle={panelVideo?.title ?? ''}
        token={token}
        onShareCountChange={handleShareCountChange}
      />
    </section>
  )
}

