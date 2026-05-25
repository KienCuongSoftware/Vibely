import React from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import {
  watchTimeNearPlaythroughEnd,
  watchTimeQualifiesForViewRecord,
} from '../utils/watchQualifiesForViewRecord'
import { Sidebar } from '../components/Sidebar'
import { TooltipHoverWrap } from '../components/TooltipControls'
import { AccountActionsPill } from '../components/AccountActionsPill'
import { VideoShareModal } from '../components/VideoShareModal'
import { useAuth } from '../state/useAuth'
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
  IoCompass,
  IoEllipsisHorizontal,
  IoHappyOutline,
  IoHeart,
  IoHeartOutline,
  IoHome,
  IoLogOutOutline,
  IoMusicalNotes,
  IoNotifications,
  IoPaperPlane,
  IoPeople,
  IoPerson,
  IoShareOutline,
  IoVideocam,
} from 'react-icons/io5'
import { MdOutlineFileUpload } from 'react-icons/md'

const DEFAULT_USER_AVATAR_URL = '/images/users/default-avatar.jpeg'

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

export function VideoWatchPage() {
  const { username: usernameParam, publicId: publicIdParam } = useParams()
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
  const accountMenuRef = useRef(null)

  const routeSlug = useMemo(() => normalizeUsernameKey(usernameParam), [usernameParam])
  const publicIdFromRoute = useMemo(
    () => normalizeVideoPublicId(publicIdParam),
    [publicIdParam],
  )

  const menuItems = useMemo(
    () => [
      { id: 'latest', label: 'Đề xuất', icon: IoHome },
      { id: 'explore', label: 'Khám phá', icon: IoCompass },
      { id: 'following', label: 'Đã follow', icon: IoPeople },
      ...(token
        ? [
            { id: 'friends', label: 'Bạn bè', icon: IoPeople },
            { id: 'messages', label: 'Tin nhắn', icon: IoPaperPlane },
            { id: 'activity', label: 'Hoạt động', icon: IoNotifications },
          ]
        : []),
      { id: 'live', label: 'LIVE', icon: IoVideocam },
      { id: 'upload', label: 'Tải lên', icon: MdOutlineFileUpload },
      { id: 'profile', label: 'Hồ sơ', icon: IoPerson },
      { id: 'more', label: 'Thêm', icon: IoEllipsisHorizontal },
    ],
    [token],
  )

  const handleSelectMenu = (id) => {
    if (id === 'more') return
    if (id === 'profile') {
      if (!token) {
        navigate('/login')
        return
      }
      navigate('/profile')
      return
    }
    if (id === 'upload') {
      navigate('/vibelystudio/upload')
      return
    }
    navigate('/foryou')
  }

  const profileBackPath = useMemo(() => {
    const slug = routeSlug
    return slug ? `/@${encodeURIComponent(slug)}` : '/foryou'
  }, [routeSlug])

  const authorProfilePath = useMemo(() => {
    const a = video?.authorUsername
    const slug = normalizeUsernameKey(a)
    return slug ? `/@${encodeURIComponent(slug)}` : profileBackPath
  }, [video?.authorUsername, profileBackPath])

  useEffect(() => {
    if (!publicIdFromRoute) {
      setLoading(false)
      setLoadError('Liên kết video không hợp lệ.')
      setVideo(null)
      return
    }
    let cancelled = false
    setLoading(true)
    setLoadError('')
    apiClient
      .getVideo(publicIdFromRoute, { token })
      .then((v) => {
        if (cancelled) return
        setVideo(v)
        const authorKey = normalizeUsernameKey(v?.authorUsername)
        const canonical = buildProfileVideoUrl(authorKey, videoPublicIdOf(v))
        if (canonical && routeSlug && authorKey !== routeSlug) {
          navigate(canonical, {
            replace: true,
          })
        }
      })
      .catch((e) => {
        if (cancelled) return
        setVideo(null)
        setLoadError(e instanceof Error ? e.message : 'Không tải được video.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [publicIdFromRoute, token, navigate, routeSlug])

  useEffect(() => {
    watchQualifySentRef.current = false
    watchPlaythroughSentRef.current = false
    const el = videoRef.current
    if (!el || !isWatchableVideo(video)) return undefined
    const key = String(video.publicId)
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
          })
          .catch(() => {
            watchPlaythroughSentRef.current = false
          })
        return
      }

      if (watchQualifySentRef.current) return
      if (!watchTimeQualifiesForViewRecord(watchedMs, durationMs)) return
      watchQualifySentRef.current = true
      apiClient
        .recordVideoView(key, {
          watchedMs,
          ...(durationMs != null ? { durationMs } : {}),
        })
        .catch(() => {
          watchQualifySentRef.current = false
        })
    }
    el.addEventListener('timeupdate', onPlaybackSample)
    el.addEventListener('seeked', onPlaybackSample)
    el.addEventListener('ended', onPlaybackSample)
    return () => {
      el.removeEventListener('timeupdate', onPlaybackSample)
      el.removeEventListener('seeked', onPlaybackSample)
      el.removeEventListener('ended', onPlaybackSample)
    }
  }, [video?.publicId])

  useEffect(() => {
    if (!token || !isWatchableVideo(video)) return
    let cancelled = false
    apiClient
      .getVideoMeState(video.publicId, token)
      .then((s) => {
        if (cancelled || !s) return
        setLiked(Boolean(s.liked))
        setBookmarked(Boolean(s.bookmarked))
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [token, video?.publicId])

  useEffect(() => {
    if (!isWatchableVideo(video)) return
    let cancelled = false
    setCommentsLoading(true)
    setCommentsError('')
    apiClient
      .getComments(video.publicId, { token })
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
  }, [video?.publicId, token])

  useEffect(() => {
    document.title = video?.title
      ? `${String(video.title).slice(0, 40)} | Vibely`
      : 'Video | Vibely'
  }, [video?.title])

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

  const caption = watchPageCaption(video ?? {})

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
    if (!isWatchableVideo(video)) return
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

  return (
    <section className="flex h-dvh min-h-0 bg-black text-zinc-100">
      <Sidebar
        menuItems={menuItems}
        activeMenu="latest"
        onSelectMenu={handleSelectMenu}
        token={token}
        user={user}
        onLogout={token ? logout : undefined}
      />

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

        <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
          <div className="relative flex min-h-[42vh] flex-1 items-center justify-center bg-black lg:min-h-0">
            {loading ? (
              <p className="text-sm text-zinc-500">Đang tải video…</p>
            ) : loadError ? (
              <div className="max-w-sm px-6 text-center">
                <p className="text-sm text-red-400">{loadError}</p>
                <Link
                  to={profileBackPath}
                  className="mt-4 inline-block rounded-full border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-900"
                >
                  Quay lại
                </Link>
              </div>
            ) : video?.videoUrl ? (
              <video
                key={String(video.publicId)}
                ref={videoRef}
                src={video.videoUrl}
                controls
                playsInline
                muted
                autoPlay
                className="max-h-[min(88dvh,920px)] w-full max-w-md rounded-lg bg-zinc-950 ring-1 ring-zinc-800"
                poster={video.thumbnailUrl?.trim() ? video.thumbnailUrl : undefined}
              />
            ) : (
              <p className="text-sm text-zinc-500">Video chưa sẵn sàng phát.</p>
            )}
          </div>

          <aside className="flex h-[min(52dvh,520px)] w-full shrink-0 flex-col border-t border-zinc-800 bg-black lg:h-auto lg:max-h-none lg:w-[min(420px,40vw)] lg:border-l lg:border-t-0">
            {!video || loading ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <p className="text-sm text-zinc-500">…</p>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-start gap-3 border-b border-zinc-800 p-4 pr-12">
                  <Link to={authorProfilePath} className="shrink-0">
                    <img
                      src={
                        video.authorAvatarUrl?.trim()
                          ? video.authorAvatarUrl
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
                        {String(video.authorDisplayName ?? '').trim() || 'Nhà sáng tạo'}
                      </Link>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {formatRelativeTime(video.createdAt)}
                      </span>
                    </div>
                    <p className="truncate text-xs text-zinc-400">
                      @{normalizeUsernameKey(video.authorUsername) || 'user'}
                    </p>
                    {caption ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-snug text-zinc-200">
                        {caption}
                      </p>
                    ) : null}
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
                      <IoMusicalNotes className="shrink-0 text-base text-zinc-500" aria-hidden />
                      <span className="truncate">
                        {video.audioTitle?.trim()
                          ? video.audioTitle
                          : `Âm thanh gốc — ${String(video.authorDisplayName ?? '').trim() || 'Nhà sáng tạo'}`}
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
                      if (!token || !isWatchableVideo(video)) {
                        if (!token) navigate('/login')
                        return
                      }
                      const next = !liked
                      const prevCount = Number(video.likeCount ?? 0)
                      setLiked(next)
                      patchVideo({ likeCount: Math.max(0, prevCount + (next ? 1 : -1)) })
                      const req = next
                        ? apiClient.likeVideo(video.publicId, token)
                        : apiClient.unlikeVideo(video.publicId, token)
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
                      {formatCompactCount(video.likeCount ?? 0)}
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
                      {formatCompactCount(video.commentCount ?? 0)}
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
                      if (!token || !isWatchableVideo(video)) {
                        if (!token) navigate('/login')
                        return
                      }
                      const next = !bookmarked
                      const prevCount = Number(video.bookmarkCount ?? 0)
                      setBookmarked(next)
                      patchVideo({ bookmarkCount: Math.max(0, prevCount + (next ? 1 : -1)) })
                      const req = next
                        ? apiClient.bookmarkVideo(video.publicId, token)
                        : apiClient.unbookmarkVideo(video.publicId, token)
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
                      {formatCompactCount(video.bookmarkCount ?? 0)}
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
                      {formatCompactCount(video.shareCount ?? 0)}
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
                      ({formatCompactCount(video.commentCount ?? 0)})
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
                              {c.content}
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
                        disabled={!token || !isWatchableVideo(video)}
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
                      disabled={!commentDraft.trim() || !token || !isWatchableVideo(video)}
                      onClick={async () => {
                        const text = commentDraft.trim()
                        if (!text || !token || !isWatchableVideo(video)) return
                        setCommentPostError('')
                        try {
                          const created = await apiClient.addComment(video.publicId, text, token)
                          setCommentDraft('')
                          setComments((prev) => [created, ...prev])
                          const prevCc = Number(video.commentCount ?? 0)
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
        videoId={video?.publicId}
        videoTitle={video?.title ?? ''}
        token={token}
        onShareCountChange={handleShareCountChange}
      />
    </section>
  )
}
