import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  IoArrowRedo,
  IoArrowUp,
  IoBookmark,
  IoHappyOutline,
  IoHeart,
  IoLogOutOutline,
  IoPerson,
} from 'react-icons/io5'
import { FaComment } from 'react-icons/fa6'
import { apiClient } from '../api/client.js'
import { AccountActionsPill } from '../components/AccountActionsPill.jsx'
import { FeedPhoneStage } from '../components/feed/FeedPhoneStage.jsx'
import { Sidebar } from '../components/Sidebar.jsx'
import { TooltipHoverWrap } from '../components/TooltipControls.jsx'
import { VideoShareModal } from '../components/VideoShareModal.jsx'
import { feedCommentsPanelWidthCss } from '../feed/feedLayout.js'
import { useAuth } from '../state/useAuth.js'
import { useActivityModal } from '../state/ActivityModalContext.jsx'
import { useNotificationUnread } from '../state/NotificationUnreadContext.jsx'
import { buildProfilePath } from '../utils/buildProfilePath.js'
import { buildMainSidebarMenuItems } from '../utils/mainSidebarMenuItems.js'
import { handleSidebarMenuSelect } from '../utils/sidebarNavigation.js'
import {
  buildActivityVideoUrl,
  isVideoPublicId,
  normalizeVideoPublicId,
  videoPublicIdOf,
} from '../utils/videoPublicId.js'

const DEFAULT_AVATAR = '/images/users/default-avatar.jpeg'
const FEED_DEFAULT_AUTHOR_AVATAR = '/images/users/default-avatar.jpeg'

const FEED_ROUND_ICON_BUTTON =
  'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full border border-zinc-600/90 bg-zinc-900/95 text-xl text-zinc-100 shadow-lg transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-35'

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

function resolveFeedAuthorDisplayName(video) {
  const name = String(video?.authorDisplayName ?? '').trim()
  if (name) return name
  const fallback = String(video?.authorUsername ?? '')
    .trim()
    .replace(/^@/, '')
  return fallback || 'Nhà sáng tạo'
}

function normalizeFeedVideo(row) {
  if (!row) return null
  const rawAvatar = row?.authorAvatarUrl ?? row?.avatarUrl
  return {
    ...row,
    avatarUrl:
      rawAvatar != null && String(rawAvatar).trim()
        ? String(rawAvatar).trim()
        : FEED_DEFAULT_AUTHOR_AVATAR,
    shareCount: Number(row.shareCount ?? 0),
    bookmarkCount: Number(row.bookmarkCount ?? 0),
  }
}

function videoPageTitle(video) {
  const desc =
    String(video?.description ?? '').trim() ||
    String(video?.title ?? '').trim()
  return desc ? `${desc} | Vibely` : 'Vibely'
}

function RelatedVideoTile({ video, onSelect }) {
  const thumb = String(video?.thumbnailUrl ?? '').trim()
  const views = formatCompactCount(video?.viewCount ?? video?.views ?? 0)
  const label =
    String(video?.description ?? '').trim() ||
    String(video?.title ?? '').trim() ||
    'Video'
  const author = String(video?.authorUsername ?? '')
    .trim()
    .replace(/^@/, '')
  return (
    <button
      type="button"
      onClick={() => onSelect(video)}
      className="group flex w-full cursor-pointer gap-2 rounded-md p-1 text-left transition hover:bg-white/5"
    >
      <div className="relative aspect-[3/4] w-[72px] shrink-0 overflow-hidden rounded-md bg-zinc-900 ring-1 ring-white/10">
        {thumb ? (
          <img
            src={thumb}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-[10px] text-zinc-600">
            Video
          </div>
        )}
        <span className="absolute bottom-0.5 left-0.5 rounded bg-black/65 px-1 py-px text-[9px] font-semibold text-white">
          {views}
        </span>
      </div>
      <div className="min-w-0 flex-1 py-0.5">
        <p className="line-clamp-2 text-xs font-medium leading-snug text-zinc-100">
          {label}
        </p>
        {author ? (
          <p className="mt-1 truncate text-[11px] text-zinc-500">@{author}</p>
        ) : null}
      </div>
    </button>
  )
}

export function ActivityVideoWatchPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const { username: routeUsername, publicId: routePublicId } = useParams()
  const { token, user, logout } = useAuth()
  const activityModal = useActivityModal()
  const { refreshUnreadCount, decrementUnreadCount } = useNotificationUnread()
  const publicId = normalizeVideoPublicId(routePublicId)

  const feedVideoRef = useRef(null)
  const virtualFeedRef = useRef(null)
  const accountMenuRef = useRef(null)
  const commentInputRef = useRef(null)
  const playbackFlashTimerRef = useRef(null)

  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [shareOpen, setShareOpen] = useState(false)
  const [sidebarTab, setSidebarTab] = useState('related')
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [commentPostError, setCommentPostError] = useState('')
  const [related, setRelated] = useState([])
  const [relatedLoading, setRelatedLoading] = useState(false)
  const [showAccountMenu, setShowAccountMenu] = useState(false)
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false)
  const [stageWide, setStageWide] = useState(false)

  const [feedSlotHeightPx, setFeedSlotHeightPx] = useState(() =>
    typeof window === 'undefined' ? 760 : Math.max(320, window.innerHeight - 24),
  )
  const [feedVolume, setFeedVolume] = useState(1)
  const [feedSoundOn, setFeedSoundOn] = useState(false)
  const [soundUnlocked, setSoundUnlocked] = useState(false)
  const feedMuted = !feedSoundOn || feedVolume === 0
  const playbackMuted = feedMuted || (feedSoundOn && !soundUnlocked)
  const [feedMoreMenuOpen, setFeedMoreMenuOpen] = useState(false)
  const [feedMoreMenuSubpage, setFeedMoreMenuSubpage] = useState('main')
  const [feedVideoQuality, setFeedVideoQuality] = useState('auto')
  const [feedAutoScrollEnabled, setFeedAutoScrollEnabled] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [playbackFlash, setPlaybackFlash] = useState(null)

  const menuItems = useMemo(() => buildMainSidebarMenuItems(token), [token])
  const feedVideo = useMemo(() => normalizeFeedVideo(video), [video])
  const feedVideos = useMemo(() => (feedVideo ? [feedVideo] : []), [feedVideo])
  const authorProfilePath = feedVideo?.authorUsername
    ? `/@${encodeURIComponent(String(feedVideo.authorUsername).replace(/^@/, ''))}`
    : '/foryou'
  const feedDockLandscape = stageWide

  const patchVideo = useCallback((patch) => {
    setVideo((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const handleSidebarSelect = (id) => {
    handleSidebarMenuSelect(navigate, id, {
      token,
      profilePath: buildProfilePath(token, user),
      onActivity: () => activityModal?.openActivity?.(),
    })
  }

  const openRelatedVideo = useCallback(
    (row) => {
      const nextUrl = buildActivityVideoUrl(row?.authorUsername, row?.publicId)
      if (nextUrl) navigate(nextUrl)
    },
    [navigate],
  )

  useEffect(() => {
    const onResize = () => {
      setFeedSlotHeightPx(Math.max(320, window.innerHeight - 24))
    }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  useEffect(() => {
    const unlock = () => setSoundUnlocked(true)
    window.addEventListener('pointerdown', unlock, { once: true, capture: true })
    return () => window.removeEventListener('pointerdown', unlock, { capture: true })
  }, [])

  useEffect(() => {
    document.title = videoPageTitle(video)
  }, [video?.description, video?.title])

  useEffect(() => {
    const notificationId = location.state?.notificationId
    if (!token || !notificationId) {
      void refreshUnreadCount()
      return undefined
    }
    let cancelled = false
    ;(async () => {
      try {
        await apiClient.markNotificationRead(notificationId, token)
        if (!cancelled) decrementUnreadCount(1)
      } catch {
        /* inbox click should have marked already */
      } finally {
        if (!cancelled) void refreshUnreadCount()
      }
    })()
    return () => {
      cancelled = true
    }
  }, [decrementUnreadCount, location.state?.notificationId, refreshUnreadCount, token])

  useEffect(() => {
    if (!publicId) {
      setLoadError('Liên kết video không hợp lệ.')
      setVideo(null)
      setLoading(false)
      return undefined
    }
    let cancelled = false
    setLoading(true)
    setLoadError('')
    apiClient
      .getVideo(publicId, { token })
      .then((row) => {
        if (cancelled) return
        setVideo(row)
        const authorKey = String(row?.authorUsername ?? '')
          .trim()
          .replace(/^@/, '')
          .toLowerCase()
        const routeKey = String(routeUsername ?? '')
          .trim()
          .replace(/^@/, '')
          .toLowerCase()
        const canonical = buildActivityVideoUrl(authorKey, videoPublicIdOf(row))
        if (canonical && authorKey && routeKey && authorKey !== routeKey) {
          navigate(canonical, { replace: true })
        }
      })
      .catch((err) => {
        if (cancelled) return
        setVideo(null)
        setLoadError(err instanceof Error ? err.message : 'Không tải được video.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [navigate, publicId, routeUsername, token])

  useEffect(() => {
    if (!token || !publicId) return undefined
    let cancelled = false
    apiClient
      .getVideoMeState(publicId, token)
      .then((state) => {
        if (cancelled || !state) return
        setLiked(Boolean(state.liked))
        setBookmarked(Boolean(state.bookmarked))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [publicId, token])

  useEffect(() => {
    if (!publicId) return undefined
    let cancelled = false
    setCommentsLoading(true)
    setCommentsError('')
    apiClient
      .getComments(publicId, { token })
      .then((list) => {
        if (!cancelled) setComments(Array.isArray(list) ? list : [])
      })
      .catch((err) => {
        if (!cancelled) {
          setCommentsError(err instanceof Error ? err.message : 'Không tải được bình luận.')
        }
      })
      .finally(() => {
        if (!cancelled) setCommentsLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [publicId, token])

  useEffect(() => {
    if (!publicId) return undefined
    let cancelled = false
    setRelatedLoading(true)
    apiClient
      .getExploreRelated(publicId, { size: 18 })
      .then((page) => {
        if (cancelled) return
        const items = Array.isArray(page?.items) ? page.items : []
        setRelated(items.filter((row) => normalizeVideoPublicId(row?.publicId) !== publicId))
      })
      .catch(() => {
        if (!cancelled) setRelated([])
      })
      .finally(() => {
        if (!cancelled) setRelatedLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [publicId])

  useEffect(() => {
    setSidebarTab('related')
  }, [publicId])

  useEffect(() => {
    if (!showAccountMenu) return undefined
    const onPointerDown = (event) => {
      if (accountMenuRef.current?.contains(event.target)) return
      setShowAccountMenu(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    return () => document.removeEventListener('pointerdown', onPointerDown)
  }, [showAccountMenu])

  useEffect(() => {
    if (!showLogoutConfirm) return undefined
    const handleEscape = (event) => {
      if (event.key === 'Escape') setShowLogoutConfirm(false)
    }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [showLogoutConfirm])

  useEffect(
    () => () => {
      if (playbackFlashTimerRef.current != null) {
        clearTimeout(playbackFlashTimerRef.current)
      }
    },
    [],
  )

  const toggleFeedPlayback = useCallback(() => {
    const el = feedVideoRef.current
    if (!el) return
    const wasPaused = el.paused
    if (wasPaused) {
      setUserPaused(false)
      void el.play().catch(() => {})
      setPlaybackFlash('play')
    } else {
      setUserPaused(true)
      el.pause()
      setPlaybackFlash('pause')
    }
    if (playbackFlashTimerRef.current != null) {
      clearTimeout(playbackFlashTimerRef.current)
    }
    playbackFlashTimerRef.current = setTimeout(() => {
      setPlaybackFlash(null)
      playbackFlashTimerRef.current = null
    }, 620)
  }, [])

  const toggleFeedPictureInPicture = async () => {
    const el = feedVideoRef.current
    if (!el || typeof el.requestPictureInPicture !== 'function') return
    try {
      if (document.pictureInPictureElement === el) {
        await document.exitPictureInPicture?.()
      } else {
        await el.requestPictureInPicture()
      }
      setFeedMoreMenuOpen(false)
    } catch {
      /* PiP không khả dụng */
    }
  }

  const toggleLike = () => {
    if (!token || !isVideoPublicId(publicId)) {
      if (!token) navigate('/login')
      return
    }
    const next = !liked
    const prevCount = Number(video?.likeCount ?? 0)
    setLiked(next)
    patchVideo({ likeCount: Math.max(0, prevCount + (next ? 1 : -1)) })
    const req = next
      ? apiClient.likeVideo(publicId, token)
      : apiClient.unlikeVideo(publicId, token)
    req.catch(() => {
      setLiked(!next)
      patchVideo({ likeCount: prevCount })
    })
  }

  const toggleBookmark = () => {
    if (!token || !isVideoPublicId(publicId)) {
      if (!token) navigate('/login')
      return
    }
    const next = !bookmarked
    const prevCount = Number(video?.bookmarkCount ?? 0)
    setBookmarked(next)
    patchVideo({ bookmarkCount: Math.max(0, prevCount + (next ? 1 : -1)) })
    const req = next
      ? apiClient.bookmarkVideo(publicId, token)
      : apiClient.unbookmarkVideo(publicId, token)
    req.catch(() => {
      setBookmarked(!next)
      patchVideo({ bookmarkCount: prevCount })
    })
  }

  const submitComment = async () => {
    const text = commentDraft.trim()
    if (!text || !token || !isVideoPublicId(publicId)) return
    setCommentPostError('')
    try {
      const created = await apiClient.addComment(publicId, text, token)
      setCommentDraft('')
      setComments((prev) => [created, ...prev])
      patchVideo({ commentCount: Number(video?.commentCount ?? 0) + 1 })
    } catch (err) {
      setCommentPostError(err instanceof Error ? err.message : 'Không gửi được bình luận.')
    }
  }

  return (
    <section className="flex h-dvh max-h-dvh min-h-0 w-full overflow-hidden bg-black text-zinc-100">
      <Sidebar
        menuItems={menuItems}
        activeMenu="activity"
        onSelectMenu={handleSidebarSelect}
        token={token}
        user={user}
        onLogout={token ? logout : undefined}
      />

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-row overflow-hidden">
        <AccountActionsPill className="absolute right-8 top-5 z-[100]" tone="profile">
          {!token ? (
            <Link
              to="/login"
              className="ml-0.5 cursor-pointer rounded-full bg-red-600 px-3 py-1 text-xs font-semibold leading-none text-white hover:bg-red-500"
            >
              Đăng nhập
            </Link>
          ) : (
            <div className="relative" ref={accountMenuRef}>
              <TooltipHoverWrap tip="Tài khoản" tipHidden={showAccountMenu} hoverOnly>
                <button
                  type="button"
                  className="flex cursor-pointer rounded-full p-0.5 ring-1 ring-zinc-700 transition hover:ring-zinc-500"
                  aria-label="Menu tài khoản"
                  onClick={() => setShowAccountMenu((prev) => !prev)}
                >
                  <img
                    className="h-7 w-7 rounded-full object-cover"
                    src={user?.avatarUrl?.trim() || DEFAULT_AVATAR}
                    alt=""
                    referrerPolicy="no-referrer"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_AVATAR
                    }}
                  />
                </button>
              </TooltipHoverWrap>
              {showAccountMenu ? (
                <div className="absolute right-0 z-[110] mt-2 w-44 overflow-hidden rounded-xl border border-zinc-700 bg-zinc-800 py-1 shadow-2xl">
                  <Link
                    to={buildProfilePath(token, user)}
                    className="flex items-center gap-2 px-3 py-2 text-sm text-zinc-100 hover:bg-zinc-700"
                    onClick={() => setShowAccountMenu(false)}
                  >
                    <IoPerson className="text-base" />
                    Xem hồ sơ
                  </Link>
                  <button
                    type="button"
                    className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-zinc-100 hover:bg-zinc-700"
                    onClick={() => {
                      setShowAccountMenu(false)
                      setShowLogoutConfirm(true)
                    }}
                  >
                    <IoLogOutOutline className="text-base" />
                    Đăng xuất
                  </button>
                </div>
              ) : null}
            </div>
          )}
        </AccountActionsPill>

        <div className="flex min-h-0 min-w-0 flex-1 items-center justify-center px-1 py-1">
          {loadError ? (
            <p className="px-6 text-center text-sm text-red-400">{loadError}</p>
          ) : loading && !feedVideo ? (
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-rose-500"
              aria-label="Đang tải"
            />
          ) : feedVideo ? (
            <div
              className={`flex h-full min-h-0 max-w-full flex-row ${
                feedDockLandscape
                  ? 'min-w-0 items-center justify-start'
                  : 'items-center justify-center'
              }`}
            >
              <div
                className={
                  feedDockLandscape
                    ? 'relative flex h-full min-h-0 flex-col items-start justify-center'
                    : 'relative flex h-full min-h-0 flex-col items-center justify-center'
                }
              >
                <FeedPhoneStage
                  videos={feedVideos}
                  activeIndex={0}
                  setActiveIndex={() => {}}
                  feedSlotHeightPx={feedSlotHeightPx}
                  virtualFeedRef={virtualFeedRef}
                  loadMoreFeed={() => {}}
                  feedVideoRef={feedVideoRef}
                  feedVolume={feedVolume}
                  setFeedVolume={setFeedVolume}
                  feedSoundOn={feedSoundOn}
                  setFeedSoundOn={setFeedSoundOn}
                  playbackMuted={playbackMuted}
                  feedMoreMenuOpen={feedMoreMenuOpen}
                  setFeedMoreMenuOpen={setFeedMoreMenuOpen}
                  feedMoreMenuSubpage={feedMoreMenuSubpage}
                  setFeedMoreMenuSubpage={setFeedMoreMenuSubpage}
                  feedVideoQuality={feedVideoQuality}
                  setFeedVideoQuality={setFeedVideoQuality}
                  feedAutoScrollEnabled={feedAutoScrollEnabled}
                  setFeedAutoScrollEnabled={setFeedAutoScrollEnabled}
                  toggleFeedPlayback={toggleFeedPlayback}
                  userPaused={userPaused}
                  toggleFeedPictureInPicture={toggleFeedPictureInPicture}
                  resolveFeedAuthorDisplayName={resolveFeedAuthorDisplayName}
                  feedDefaultAuthorAvatar={FEED_DEFAULT_AUTHOR_AVATAR}
                  thumbnailFallbackUrl={undefined}
                  playbackFlash={playbackFlash}
                  onActiveFeedPlaybackTick={() => {}}
                  commentsDockOpen
                  onStageWideChange={setStageWide}
                />
              </div>

              <div className="ml-2 flex shrink-0 flex-col items-center justify-center gap-3 self-center sm:ml-3">
                <div className="relative mb-3 h-12 w-12">
                  <Link
                    to={authorProfilePath}
                    aria-label={`Xem hồ sơ ${feedVideo.authorUsername ?? 'user'}`}
                    className="block h-12 w-12 rounded-full"
                  >
                    <img
                      className="h-full w-full rounded-full object-cover"
                      src={feedVideo.avatarUrl ?? FEED_DEFAULT_AUTHOR_AVATAR}
                      alt=""
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        e.currentTarget.src = FEED_DEFAULT_AUTHOR_AVATAR
                      }}
                    />
                  </Link>
                </div>
                <button
                  type="button"
                  className={FEED_ROUND_ICON_BUTTON}
                  aria-pressed={liked}
                  aria-label={liked ? 'Bỏ thích' : 'Thích'}
                  onClick={toggleLike}
                >
                  <IoHeart
                    className={liked ? 'text-red-500' : 'text-zinc-100'}
                    aria-hidden
                  />
                </button>
                <span className="text-xs text-zinc-300">
                  {formatCompactCount(feedVideo.likeCount)}
                </span>
                <button
                  type="button"
                  className={`${FEED_ROUND_ICON_BUTTON} ${
                    sidebarTab === 'comments'
                      ? 'ring-2 ring-white/35 ring-offset-2 ring-offset-black'
                      : ''
                  }`}
                  aria-label="Bình luận"
                  aria-expanded={sidebarTab === 'comments'}
                  onClick={() => {
                    setSidebarTab('comments')
                    commentInputRef.current?.focus()
                  }}
                >
                  <FaComment className="text-lg text-zinc-100" aria-hidden />
                </button>
                <span className="text-xs text-zinc-300">
                  {formatCompactCount(feedVideo.commentCount)}
                </span>
                <button
                  type="button"
                  className={FEED_ROUND_ICON_BUTTON}
                  aria-pressed={bookmarked}
                  aria-label={bookmarked ? 'Bỏ lưu yêu thích' : 'Lưu yêu thích'}
                  onClick={toggleBookmark}
                >
                  <IoBookmark
                    className={
                      bookmarked ? 'text-xl text-[#FACE15]' : 'text-xl text-white'
                    }
                    aria-hidden
                  />
                </button>
                <span className="text-xs text-zinc-300">
                  {formatCompactCount(feedVideo.bookmarkCount)}
                </span>
                <button
                  type="button"
                  className={FEED_ROUND_ICON_BUTTON}
                  aria-label="Chia sẻ"
                  onClick={() => setShareOpen(true)}
                >
                  <IoArrowRedo aria-hidden />
                </button>
                <span className="text-xs text-zinc-300">
                  {formatCompactCount(feedVideo.shareCount)}
                </span>
              </div>
            </div>
          ) : null}
        </div>

        <aside
          className="relative z-0 flex h-full min-h-0 shrink-0 flex-col border-l border-white/[0.08] bg-[#121212] pt-[4.5rem] text-zinc-100"
          style={{ width: feedCommentsPanelWidthCss() }}
          aria-label="Bình luận và gợi ý"
        >
          <div role="tablist" className="flex shrink-0 border-b border-white/[0.08] px-2">
            <button
              type="button"
              role="tab"
              aria-selected={sidebarTab === 'comments'}
              className={`flex-1 border-b-2 px-2 py-3.5 text-[15px] font-semibold ${
                sidebarTab === 'comments'
                  ? 'border-white text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
              onClick={() => setSidebarTab('comments')}
            >
              Bình luận
              <span className="ml-1 font-normal text-zinc-400">
                ({formatCompactCount(video?.commentCount ?? comments.length)})
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={sidebarTab === 'related'}
              className={`flex-1 border-b-2 px-2 py-3.5 text-[15px] font-semibold ${
                sidebarTab === 'related'
                  ? 'border-white text-white'
                  : 'border-transparent text-zinc-500 hover:text-zinc-300'
              }`}
              onClick={() => setSidebarTab('related')}
            >
              Bạn có thể thích
            </button>
          </div>

          <div className="scrollbar-none min-h-0 flex-1 overflow-y-auto overscroll-y-contain px-2 py-2">
            {sidebarTab === 'comments' ? (
              commentsLoading ? (
                <p className="px-3 py-12 text-center text-sm text-zinc-500">
                  Đang tải bình luận…
                </p>
              ) : commentsError ? (
                <p className="px-3 py-12 text-center text-sm text-red-400">{commentsError}</p>
              ) : comments.length === 0 ? (
                <div className="flex flex-col items-center px-3 py-12 text-center text-sm text-zinc-500">
                  <p>Chưa có bình luận.</p>
                  <p className="mt-1 text-xs">Hãy mở đầu cuộc trò chuyện.</p>
                </div>
              ) : (
                <ul className="space-y-4 px-1">
                  {comments.map((comment) => (
                    <li key={comment.id} className="flex gap-2">
                      <img
                        src={comment.authorAvatarUrl?.trim() || DEFAULT_AVATAR}
                        alt=""
                        className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-800"
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_AVATAR
                        }}
                      />
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-semibold text-zinc-300">
                          @{comment.username ?? 'user'}
                          <span className="ml-2 font-normal text-zinc-600">
                            {formatRelativeTime(comment.createdAt)}
                          </span>
                        </p>
                        <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-100">
                          {comment.content}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )
            ) : relatedLoading ? (
              <p className="px-3 py-12 text-center text-sm text-zinc-500">Đang tải gợi ý…</p>
            ) : related.length === 0 ? (
              <p className="px-3 py-12 text-center text-sm text-zinc-500">Chưa có gợi ý.</p>
            ) : (
              <ul className="space-y-1">
                {related.map((row) => {
                  const id = videoPublicIdOf(row)
                  return (
                    <li key={id ?? row.id}>
                      <RelatedVideoTile video={row} onSelect={openRelatedVideo} />
                    </li>
                  )
                })}
              </ul>
            )}
          </div>

          {sidebarTab === 'comments' ? (
            <div className="shrink-0 border-t border-white/[0.08] px-3 py-3">
              {commentPostError ? (
                <p className="mb-1 text-xs text-red-400">{commentPostError}</p>
              ) : null}
              <div className="flex items-end gap-2">
                <img
                  src={user?.avatarUrl?.trim() || DEFAULT_AVATAR}
                  alt=""
                  className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-700"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    e.currentTarget.src = DEFAULT_AVATAR
                  }}
                />
                <div className="relative min-w-0 flex-1">
                  <input
                    ref={commentInputRef}
                    type="text"
                    value={commentDraft}
                    onChange={(e) => setCommentDraft(e.target.value)}
                    placeholder={token ? 'Thêm bình luận...' : 'Đăng nhập để bình luận...'}
                    disabled={!token || !isVideoPublicId(publicId)}
                    className="w-full rounded-full border border-zinc-700 bg-zinc-900 py-2.5 pl-4 pr-14 text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600 disabled:opacity-50"
                  />
                  <button
                    type="button"
                    className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full p-1.5 text-zinc-500 hover:bg-zinc-800 hover:text-zinc-200"
                    aria-label="Biểu tượng cảm xúc"
                  >
                    <IoHappyOutline className="text-lg" aria-hidden />
                  </button>
                </div>
                <button
                  type="button"
                  aria-label="Gửi bình luận"
                  disabled={!commentDraft.trim() || !token || !isVideoPublicId(publicId)}
                  onClick={() => void submitComment()}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <IoArrowUp className="text-xl" aria-hidden />
                </button>
              </div>
            </div>
          ) : null}
        </aside>
      </div>

      <VideoShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        videoId={video?.publicId}
        videoTitle={video?.title ?? ''}
        token={token}
        onShareCountChange={(shareCount) => {
          if (shareCount != null) patchVideo({ shareCount })
        }}
      />

      {showLogoutConfirm ? (
        <div className="fixed inset-0 z-30 flex items-center justify-center bg-black/55 px-4">
          <div className="w-full max-w-sm rounded-xl bg-zinc-800 p-6 text-center shadow-2xl">
            <p className="text-2xl font-bold leading-snug">
              Bạn có chắc chắn muốn đăng xuất?
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <button
                type="button"
                className="rounded-lg bg-zinc-700 px-5 py-2 text-sm font-semibold text-white hover:bg-zinc-600"
                onClick={() => setShowLogoutConfirm(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="rounded-lg bg-red-600 px-5 py-2 text-sm font-semibold text-white hover:bg-red-500"
                onClick={() => {
                  setShowLogoutConfirm(false)
                  logout?.()
                }}
              >
                Đăng xuất
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
