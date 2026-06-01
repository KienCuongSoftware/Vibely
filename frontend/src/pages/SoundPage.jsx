import React, { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { BiDotsVerticalRounded } from 'react-icons/bi'
import { IoMusicalNotes, IoPause, IoPlay } from 'react-icons/io5'
import Hls from 'hls.js'
import { apiClient } from '../api/client'
import { useAuth } from '../state/useAuth'
import { isHlsPlaybackUrl, resolveFeedPlaybackUrl } from '../feed/feedPlayback.js'
import { normalizeVideoPublicId } from '../utils/videoPublicId.js'

export const DEFAULT_COVER = '/images/users/default-avatar.jpeg'

function soundProfilePath(username) {
  const raw = String(username ?? 'vibely')
    .trim()
    .replace(/^@/, '')
  return raw ? `/@${encodeURIComponent(raw)}` : ''
}

function resolveAuthorDisplayName(video) {
  const name = String(video?.authorDisplayName ?? '').trim()
  if (name) return name
  const u = String(video?.authorUsername ?? '')
    .trim()
    .replace(/^@/, '')
  return u || 'Vibely'
}

function hashtagPagePath(token) {
  const raw = String(token ?? '')
    .trim()
    .replace(/^#/, '')
  return raw ? `/tag/${encodeURIComponent(raw)}` : '/foryou'
}

function renderCaptionWithHashtags(text) {
  const s = String(text ?? '')
  if (!s) return null
  const parts = s.split(/([#@][^\s#@]+)/g)
  return parts.map((part, i) => {
    if (/^#[^\s#@]+$/.test(part)) {
      return (
        <Link
          key={i}
          to={hashtagPagePath(part)}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-sky-400 transition hover:text-sky-300 hover:underline"
        >
          {part}
        </Link>
      )
    }
    if (/^@[^\s#@]+$/.test(part)) {
      return (
        <Link
          key={i}
          to={`/@${encodeURIComponent(part.slice(1))}`}
          onClick={(e) => e.stopPropagation()}
          className="font-semibold text-sky-400 transition hover:text-sky-300 hover:underline"
        >
          {part}
        </Link>
      )
    }
    return <React.Fragment key={i}>{part}</React.Fragment>
  })
}

/** Popover bên cạnh thẻ — không nút; đóng khi mouseleave vùng thẻ (kèm cầu nối hover). */
function SoundVideoDetailPopover({
  video,
  formatCount,
  soundPageHref,
  soundOwnerVibelyId,
  side = 'right',
}) {
  if (!video) return null
  const rawUser = String(video.authorUsername ?? 'vibely')
    .trim()
    .replace(/^@/, '')
  const ownerId = String(soundOwnerVibelyId ?? '')
    .trim()
    .replace(/^@/, '')
  const soundLine = ownerId
    ? `nhạc nền - ${ownerId}`
    : video.audioTitle?.trim() || `nhạc nền - ${rawUser}`
  const avatar =
    String(video.authorAvatarUrl ?? video.avatarUrl ?? '').trim() ||
    String(video.thumbnailUrl ?? '').trim() ||
    DEFAULT_COVER
  const caption =
    String(video.description ?? '').trim() || String(video.title ?? '').trim()
  const profile = soundProfilePath(rawUser)

  return (
    <div
      role="dialog"
      aria-label="Chi tiết video"
      className={`pointer-events-auto relative z-[80] w-[min(400px,calc(100vw-2rem))] max-w-[400px] rounded-xl border border-white/12 bg-[#1f1f1f] p-5 text-left shadow-2xl ring-1 ring-black/40 before:pointer-events-none before:absolute before:top-1/2 before:z-10 before:-translate-y-1/2 before:border-y-[8px] before:border-y-transparent before:content-[''] ${
        side === 'left'
          ? "before:right-0 before:translate-x-full before:border-l-[10px] before:border-l-[#1f1f1f]"
          : "before:left-0 before:-translate-x-full before:border-r-[10px] before:border-r-[#1f1f1f]"
      }`}
    >
      {profile ? (
        <Link
          to={profile}
          className="-m-1 flex items-start gap-3 rounded-lg p-1 transition hover:bg-white/[0.07] focus:outline-none focus-visible:ring-2 focus-visible:ring-white/35"
          aria-label={`Hồ sơ ${rawUser}`}
        >
          <img
            src={avatar}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full border border-white/12 object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0 flex-1 pt-1">
            <p className="truncate text-[15px] font-bold leading-tight text-white">
              {rawUser}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-zinc-400">
              {resolveAuthorDisplayName(video)}
            </p>
          </div>
        </Link>
      ) : (
        <div className="flex items-start gap-3">
          <img
            src={avatar}
            alt=""
            className="h-10 w-10 shrink-0 rounded-full border border-white/12 object-cover"
            referrerPolicy="no-referrer"
          />
          <div className="min-w-0 flex-1 pt-1">
            <p className="truncate text-[15px] font-bold leading-tight text-white">
              {rawUser}
            </p>
            <p className="mt-0.5 truncate text-[12px] text-zinc-400">
              {resolveAuthorDisplayName(video)}
            </p>
          </div>
        </div>
      )}
      {caption ? (
        <p className="mt-3 text-[13px] leading-snug text-white/95">
          {renderCaptionWithHashtags(caption)}
        </p>
      ) : null}
      <div className="mt-2.5 flex items-start gap-2 text-[13px] text-zinc-200">
        <IoMusicalNotes
          className="mt-0.5 shrink-0 text-lg text-zinc-500"
          aria-hidden
        />
        {soundPageHref ? (
          <Link
            to={soundPageHref}
            className="min-w-0 leading-snug text-sky-400 transition hover:text-sky-300 hover:underline"
          >
            {soundLine}
          </Link>
        ) : (
          <span className="min-w-0 leading-snug">{soundLine}</span>
        )}
      </div>
      <div className="mt-4 grid grid-cols-3 divide-x divide-white/10 border-t border-white/10 pt-3 text-center">
        <div>
          <p className="text-[15px] font-bold tabular-nums text-white">
            {formatCount(video.likeCount)}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">Thích</p>
        </div>
        <div>
          <p className="text-[15px] font-bold tabular-nums text-white">
            {formatCount(video.commentCount)}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">Bình luận</p>
        </div>
        <div>
          <p className="text-[15px] font-bold tabular-nums text-white">
            {formatCount(video.shareCount)}
          </p>
          <p className="mt-0.5 text-[11px] text-zinc-500">Chia sẻ</p>
        </div>
      </div>
    </div>
  )
}

function parseSourceVideoPublicId(raw) {
  return normalizeVideoPublicId(raw)
}

function formatCompactCount(value) {
  const count = Number(value ?? 0)
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(count)
}

/** Preview card: chỉ phát khi `playing`; rời chuột không tự reset, chỉ đổi khi hover ô khác. */
function SoundGridMedia({
  item: video,
  playing = false,
  coverFallback,
}) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const playbackUrl = resolveFeedPlaybackUrl(video)
  const thumb = String(video?.thumbnailUrl ?? '').trim()
  const poster = thumb || coverFallback || DEFAULT_COVER
  const [videoReady, setVideoReady] = useState(false)

  useEffect(() => {
    if (!playing) {
      setVideoReady(false)
    }
  }, [playing, playbackUrl])

  useEffect(() => {
    const el = videoRef.current
    if (!el || !playbackUrl || !playing) return undefined

    let cancelled = false
    const destroyHls = () => {
      if (hlsRef.current) {
        try {
          hlsRef.current.destroy()
        } catch {
          /* noop */
        }
        hlsRef.current = null
      }
    }

    const tryPlay = () => {
      if (cancelled) return
      const playback = el.play()
      if (playback?.catch) playback.catch(() => {})
    }

    const markReady = () => {
      if (!cancelled) setVideoReady(true)
    }

    if (isHlsPlaybackUrl(playbackUrl)) {
      if (Hls.isSupported()) {
        const hls = new Hls({
          enableWorker: true,
          maxBufferLength: 8,
          maxMaxBufferLength: 12,
          backBufferLength: 0,
        })
        hlsRef.current = hls
        hls.loadSource(playbackUrl)
        hls.attachMedia(el)
        hls.on(Hls.Events.MANIFEST_PARSED, () => {
          markReady()
          tryPlay()
        })
        return () => {
          cancelled = true
          destroyHls()
          try {
            el.pause()
            el.removeAttribute('src')
            el.load()
          } catch {
            /* noop */
          }
        }
      }
      if (el.canPlayType('application/vnd.apple.mpegurl')) {
        el.src = playbackUrl
        el.addEventListener('canplay', markReady)
        tryPlay()
        return () => {
          cancelled = true
          el.removeEventListener('canplay', markReady)
          try {
            el.pause()
            el.removeAttribute('src')
            el.load()
          } catch {
            /* noop */
          }
        }
      }
    }

    el.src = playbackUrl
    el.addEventListener('loadeddata', markReady)
    el.addEventListener('canplay', markReady)
    tryPlay()
    return () => {
      cancelled = true
      destroyHls()
      el.removeEventListener('loadeddata', markReady)
      el.removeEventListener('canplay', markReady)
      try {
        el.pause()
        el.removeAttribute('src')
        el.load()
      } catch {
        /* noop */
      }
    }
  }, [playing, playbackUrl])

  const thumbNode = (
    <img
      src={poster}
      alt=""
      loading="lazy"
      className="h-full w-full object-cover"
      referrerPolicy="no-referrer"
      onError={(e) => {
        e.currentTarget.src = DEFAULT_COVER
      }}
    />
  )

  if (playbackUrl && playing) {
    return (
      <>
        {!videoReady ? <div className="absolute inset-0">{thumbNode}</div> : null}
        <video
          ref={videoRef}
          poster={poster || undefined}
          muted
          loop
          playsInline
          preload="none"
          className="h-full w-full object-cover"
        />
      </>
    )
  }

  return thumbNode
}

/** Thumbnail + VibelyID trên video; mô tả + ⋮ (chỉ khi hover mô tả); popover bên phải khi bấm ⋮. */
export function SoundGridVideoCard({
  video,
  coverFallback,
  wideSource,
  soundPageHref,
  soundOwnerVibelyId,
  narrowWidthClass = 'max-w-[96px]',
  playing = false,
  onHoverPreview,
}) {
  const [popoverOpen, setPopoverOpen] = useState(false)
  const [popoverSide, setPopoverSide] = useState('right')
  const cardRef = useRef(null)
  const triggerRef = useRef(null)
  const [popoverAnchorTop, setPopoverAnchorTop] = useState(null)
  const [popoverAnchorLeft, setPopoverAnchorLeft] = useState(null)
  const [popoverAnchorRight, setPopoverAnchorRight] = useState(null)

  const updatePopoverSide = React.useCallback(() => {
    const cardRect = cardRef.current?.getBoundingClientRect()
    const triggerRect = triggerRef.current?.getBoundingClientRect()
    if (!cardRect || !triggerRect) return
    const popoverGapPx = 4
    const viewportWidth =
      globalThis.window?.innerWidth ?? document.documentElement.clientWidth ?? 0
    const estimatedPopoverWidth = Math.min(416, Math.max(viewportWidth - 24, 0))
    const roomRight = viewportWidth - triggerRect.right
    const roomLeft = triggerRect.left
    const anchorTop = triggerRect.top - cardRect.top + triggerRect.height / 2

    setPopoverAnchorTop(anchorTop)
    setPopoverAnchorLeft(triggerRect.right - cardRect.left + popoverGapPx)
    setPopoverAnchorRight(cardRect.right - triggerRect.left + popoverGapPx)

    if (roomRight >= estimatedPopoverWidth || roomRight >= roomLeft) {
      setPopoverSide('right')
      return
    }
    setPopoverSide('left')
  }, [])

  useEffect(() => {
    if (!popoverOpen) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') setPopoverOpen(false)
    }
    const onResize = () => updatePopoverSide()
    updatePopoverSide()
    document.addEventListener('keydown', onKey)
    globalThis.window?.addEventListener('resize', onResize)
    return () => {
      document.removeEventListener('keydown', onKey)
      globalThis.window?.removeEventListener('resize', onResize)
    }
  }, [popoverOpen, updatePopoverSide])

  const rawUser = String(video.authorUsername ?? 'vibely')
    .trim()
    .replace(/^@/, '')
  const profile = soundProfilePath(rawUser)
  const oneLine =
    String(video.description ?? '').trim() ||
    String(video.title ?? '').trim() ||
    '\u00A0'
  const poster =
    String(video.thumbnailUrl ?? '').trim() || coverFallback || DEFAULT_COVER
  const overlayAvatar =
    String(video.authorAvatarUrl ?? video.avatarUrl ?? '').trim() || poster

  const thumb = (
    <>
      <Link
        to="/foryou"
        state={{ focusVideoPublicId: video.publicId }}
        className="absolute inset-0 z-0 block"
        aria-label="Mở video trong feed"
      />
      <div className="pointer-events-none relative z-[1] h-full w-full">
        <SoundGridMedia
          item={video}
          playing={playing}
          coverFallback={coverFallback}
        />
      </div>
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] bg-linear-to-t from-black/75 via-black/15 to-transparent px-2 pb-1.5 pt-5">
        <div className="pointer-events-auto inline-flex max-w-[calc(100%-4px)] items-center">
          {profile ? (
            <Link
              to={profile}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex max-w-full items-center gap-1.5 transition hover:opacity-90"
              aria-label={`Hồ sơ ${rawUser}`}
            >
              <img
                src={overlayAvatar}
                alt=""
                className="h-6 w-6 shrink-0 rounded-full object-cover shadow-[0_2px_10px_rgba(0,0,0,0.55)]"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_COVER
                }}
              />
              <span className="truncate text-[11px] font-bold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.95),0_0_1px_rgba(0,0,0,0.8)]">
                {rawUser}
              </span>
            </Link>
          ) : (
            <span className="inline-flex max-w-full items-center gap-1.5">
              <img
                src={overlayAvatar}
                alt=""
                className="h-6 w-6 shrink-0 rounded-full object-cover shadow-[0_2px_10px_rgba(0,0,0,0.55)]"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_COVER
                }}
              />
              <span className="truncate text-[11px] font-bold text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.95),0_0_1px_rgba(0,0,0,0.8)]">
                {rawUser}
              </span>
            </span>
          )}
        </div>
      </div>
    </>
  )

  const frameClass = wideSource
    ? 'relative aspect-9/16 w-[min(200px,55vw)] overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-zinc-800 transition hover:ring-zinc-600'
    : `relative mx-auto aspect-9/16 w-full ${narrowWidthClass} overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-800 transition hover:ring-zinc-600`

  const descRowClass = wideSource
    ? 'mt-2 w-[min(200px,55vw)]'
    : `mt-1.5 w-full ${narrowWidthClass} mx-auto`

  return (
    <div
      ref={cardRef}
      className={
        wideSource
          ? 'relative inline-flex max-w-full flex-col'
          : 'relative flex w-full flex-col'
      }
      onMouseEnter={() => {
        if (video?.publicId != null) {
          onHoverPreview?.(video.publicId)
        }
      }}
      onMouseLeave={() => setPopoverOpen(false)}
    >
      <div className={frameClass}>{thumb}</div>
      <div
        className={`group/desc flex min-w-0 cursor-default items-start gap-0.5 rounded-md px-0.5 py-0.5 transition-colors hover:bg-white/[0.06] ${descRowClass}`}
      >
        <p className="line-clamp-1 flex-1 text-[11px] leading-snug text-zinc-400 group-hover/desc:text-zinc-200">
          {renderCaptionWithHashtags(oneLine)}
        </p>
        <button
          ref={triggerRef}
          type="button"
          aria-label="Chi tiết video"
          aria-expanded={popoverOpen}
          className="shrink-0 rounded-full p-0.5 text-lg text-zinc-300 opacity-0 transition-opacity hover:bg-white/10 hover:text-white group-hover/desc:opacity-100 group-focus-within/desc:opacity-100 focus:opacity-100 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30"
          onClick={(e) => {
            e.preventDefault()
            if (!popoverOpen) {
              updatePopoverSide()
            }
            setPopoverOpen((o) => !o)
          }}
        >
          <BiDotsVerticalRounded aria-hidden className="block h-[18px] w-[18px]" />
        </button>
      </div>
      {popoverOpen ? (
        <div
          className="pointer-events-auto absolute z-[68] -translate-y-1/2"
          style={{
            top: popoverAnchorTop ?? '50%',
            ...(popoverSide === 'left'
              ? { right: popoverAnchorRight ?? undefined }
              : { left: popoverAnchorLeft ?? undefined }),
          }}
        >
          {popoverSide === 'left' ? (
            <SoundVideoDetailPopover
              video={video}
              formatCount={formatCompactCount}
              soundPageHref={soundPageHref}
              soundOwnerVibelyId={soundOwnerVibelyId}
              side="left"
            />
          ) : (
            <SoundVideoDetailPopover
              video={video}
              formatCount={formatCompactCount}
              soundPageHref={soundPageHref}
              soundOwnerVibelyId={soundOwnerVibelyId}
              side="right"
            />
          )}
        </div>
      ) : null}
    </div>
  )
}

export function SoundPage() {
  const { token } = useAuth()
  const [searchParams] = useSearchParams()
  const audioUrl = String(searchParams.get('audioUrl') ?? '').trim()
  const audioTitleFromQuery = String(searchParams.get('title') ?? '').trim()
  const creatorFromQuery = String(searchParams.get('creator') ?? '').trim()
  const creatorAvatarFromQuery = String(
    searchParams.get('creatorAvatar') ?? '',
  ).trim()
  const creatorUsernameFromQuery = String(
    searchParams.get('creatorUsername') ?? '',
  )
    .trim()
    .replace(/^@/, '')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const sourceVideoId = useMemo(
    () => parseSourceVideoPublicId(searchParams.get('sourceVideoId')),
    [searchParams],
  )
  const [sourceVideo, setSourceVideo] = useState(null)
  const [sourceLoading, setSourceLoading] = useState(false)
  const [sourceError, setSourceError] = useState('')
  const soundAudioRef = useRef(null)
  const [soundPlaying, setSoundPlaying] = useState(false)
  const [soundGridPlayingId, setSoundGridPlayingId] = useState(null)

  useEffect(() => {
    const el = soundAudioRef.current
    if (!el) return undefined
    const onPlay = () => setSoundPlaying(true)
    const onPause = () => setSoundPlaying(false)
    const onEnded = () => setSoundPlaying(false)
    el.addEventListener('play', onPlay)
    el.addEventListener('pause', onPause)
    el.addEventListener('ended', onEnded)
    return () => {
      el.removeEventListener('play', onPlay)
      el.removeEventListener('pause', onPause)
      el.removeEventListener('ended', onEnded)
    }
  }, [audioUrl])

  useEffect(() => {
    const el = soundAudioRef.current
    if (!el) return
    el.pause()
    el.currentTime = 0
    setSoundPlaying(false)
  }, [audioUrl])

  useEffect(() => {
    return () => {
      soundAudioRef.current?.pause()
    }
  }, [])

  useEffect(() => {
    if (sourceVideoId == null) {
      setSourceVideo(null)
      setSourceError('')
      setSourceLoading(false)
      return undefined
    }
    let cancelled = false
    setSourceLoading(true)
    setSourceError('')
    apiClient
      .getVideo(sourceVideoId, { token })
      .then((v) => {
        if (!cancelled) setSourceVideo(v)
      })
      .catch((e) => {
        if (!cancelled) {
          setSourceVideo(null)
          setSourceError(e?.message || 'Không tải được video gốc.')
        }
      })
      .finally(() => {
        if (!cancelled) setSourceLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [sourceVideoId, token])

  useEffect(() => {
    if (!audioUrl) return
    let cancelled = false
    setLoading(true)
    setError('')
    apiClient
      .getVideosBySound(audioUrl, { page: 0, size: 60 })
      .then((res) => {
        if (!cancelled) setItems(Array.isArray(res?.items) ? res.items : [])
      })
      .catch((e) => {
        if (!cancelled) setError(e?.message || 'Không tải được danh sách âm thanh.')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [audioUrl])

  const creatorAvatar = useMemo(() => {
    const fromItem = String(items[0]?.authorAvatarUrl ?? '').trim()
    return fromItem || creatorAvatarFromQuery
  }, [items, creatorAvatarFromQuery])

  const cover = useMemo(() => {
    if (creatorAvatar) return creatorAvatar
    if (items[0]?.thumbnailUrl?.trim()) return items[0].thumbnailUrl.trim()
    const st = String(sourceVideo?.thumbnailUrl ?? '').trim()
    if (st) return st
    return DEFAULT_COVER
  }, [items, creatorAvatar, sourceVideo])

  const title = items[0]?.audioTitle || audioTitleFromQuery || 'Âm thanh gốc'
  const creator = items[0]?.authorDisplayName || creatorFromQuery || 'Nhà sáng tạo'
  const creatorUsername = String(items[0]?.authorUsername ?? '')
    .trim()
    .replace(/^@/, '')
  const creatorUsernameResolved =
    creatorUsername || creatorUsernameFromQuery
  const creatorProfileHref = creatorUsernameResolved
    ? `/@${encodeURIComponent(creatorUsernameResolved)}`
    : ''
  const heroVideo = useMemo(() => {
    const fromItem = String(items[0]?.videoUrl ?? '').trim()
    if (fromItem) return fromItem
    return String(sourceVideo?.videoUrl ?? '').trim()
  }, [items, sourceVideo])

  /** API có thể trả 0 bài; video gốc từ query vẫn hiển thị — cộng vào số đếm nếu chưa có trong danh sách. */
  const displayedVideoCount = useMemo(() => {
    const ids = new Set(items.map((v) => String(v.publicId)))
    let n = items.length
    const sourcePublicId = normalizeVideoPublicId(sourceVideo?.publicId)
    if (
      sourcePublicId &&
      String(sourceVideo.videoUrl ?? '').trim() !== '' &&
      !ids.has(sourcePublicId)
    ) {
      n += 1
    }
    return n
  }, [items, sourceVideo])

  const soundPageHref = useMemo(() => {
    const q = searchParams.toString()
    return q ? `/sound?${q}` : null
  }, [searchParams])

  const soundOwnerVibelyId = useMemo(() => {
    const r = String(creatorUsernameResolved ?? '')
      .trim()
      .replace(/^@/, '')
    if (r) return r
    const i = String(items[0]?.authorUsername ?? '')
      .trim()
      .replace(/^@/, '')
    if (i) return i
    return String(creatorUsernameFromQuery ?? '')
      .trim()
      .replace(/^@/, '')
  }, [creatorUsernameResolved, items, creatorUsernameFromQuery])

  const soundGridVideoIds = useMemo(() => {
    const ids = items.map((v) => v?.publicId).filter(Boolean)
    if (ids.length > 0) return ids
    const sourceId = sourceVideo?.publicId
    return sourceId && String(sourceVideo?.videoUrl ?? '').trim() ? [sourceId] : []
  }, [items, sourceVideo?.publicId, sourceVideo?.videoUrl])

  useEffect(() => {
    setSoundGridPlayingId((prev) => {
      if (prev != null && soundGridVideoIds.includes(prev)) {
        return prev
      }
      return null
    })
  }, [soundGridVideoIds])

  const focusSoundGridVideo = React.useCallback((publicId) => {
    if (publicId == null) return
    setSoundGridPlayingId(publicId)
  }, [])

  return (
    <div className="scrollbar-none h-dvh max-h-dvh overflow-y-auto overscroll-y-contain bg-black text-zinc-100">
      <audio
        ref={soundAudioRef}
        src={audioUrl || undefined}
        preload="metadata"
        className="hidden"
      />
      <div className="relative overflow-hidden border-b border-zinc-800/90">
        {heroVideo ? (
          <video
            src={heroVideo}
            poster={cover}
            muted
            autoPlay
            loop
            playsInline
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30 blur-xl"
          />
        ) : (
          <img
            src={cover}
            alt=""
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30 blur-xl"
          />
        )}
        <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/75 to-black" />
        <div className="relative mx-auto w-full max-w-[1200px] px-4 py-5">
          <header className="mt-2 flex flex-wrap items-start gap-4">
            <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-lg ring-1 ring-zinc-700">
              <img
                src={cover}
                alt=""
                className="h-full w-full object-cover"
                referrerPolicy="no-referrer"
                onError={(e) => {
                  e.currentTarget.src = DEFAULT_COVER
                }}
              />
              <button
                type="button"
                disabled={!audioUrl}
                aria-label={soundPlaying ? 'Tạm dừng âm thanh' : 'Phát âm thanh'}
                className="absolute inset-0 flex items-center justify-center bg-black/35 transition hover:bg-black/45 disabled:cursor-not-allowed disabled:opacity-40"
                onClick={() => {
                  const el = soundAudioRef.current
                  if (!el || !audioUrl) return
                  if (soundPlaying) {
                    el.pause()
                  } else {
                    void el.play().catch(() => {})
                  }
                }}
              >
                {soundPlaying ? (
                  <IoPause
                    aria-hidden
                    className="h-11 w-11 shrink-0 text-white drop-shadow-md"
                  />
                ) : (
                  <IoPlay
                    aria-hidden
                    className="h-11 w-11 shrink-0 translate-x-0.5 text-white drop-shadow-md"
                  />
                )}
              </button>
            </div>
            <div className="min-w-0 flex-1">
              <h1 className="line-clamp-2 text-[clamp(22px,3.2vw,42px)] font-extrabold leading-[1.08] tracking-tight">
                {title}
              </h1>
              {creatorProfileHref ? (
                <Link
                  to={creatorProfileHref}
                  className="mt-1 inline-block text-lg italic text-zinc-200 transition hover:text-white hover:underline"
                >
                  {creator}
                </Link>
              ) : (
                <p className="mt-1 text-lg italic text-zinc-200">{creator}</p>
              )}
              <p className="mt-1 text-xs text-zinc-400">
                {displayedVideoCount}{' '}
                {displayedVideoCount === 1 ? 'video' : 'videos'}
              </p>
            </div>
          </header>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1200px] px-4 py-6">
        <section>
          {loading ? <p className="text-zinc-400">Đang tải video…</p> : null}
          {error ? <p className="text-red-400">{error}</p> : null}
          {!loading && !error && items.length === 0 ? (
            <div className="space-y-5">
              {sourceVideoId != null && sourceLoading ? (
                <p className="text-zinc-400">Đang tải video gốc…</p>
              ) : null}
              {sourceVideoId != null && sourceError && !sourceVideo ? (
                <p className="text-sm text-red-400/90">{sourceError}</p>
              ) : null}
              {sourceVideo?.videoUrl?.trim() ? (
                <SoundGridVideoCard
                  video={sourceVideo}
                  coverFallback={cover}
                  wideSource
                  soundPageHref={soundPageHref}
                  soundOwnerVibelyId={soundOwnerVibelyId}
                  playing={sourceVideo?.publicId === soundGridPlayingId}
                  onHoverPreview={focusSoundGridVideo}
                />
              ) : null}
              {!sourceLoading &&
              !sourceVideo?.videoUrl?.trim() &&
              !(sourceVideoId != null && sourceError) ? (
                <p className="text-zinc-500">
                  Chưa có video nào dùng âm thanh này.
                </p>
              ) : null}
            </div>
          ) : null}
          {items.length > 0 ? (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {items.map((v) => (
                <SoundGridVideoCard
                  key={String(v.publicId)}
                  video={v}
                  coverFallback={cover}
                  wideSource={false}
                  soundPageHref={soundPageHref}
                  soundOwnerVibelyId={soundOwnerVibelyId}
                  playing={v.publicId === soundGridPlayingId}
                  onHoverPreview={focusSoundGridVideo}
                />
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

