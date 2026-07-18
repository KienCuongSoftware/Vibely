import React from 'react'
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import {
  watchTimeNearPlaythroughEnd,
  watchTimeQualifiesForViewRecord,
} from '../utils/watchQualifiesForViewRecord'
import { TooltipHoverWrap } from '../components/TooltipControls'
import { feedPrefetchManager } from '../feed/FeedPrefetchManager.js'
import { resolveFeedPlaybackUrl } from '../feed/feedPlayback.js'
import { useAuth } from '../state/useAuth'
import { useRapidStepNavigation } from '../hooks/useRapidStepNavigation.js'
import {
  buildProfileVideoUrl,
  buildProfileWatchUrl,
  isVideoPublicId,
  normalizeVideoPublicId,
  videoPublicIdOf,
} from '../utils/videoPublicId.js'
import { buildShareableVideoUrl } from '../utils/shareUrl.js'
import { pickShareCaption } from '../utils/shareCaption.js'
import { recordProfileLastWatchedFromVideo } from '../utils/profileLastWatched.js'
import { formatRelativeTimeVi } from '../utils/relativeTimeVi.js'
import {
  isEnterKey,
  isSpaceKey,
  shouldHandleGlobalShortcut,
} from '../utils/keyboardShortcuts.js'
import { isMobileFeedLayout } from '../components/feed/MobileFeedShell.jsx'
import { CommentInputAccessoryButtons } from '../components/comments/CommentInputAccessory.jsx'
import { WatchSearchDropdown } from '../components/search/WatchSearchDropdown.jsx'
import {
  IoArrowUp,
  IoBookmark,
  IoChatbubbleEllipses,
  IoChevronDown,
  IoChevronUp,
  IoClose,
  IoEllipsisHorizontal,
  IoHeart,
  IoMusicalNotes,
  IoPlayOutline,
  IoVolumeHighOutline,
  IoVolumeLowOutline,
  IoVolumeMediumOutline,
  IoVolumeMuteOutline,
} from 'react-icons/io5'
import { LuPictureInPicture2 } from 'react-icons/lu'
import { FeedVideoPlayer } from '../components/feed/FeedVideoPlayer.jsx'
import { VideoContextMenu } from '../components/feed/VideoContextMenu.jsx'
import { VideoShareModal } from '../components/VideoShareModal.jsx'
import { downloadWatermarkedVideo } from '../feed/videoDownload.js'
import {
  WatchVideoMoreMenu,
  WATCH_MORE_TRIGGER_BTN_CLASS,
} from '../components/watch/WatchVideoMoreMenu.jsx'
import { WatchShareStrip } from '../components/watch/WatchShareStrip.jsx'
import { SelfRepostIndicator } from '../components/repost/SelfRepostIndicator.jsx'
import { buildProfilePath } from '../utils/buildProfilePath.js'
import { sortQualityOptions } from '../feed/hlsQualityUtils.js'
import { usePersistedFeedVideoQuality } from '../feed/usePersistedFeedVideoQuality.js'
import { usePersistedFeedPlaybackSpeed } from '../feed/usePersistedFeedPlaybackSpeed.js'
import {
  markFeedAuthorFollowed,
  markFeedAuthorUnfollowed,
} from '../utils/feedFollowState.js'
import { Seo } from '../seo/Seo.jsx'
import { videoObjectJsonLd } from '../seo/jsonLd.js'
import { absoluteUrl } from '../seo/seoConfig.js'

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

function watchPageCaption(v) {
  const pick = pickShareCaption({
    title: v?.title,
    description: v?.description,
  })
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

const ACTION_ROW =
  'flex items-center gap-1.5 rounded-md px-0.5 py-1 text-zinc-100 transition hover:bg-zinc-900/80'

function WatchActionTip({ tip, children }) {
  return (
    <div className="group/watch-tip relative flex shrink-0">
      {children}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full left-1/2 z-70 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-[#545454] px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity duration-150 group-hover/watch-tip:opacity-100"
      >
        {tip}
        <span
          aria-hidden
          className="absolute left-1/2 top-full -translate-x-1/2 border-[5px] border-transparent border-t-[#545454]"
        />
      </span>
    </div>
  )
}

const WATCH_CHROME_BTN =
  'flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-zinc-600/45 text-xl text-zinc-100 transition hover:bg-zinc-600/75'

const WATCH_BAR_ICON_BTN =
  'inline-flex h-7 w-7 shrink-0 cursor-pointer items-center justify-center text-[1.2rem] text-white/90 transition hover:text-white'

const WATCH_VOLUME_DEFAULT = 1

function formatWatchClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

/** Thanh tiến trình + thời gian + PiP/âm lượng (một hàng, căn theo khung video). */
function WatchPlaybackBar({
  videoRef,
  current,
  duration,
  onSeekFraction,
  onScrubbingChange,
  volume,
  onVolumeChange,
  muted,
  onMutedChange,
  onTogglePip,
}) {
  const trackRef = useRef(null)
  const scrubbingRef = useRef(false)
  const [videoFrame, setVideoFrame] = useState(null)
  const [isScrubbing, setIsScrubbing] = useState(false)
  const pct = duration > 0 ? Math.min(100, (current / duration) * 100) : 0

  useEffect(() => {
    const video = videoRef?.current
    if (!video) return undefined

    const sync = () => {
      const host = video.offsetParent
      if (!host) return
      const vRect = video.getBoundingClientRect()
      const hRect = host.getBoundingClientRect()
      if (vRect.width <= 0 || vRect.height <= 0) return
      setVideoFrame({
        left: vRect.left - hRect.left,
        width: vRect.width,
      })
    }

    sync()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(sync) : null
    ro?.observe(video)
    ro?.observe(video.offsetParent)
    window.addEventListener('resize', sync)
    video.addEventListener('loadedmetadata', sync)
    video.addEventListener('loadeddata', sync)
    video.addEventListener('resize', sync)
    return () => {
      ro?.disconnect()
      window.removeEventListener('resize', sync)
      video.removeEventListener('loadedmetadata', sync)
      video.removeEventListener('loadeddata', sync)
      video.removeEventListener('resize', sync)
    }
  }, [videoRef])

  const seekFromClientX = useCallback(
    (clientX) => {
      const track = trackRef.current
      if (!track || !duration) return
      const rect = track.getBoundingClientRect()
      const width = rect.width
      if (width <= 0) return
      const fraction = Math.min(1, Math.max(0, (clientX - rect.left) / width))
      onSeekFraction(fraction)
    },
    [duration, onSeekFraction],
  )

  const onTrackPointerDown = (e) => {
    e.stopPropagation()
    scrubbingRef.current = true
    setIsScrubbing(true)
    onScrubbingChange(true)
    seekFromClientX(e.clientX)
  }

  useEffect(() => {
    const onMove = (e) => {
      if (!scrubbingRef.current) return
      seekFromClientX(e.clientX)
    }
    const onUp = () => {
      if (!scrubbingRef.current) return
      scrubbingRef.current = false
      setIsScrubbing(false)
      onScrubbingChange(false)
    }
    window.addEventListener('pointermove', onMove)
    window.addEventListener('pointerup', onUp)
    window.addEventListener('pointercancel', onUp)
    return () => {
      window.removeEventListener('pointermove', onMove)
      window.removeEventListener('pointerup', onUp)
      window.removeEventListener('pointercancel', onUp)
    }
  }, [onScrubbingChange, seekFromClientX])

  if (!videoFrame) return null

  return (
    <div
      className="pointer-events-none absolute bottom-6 z-40 sm:bottom-7"
      style={{ left: videoFrame.left, width: videoFrame.width }}
    >
      <div className="pointer-events-auto flex min-h-7 w-full items-center gap-1 px-3 sm:gap-1.5 sm:px-4">
        <div
          ref={trackRef}
          role="slider"
          aria-label="Tiến độ phát"
          aria-valuemin={0}
          aria-valuemax={Math.floor(duration) || 0}
          aria-valuenow={Math.floor(current)}
          tabIndex={0}
          className="group/watch-progress relative flex min-w-0 flex-1 cursor-pointer items-center py-1.5"
          onPointerDown={onTrackPointerDown}
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight') return
            e.preventDefault()
            const delta = e.key === 'ArrowLeft' ? -5 : 5
            onSeekFraction(Math.min(1, Math.max(0, (current + delta) / Math.max(duration, 1))))
          }}
        >
          <div className="relative h-1 w-full rounded-full bg-white/30 transition-[height] duration-150 ease-out group-hover/watch-progress:h-1.5">
            <div
              className="absolute inset-y-0 left-0 rounded-full bg-white"
              style={{ width: `${pct}%` }}
            />
            <div
              className={`pointer-events-none absolute top-1/2 z-10 h-3.5 w-3.5 -translate-x-1/2 -translate-y-1/2 transition-opacity duration-200 ease-out ${
                isScrubbing ? 'opacity-100' : 'opacity-0 group-hover/watch-progress:opacity-100'
              }`}
              style={{ left: `${pct}%` }}
              aria-hidden
            >
              <div className="h-full w-full rounded-full bg-white shadow-[0_0_0_1.5px_rgba(0,0,0,0.45),0_1px_4px_rgba(0,0,0,0.35)] transition-transform duration-200 ease-out group-hover/watch-progress:scale-110" />
            </div>
          </div>
        </div>
        <span className="shrink-0 text-[11px] font-medium tabular-nums text-white/95 sm:text-xs">
          {formatWatchClock(current)}/{formatWatchClock(duration)}
        </span>
        <div className="flex shrink-0 items-center gap-0.5">
          <TooltipHoverWrap tip="Trình phát nổi" placement="top" hoverOnly>
            <button
              type="button"
              className={WATCH_BAR_ICON_BTN}
              aria-label="Trình phát nổi"
              onClick={(e) => {
                e.stopPropagation()
                onTogglePip()
              }}
            >
              <LuPictureInPicture2 className="text-[1.05rem]" strokeWidth={1.75} aria-hidden />
            </button>
          </TooltipHoverWrap>
          <WatchVolumeControl
            compact
            volume={volume}
            onVolumeChange={onVolumeChange}
            muted={muted}
            onMutedChange={onMutedChange}
          />
        </div>
      </div>
    </div>
  )
}

function WatchVolumeIcon({ muted, volume }) {
  if (muted || volume === 0) {
    return <IoVolumeMuteOutline aria-hidden />
  }
  if (volume < 0.34) {
    return <IoVolumeLowOutline aria-hidden />
  }
  if (volume < 0.67) {
    return <IoVolumeMediumOutline aria-hidden />
  }
  return <IoVolumeHighOutline aria-hidden />
}

/** Âm lượng dọc + nút loa (TikTok-style). */
function WatchVolumeControl({ volume, onVolumeChange, muted, onMutedChange, compact = false }) {
  const onSlider = (e) => {
    e.stopPropagation()
    const v = Number(e.target.value)
    onVolumeChange(v)
    onMutedChange(false)
  }

  const toggleMute = (e) => {
    e.stopPropagation()
    if (!muted) {
      onMutedChange(true)
      return
    }
    onMutedChange(false)
    if (volume === 0) {
      onVolumeChange(WATCH_VOLUME_DEFAULT)
    }
  }

  return (
    <div
      className={
        compact
          ? 'group/vol relative shrink-0'
          : 'group/vol flex flex-col items-center'
      }
      onMouseDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
    >
      <div
        className={
          compact
            ? 'pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 flex h-26 w-10 -translate-x-1/2 items-center justify-center rounded-full bg-zinc-800/92 px-1 py-3 opacity-0 shadow-lg transition-opacity duration-200 group-hover/vol:pointer-events-auto group-hover/vol:opacity-100 group-focus-within/vol:pointer-events-auto group-focus-within/vol:opacity-100'
            : 'pointer-events-none mb-2 flex h-26 w-10 items-center justify-center rounded-full bg-zinc-800/92 px-1 py-3 opacity-0 shadow-lg transition-opacity duration-200 group-hover/vol:pointer-events-auto group-hover/vol:opacity-100 group-focus-within/vol:pointer-events-auto group-focus-within/vol:opacity-100'
        }
      >
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          aria-label="Âm lượng"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(volume * 100)}
          className="watch-volume-slider-vertical pointer-events-auto"
          onChange={onSlider}
          onInput={onSlider}
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      <button
        type="button"
        className={
          compact
            ? WATCH_BAR_ICON_BTN
            : `${WATCH_CHROME_BTN} bg-black/55 hover:bg-black/75`
        }
        aria-label={muted ? 'Bật âm thanh' : 'Tắt âm thanh'}
        aria-pressed={!muted}
        onClick={toggleMute}
      >
        <WatchVolumeIcon muted={muted} volume={volume} />
      </button>
    </div>
  )
}

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

function resolveWatchPlaybackUrl(video) {
  return resolveFeedPlaybackUrl(video) || ''
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

const WATCH_NOW_PLAYING_BAR_HEIGHTS = [8, 14, 6, 12, 9]

function WatchNowPlayingWave() {
  return (
    <span className="mb-1.5 flex h-4 items-end justify-center gap-[3px]" aria-hidden>
      {WATCH_NOW_PLAYING_BAR_HEIGHTS.map((heightPx, i) => (
        <span
          key={i}
          className="watch-now-playing-bar"
          style={{
            height: `${heightPx}px`,
            animationDelay: `${i * 0.11}s`,
          }}
        />
      ))}
    </span>
  )
}

/** Preview lưới creator: phát khi hover, tắt khi rời chuột. */
function WatchCreatorGridMedia({ item, playing = false }) {
  const videoRef = useRef(null)
  const playbackUrl = resolveWatchPlaybackUrl(item)
  const thumb =
    typeof item?.thumbnailUrl === 'string' ? item.thumbnailUrl.trim() : ''
  const [videoReady, setVideoReady] = useState(false)

  useEffect(() => {
    if (!playing) setVideoReady(false)
  }, [playing, playbackUrl])

  useEffect(() => {
    const el = videoRef.current
    if (!el || !playbackUrl || !playing) return undefined
    const p = el.play()
    if (p?.catch) p.catch(() => {})
    return () => {
      try {
        el.pause()
      } catch {
        /* noop */
      }
      try {
        el.currentTime = 0
      } catch {
        /* noop */
      }
    }
  }, [playing, playbackUrl])

  const thumbNode = thumb ? (
    <img src={thumb} alt="" loading="lazy" className="h-full w-full object-cover" />
  ) : (
    <div className="h-full w-full bg-zinc-800" />
  )

  if (playbackUrl && playing) {
    return (
      <>
        {!videoReady ? <div className="absolute inset-0">{thumbNode}</div> : null}
        <video
          ref={videoRef}
          src={playbackUrl}
          poster={thumb || undefined}
          muted
          loop
          playsInline
          className="h-full w-full object-cover"
          preload="metadata"
          onLoadedData={() => setVideoReady(true)}
          onCanPlay={() => setVideoReady(true)}
        />
      </>
    )
  }
  return thumbNode
}

function WatchCreatorVideoTile({ video, isPlaying, onSelect }) {
  const [hovering, setHovering] = useState(false)
  const previewPlaying = !isPlaying && hovering
  const id = videoPublicIdOf(video)

  return (
    <button
      type="button"
      disabled={!id}
      onClick={() => onSelect(video)}
      onMouseEnter={() => {
        if (!isPlaying) setHovering(true)
      }}
      onMouseLeave={() => setHovering(false)}
      className="group relative aspect-9/16 w-full overflow-hidden rounded-md bg-zinc-900 ring-1 ring-zinc-800 transition hover:ring-zinc-600 disabled:cursor-not-allowed"
      aria-label={isPlaying ? 'Hiện đang phát' : 'Xem video'}
      aria-current={isPlaying ? 'true' : undefined}
    >
      <div className="absolute inset-0">
        <WatchCreatorGridMedia item={video} playing={previewPlaying} />
      </div>
      {isPlaying ? (
        <div className="absolute inset-0 z-2 flex flex-col items-center justify-center bg-black/55 px-2 text-center">
          <WatchNowPlayingWave />
          <span className="text-[11px] font-semibold leading-tight text-white">
            Hiện đang phát
          </span>
        </div>
      ) : null}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-1 bg-linear-to-t from-black/85 via-black/25 to-transparent px-1.5 pb-1 pt-8">
        <div className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-white drop-shadow-md">
          <IoPlayOutline className="text-[11px]" aria-hidden />
          <span>{formatCompactCount(video?.viewCount ?? 0)}</span>
        </div>
      </div>
    </button>
  )
}

/** Hàng đợi video trên hồ sơ: mới đăng trước (khớp tab Video → Mới nhất). */
function sortVideosNewestFirst(items) {
  const list = Array.isArray(items) ? [...items] : []
  return list.sort((a, b) => {
    const ta = new Date(a?.createdAt ?? 0).getTime()
    const tb = new Date(b?.createdAt ?? 0).getTime()
    if (tb !== ta) return tb - ta
    return Number(b?.id ?? 0) - Number(a?.id ?? 0)
  })
}

/** Tab creator: video đang phát luôn ở ô đầu tiên (trên-trái). */
function orderCreatorGridWithPlayingFirst(queue, playingPublicId) {
  if (!playingPublicId) return queue
  const playing = []
  const rest = []
  for (const row of queue) {
    if (videoPublicIdOf(row) === playingPublicId) playing.push(row)
    else rest.push(row)
  }
  return playing.length > 0 ? [...playing, ...rest] : queue
}

export function VideoWatchPage({ sidebarVariant = 'creator' } = {}) {
  const useSuggestedSidebar = sidebarVariant === 'suggested'
  const { username: usernameParam, publicId: publicIdParam } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const videoRef = useRef(null)
  /** Một lần / clip: qualify (~2s) và một lần gần xem hết (Studio % xem hết). */
  const watchQualifySentRef = useRef(false)
  const watchPlaythroughSentRef = useRef(false)
  const commentInputRef = useRef(null)
  const commentAccessoryRef = useRef(null)
  const watchSidebarScrollRef = useRef(null)

  const [video, setVideo] = useState(null)
  const [loadError, setLoadError] = useState('')
  const [loading, setLoading] = useState(true)
  const [videoReady, setVideoReady] = useState(false)
  const [liked, setLiked] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [reposted, setReposted] = useState(false)
  const [repostBusy, setRepostBusy] = useState(false)
  const [repostToast, setRepostToast] = useState('')
  const [comments, setComments] = useState([])
  const [commentsLoading, setCommentsLoading] = useState(false)
  const [commentsError, setCommentsError] = useState('')
  const [commentDraft, setCommentDraft] = useState('')
  const [commentPostError, setCommentPostError] = useState('')
  const [shareCopied, setShareCopied] = useState(false)
  const [authorFollowed, setAuthorFollowed] = useState(false)
  const [followBusy, setFollowBusy] = useState(false)
  const [intrinsicSize, setIntrinsicSize] = useState(null)
  const [exploreQueue, setExploreQueue] = useState([])
  const [creatorQueue, setCreatorQueue] = useState([])
  const [creatorQueueLoading, setCreatorQueueLoading] = useState(false)
  const [suggestedVideos, setSuggestedVideos] = useState([])
  const [suggestedLoading, setSuggestedLoading] = useState(false)
  const [watchSidebarTab, setWatchSidebarTab] = useState('comments')
  const [exploreCursor, setExploreCursor] = useState(null)
  const [exploreHasNext, setExploreHasNext] = useState(false)
  const [exploreLoadingMore, setExploreLoadingMore] = useState(false)
  const exploreInitRef = useRef(false)
  const videoDetailCacheRef = useRef(new Map())
  const displayPosterRef = useRef('')
  const exploreQueueRef = useRef(exploreQueue)
  exploreQueueRef.current = exploreQueue
  const creatorQueueRef = useRef(creatorQueue)
  creatorQueueRef.current = creatorQueue
  const exploreNavLockRef = useRef(false)
  const creatorNavLockRef = useRef(false)
  const exploreNavGenRef = useRef(0)
  const detailPrefetchGenRef = useRef(0)
  const videoLoadGenRef = useRef(0)
  const moveToExploreVideoByOffsetRef = useRef(null)
  const moveToCreatorVideoByOffsetRef = useRef(null)
  const currentExploreIndexRef = useRef(-1)
  const currentCreatorIndexRef = useRef(-1)
  const [exploreNavBusy, setExploreNavBusy] = useState(false)
  const [watchMuted, setWatchMuted] = useState(true)
  const [watchVolume, setWatchVolume] = useState(WATCH_VOLUME_DEFAULT)
  const [pipActive, setPipActive] = useState(false)
  const [watchPlayback, setWatchPlayback] = useState({ current: 0, duration: 0 })
  const watchScrubbingRef = useRef(false)
  const [watchUserPaused, setWatchUserPaused] = useState(false)
  const [watchMoreMenuOpen, setWatchMoreMenuOpen] = useState(false)
  const [watchMoreMenuSubpage, setWatchMoreMenuSubpage] = useState('main')
  const [watchVideoQuality, setWatchVideoQuality] = usePersistedFeedVideoQuality()
  const [watchPlaybackSpeed, setWatchPlaybackSpeed] = usePersistedFeedPlaybackSpeed()
  const [watchQualityOptions, setWatchQualityOptions] = useState(['auto'])
  const [watchAutoScroll, setWatchAutoScroll] = useState(false)
  const [videoContextMenu, setVideoContextMenu] = useState(null)
  const [videoDownloadBusy, setVideoDownloadBusy] = useState(false)
  const [shareModalOpen, setShareModalOpen] = useState(false)
  const [mobileLayout, setMobileLayout] = useState(() => isMobileFeedLayout())

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 1023px)')
    const syncLayout = () => setMobileLayout(mq.matches)
    syncLayout()
    mq.addEventListener('change', syncLayout)
    return () => mq.removeEventListener('change', syncLayout)
  }, [])

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

  const isCreatorWatch = useMemo(
    () => !isFromExplore && Boolean(routeSlug) && Boolean(publicIdFromRoute),
    [isFromExplore, routeSlug, publicIdFromRoute],
  )

  const isOwnCreatorProfile = useMemo(
    () =>
      Boolean(routeSlug) &&
      normalizeUsernameKey(user?.username) === routeSlug,
    [routeSlug, user?.username],
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

  const watchQualityMenuOptions = useMemo(
    () => sortQualityOptions(watchQualityOptions.length ? watchQualityOptions : ['auto']),
    [watchQualityOptions],
  )

  useEffect(() => {
    recordProfileLastWatchedFromVideo(activeVideo, { tab: 'videos' })
  }, [activeVideo?.publicId, activeVideo?.authorUsername])

  useLayoutEffect(() => {
    exploreNavGenRef.current += 1
    setVideoReady(false)
    setIntrinsicSize(null)
    setExploreNavBusy(false)
    setWatchMuted(true)
    setPipActive(false)
    setWatchPlayback({ current: 0, duration: 0 })
    watchScrubbingRef.current = false
    setWatchUserPaused(false)
    setWatchMoreMenuOpen(false)
    setWatchMoreMenuSubpage('main')
    setWatchQualityOptions(['auto'])
    exploreNavLockRef.current = false
    creatorNavLockRef.current = false
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

  useEffect(() => {
    const el = videoRef.current
    if (!el) return undefined
    el.muted = watchMuted
    el.volume = watchVolume
    const onEnterPip = () => setPipActive(true)
    const onLeavePip = () => setPipActive(false)
    el.addEventListener('enterpictureinpicture', onEnterPip)
    el.addEventListener('leavepictureinpicture', onLeavePip)
    if (document.pictureInPictureElement === el) {
      setPipActive(true)
    }
    return () => {
      el.removeEventListener('enterpictureinpicture', onEnterPip)
      el.removeEventListener('leavepictureinpicture', onLeavePip)
    }
  }, [watchMuted, watchVolume, isVideoFrameReady, activePlaybackUrl, publicIdFromRoute])

  useEffect(() => {
    const el = videoRef.current
    if (!el) return
    const rate = Number(watchPlaybackSpeed)
    el.playbackRate = Number.isFinite(rate) && rate > 0 ? rate : 1
  }, [watchPlaybackSpeed, activePlaybackUrl, publicIdFromRoute])

  const handleWatchPlaybackTick = useCallback((e) => {
    if (watchScrubbingRef.current) return
    const el = e?.currentTarget ?? videoRef.current
    if (!el || el.tagName !== 'VIDEO') return
    setWatchPlayback({
      current: el.currentTime || 0,
      duration: Number.isFinite(el.duration) ? el.duration : 0,
    })
    if (
      e?.type === 'loadedmetadata' ||
      e?.type === 'canplay' ||
      e?.type === 'loadeddata'
    ) {
      setVideoReady(true)
      if (el.videoWidth > 0 && el.videoHeight > 0) {
        setIntrinsicSize({
          width: el.videoWidth,
          height: el.videoHeight,
        })
      }
    }
  }, [])

  useEffect(() => {
    if (!mobileLayout || !isVideoFrameReady || !activePlaybackUrl || watchUserPaused) {
      return undefined
    }
    const el = videoRef.current
    if (!el) return undefined
    el.muted = watchMuted
    const playAttempt = el.play()
    if (playAttempt?.catch) {
      playAttempt.catch(() => {})
    }
    return undefined
  }, [
    mobileLayout,
    isVideoFrameReady,
    activePlaybackUrl,
    watchUserPaused,
    watchMuted,
    publicIdFromRoute,
  ])

  const closeVideoContextMenu = useCallback(() => {
    setVideoContextMenu(null)
  }, [])

  const openWatchVideoContextMenu = useCallback(
    (event) => {
      if (watchScrubbingRef.current || watchMoreMenuOpen) return
      if (!activeVideo?.publicId || !isWatchableVideo(activeVideo)) return
      event.preventDefault()
      event.stopPropagation()
      setVideoContextMenu({
        x: event.clientX,
        y: event.clientY,
        video: activeVideo,
      })
    },
    [activeVideo, watchMoreMenuOpen],
  )

  const handleWatchVideoContextMenu = useCallback(
    (event) => {
      openWatchVideoContextMenu(event)
    },
    [openWatchVideoContextMenu],
  )

  const toggleWatchPlayback = useCallback(
    (e) => {
      e?.stopPropagation?.()
      if (watchScrubbingRef.current || watchMoreMenuOpen || videoContextMenu) return
      const el = videoRef.current
      if (!el) return
      if (el.paused) {
        setWatchUserPaused(false)
        void el.play().catch(() => {})
      } else {
        setWatchUserPaused(true)
        el.pause()
      }
    },
    [videoContextMenu, watchMoreMenuOpen],
  )

  const handleWatchVideoClick = useCallback(
    (event) => {
      if (mobileLayout) {
        toggleWatchPlayback(event)
      return
    }
      openWatchVideoContextMenu(event)
    },
    [mobileLayout, openWatchVideoContextMenu, toggleWatchPlayback],
  )

  const handleWatchContextMenuDownload = useCallback(async () => {
    const menuVideo = videoContextMenu?.video
    const publicId = menuVideo?.publicId
    if (!publicId || videoDownloadBusy) return
    setVideoDownloadBusy(true)
    closeVideoContextMenu()
    try {
      const username = String(menuVideo?.authorUsername ?? 'vibely')
        .trim()
        .replace(/^@+/, '')
      await downloadWatermarkedVideo(publicId, username, { token })
    } catch (error) {
      window.alert(
        error instanceof Error ? error.message : 'Không tải được video.',
      )
    } finally {
      setVideoDownloadBusy(false)
    }
  }, [
    closeVideoContextMenu,
    token,
    videoContextMenu?.video,
    videoDownloadBusy,
  ])

  useEffect(() => {
    closeVideoContextMenu()
  }, [closeVideoContextMenu, publicIdFromRoute])

  useEffect(() => {
    if (!watchMoreMenuOpen) setWatchMoreMenuSubpage('main')
  }, [watchMoreMenuOpen])

  const handleWatchHlsQualitiesAvailable = useCallback((options) => {
    setWatchQualityOptions(sortQualityOptions(options?.length ? options : ['auto']))
  }, [])

  const handleWatchSeekFraction = useCallback((fraction) => {
    const el = videoRef.current
    if (!el || !Number.isFinite(el.duration) || el.duration <= 0) return
    const next = fraction * el.duration
    el.currentTime = next
    setWatchPlayback((prev) => ({ ...prev, current: next }))
  }, [])

  const handleWatchScrubbingChange = useCallback((scrubbing) => {
    watchScrubbingRef.current = scrubbing
  }, [])

  const toggleWatchPictureInPicture = useCallback(async () => {
    const el = videoRef.current
    if (!el || typeof el.requestPictureInPicture !== 'function') return
    try {
      if (document.pictureInPictureElement === el) {
        await document.exitPictureInPicture?.()
      } else {
        await el.requestPictureInPicture()
      }
    } catch {
      /* PiP không khả dụng hoặc trình duyệt chặn */
    }
  }, [])

  const exitWatchPictureInPicture = useCallback(async () => {
    try {
      await document.exitPictureInPicture?.()
    } catch {
      /* noop */
    }
  }, [])

  const watchOrientation = useMemo(
    () => resolveWatchOrientation(activeVideo, intrinsicSize),
    [activeVideo, intrinsicSize],
  )

  const watchPosterSizing = `${watchMediaPlacementClass(watchOrientation)} z-1 ${
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
    setWatchSidebarTab(useSuggestedSidebar ? 'suggested' : 'comments')
  }, [publicIdFromRoute, useSuggestedSidebar])

  useEffect(() => {
    if (!useSuggestedSidebar || !publicIdFromRoute) {
      setSuggestedVideos([])
      setSuggestedLoading(false)
      return undefined
    }
    let cancelled = false
    setSuggestedLoading(true)
    apiClient
      .getExploreRelated(publicIdFromRoute, { size: 24 })
      .then((page) => {
        if (cancelled) return
        const items = Array.isArray(page?.items) ? page.items : []
        setSuggestedVideos(
          items.filter(
            (row) => normalizeVideoPublicId(row?.publicId) !== publicIdFromRoute,
          ),
        )
      })
      .catch(() => {
        if (!cancelled) setSuggestedVideos([])
      })
      .finally(() => {
        if (!cancelled) setSuggestedLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [publicIdFromRoute, useSuggestedSidebar])

  useEffect(() => {
    if (useSuggestedSidebar || !isCreatorWatch || !routeSlug) {
      setCreatorQueue([])
      setCreatorQueueLoading(false)
      return undefined
    }
    let cancelled = false
    const slug = routeSlug
    setCreatorQueue([])
    setCreatorQueueLoading(true)
    ;(async () => {
      try {
        const data =
          isOwnCreatorProfile && token
            ? await apiClient.getMyUploadedVideos(token, { page: 0, size: 48 })
            : await apiClient.getVideosByUsername(slug, { page: 0, size: 48, token })
        if (cancelled) return
        const rows = Array.isArray(data?.items) ? data.items : []
        const visible = isOwnCreatorProfile
          ? rows
          : rows.filter((video) => {
              const key = String(video?.privacy || 'PUBLIC').toUpperCase()
              if (key === 'PRIVATE' || key === 'ONLYYOU' || key === 'ONLY_YOU') return false
              if (key === 'FRIENDS' && !token) return false
              return true
            })
        setCreatorQueue(sortVideosNewestFirst(visible))
      } catch {
        if (!cancelled) setCreatorQueue([])
      } finally {
        if (!cancelled) setCreatorQueueLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isCreatorWatch, isOwnCreatorProfile, routeSlug, token, useSuggestedSidebar])

  useEffect(() => {
    if (useSuggestedSidebar || !isCreatorWatch || !video?.publicId) return
    setCreatorQueue((prev) => {
      const id = normalizeVideoPublicId(video.publicId)
      if (!id || prev.some((row) => normalizeVideoPublicId(row?.publicId) === id)) {
        return prev
      }
      return sortVideosNewestFirst([...prev, video])
    })
  }, [isCreatorWatch, useSuggestedSidebar, video])

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
      : isCreatorWatch
        ? creatorQueueRef.current.find(
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
        const canonical = buildProfileWatchUrl(authorKey, videoPublicIdOf(v))
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
  }, [
    isCreatorWatch,
    isFromExplore,
    location.state,
    publicIdFromRoute,
    token,
    navigate,
    routeSlug,
  ])

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
    setReposted(false)
    setRepostToast('')
    apiClient
      .getVideoMeState(routeId, token)
      .then((s) => {
        if (cancelled || !s) return
        setLiked(Boolean(s.liked))
        setBookmarked(Boolean(s.bookmarked))
        setReposted(Boolean(s.reposted))
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

  const patchVideo = useCallback((patch) => {
    setVideo((prev) => (prev ? { ...prev, ...patch } : prev))
  }, [])

  const caption = watchPageCaption(activeVideo ?? {})
  const panelVideo = activeVideo ?? video
  const submitWatchComment = useCallback(async () => {
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
  }, [commentDraft, panelVideo, patchVideo, token])
  const authorVibelyId = normalizeUsernameKey(panelVideo?.authorUsername) || 'user'
  const seoVideoId = videoPublicIdOf(panelVideo) || publicIdFromRoute
  const seoVideoTitleSource =
    String(panelVideo?.title ?? '').trim() ||
    watchPageCaption(panelVideo) ||
    (isFromExplore ? EXPLORE_PAGE_TITLE : 'Video trên Vibely')
  const seoVideoTitle = seoVideoTitleSource.endsWith('| Vibely')
    ? seoVideoTitleSource
    : `${seoVideoTitleSource} | Vibely`
  const seoVideoCanonical =
    buildProfileVideoUrl(authorVibelyId, seoVideoId) ||
    (seoVideoId ? `/watch/${seoVideoId}` : '/foryou')
  const seoVideoImage =
    panelVideo?.thumbnailUrl || panelVideo?.authorAvatarUrl || DEFAULT_USER_AVATAR_URL
  const authorId = Number(panelVideo?.authorId)
  const isOwnAuthorWatch = Boolean(
    user?.id && Number.isFinite(authorId) && authorId > 0 && Number(user.id) === authorId,
  )

  useEffect(() => {
    setAuthorFollowed(Boolean(panelVideo?.followedByViewer))
  }, [panelVideo?.followedByViewer, publicIdFromRoute])

  const handleAuthorFollowToggle = useCallback(async () => {
    if (!Number.isFinite(authorId) || authorId <= 0 || isOwnAuthorWatch) return
    if (!token) {
      navigate('/login')
      return
    }
    if (followBusy) return
    const next = !authorFollowed
    setFollowBusy(true)
    setAuthorFollowed(next)
    patchVideo({ followedByViewer: next })
    try {
      if (next) {
        await apiClient.follow(authorId, token)
        markFeedAuthorFollowed(token, authorId)
      } else {
        await apiClient.unfollow(authorId, token)
        markFeedAuthorUnfollowed(token, authorId)
      }
    } catch {
      setAuthorFollowed(!next)
      patchVideo({ followedByViewer: !next })
    } finally {
      setFollowBusy(false)
    }
  }, [authorFollowed, authorId, followBusy, isOwnAuthorWatch, navigate, patchVideo, token])

  const currentExploreIndex = useMemo(() => {
    const currentId = publicIdFromRoute
    if (!currentId) return -1
    return exploreQueue.findIndex((row) => normalizeVideoPublicId(row?.publicId) === currentId)
  }, [exploreQueue, publicIdFromRoute])
  currentExploreIndexRef.current = currentExploreIndex

  const currentCreatorIndex = useMemo(() => {
    const currentId = publicIdFromRoute
    if (!currentId || !isCreatorWatch) return -1
    return creatorQueue.findIndex(
      (row) => normalizeVideoPublicId(row?.publicId) === currentId,
    )
  }, [creatorQueue, isCreatorWatch, publicIdFromRoute])
  currentCreatorIndexRef.current = currentCreatorIndex

  const creatorGridVideos = useMemo(
    () => orderCreatorGridWithPlayingFirst(creatorQueue, publicIdFromRoute),
    [creatorQueue, publicIdFromRoute],
  )

  useEffect(() => {
    if (watchSidebarTab !== 'creator' && watchSidebarTab !== 'suggested') return
    const el = watchSidebarScrollRef.current
    if (el) el.scrollTop = 0
  }, [watchSidebarTab, publicIdFromRoute])

  const hasPrevExplore = isFromExplore && currentExploreIndex > 0
  const hasNextExplore = isFromExplore && (
    currentExploreIndex >= 0
      ? currentExploreIndex < exploreQueue.length - 1 || exploreHasNext
      : exploreHasNext
  )

  const hasPrevCreator =
    !useSuggestedSidebar &&
    isCreatorWatch &&
    currentCreatorIndex > 0 &&
    creatorQueue.length > 1
  const hasNextCreator =
    !useSuggestedSidebar &&
    isCreatorWatch &&
    currentCreatorIndex >= 0 &&
    currentCreatorIndex < creatorQueue.length - 1
  const hasPrevWatch = hasPrevExplore || hasPrevCreator
  const hasNextWatch = hasNextExplore || hasNextCreator
  const showWatchNavArrows =
    isFromExplore ||
    (!useSuggestedSidebar && isCreatorWatch && creatorQueue.length > 1)

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

  const moveToCreatorVideoByOffset = useCallback(
    (offsetSteps) => {
      if (!isCreatorWatch || !offsetSteps || creatorNavLockRef.current) return
      const targetIndex = currentCreatorIndexRef.current + offsetSteps
      if (targetIndex < 0 || targetIndex >= creatorQueueRef.current.length) return
      const nextVideo = creatorQueueRef.current[targetIndex]
      const nextId = normalizeVideoPublicId(nextVideo?.publicId)
      const slug = routeSlug
      if (!nextId || !slug) return
      creatorNavLockRef.current = true
      setExploreNavBusy(true)
      const nextPath = buildProfileWatchUrl(slug, nextId)
      if (!nextPath) {
        creatorNavLockRef.current = false
        setExploreNavBusy(false)
        return
      }
      navigate(nextPath, { replace: true })
    },
    [isCreatorWatch, navigate, routeSlug],
  )
  moveToCreatorVideoByOffsetRef.current = moveToCreatorVideoByOffset

  const { requestStep: requestCreatorNavStep, reset: resetCreatorNavPending } =
    useRapidStepNavigation({
      onStep: (steps) => {
        moveToCreatorVideoByOffsetRef.current?.(steps)
      },
      delayMs: 220,
      maxBurst: 3,
      cooldownMs: 320,
    })

  useLayoutEffect(() => {
    resetCreatorNavPending()
  }, [publicIdFromRoute, resetCreatorNavPending])

  const moveToCreatorVideo = useCallback(
    (direction) => {
      requestCreatorNavStep(direction === 'prev' ? -1 : 1)
    },
    [requestCreatorNavStep],
  )

  const moveWatchVideo = useCallback(
    (direction) => {
      if (isFromExplore) moveToExploreVideo(direction)
      else if (isCreatorWatch) moveToCreatorVideo(direction)
    },
    [isCreatorWatch, isFromExplore, moveToCreatorVideo, moveToExploreVideo],
  )

  const handleWatchPlaybackEnded = useCallback(() => {
    if (!watchAutoScroll || exploreNavBusy) return
    if (!hasNextWatch) return
    moveWatchVideo('next')
  }, [watchAutoScroll, exploreNavBusy, hasNextWatch, moveWatchVideo])

  const goToCreatorVideo = useCallback(
    (target) => {
      const id = videoPublicIdOf(target)
      const slug =
        routeSlug || normalizeUsernameKey(target?.authorUsername ?? panelVideo?.authorUsername)
      if (!id || !slug) return
      const path = buildProfileWatchUrl(slug, id)
      if (!path) return
      if (id === publicIdFromRoute) return
      recordProfileLastWatchedFromVideo(target, { tab: 'videos' })
      navigate(path, { replace: true })
    },
    [navigate, panelVideo?.authorUsername, publicIdFromRoute, routeSlug],
  )

  const goToSuggestedVideo = useCallback(
    (target) => {
      const id = videoPublicIdOf(target)
      if (!id || id === publicIdFromRoute) return
      const path = buildProfileVideoUrl(target?.authorUsername, id)
      if (!path) return
      navigate(path)
    },
    [navigate, publicIdFromRoute],
  )

  useEffect(() => {
    if (!isFromExplore && !isCreatorWatch) return undefined
    const onKeyDown = (e) => {
      if (!shouldHandleGlobalShortcut(e)) return
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        moveWatchVideo('prev')
      } else if (e.key === 'ArrowDown' || isSpaceKey(e)) {
        e.preventDefault()
        moveWatchVideo('next')
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isCreatorWatch, isFromExplore, moveWatchVideo])

  const shareLinkDisplay = buildShareableVideoUrl(
    panelVideo?.publicId,
    panelVideo?.authorUsername,
    { shareMethod: 'copy_link' },
  )

  const copyShareLink = async () => {
    const url = buildShareableVideoUrl(
      panelVideo?.publicId,
      panelVideo?.authorUsername,
      { shareMethod: 'copy_link' },
    )
    if (!url) return
    try {
      await navigator.clipboard.writeText(url)
      setShareCopied(true)
      setTimeout(() => setShareCopied(false), 2000)
    } catch {
      setShareCopied(false)
    }
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

  const handleUnrepost = useCallback(() => {
    const publicId = panelVideo?.publicId
    if (!publicId || !isWatchableVideo(panelVideo) || !reposted) return
    if (!token) {
      navigate('/login')
      return
    }
    if (repostBusy) return
    setRepostBusy(true)
    setReposted(false)
    apiClient
      .unrepostVideo(publicId, token)
      .catch(() => {
        setReposted(true)
      })
      .finally(() => {
        setRepostBusy(false)
      })
  }, [navigate, panelVideo, repostBusy, reposted, token])

  const handleRepostToggle = useCallback(() => {
    const publicId = panelVideo?.publicId
    if (!publicId || !isWatchableVideo(panelVideo)) return
    if (!token) {
      navigate('/login')
      return
    }
    if (repostBusy) return
    const next = !reposted
    setRepostBusy(true)
    setReposted(next)
    const req = next
      ? apiClient.repostVideo(publicId, token)
      : apiClient.unrepostVideo(publicId, token)
    req
      .then(() => {
        if (next) {
          setRepostToast('Đã đăng lại')
          window.setTimeout(() => setRepostToast(''), 2500)
        }
      })
      .catch(() => {
        setReposted(!next)
      })
      .finally(() => {
        setRepostBusy(false)
      })
  }, [panelVideo, repostBusy, reposted, token, navigate])

  const focusCommentField = () => {
    const el = commentInputRef.current
    if (!el) return
    el.focus()
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }

  const showVideoSpinner =
    loading && !activePlaybackUrl && !displayPosterUrl && !loadError

  return (
    <section
      className={`flex bg-black text-zinc-100 ${
        mobileLayout ? 'min-h-dvh flex-col overflow-y-auto overscroll-y-auto' : 'h-dvh min-h-0'
      }`}
    >
      <Seo
        title={seoVideoTitle}
        description="Xem video trên Vibely."
        canonical={seoVideoCanonical}
        image={seoVideoImage}
        type="video.other"
        jsonLd={panelVideo ? videoObjectJsonLd(panelVideo, absoluteUrl(seoVideoCanonical)) : null}
      />
      <div
        className={`relative flex flex-col ${
          mobileLayout ? '' : 'min-h-0 flex-1 overflow-hidden'
        }`}
      >
        <div
          className={`flex flex-col ${
            mobileLayout ? '' : 'min-h-0 flex-1 lg:flex-row lg:items-stretch'
          }`}
        >
          <div
            className={`relative bg-black ${
              mobileLayout
                ? 'aspect-9/16 w-full shrink-0'
                : 'min-h-0 flex-1 overflow-hidden'
            }`}
          >
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
                <div
                  className="group/watch relative h-full min-h-0 overflow-hidden"
                  onContextMenu={handleWatchVideoContextMenu}
                  onDoubleClick={toggleWatchPlayback}
                >
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
                    <FeedVideoPlayer
                      key={String(activeVideo?.publicId ?? publicIdFromRoute)}
                      ref={videoRef}
                      videoUrl={activePlaybackUrl}
                      poster={displayPosterUrl || undefined}
                      muted={watchMuted}
                      loop={false}
                      loadMedia={Boolean(activePlaybackUrl)}
                      isActive={Boolean(activePlaybackUrl) && !watchUserPaused}
                      userPaused={watchUserPaused}
                      visibilityRatio={mobileLayout ? 1 : 0}
                      streamQuality={watchVideoQuality}
                      sourceHeightPx={activeVideo?.sourceHeightPx}
                      containLandscape={watchOrientation === 'landscape'}
                      feedVideoId={activeVideo?.publicId ?? publicIdFromRoute}
                      onHlsQualitiesAvailable={handleWatchHlsQualitiesAvailable}
                      onPlaybackTick={handleWatchPlaybackTick}
                      onPlaybackEnded={handleWatchPlaybackEnded}
                      className={`watch-video-el absolute cursor-pointer bg-black transition-opacity duration-200 ${watchMediaPlacementClass(watchOrientation)} z-2 ${isVideoFrameReady ? 'opacity-100' : 'opacity-0'}`}
                      onClick={handleWatchVideoClick}
                    />
                  ) : null}

                  {repostToast ? (
                    <div
                      className="pointer-events-none absolute inset-x-0 top-14 z-40 flex justify-center px-4 sm:top-16"
                      role="status"
                    >
                      <span className="rounded-md bg-black/75 px-4 py-2 text-sm font-semibold text-white shadow-lg backdrop-blur-sm">
                        {repostToast}
                      </span>
                    </div>
                  ) : null}

                  {isVideoFrameReady && activePlaybackUrl && !pipActive ? (
                    <>
                  <button
                    type="button"
                        aria-label="Menu video"
                        aria-expanded={watchMoreMenuOpen}
                        aria-haspopup="dialog"
                        className={`pointer-events-auto absolute right-3 top-3 z-45 opacity-100 sm:right-4 sm:top-3.5 ${WATCH_MORE_TRIGGER_BTN_CLASS} ${
                          watchMoreMenuOpen ? 'bg-white/25' : ''
                        }`}
                        onClick={(e) => {
                          e.stopPropagation()
                          setWatchMoreMenuOpen((open) => !open)
                        }}
                      >
                        <IoEllipsisHorizontal aria-hidden />
                      </button>
                      <WatchVideoMoreMenu
                        open={watchMoreMenuOpen}
                        onOpenChange={setWatchMoreMenuOpen}
                        subpage={watchMoreMenuSubpage}
                        onSubpageChange={setWatchMoreMenuSubpage}
                        playbackSpeed={watchPlaybackSpeed}
                        onPlaybackSpeedChange={setWatchPlaybackSpeed}
                        videoQuality={watchVideoQuality}
                        onVideoQualityChange={setWatchVideoQuality}
                        qualityOptions={watchQualityMenuOptions}
                        autoScrollEnabled={watchAutoScroll}
                        onAutoScrollChange={setWatchAutoScroll}
                        showAutoScroll={showWatchNavArrows}
                        onTogglePip={toggleWatchPictureInPicture}
                      />
                    </>
                  ) : null}

                  {pipActive ? (
                    <div className="absolute inset-0 z-25 flex flex-col items-center justify-center gap-4 bg-black px-6 text-center">
                      <p className="text-lg font-semibold text-white">Đã bật Trình phát nổi</p>
                      <button
                        type="button"
                        className="rounded-lg bg-zinc-800 px-6 py-2.5 text-sm font-semibold text-white transition hover:bg-zinc-700"
                        onClick={() => void exitWatchPictureInPicture()}
                      >
                        Tắt
                  </button>
                </div>
              ) : null}

                  {isVideoFrameReady && activePlaybackUrl && !pipActive ? (
                    <WatchPlaybackBar
                      videoRef={videoRef}
                      current={watchPlayback.current}
                      duration={watchPlayback.duration}
                      onSeekFraction={handleWatchSeekFraction}
                      onScrubbingChange={handleWatchScrubbingChange}
                      volume={watchVolume}
                      onVolumeChange={setWatchVolume}
                      muted={watchMuted}
                      onMutedChange={setWatchMuted}
                      onTogglePip={() => void toggleWatchPictureInPicture()}
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

            <div className="pointer-events-none absolute inset-x-0 top-0 z-30 flex h-16 items-center bg-linear-to-b from-black/70 via-black/30 to-transparent px-6 sm:h-18 sm:px-10">
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
                <WatchSearchDropdown />
              </div>

              <div className="pointer-events-none w-11 shrink-0 sm:w-12" aria-hidden />
            </div>

            {showWatchNavArrows ? (
              <div className="pointer-events-none absolute right-3 top-1/2 z-30 hidden -translate-y-1/2 flex-col gap-2 lg:flex lg:right-4">
                <button
                  type="button"
                  className={`${WATCH_CHROME_BTN} pointer-events-auto ${hasPrevWatch && !exploreNavBusy ? '' : 'cursor-not-allowed opacity-45'}`}
                  aria-label="Video trước"
                  disabled={!hasPrevWatch || exploreNavBusy}
                  onClick={() => moveWatchVideo('prev')}
                >
                  <IoChevronUp />
                </button>
                <button
                  type="button"
                  className={`${WATCH_CHROME_BTN} pointer-events-auto ${hasNextWatch && !exploreNavBusy ? '' : 'cursor-not-allowed opacity-45'}`}
                  aria-label="Video sau"
                  disabled={!hasNextWatch || exploreNavBusy}
                  onClick={() => moveWatchVideo('next')}
                >
                  <IoChevronDown />
                </button>
              </div>
            ) : null}
          </div>

          <aside
            className={`flex w-full shrink-0 flex-col border-t border-zinc-800 bg-black ${
              mobileLayout
                ? ''
                : 'h-[min(46dvh,480px)] lg:h-auto lg:max-h-none lg:min-h-0 lg:w-[min(400px,34vw)] lg:border-l lg:border-t-0'
            }`}
          >
            {!activeVideo ? (
              <div className="flex flex-1 items-center justify-center p-6">
                <p className="text-sm text-zinc-500">…</p>
              </div>
            ) : (
              <>
                <div className="flex shrink-0 items-start gap-3 border-b border-zinc-800 p-4">
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
                    <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                      <Link
                        to={authorProfilePath}
                        className="truncate text-sm font-semibold text-zinc-100 hover:underline"
                      >
                            {String(panelVideo.authorDisplayName ?? '').trim() || 'Nhà sáng tạo'}
                      </Link>
                      <span className="shrink-0 text-xs text-zinc-500">
                            {formatRelativeTimeVi(panelVideo.createdAt)}
                      </span>
                    </div>
                        <p className="truncate text-xs text-zinc-400">@{authorVibelyId}</p>
                      </div>
                      {!isOwnAuthorWatch ? (
                        <button
                          type="button"
                          className={`shrink-0 rounded-sm px-3 py-1.5 text-sm font-semibold transition ${
                            authorFollowed
                              ? 'border border-zinc-700 bg-zinc-900 text-zinc-100 hover:bg-zinc-800'
                              : 'bg-[#FE2C55] text-white hover:bg-[#ea284f]'
                          } ${followBusy ? 'cursor-wait opacity-80' : 'cursor-pointer'}`}
                          onClick={() => void handleAuthorFollowToggle()}
                          disabled={followBusy}
                        >
                          {followBusy
                            ? '…'
                            : authorFollowed
                              ? 'Đã follow'
                              : 'Follow'}
                        </button>
                      ) : null}
                    </div>
                    {caption ? (
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-snug text-zinc-200">
                        {renderInteractiveText(caption)}
                      </p>
                    ) : null}
                    {reposted ? (
                      <SelfRepostIndicator
                        avatarUrl={user?.avatarUrl}
                        displayName={user?.displayName}
                        username={user?.username}
                        profilePath={
                          user?.username ? buildProfilePath(token, user) : undefined
                        }
                        onUnrepost={handleUnrepost}
                        busy={repostBusy}
                        theme="sidebar"
                      />
                    ) : null}
                    <div className="mt-2 flex items-center gap-1.5 text-xs text-zinc-400">
                      <IoMusicalNotes className="shrink-0 text-base text-zinc-500" aria-hidden />
                      <span className="truncate">nhạc nền - @{authorVibelyId}</span>
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 flex-nowrap items-center gap-x-4 overflow-visible border-b border-zinc-800 px-4 py-3">
                  <WatchActionTip tip="Thích">
                  <button
                    type="button"
                      className={`${ACTION_ROW} shrink-0`}
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
                    <IoHeart
                      className={`text-2xl ${liked ? 'text-[#FE2C55]' : 'text-white'}`}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold tabular-nums text-white">
                      {formatCompactCount(panelVideo.likeCount ?? 0)}
                    </span>
                  </button>
                  </WatchActionTip>
                  <WatchActionTip tip="Bình luận">
                  <button
                    type="button"
                      className={`${ACTION_ROW} shrink-0`}
                    aria-label="Bình luận"
                    onClick={focusCommentField}
                  >
                    <IoChatbubbleEllipses className="text-2xl text-white" aria-hidden />
                    <span className="text-sm font-semibold tabular-nums text-white">
                      {formatCompactCount(panelVideo.commentCount ?? 0)}
                    </span>
                  </button>
                  </WatchActionTip>
                  <WatchActionTip tip="Lưu">
                  <button
                    type="button"
                      className={`${ACTION_ROW} shrink-0`}
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
                    <IoBookmark
                      className={`text-2xl ${bookmarked ? 'text-[#FACE15]' : 'text-white'}`}
                      aria-hidden
                    />
                    <span className="text-sm font-semibold tabular-nums text-white">
                      {formatCompactCount(panelVideo.bookmarkCount ?? 0)}
                    </span>
                  </button>
                  </WatchActionTip>
                  <WatchShareStrip
                    videoPublicId={panelVideo.publicId}
                    authorUsername={panelVideo.authorUsername}
                    videoTitle={panelVideo.title ?? ''}
                    videoDescription={panelVideo.description ?? ''}
                    token={token}
                    disabled={!isWatchableVideo(panelVideo)}
                    reposted={reposted}
                    repostBusy={repostBusy}
                    onRepostToggle={handleRepostToggle}
                    onShareCountChange={handleShareCountChange}
                  />
                </div>

                <div className="shrink-0 border-b border-zinc-800 px-4 py-2">
                  <div className="flex items-center gap-2 rounded-lg border border-zinc-800 bg-zinc-900/80 px-3 py-2">
                    <span className="min-w-0 flex-1 truncate text-xs text-zinc-400">
                      {shareLinkDisplay}
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
                    aria-selected={watchSidebarTab === 'comments'}
                    className={`min-w-0 flex-1 border-b-2 px-2 py-3 text-left text-[15px] font-semibold ${
                      watchSidebarTab === 'comments'
                        ? 'border-white text-zinc-100'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                    onClick={() => setWatchSidebarTab('comments')}
                  >
                    Bình luận{' '}
                    <span className="font-normal text-zinc-400">
                      ({formatCompactCount(panelVideo.commentCount ?? 0)})
                    </span>
                  </button>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={
                      useSuggestedSidebar
                        ? watchSidebarTab === 'suggested'
                        : watchSidebarTab === 'creator'
                    }
                    disabled={!useSuggestedSidebar && !isCreatorWatch}
                    className={`min-w-0 flex-1 border-b-2 px-2 py-3 text-left text-[15px] font-semibold disabled:cursor-not-allowed disabled:opacity-40 ${
                      (
                        useSuggestedSidebar
                          ? watchSidebarTab === 'suggested'
                          : watchSidebarTab === 'creator'
                      )
                        ? 'border-white text-zinc-100'
                        : 'border-transparent text-zinc-500 hover:text-zinc-300'
                    }`}
                    onClick={() =>
                      setWatchSidebarTab(useSuggestedSidebar ? 'suggested' : 'creator')
                    }
                  >
                    {useSuggestedSidebar ? 'Bạn có thể thích' : 'Video của nhà sáng tạo'}
                  </button>
                </div>

                <div
                  ref={watchSidebarScrollRef}
                  className={`px-3 py-3 ${
                    mobileLayout
                      ? ''
                      : `min-h-0 flex-1 overscroll-contain ${
                          watchSidebarTab === 'creator' || watchSidebarTab === 'suggested'
                            ? 'scrollbar-none overflow-y-auto'
                            : 'overflow-y-auto'
                        }`
                  }`}
                >
                  {watchSidebarTab === 'suggested' ? (
                    suggestedLoading ? (
                      <p className="py-10 text-center text-sm text-zinc-500">
                        Đang tải gợi ý…
                      </p>
                    ) : suggestedVideos.length === 0 ? (
                      <p className="py-10 text-center text-sm text-zinc-500">
                        Chưa có gợi ý.
                      </p>
                    ) : (
                      <ul className="grid grid-cols-2 gap-2">
                        {suggestedVideos.map((v) => {
                          const vid = videoPublicIdOf(v)
                          return (
                            <li key={vid ?? v.id}>
                              <WatchCreatorVideoTile
                                video={v}
                                isPlaying={false}
                                onSelect={goToSuggestedVideo}
                              />
                            </li>
                          )
                        })}
                      </ul>
                    )
                  ) : watchSidebarTab === 'creator' ? (
                    creatorQueueLoading ? (
                      <p className="py-10 text-center text-sm text-zinc-500">
                        Đang tải video…
                      </p>
                    ) : creatorQueue.length === 0 ? (
                      <div className="flex flex-col items-center py-10 text-center text-sm text-zinc-500">
                        <p>Chưa có video công khai.</p>
                  <Link
                    to={authorProfilePath}
                          className="mt-3 text-xs font-semibold text-zinc-300 hover:text-white hover:underline"
                  >
                          Xem hồ sơ
                  </Link>
                </div>
                    ) : (
                      <ul className="grid grid-cols-2 gap-2">
                        {creatorGridVideos.map((v) => {
                          const vid = videoPublicIdOf(v)
                          const playing = vid != null && vid === publicIdFromRoute
                          return (
                            <li key={vid ?? v.id}>
                              <WatchCreatorVideoTile
                                video={v}
                                isPlaying={playing}
                                onSelect={goToCreatorVideo}
                              />
                            </li>
                          )
                        })}
                      </ul>
                    )
                  ) : commentsLoading ? (
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

                {watchSidebarTab === 'comments' ? (
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
                        placeholder={
                          token ? 'Thêm bình luận...' : 'Đăng nhập để bình luận...'
                        }
                        disabled={!token || !isWatchableVideo(panelVideo)}
                        className="w-full rounded-full border border-zinc-700 bg-zinc-900 py-2.5 pl-4 pr-[4.75rem] text-sm text-zinc-100 placeholder:text-zinc-500 outline-none focus:border-zinc-600 disabled:opacity-50"
                        onKeyDown={(e) => {
                          if (!isEnterKey(e) || e.nativeEvent.isComposing || e.shiftKey) return
                          e.preventDefault()
                          void submitWatchComment()
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
                      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-600 text-white shadow-md transition hover:bg-red-500 disabled:cursor-not-allowed disabled:opacity-40"
                      aria-label="Gửi bình luận"
                      disabled={!commentDraft.trim() || !token || !isWatchableVideo(panelVideo)}
                      onClick={() => void submitWatchComment()}
                    >
                      <IoArrowUp className="text-xl" aria-hidden />
                    </button>
                  </div>
                </div>
                ) : null}
              </>
            )}
          </aside>
        </div>
      </div>

      <VideoContextMenu
        open={Boolean(videoContextMenu)}
        x={videoContextMenu?.x ?? 0}
        y={videoContextMenu?.y ?? 0}
        downloading={videoDownloadBusy}
        onClose={closeVideoContextMenu}
        onDownload={handleWatchContextMenuDownload}
        onShare={() => {
          closeVideoContextMenu()
          setShareModalOpen(true)
        }}
        onCopyLink={async () => {
          const menuVideo = videoContextMenu?.video
          const url = buildShareableVideoUrl(
            menuVideo?.publicId,
            menuVideo?.authorUsername,
            { shareMethod: 'copy_link' },
          )
          if (!url) return
          try {
            await navigator.clipboard.writeText(url)
            setShareCopied(true)
            setTimeout(() => setShareCopied(false), 2000)
          } catch {
            setShareCopied(false)
          }
        }}
        onRepost={() => {
          closeVideoContextMenu()
          handleRepostToggle()
        }}
        reposted={reposted}
        repostBusy={repostBusy}
        onViewDetails={() => {
          closeVideoContextMenu()
        }}
      />

      <VideoShareModal
        open={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        videoId={panelVideo?.publicId}
        authorUsername={panelVideo?.authorUsername}
        videoTitle={panelVideo?.title ?? ''}
        token={token}
        onShareCountChange={handleShareCountChange}
      />
    </section>
  )
}

