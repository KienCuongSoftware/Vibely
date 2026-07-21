import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import {
  IoArrowRedo,
  IoArrowUp,
  IoBookmark,
  IoCheckmark,
  IoClose,
  IoHeart,
  IoLogOutOutline,
  IoPerson,
  IoPlayOutline,
} from 'react-icons/io5'
import { FaComment } from 'react-icons/fa6'
import { apiClient } from '../../api/client.js'
import { AccountActionsPill } from '../AccountActionsPill.jsx'
import { AvatarImage } from '../AvatarImage.jsx'
import {
  BookmarkCollectionPopover,
  BookmarkSaveToast,
  NewCollectionModal,
} from '../BookmarkSaveFeedback.jsx'
import { CommentInputAccessoryButtons } from '../comments/CommentInputAccessory.jsx'
import { FeedPhoneStage, FeedVolumeControl, FeedVideoCaption } from '../feed/FeedPhoneStage.jsx'
import {
  isMobileFeedLayout,
  MOBILE_FEED_BOTTOM_NAV_PX,
  MOBILE_FEED_TOP_BAR_PX,
  MobileFeedBottomNav,
  MobileFeedMenuDrawer,
  MobileFeedTopBar,
} from '../feed/MobileFeedShell.jsx'
import { Sidebar } from '../Sidebar.jsx'
import { TooltipHoverWrap } from '../TooltipControls.jsx'
import { VideoShareModal } from '../VideoShareModal.jsx'
import { usePersistedFeedPlaybackSpeed } from '../../feed/usePersistedFeedPlaybackSpeed.js'
import { usePersistedFeedVideoQuality } from '../../feed/usePersistedFeedVideoQuality.js'
import { useAuth } from '../../state/useAuth.js'
import { useActivityModal } from '../../state/ActivityModalContext.jsx'
import { useNotificationUnread } from '../../state/NotificationUnreadContext.jsx'
import { buildProfilePath } from '../../utils/buildProfilePath.js'
import {
  readFeedFollowedAuthorIds,
  writeFeedFollowedAuthorIds,
} from '../../utils/feedFollowState.js'
import { buildMainSidebarMenuItems } from '../../utils/mainSidebarMenuItems.js'
import { redirectGuestToLogin } from '../../utils/guestAuthGate.js'
import { buildShareableVideoUrl } from '../../utils/shareUrl.js'
import { handleSidebarMenuSelect } from '../../utils/sidebarNavigation.js'
import {
  FEED_ACTION_ITEM_CLASS,
  FEED_ROUND_ICON_BUTTON_CLASS,
  FEED_VIDEO_OVERLAY_BTN_CLASS,
} from '../../feed/feedLayout.js'
import {
  isVideoPublicId,
  normalizeVideoPublicId,
  videoPublicIdOf,
} from '../../utils/videoPublicId.js'
import { Seo } from '../../seo/Seo.jsx'
import { videoObjectJsonLd } from '../../seo/jsonLd.js'
import { absoluteUrl } from '../../seo/seoConfig.js'
import { buildProfileHref } from '../search/searchUtils.js'
import { formatRelativeTimeVi } from '../../utils/relativeTimeVi.js'
import { isEnterKey } from '../../utils/keyboardShortcuts.js'

const DEFAULT_AVATAR = '/images/users/default-avatar.jpeg'
const FEED_DEFAULT_AUTHOR_AVATAR = '/images/users/default-avatar.jpeg'

const FEED_ROUND_ICON_BUTTON = FEED_ROUND_ICON_BUTTON_CLASS

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

function isPendingModerationStatus(status) {
  const s = String(status || '').toUpperCase()
  return s === 'HIDDEN' || s === 'PROCESSING' || s === 'RAW'
}

function resolveFeedAuthorDisplayName(video) {
  const name = String(video?.authorDisplayName ?? '').trim()
  if (name) return name
  const fallback = String(video?.authorUsername ?? '')
    .trim()
    .replace(/^@/, '')
  return fallback || 'Nhà sáng tạo'
}

function normalizeFeedVideo(row, followedAuthorIds) {
  if (!row) return null
  const rawAvatar = row?.authorAvatarUrl ?? row?.avatarUrl
  const authorId = Number(row?.authorId)
  const isAuthorFollowed =
    Boolean(row?.isAuthorFollowed) ||
    (Number.isFinite(authorId) && authorId > 0 && followedAuthorIds.has(authorId))
  return {
    ...row,
    isAuthorFollowed,
    avatarUrl:
      rawAvatar != null && String(rawAvatar).trim()
        ? String(rawAvatar).trim()
        : FEED_DEFAULT_AUTHOR_AVATAR,
    shareCount: Number(row.shareCount ?? 0),
    bookmarkCount: Number(row.bookmarkCount ?? 0),
  }
}

function videoDocumentTitle(video, forYouStyle) {
  const desc =
    String(video?.description ?? '').trim() ||
    String(video?.title ?? '').trim()
  if (!desc) return 'Vibely'
  return forYouStyle ? desc : `${desc} | Vibely`
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

function SuggestedGridVideoTile({ video, isPlaying, onSelect }) {
  const thumb = String(video?.thumbnailUrl ?? '').trim()
  const id = videoPublicIdOf(video)
  return (
    <button
      type="button"
      disabled={!id}
      onClick={() => onSelect(video)}
      className="group relative aspect-[9/16] w-full overflow-hidden rounded-md bg-zinc-900 ring-1 ring-zinc-800 transition hover:ring-zinc-600 disabled:cursor-not-allowed"
      aria-label={isPlaying ? 'Hiện đang phát' : 'Xem video'}
      aria-current={isPlaying ? 'true' : undefined}
    >
      {thumb ? (
        <img
          src={thumb}
          alt=""
          className="h-full w-full object-cover"
          loading="lazy"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-zinc-800 text-[10px] text-zinc-600">
          Video
        </div>
      )}
      {isPlaying ? (
        <div className="absolute inset-0 z-[2] flex items-center justify-center bg-black/55 px-2 text-center">
          <span className="text-[11px] font-semibold leading-tight text-white">
            Hiện đang phát
          </span>
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[1] bg-linear-to-t from-black/85 via-black/25 to-transparent px-1.5 pb-1 pt-8">
        <div className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-white drop-shadow-md">
          <IoPlayOutline className="text-[11px]" aria-hidden />
          <span>{formatCompactCount(video?.viewCount ?? 0)}</span>
        </div>
      </div>
    </button>
  )
}

export function FeedStyleVideoDetailPage({
  activeMenu = 'latest',
  buildDetailVideoUrl,
  forYouStyle = false,
  relatedLayout = 'list',
  useActivitySidebar = false,
}) {
  const navigate = useNavigate()
  const location = useLocation()
  const { username: routeUsername, publicId: routePublicId } = useParams()
  const { token, user, logout } = useAuth()
  const activityModal = useActivityModal()
  const { refreshUnreadCount, decrementUnreadCount } = useNotificationUnread()
  const publicId = normalizeVideoPublicId(routePublicId)
  const notificationId = location.state?.notificationId

  const feedVideoRef = useRef(null)
  const virtualFeedRef = useRef(null)
  const accountMenuRef = useRef(null)
  const commentInputRef = useRef(null)
  const commentAccessoryRef = useRef(null)
  const playbackFlashTimerRef = useRef(null)
  const bookmarkButtonRef = useRef(null)
  const followBadgeTimerRef = useRef(null)
  const repostToastTimerRef = useRef(null)

  const [video, setVideo] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [repostBusy, setRepostBusy] = useState(false)
  const [repostToastOpen, setRepostToastOpen] = useState(false)
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
  const [followedAuthorIds, setFollowedAuthorIds] = useState(() =>
    readFeedFollowedAuthorIds(token),
  )
  const [followBusyAuthorId, setFollowBusyAuthorId] = useState(null)
  const [followSuccessPublicId, setFollowSuccessPublicId] = useState(null)
  const [bookmarkToastOpen, setBookmarkToastOpen] = useState(false)
  const [bookmarkManageOpen, setBookmarkManageOpen] = useState(false)
  const [newCollectionOpen, setNewCollectionOpen] = useState(false)
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mobileLayout, setMobileLayout] = useState(() => isMobileFeedLayout())

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
  const [feedVideoQuality, setFeedVideoQuality] = usePersistedFeedVideoQuality()
  const [feedPlaybackSpeed, setFeedPlaybackSpeed] = usePersistedFeedPlaybackSpeed()
  const [feedAutoScrollEnabled, setFeedAutoScrollEnabled] = useState(false)
  const [userPaused, setUserPaused] = useState(false)
  const [playbackFlash, setPlaybackFlash] = useState(null)

  const menuItems = useMemo(() => buildMainSidebarMenuItems(token), [token])
  const feedVideo = useMemo(
    () => normalizeFeedVideo(video, followedAuthorIds),
    [video, followedAuthorIds],
  )
  const feedVideos = useMemo(() => (feedVideo ? [feedVideo] : []), [feedVideo])
  const pendingModeration = isPendingModerationStatus(feedVideo?.status)
  const authorProfilePath = feedVideo?.authorUsername
    ? `/@${encodeURIComponent(String(feedVideo.authorUsername).replace(/^@/, ''))}`
    : '/foryou'
  const feedDockLandscape = stageWide
  const watchChrome = forYouStyle && !mobileLayout

  const exitWatchToForYou = useCallback(() => {
    navigate('/foryou')
  }, [navigate])

  const patchVideo = useCallback((patch) => {
    setVideo((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const handleSidebarSelect = (id) => {
    handleSidebarMenuSelect(navigate, id, {
      token,
      profilePath: buildProfilePath(token, user),
      onActivity: useActivitySidebar ? () => activityModal?.openActivity?.() : undefined,
    })
  }

  const openRelatedVideo = useCallback(
    (row) => {
      const nextUrl = buildDetailVideoUrl(row?.authorUsername, row?.publicId)
      if (nextUrl) navigate(nextUrl)
    },
    [buildDetailVideoUrl, navigate],
  )

  const markAuthorFollowedInSession = useCallback(
    (authorId) => {
      const key = Number(authorId)
      if (!Number.isFinite(key) || key <= 0) return
      setFollowedAuthorIds((prev) => {
        const next = new Set(prev)
        next.add(key)
        writeFeedFollowedAuthorIds(token, next)
        return next
      })
    },
    [token],
  )

  const startFollowSuccessFlash = useCallback((vid) => {
    const key = normalizeVideoPublicId(vid)
    if (!key) return
    if (followBadgeTimerRef.current != null) {
      clearTimeout(followBadgeTimerRef.current)
    }
    setFollowSuccessPublicId(key)
    followBadgeTimerRef.current = setTimeout(() => {
      setFollowSuccessPublicId((current) => (current === key ? null : current))
      followBadgeTimerRef.current = null
    }, 500)
  }, [])

  const clearFollowSuccessFlash = useCallback((vid) => {
    const key = normalizeVideoPublicId(vid)
    if (!key) return
    if (followBadgeTimerRef.current != null) {
      clearTimeout(followBadgeTimerRef.current)
      followBadgeTimerRef.current = null
    }
    setFollowSuccessPublicId((current) => (current === key ? null : current))
  }, [])

  const showActiveAuthorFollowBadge = useMemo(() => {
    if (!forYouStyle || !feedVideo) return false
    const authorId = Number(feedVideo.authorId)
    if (!Number.isFinite(authorId) || authorId <= 0) return false
    if (Number(user?.id) === authorId) return false
    return !feedVideo.isAuthorFollowed
  }, [feedVideo, forYouStyle, user?.id])

  const showActiveAuthorFollowSuccess = useMemo(() => {
    return (
      normalizeVideoPublicId(feedVideo?.publicId) != null &&
      normalizeVideoPublicId(feedVideo?.publicId) === followSuccessPublicId
    )
  }, [feedVideo?.publicId, followSuccessPublicId])

  const handleActiveAuthorFollow = useCallback(async () => {
    const authorId = Number(feedVideo?.authorId)
    if (!Number.isFinite(authorId) || authorId <= 0) return
    if (!token) {
      navigate('/login')
      return
    }
    if (followBusyAuthorId === authorId) return
    setFollowBusyAuthorId(authorId)
    markAuthorFollowedInSession(authorId)
    patchVideo({ isAuthorFollowed: true })
    startFollowSuccessFlash(publicId)
    try {
      await apiClient.follow(authorId, token)
    } catch {
      clearFollowSuccessFlash(publicId)
      patchVideo({ isAuthorFollowed: false })
    } finally {
      setFollowBusyAuthorId(null)
    }
  }, [
    clearFollowSuccessFlash,
    feedVideo?.authorId,
    followBusyAuthorId,
    markAuthorFollowedInSession,
    navigate,
    patchVideo,
    publicId,
    startFollowSuccessFlash,
    token,
  ])

  const handleRepostToggle = useCallback(() => {
    if (!isVideoPublicId(publicId)) return
    if (!token) {
      navigate('/login')
      return
    }
    if (repostBusy) return
    const next = !reposted
    setRepostBusy(true)
    setReposted(next)
    if (next) {
      setRepostToastOpen(true)
      if (repostToastTimerRef.current) {
        window.clearTimeout(repostToastTimerRef.current)
      }
      repostToastTimerRef.current = window.setTimeout(() => {
        setRepostToastOpen(false)
      }, 2500)
    } else {
      setRepostToastOpen(false)
    }
    const req = next
      ? apiClient.repostVideo(publicId, token)
      : apiClient.unrepostVideo(publicId, token)
    req
      .catch(() => {
        setReposted(!next)
        if (next) setRepostToastOpen(false)
      })
      .finally(() => {
        setRepostBusy(false)
      })
  }, [navigate, publicId, repostBusy, reposted, token])

  const handleVideoContextShare = useCallback(() => {
    setShareOpen(true)
  }, [])

  const handleVideoContextCopyLink = useCallback(async () => {
    const url = buildShareableVideoUrl(video?.publicId, video?.authorUsername, {
      shareMethod: 'copy_link',
    })
    if (!url) return
    await navigator.clipboard.writeText(url)
  }, [video?.authorUsername, video?.publicId])

  useEffect(() => {
    setFollowedAuthorIds(readFeedFollowedAuthorIds(token))
  }, [token])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const syncLayout = () => setMobileLayout(mq.matches)
    syncLayout()
    mq.addEventListener('change', syncLayout)
    return () => mq.removeEventListener('change', syncLayout)
  }, [])

  useEffect(() => {
    const onResize = () => {
      if (forYouStyle && !mobileLayout) {
        const viewportH = window.visualViewport?.height ?? window.innerHeight
        setFeedSlotHeightPx(Math.max(320, Math.round(viewportH)))
        return
      }
      const inset = mobileLayout
        ? MOBILE_FEED_TOP_BAR_PX + MOBILE_FEED_BOTTOM_NAV_PX + 8
        : 24
      setFeedSlotHeightPx(Math.max(320, window.innerHeight - inset))
    }
    onResize()
    window.addEventListener('resize', onResize)
    window.visualViewport?.addEventListener('resize', onResize)
    return () => {
      window.removeEventListener('resize', onResize)
      window.visualViewport?.removeEventListener('resize', onResize)
    }
  }, [mobileLayout, forYouStyle])

  useEffect(() => {
    if (!watchChrome) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape' && !feedMoreMenuOpen) exitWatchToForYou()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [watchChrome, feedMoreMenuOpen, exitWatchToForYou])

  useEffect(() => {
    const unlock = () => setSoundUnlocked(true)
    window.addEventListener('pointerdown', unlock, { once: true, capture: true })
    return () => window.removeEventListener('pointerdown', unlock, { capture: true })
  }, [])

  const videoSeoTitle = videoDocumentTitle(video, false)
  const videoSeoDescription = 'Xem video trên Vibely.'
  const videoSeoCanonical =
    buildDetailVideoUrl(video?.authorUsername ?? routeUsername, videoPublicIdOf(video) ?? publicId) ||
    (publicId ? `/watch/${publicId}` : '/foryou')
  const videoSeoImage = video?.thumbnailUrl || video?.authorAvatarUrl || DEFAULT_AVATAR

  useEffect(() => {
    if (!token || !notificationId || !useActivitySidebar) {
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
  }, [
    decrementUnreadCount,
    notificationId,
    refreshUnreadCount,
    token,
    useActivitySidebar,
  ])

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
        const canonical = buildDetailVideoUrl(authorKey, videoPublicIdOf(row))
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
  }, [buildDetailVideoUrl, navigate, publicId, routeUsername, token])

  useEffect(() => {
    if (!token || !publicId) return undefined
    let cancelled = false
    apiClient
      .getVideoMeState(publicId, token)
      .then((state) => {
        if (cancelled || !state) return
        setLiked(Boolean(state.liked))
        setBookmarked(Boolean(state.bookmarked))
        if (forYouStyle) setReposted(Boolean(state.reposted))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [forYouStyle, publicId, token])

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
    setLiked(false)
    setBookmarked(false)
    setReposted(false)
    setShareOpen(false)
    setBookmarkToastOpen(false)
    setBookmarkManageOpen(false)
    setRepostToastOpen(false)
    setMobilePanelOpen(false)
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
      if (followBadgeTimerRef.current != null) {
        clearTimeout(followBadgeTimerRef.current)
      }
      if (repostToastTimerRef.current != null) {
        window.clearTimeout(repostToastTimerRef.current)
      }
    },
    [],
  )

  useEffect(() => {
    const el = feedVideoRef.current
    if (!el) return
    const rate = Number(feedPlaybackSpeed)
    el.playbackRate = Number.isFinite(rate) && rate > 0 ? rate : 1
  }, [feedPlaybackSpeed, feedVideo?.publicId])

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
    if (forYouStyle && next) {
      setBookmarkToastOpen(true)
    } else if (forYouStyle) {
      setBookmarkToastOpen(false)
      setBookmarkManageOpen(false)
    }
    const req = next
      ? apiClient.bookmarkVideo(publicId, token)
      : apiClient.unbookmarkVideo(publicId, token)
    req.catch(() => {
      setBookmarked(!next)
      patchVideo({ bookmarkCount: prevCount })
      if (forYouStyle && next) setBookmarkToastOpen(false)
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

  const openSidePanel = useCallback((tab) => {
    setSidebarTab(tab)
    if (isMobileFeedLayout() || (forYouStyle && !isMobileFeedLayout())) {
      setMobilePanelOpen(true)
      if (tab === 'comments') {
        window.requestAnimationFrame(() => commentInputRef.current?.focus())
      }
      return
    }
    if (tab === 'comments') {
      commentInputRef.current?.focus()
    }
  }, [forYouStyle])

  const openBookmarkManagePopover = useCallback(() => {
    setBookmarkToastOpen(false)
    setBookmarkManageOpen(true)
  }, [])

  const openNewCollectionModal = useCallback(() => {
    setBookmarkManageOpen(false)
    setNewCollectionOpen(true)
  }, [])

  return (
    <section className="flex h-dvh max-h-dvh min-h-0 w-full flex-col overflow-hidden bg-black text-zinc-100 lg:flex-row">
      <Seo
        title={videoSeoTitle}
        description={videoSeoDescription}
        canonical={videoSeoCanonical}
        image={videoSeoImage}
        type="video.other"
        jsonLd={video ? videoObjectJsonLd(video, absoluteUrl(videoSeoCanonical)) : null}
      />
      <div className="shrink-0 lg:hidden">
        <MobileFeedTopBar
          onLiveTap={() => redirectGuestToLogin(navigate, token)}
          onSearchTap={() => {
            if (redirectGuestToLogin(navigate, token)) return
            navigate('/search')
          }}
        />
      </div>

      <MobileFeedMenuDrawer
        open={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        token={token}
        user={user}
        activeFeedTab="for-you"
      />

      <div className={`hidden shrink-0 lg:block${watchChrome ? ' lg:hidden' : ''}`}>
        <Sidebar
          menuItems={menuItems}
          activeMenu={activeMenu}
          onSelectMenu={handleSidebarSelect}
          token={token}
          user={user}
          onLogout={token ? logout : undefined}
        />
      </div>

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden lg:flex-row">
        {!watchChrome ? (
        <AccountActionsPill className="absolute right-3 top-3 z-[100] lg:right-8 lg:top-5" tone="profile">
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
        ) : null}

        <div
          className={`relative flex min-h-0 min-w-0 flex-1 items-stretch justify-stretch ${
            watchChrome
              ? 'h-full lg:items-center lg:justify-center'
              : 'lg:items-center lg:justify-center lg:px-1 lg:py-1'
          }`}
        >
          {loadError ? (
            <p className="px-6 text-center text-sm text-red-400">{loadError}</p>
          ) : loading && !feedVideo ? (
            <div
              className="h-10 w-10 animate-spin rounded-full border-2 border-zinc-700 border-t-rose-500"
              aria-label="Đang tải"
            />
          ) : feedVideo && pendingModeration ? (
            <div className="flex max-w-sm flex-col items-center gap-3 px-6 text-center">
              <p className="text-base font-semibold text-white">Đang kiểm tra...</p>
              <p className="text-sm text-zinc-400">
                Video chưa được phép xem công khai cho đến khi kiểm duyệt AI xong.
              </p>
              <Link
                to={authorProfilePath}
                className="mt-1 text-sm font-medium text-rose-400 hover:text-rose-300"
              >
                Quay lại hồ sơ
              </Link>
            </div>
          ) : feedVideo ? (
            <div
              className={`relative h-full min-h-0 w-full max-lg:flex-1 ${
                feedDockLandscape
                  ? 'min-w-0 items-center justify-start lg:flex lg:flex-row'
                  : 'lg:flex lg:flex-row lg:items-center lg:justify-center'
              }`}
            >
              <div
                className={
                  feedDockLandscape
                    ? 'relative flex h-full min-h-0 w-full flex-col items-start justify-center max-lg:flex-1'
                    : 'relative flex h-full min-h-0 max-lg:w-full max-lg:flex-1 flex-col items-center justify-center lg:w-auto lg:shrink-0'
                }
              >
                <FeedPhoneStage
                  mobileFullBleed={mobileLayout}
                  theaterMode={watchChrome}
                  onTheaterModeChange={(open) => {
                    if (!open) exitWatchToForYou()
                  }}
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
                  feedPlaybackSpeed={feedPlaybackSpeed}
                  setFeedPlaybackSpeed={setFeedPlaybackSpeed}
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
                  commentsDockOpen={!mobileLayout && !watchChrome && sidebarTab === 'comments'}
                  onStageWideChange={setStageWide}
                  contextMenuToken={forYouStyle ? token : undefined}
                  onVideoContextShare={forYouStyle ? handleVideoContextShare : undefined}
                  onVideoContextCopyLink={forYouStyle ? handleVideoContextCopyLink : undefined}
                  onVideoContextRepost={forYouStyle ? () => handleRepostToggle() : undefined}
                  videoContextReposted={forYouStyle ? reposted : undefined}
                  videoContextRepostBusy={forYouStyle ? repostBusy : undefined}
                  selfReposted={forYouStyle ? reposted : false}
                  selfRepostAvatarUrl={forYouStyle ? user?.avatarUrl : undefined}
                  selfRepostDisplayName={forYouStyle ? user?.displayName : undefined}
                  selfRepostUsername={forYouStyle ? user?.username : undefined}
                  selfRepostProfilePath={
                    forYouStyle && user?.username
                      ? buildProfilePath(token, user)
                      : undefined
                  }
                  onSelfUnrepost={forYouStyle ? handleRepostToggle : undefined}
                  selfRepostBusy={forYouStyle ? repostBusy : false}
                />
                {watchChrome ? (
                  <div className="pointer-events-auto fixed top-4 left-6 z-80 flex items-center gap-2">
                    <button
                      type="button"
                      aria-label="Quay lại For You"
                      title="Quay lại For You"
                      className={`cursor-pointer ${FEED_VIDEO_OVERLAY_BTN_CLASS}`}
                      onClick={exitWatchToForYou}
                    >
                      <IoClose aria-hidden />
                    </button>
                    <FeedVolumeControl
                      volume={feedVolume}
                      onVolumeChange={setFeedVolume}
                      soundOn={feedSoundOn}
                      onSoundOnChange={setFeedSoundOn}
                      alwaysVisible
                    />
                  </div>
                ) : null}
                {watchChrome && feedVideo ? (
                  <div className="pointer-events-auto fixed bottom-10 left-6 z-80 w-[min(17.5rem,calc(50vw-min(280px,28vh)-2rem))] max-w-[280px]">
                    <Link
                      to={authorProfilePath}
                      className="inline-block max-w-full truncate text-[15px] font-bold leading-snug text-white hover:underline"
                    >
                      @
                      {String(feedVideo.authorUsername ?? 'vibely')
                        .trim()
                        .replace(/^@/, '') || 'vibely'}
                    </Link>
                    <div className="mt-1.5 text-sm leading-snug text-white/90">
                      <FeedVideoCaption
                        caption={
                          String(feedVideo.description ?? '').trim() ||
                          String(feedVideo.title ?? '').trim() ||
                          ''
                        }
                      />
                    </div>
                  </div>
                ) : null}
                {forYouStyle && repostToastOpen ? (
                  <div
                    className="pointer-events-none absolute inset-x-0 top-4 z-[60] flex justify-center px-4"
                    role="status"
                  >
                    <span className="rounded-md bg-black/80 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
                      Đã đăng lại
                    </span>
                  </div>
                ) : null}
                {forYouStyle ? (
                  <BookmarkSaveToast
                    open={bookmarkToastOpen}
                    onManage={openBookmarkManagePopover}
                    onDismiss={() => setBookmarkToastOpen(false)}
                  />
                ) : null}
              </div>

              <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[15] h-28 bg-linear-to-t from-black/80 via-black/35 to-transparent lg:hidden" />

              <div
                className={
                  watchChrome
                    ? 'pointer-events-auto fixed right-6 bottom-[max(6.5rem,18%)] z-80 flex flex-col items-center gap-3.5'
                    : 'pointer-events-none absolute right-2 bottom-[4.75rem] z-30 lg:pointer-events-auto lg:static lg:ml-3 lg:flex lg:shrink-0 lg:flex-col lg:items-center lg:gap-4 lg:self-center'
                }
              >
                <div className="pointer-events-auto flex flex-col items-center gap-3">
                <div className="relative h-12 w-12">
                  <Link
                    to={authorProfilePath}
                    aria-label={`Xem hồ sơ ${feedVideo.authorUsername ?? 'user'}`}
                    className="block h-12 w-12 rounded-full"
                  >
                    {forYouStyle ? (
                      <AvatarImage
                        className="h-full w-full rounded-full object-cover"
                        src={feedVideo.avatarUrl ?? FEED_DEFAULT_AUTHOR_AVATAR}
                        alt={`avatar-${feedVideo.authorUsername ?? 'user'}`}
                        fallbackSrc={FEED_DEFAULT_AUTHOR_AVATAR}
                      />
                    ) : (
                      <img
                        className="h-full w-full rounded-full object-cover"
                        src={feedVideo.avatarUrl ?? FEED_DEFAULT_AUTHOR_AVATAR}
                        alt=""
                        referrerPolicy="no-referrer"
                        onError={(e) => {
                          e.currentTarget.src = FEED_DEFAULT_AUTHOR_AVATAR
                        }}
                      />
                    )}
                  </Link>
                  {forYouStyle && showActiveAuthorFollowSuccess ? (
                    <span
                      aria-label={`Đã theo dõi ${feedVideo.authorUsername ?? 'user'}`}
                      className="absolute bottom-0 left-1/2 flex h-6 w-6 -translate-x-1/2 translate-y-[38%] items-center justify-center rounded-full border border-zinc-500 bg-zinc-200 text-sm text-red-500 shadow-[0_3px_10px_rgba(0,0,0,0.45)]"
                    >
                      <IoCheckmark aria-hidden />
                    </span>
                  ) : null}
                  {forYouStyle && showActiveAuthorFollowBadge && !showActiveAuthorFollowSuccess ? (
                    <button
                      type="button"
                      aria-label={`Theo dõi ${feedVideo.authorUsername ?? 'user'}`}
                      className="absolute bottom-0 left-1/2 flex h-6 w-6 -translate-x-1/2 translate-y-[38%] cursor-pointer items-center justify-center rounded-full border-2 border-black bg-red-500 text-base leading-none text-white shadow-[0_3px_10px_rgba(0,0,0,0.45)] disabled:cursor-wait disabled:opacity-75"
                      onClick={() => void handleActiveAuthorFollow()}
                      disabled={followBusyAuthorId === Number(feedVideo?.authorId)}
                    >
                      <span className="-translate-y-px">+</span>
                    </button>
                  ) : null}
                </div>
                <div className={FEED_ACTION_ITEM_CLASS}>
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
                <span className="text-xs leading-none text-zinc-300">
                  {formatCompactCount(feedVideo.likeCount)}
                </span>
                </div>
                <div className={FEED_ACTION_ITEM_CLASS}>
                <button
                  type="button"
                  className={`${FEED_ROUND_ICON_BUTTON} ${
                    sidebarTab === 'comments'
                      ? 'ring-2 ring-white/35 ring-offset-2 ring-offset-black'
                      : ''
                  }`}
                  aria-label="Bình luận"
                  aria-expanded={sidebarTab === 'comments' || mobilePanelOpen}
                  onClick={() => openSidePanel('comments')}
                >
                  <FaComment className="text-lg text-zinc-100" aria-hidden />
                </button>
                <span className="text-xs leading-none text-zinc-300">
                  {formatCompactCount(feedVideo.commentCount)}
                </span>
                </div>
                <div className={FEED_ACTION_ITEM_CLASS}>
                <button
                  ref={bookmarkButtonRef}
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
                <span className="text-xs leading-none text-zinc-300">
                  {formatCompactCount(feedVideo.bookmarkCount)}
                </span>
                </div>
                <div className={FEED_ACTION_ITEM_CLASS}>
                <button
                  type="button"
                  className={FEED_ROUND_ICON_BUTTON}
                  aria-label="Chia sẻ"
                  onClick={() => setShareOpen(true)}
                >
                  <IoArrowRedo aria-hidden />
                </button>
                <span className="text-xs leading-none text-zinc-300">
                  {formatCompactCount(feedVideo.shareCount)}
                </span>
                </div>
                {forYouStyle ? (
                  <button
                    type="button"
                    aria-label="Âm thanh đang phát"
                    className="relative flex h-11 w-11 cursor-pointer items-center justify-center overflow-hidden rounded-full border-2 border-white/35 bg-zinc-950 shadow-lg"
                    onClick={() => {
                      const rawAudioUrl = String(feedVideo?.audioUrl ?? '').trim()
                      if (!rawAudioUrl) return
                      const q = new URLSearchParams({
                        audioUrl: rawAudioUrl,
                        title: String(feedVideo?.audioTitle ?? '').trim(),
                        creator: resolveFeedAuthorDisplayName(feedVideo),
                      })
                      const av = String(feedVideo?.avatarUrl ?? '').trim()
                      if (av) q.set('creatorAvatar', av)
                      const un = String(feedVideo?.authorUsername ?? '')
                        .trim()
                        .replace(/^@/, '')
                      if (un) q.set('creatorUsername', un)
                      const sid = feedVideo?.publicId
                      if (isVideoPublicId(sid)) {
                        q.set('sourceVideoId', String(sid).toLowerCase())
                      }
                      navigate(`/sound?${q.toString()}`)
                    }}
                  >
                    <AvatarImage
                      src={feedVideo?.avatarUrl ?? FEED_DEFAULT_AUTHOR_AVATAR}
                      alt=""
                      fallbackSrc={FEED_DEFAULT_AUTHOR_AVATAR}
                      className="h-full w-full scale-110 object-cover animate-[spin_12s_linear_infinite]"
                    />
                  </button>
                ) : null}
                </div>
              </div>
            </div>
          ) : null}
        </div>

        {mobilePanelOpen ? (
          <button
            type="button"
            className={`fixed inset-0 z-[80] bg-black/60 ${watchChrome ? '' : 'lg:hidden'}`}
            aria-label="Đóng bình luận"
            onClick={() => setMobilePanelOpen(false)}
          />
        ) : null}

        <aside
          className={`relative z-0 flex h-full min-h-0 shrink-0 flex-col border-white/[0.08] bg-[#121212] text-zinc-100 ${
            mobilePanelOpen ? 'max-lg:fixed max-lg:inset-0 max-lg:z-[90] max-lg:flex max-lg:w-full max-lg:border-l-0 max-lg:pt-14' : 'max-lg:hidden'
          } ${
            watchChrome
              ? mobilePanelOpen
                ? 'lg:fixed lg:inset-y-0 lg:right-0 lg:z-[90] lg:flex lg:w-[clamp(380px,34vw,420px)] lg:border-l lg:pt-4'
                : 'lg:hidden'
              : 'lg:flex lg:border-l lg:pt-[4.5rem] lg:w-[clamp(380px,34vw,420px)]'
          }`}
          aria-label="Bình luận và gợi ý"
        >
          <div
            className={`flex shrink-0 items-center justify-end border-b border-white/[0.08] px-3 py-2 ${
              watchChrome ? '' : 'lg:hidden'
            }`}
          >
            <button
              type="button"
              className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full text-zinc-200 transition hover:bg-white/10"
              aria-label="Đóng"
              onClick={() => setMobilePanelOpen(false)}
            >
              <IoClose className="text-2xl" aria-hidden />
            </button>
          </div>
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
              onClick={() => openSidePanel('comments')}
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
              onClick={() => openSidePanel('related')}
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
                  {comments.map((comment) => {
                    const profileHref = comment.username
                      ? buildProfileHref(comment.username)
                      : null
                    const displayName = comment.username ?? 'user'
                    const avatarSrc =
                      comment.authorAvatarUrl?.trim() || DEFAULT_AVATAR

                    return (
                      <li key={comment.id} className="flex gap-2">
                        {profileHref ? (
                          <Link
                            to={profileHref}
                            className="shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-[#69C9D0]"
                            aria-label={`Xem trang cá nhân ${displayName}`}
                          >
                            <img
                              src={avatarSrc}
                              alt=""
                              className="h-9 w-9 rounded-full object-cover ring-1 ring-zinc-800"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.src = DEFAULT_AVATAR
                              }}
                            />
                          </Link>
                        ) : (
                          <img
                            src={avatarSrc}
                            alt=""
                            className="h-9 w-9 shrink-0 rounded-full object-cover ring-1 ring-zinc-800"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              e.currentTarget.src = DEFAULT_AVATAR
                            }}
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-zinc-300">
                            {profileHref ? (
                              <Link
                                to={profileHref}
                                className="hover:underline"
                              >
                                @{displayName}
                              </Link>
                            ) : (
                              <span>@{displayName}</span>
                            )}
                            <span className="ml-2 font-normal text-zinc-600">
                              {formatRelativeTimeVi(comment.createdAt)}
                            </span>
                          </p>
                          <p className="mt-0.5 whitespace-pre-wrap text-sm text-zinc-100">
                            {comment.content}
                          </p>
                        </div>
                      </li>
                    )
                  })}
                </ul>
              )
            ) : relatedLoading ? (
              <p className="px-3 py-12 text-center text-sm text-zinc-500">Đang tải gợi ý…</p>
            ) : related.length === 0 ? (
              <p className="px-3 py-12 text-center text-sm text-zinc-500">Chưa có gợi ý.</p>
            ) : relatedLayout === 'grid' ? (
              <ul className="grid grid-cols-2 gap-2 px-1">
                {related.map((row) => {
                  const id = videoPublicIdOf(row)
                  return (
                    <li key={id ?? row.id}>
                      <SuggestedGridVideoTile
                        video={row}
                        isPlaying={false}
                        onSelect={openRelatedVideo}
                      />
                    </li>
                  )
                })}
              </ul>
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
                    onChange={(e) => {
                      const { value, selectionStart } = e.target
                      setCommentDraft(value)
                      commentAccessoryRef.current?.syncMentionFromInput(
                        value,
                        selectionStart,
                      )
                    }}
                    onKeyUp={(e) => {
                      commentAccessoryRef.current?.syncMentionFromInput(
                        e.target.value,
                        e.target.selectionStart,
                      )
                    }}
                    onSelect={(e) => {
                      commentAccessoryRef.current?.syncMentionFromInput(
                        e.target.value,
                        e.target.selectionStart,
                      )
                    }}
                    placeholder={token ? 'Thêm bình luận...' : 'Đăng nhập để bình luận...'}
                    disabled={!token || !isVideoPublicId(publicId)}
                    className="w-full rounded-full border border-zinc-700 bg-zinc-900 py-2.5 pl-4 pr-[4.75rem] text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600 disabled:opacity-50"
                    onKeyDown={(e) => {
                      if (!isEnterKey(e) || e.nativeEvent.isComposing || e.shiftKey) return
                      e.preventDefault()
                      void submitComment()
                    }}
                  />
                  <CommentInputAccessoryButtons
                    ref={commentAccessoryRef}
                    inputRef={commentInputRef}
                    draft={commentDraft}
                    setDraft={setCommentDraft}
                    token={token}
                    mentionPlacement="above"
                  />
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

        <div className="shrink-0 lg:hidden">
          <MobileFeedBottomNav
            token={token}
            user={user}
            onSelectMenu={handleSidebarSelect}
          />
        </div>
      </div>

      <VideoShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        videoId={video?.publicId}
        authorUsername={video?.authorUsername}
        videoTitle={video?.title ?? ''}
        videoDescription={video?.description ?? ''}
        token={token}
        onShareCountChange={(shareCount) => {
          if (shareCount != null) patchVideo({ shareCount })
        }}
      />

      {forYouStyle ? (
        <>
          <BookmarkCollectionPopover
            open={bookmarkManageOpen}
            anchorRef={bookmarkButtonRef}
            onCreateCollection={openNewCollectionModal}
            onClose={() => setBookmarkManageOpen(false)}
          />
          <NewCollectionModal
            open={newCollectionOpen}
            onClose={() => setNewCollectionOpen(false)}
            token={token}
            initialPickVideoId={video?.publicId ?? null}
          />
        </>
      ) : null}

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
