import React from 'react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  IoArrowBack,
  IoBookmarkOutline,
  IoChatbubbleEllipsesOutline,
  IoHeartOutline,
  IoInformationCircleOutline,
  IoPauseOutline,
  IoPlayOutline,
  IoShareSocialOutline,
  IoVideocamOutline,
} from 'react-icons/io5'
import { apiClient } from '../api/client'
import { StudioLayout } from '../components/StudioLayout'
import { useAuth } from '../state/useAuth'
import { buildProfileVideoUrl, isVideoPublicId, normalizeVideoPublicId } from '../utils/videoPublicId.js'
import {
  watchTimeNearPlaythroughEnd,
  watchTimeQualifiesForViewRecord,
} from '../utils/watchQualifiesForViewRecord'
import { parseApiDateTime } from '../utils/relativeTimeVi.js'

const PERIOD_OPTIONS = [7, 28, 60, 90]
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function normalizeDay(day) {
  if (day == null) return ''
  if (typeof day === 'string') return day.slice(0, 10)
  if (Array.isArray(day) && day.length >= 3) {
    const [y, m, d] = day
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
  }
  return String(day)
}

function buildZeroPoints(days) {
  const now = new Date()
  const rows = []
  for (let i = days - 1; i >= 0; i -= 1) {
    const d = new Date(now)
    d.setDate(now.getDate() - i)
    rows.push({
      day: d.toISOString().slice(0, 10),
      views: 0,
      likes: 0,
      comments: 0,
    })
  }
  return rows
}

/** Định dạng tổng thời gian: 0h:05m:30s */
function formatTotalWatch(ms) {
  const n = Math.max(0, Math.floor(Number(ms) || 0))
  const s = Math.floor(n / 1000)
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const sec = s % 60
  return `${h}h:${String(m).padStart(2, '0')}m:${String(sec).padStart(2, '0')}s`
}

/** Thời gian xem TB (giây, 2 chữ số). */
function formatAvgWatchSeconds(ms) {
  const v = Number(ms) || 0
  if (v <= 0) return '0s'
  return `${(v / 1000).toFixed(2)}s`
}

function formatPercent(p) {
  if (p == null || Number.isNaN(Number(p))) return '—'
  return `${Number(p).toFixed(1)}%`
}

function retentionDropHint(retention, durationSeconds) {
  const pts = Array.isArray(retention) ? retention : []
  if (pts.length < 2) return null
  let maxDrop = 0
  let atProgress = 0
  for (let i = 1; i < pts.length; i += 1) {
    const a = Number(pts[i - 1]?.retentionPercent ?? 0)
    const b = Number(pts[i]?.retentionPercent ?? 0)
    const drop = a - b
    if (drop > maxDrop) {
      maxDrop = drop
      atProgress = Number(pts[i]?.progressPercent ?? 0)
    }
  }
  if (maxDrop < 3) return null
  const dur = Number(durationSeconds)
  if (dur > 0) {
    const sec = Math.round((dur * atProgress) / 100)
    const mm = Math.floor(sec / 60)
    const ss = sec % 60
    const t = mm > 0 ? `${mm}:${String(ss).padStart(2, '0')}` : `0:${String(ss).padStart(2, '0')}`
    return `Nhiều phiên rời sớm quanh mốc ${t} (${atProgress}% thời lượng).`
  }
  return `Nhiều phiên rời sớm quanh ${atProgress}% thời lượng video.`
}

function buildViewsChartMeta(points) {
  if (!points.length) return { path: '', areaPath: '', labels: [] }
  const maxY = Math.max(...points.map((p) => Number(p.views ?? 0)), 1)
  const width = 680
  const height = 200
  const pad = 20
  const bottomY = height - pad
  const stepX = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0
  const coords = points.map((p, idx) => {
    const x = pad + idx * stepX
    const y = bottomY - (Number(p.views ?? 0) / maxY) * (bottomY - pad)
    return { x, y, day: p.day }
  })
  const path = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  const first = coords[0]
  const last = coords[coords.length - 1]
  const areaPath =
    first && last
      ? `M ${first.x} ${bottomY} L ${coords.map((c) => `${c.x} ${c.y}`).join(' L ')} L ${last.x} ${bottomY} Z`
      : ''
  return { path, areaPath, labels: coords }
}

function formatClockFromSeconds(totalSec) {
  const s = Math.max(0, Math.floor(Number(totalSec) || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `0:${String(r).padStart(2, '0')}`
}

/** @param {{ progressPercent?: number, retentionPercent?: number }[]} pts */
function retentionPercentAtProgress(pts, progressPercent) {
  const arr = [...pts].sort((a, b) => Number(a.progressPercent) - Number(b.progressPercent))
  if (!arr.length) return null
  const p = Math.max(0, Math.min(100, Number(progressPercent) || 0))
  const first = arr[0]
  const last = arr[arr.length - 1]
  if (p <= Number(first.progressPercent)) return Number(first.retentionPercent ?? 0)
  if (p >= Number(last.progressPercent)) return Number(last.retentionPercent ?? 0)
  for (let i = 1; i < arr.length; i += 1) {
    const p0 = Number(arr[i - 1].progressPercent)
    const p1 = Number(arr[i].progressPercent)
    if (p <= p1) {
      const r0 = Number(arr[i - 1].retentionPercent ?? 0)
      const r1 = Number(arr[i].retentionPercent ?? 0)
      const t = p1 === p0 ? 0 : (p - p0) / (p1 - p0)
      return r0 + t * (r1 - r0)
    }
  }
  return Number(last.retentionPercent ?? 0)
}

function buildRetentionChartMeta(retention) {
  const pts = Array.isArray(retention) ? retention : []
  const width = 680
  const height = 200
  const padL = 44
  const padR = 52
  const padT = 18
  const padB = 40
  const emptyInnerW = width - padL - padR
  const emptyInnerH = height - padT - padB
  if (!pts.length) {
    return {
      path: '',
      areaPath: '',
      labels: [],
      width,
      height,
      padL,
      padR,
      padT,
      padB,
      innerW: emptyInnerW,
      innerH: emptyInnerH,
    }
  }
  const maxY = 100
  const innerW = width - padL - padR
  const innerH = height - padT - padB
  const coords = pts.map((p) => {
    const x = padL + (Number(p.progressPercent ?? 0) / 100) * innerW
    const y = padT + innerH - (Number(p.retentionPercent ?? 0) / maxY) * innerH
    return { x, y, pct: p.progressPercent }
  })
  const path = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  const first = coords[0]
  const last = coords[coords.length - 1]
  const bottomY = padT + innerH
  const areaPath =
    first && last
      ? `M ${first.x} ${bottomY} L ${coords.map((c) => `${c.x} ${c.y}`).join(' L ')} L ${last.x} ${bottomY} Z`
      : ''
  return {
    path,
    areaPath,
    labels: coords,
    width,
    height,
    padL,
    padR,
    padT,
    padB,
    innerW,
    innerH,
  }
}

function buildEngagementChartMeta(points) {
  if (!points.length) return { likesPath: '', commentsPath: '', labels: [], maxY: 1 }
  const maxY = Math.max(
    ...points.map((p) => Math.max(Number(p.likes ?? 0), Number(p.comments ?? 0))),
    1,
  )
  const width = 680
  const height = 200
  const pad = 20
  const bottomY = height - pad
  const stepX = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0
  const likeCoords = points.map((p, idx) => ({
    x: pad + idx * stepX,
    y: bottomY - (Number(p.likes ?? 0) / maxY) * (bottomY - pad),
    day: p.day,
  }))
  const comCoords = points.map((p, idx) => ({
    x: pad + idx * stepX,
    y: bottomY - (Number(p.comments ?? 0) / maxY) * (bottomY - pad),
    day: p.day,
  }))
  const likesPath = likeCoords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  const commentsPath = comCoords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
  return { likesPath, commentsPath, labels: likeCoords, maxY }
}

export function StudioVideoAnalyticsPage() {
  const { publicId: publicIdParam } = useParams()
  const publicId = useMemo(
    () => normalizeVideoPublicId(publicIdParam),
    [publicIdParam],
  )
  const validPublicId = isVideoPublicId(publicId)
  const navigate = useNavigate()
  const { token } = useAuth()
  const [days, setDays] = useState(7)
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [payload, setPayload] = useState(null)
  const [scrubProgress, setScrubProgress] = useState(0)
  const [retentionVideoDur, setRetentionVideoDur] = useState(0)
  const retentionVideoRef = useRef(null)
  const retentionQualifyRecordedRef = useRef(false)
  const retentionPlaythroughRecordedRef = useRef(false)
  const [retentionUiPlaying, setRetentionUiPlaying] = useState(false)
  const [analyticsRefreshTick, setAnalyticsRefreshTick] = useState(0)

  useEffect(() => {
    setScrubProgress(0)
    setRetentionVideoDur(0)
    setRetentionUiPlaying(false)
    retentionQualifyRecordedRef.current = false
    retentionPlaythroughRecordedRef.current = false
    setAnalyticsRefreshTick(0)
  }, [publicId, days])

  useEffect(() => {
    document.title = validPublicId
      ? 'VibelyStudio | Thống kê'
      : 'VibelyStudio | Thống kê'
  }, [validPublicId])

  useEffect(() => {
    if (!token || !validPublicId || !publicId) return
    let cancelled = false
    const showFullLoader = analyticsRefreshTick === 0
    if (showFullLoader) {
      setLoading(true)
      setError('')
    }
    ;(async () => {
      const maxAttempts = 2
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const data = await apiClient.getStudioVideoAnalytics(token, publicId, { days })
          if (cancelled) return
          const rawPoints = Array.isArray(data?.points) ? data.points : []
          const points =
            rawPoints.length > 0
              ? rawPoints.map((p) => ({
                  day: normalizeDay(p.day),
                  views: Number(p.views ?? 0),
                  likes: Number(p.likes ?? 0),
                  comments: Number(p.comments ?? 0),
                }))
              : buildZeroPoints(days)
          setPayload({
            days: Number(data?.days ?? days),
            periodViews: Number(data?.periodViews ?? 0),
            periodLikes: Number(data?.periodLikes ?? 0),
            periodComments: Number(data?.periodComments ?? 0),
            periodBookmarks: Number(data?.periodBookmarks ?? 0),
            playbackSampleSize: Number(data?.playbackSampleSize ?? 0),
            periodTotalWatchMs: Number(data?.periodTotalWatchMs ?? 0),
            periodAvgWatchMs: Number(data?.periodAvgWatchMs ?? 0),
            periodFullWatchPercent: data?.periodFullWatchPercent ?? null,
            periodNewFollowers: Number(data?.periodNewFollowers ?? 0),
            video: data?.video ?? null,
            points,
            retention: Array.isArray(data?.retention) ? data.retention : [],
            trafficSources: Array.isArray(data?.trafficSources) ? data.trafficSources : [],
            searchKeywords: Array.isArray(data?.searchKeywords) ? data.searchKeywords : [],
            topSemanticTags: Array.isArray(data?.topSemanticTags) ? data.topSemanticTags : [],
          })
          if (!cancelled && showFullLoader) setLoading(false)
          return
        } catch (e) {
          if (attempt < maxAttempts) {
            await sleep(400)
            continue
          }
          if (!cancelled) {
            setError(e instanceof Error ? e.message : 'Không tải được thống kê.')
            setPayload(null)
          }
        } finally {
          if (!cancelled && attempt === maxAttempts && showFullLoader) setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, publicId, validPublicId, days, analyticsRefreshTick])

  const video = payload?.video
  const points = payload?.points ?? buildZeroPoints(days)
  const retention = payload?.retention ?? []
  const trafficSources = payload?.trafficSources ?? []
  const searchKeywords = payload?.searchKeywords ?? []
  const topSemanticTags = payload?.topSemanticTags ?? []

  const viewsChart = useMemo(() => buildViewsChartMeta(points), [points])
  const retentionChart = useMemo(() => buildRetentionChartMeta(retention), [retention])
  const engagementChart = useMemo(() => buildEngagementChartMeta(points), [points])

  const retentionTip = useMemo(
    () => retentionDropHint(retention, video?.durationSeconds),
    [retention, video?.durationSeconds],
  )

  const scrubRetention = useMemo(
    () => retentionPercentAtProgress(retention, scrubProgress),
    [retention, scrubProgress],
  )

  const retentionInsight = useMemo(() => {
    if (retentionTip) {
      return `${retentionTip} Phát video bên dưới và kéo thanh thời gian để xem mức giữ chân tại từng thời điểm.`
    }
    if (retention.length > 0) {
      return 'Phát video bên dưới và kéo thanh thời gian để xem tỷ lệ giữ chân tại từng thời điểm.'
    }
    return null
  }, [retentionTip, retention.length])

  const effectiveVideoDuration =
    retentionVideoDur > 0
      ? retentionVideoDur
      : Number(video?.durationSeconds) > 0
        ? Number(video.durationSeconds)
        : 0

  const postedLabel = useMemo(() => {
    const d = parseApiDateTime(video?.createdAt)
    if (!d) return '—'
    return d.toLocaleDateString('vi-VN', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
    })
  }, [video?.createdAt])

  const title = (video?.title && String(video.title).trim()) || 'Không có tiêu đề'
  const hasThumb = Boolean(video?.thumbnailUrl)
  const desc = (video?.description && String(video.description).trim()) || title

  const svgIds = useMemo(
    () => ({
      va: `st-va-fill-${publicId ?? 'invalid'}`,
      ret: `st-ret-fill-${publicId ?? 'invalid'}`,
    }),
    [publicId],
  )

  if (!validPublicId || !publicId) {
    return (
      <StudioLayout active="posts" title="Thống kê" subtitle="Mã video không hợp lệ">
        <p className="text-sm text-zinc-500">Đường dẫn không hợp lệ.</p>
      </StudioLayout>
    )
  }

  const tabBar = (
    <nav className="flex gap-8 border-b border-zinc-800/80 text-sm font-semibold">
      {[
        { id: 'overview', label: 'Tổng quan' },
        { id: 'viewers', label: 'Người xem' },
        { id: 'engagement', label: 'Tương tác' },
      ].map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => setTab(t.id)}
          className={`relative -mb-px cursor-pointer pb-3 transition ${
            tab === t.id ? 'text-sky-400' : 'text-zinc-500 hover:text-zinc-200'
          }`}
        >
          {t.label}
          {tab === t.id ? (
            <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-sky-400" />
          ) : null}
        </button>
      ))}
    </nav>
  )

  const videoHeader = (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4 sm:p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-4">
          <div className="relative h-28 w-20 shrink-0 overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900">
            {hasThumb ? (
              <img src={video.thumbnailUrl} alt="" className="h-full w-full object-cover" />
            ) : video?.videoUrl ? (
              <video
                src={video.videoUrl}
                muted
                playsInline
                className="h-full w-full object-cover"
                preload="metadata"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-zinc-600">
                <IoVideocamOutline className="h-8 w-8" aria-hidden />
              </div>
            )}
          </div>
          <div className="min-w-0">
            <h1 className="text-lg font-semibold text-white sm:text-xl">{desc}</h1>
            <p className="mt-1 text-xs text-zinc-500">
              Đăng ngày {postedLabel}
              {video?.publicId ? (
                <span className="text-zinc-600 font-mono text-xs"> · {video.publicId}</span>
              ) : null}
            </p>
            <Link
              to={
                video?.authorUsername && publicId
                  ? buildProfileVideoUrl(video.authorUsername, publicId)
                  : '#'
              }
              className={`mt-2 inline-block text-xs ${
                video?.authorUsername
                  ? 'cursor-pointer font-medium text-sky-400 hover:underline'
                  : 'pointer-events-none text-zinc-600'
              }`}
            >
              Mở trên feed
            </Link>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-4 text-zinc-400 sm:gap-5">
          <span className="inline-flex items-center gap-1.5 text-sm tabular-nums" title="Lượt xem (tổng)">
            <IoPlayOutline className="h-5 w-5 shrink-0 text-zinc-300" aria-hidden />
            {video?.viewCount ?? 0}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm tabular-nums" title="Lượt thích">
            <IoHeartOutline className="h-5 w-5 shrink-0 text-zinc-300" aria-hidden />
            {video?.likeCount ?? 0}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm tabular-nums" title="Bình luận">
            <IoChatbubbleEllipsesOutline className="h-5 w-5 shrink-0 text-zinc-300" aria-hidden />
            {video?.commentCount ?? 0}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm tabular-nums" title="Chia sẻ">
            <IoShareSocialOutline className="h-5 w-5 shrink-0 text-zinc-300" aria-hidden />
            {video?.shareCount ?? 0}
          </span>
          <span className="inline-flex items-center gap-1.5 text-sm tabular-nums" title="Đã lưu">
            <IoBookmarkOutline className="h-5 w-5 shrink-0 text-zinc-300" aria-hidden />
            {video?.bookmarkCount ?? 0}
          </span>
        </div>
      </div>
      <p className="mt-4 text-xs text-zinc-500">
        Các số trong khối chỉ số dưới đây là trong <strong className="text-zinc-300">{days} ngày</strong> gần nhất
        (khác với hàng icon tổng cộng).
      </p>
    </section>
  )

  const periodSelector = (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <div className="flex items-center gap-0.5 rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
        {PERIOD_OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            className={`cursor-pointer rounded-md px-2.5 py-1.5 text-xs font-medium ${
              days === option ? 'bg-zinc-800 text-white' : 'text-zinc-400 hover:bg-zinc-900'
            }`}
            onClick={() => setDays(option)}
          >
            {option} ngày
          </button>
        ))}
      </div>
    </div>
  )

  const metricCards = (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {[
        {
          label: 'Lượt xem (giai đoạn)',
          value: payload?.periodViews ?? 0,
          accent: true,
          hint: null,
        },
        {
          label: 'Tổng thời gian xem',
          value:
            (payload?.periodViews ?? 0) > 0
              ? formatTotalWatch(payload?.periodTotalWatchMs ?? 0)
              : '—',
          hint: null,
        },
        {
          label: 'Thời gian xem TB',
          value:
            (payload?.periodViews ?? 0) > 0 ? formatAvgWatchSeconds(payload?.periodAvgWatchMs ?? 0) : '—',
          hint: null,
        },
        {
          label: 'Xem hết video',
          value:
            (payload?.periodViews ?? 0) > 0
              ? formatPercent(payload?.periodFullWatchPercent)
              : '—',
          hint: null,
        },
        {
          label: 'Follower mới (kênh)',
          value: String(payload?.periodNewFollowers ?? 0),
          hint: null,
        },
      ].map((m) => (
        <article
          key={m.label}
          className={`rounded-xl border bg-zinc-950 p-4 ${
            m.accent ? 'border-sky-500/50 ring-1 ring-sky-500/20' : 'border-zinc-800'
          }`}
        >
          <p className="text-xs text-zinc-500">{m.label}</p>
          <p className="mt-2 text-xl font-bold text-zinc-100">{m.value}</p>
          {m.hint ? <p className="mt-1 text-[11px] text-zinc-600">{m.hint}</p> : null}
        </article>
      ))}
    </div>
  )

  const viewsSection = (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <h2 className="text-base font-semibold text-white">Lượt xem theo ngày</h2>
      <div className="mt-4 rounded-lg border border-zinc-800 bg-black/40 p-3">
        {loading ? <p className="py-8 text-center text-sm text-zinc-500">Đang tải...</p> : null}
        {!loading ? (
          <svg viewBox="0 0 680 200" preserveAspectRatio="none" className="h-52 w-full">
            <defs>
              <linearGradient id={svgIds.va} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </linearGradient>
            </defs>
            {viewsChart.areaPath ? (
              <path d={viewsChart.areaPath} fill={`url(#${svgIds.va})`} stroke="none" />
            ) : null}
            <path d={viewsChart.path} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
          </svg>
        ) : null}
        {!loading ? (
          <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
            {viewsChart.labels.map((pt, idx) => (
              <span key={`${pt.day}-${idx}`} className={idx % 2 === 0 ? '' : 'opacity-0 sm:opacity-100'}>
                {String(pt.day).slice(5)}
              </span>
            ))}
          </div>
        ) : null}
        {!loading && points.every((p) => Number(p.views ?? 0) === 0) ? (
          <p className="mt-2 text-center text-xs text-zinc-500">Chưa có lượt xem trong giai đoạn này</p>
        ) : null}
      </div>
    </section>
  )

  const retentionBlock = (compact = false) => {
    const rt = retentionChart
    const y50 = rt.padT + rt.innerH / 2
    const bottomY = rt.padT + rt.innerH
    const x1 = rt.padL
    const x2 = rt.width - rt.padR
    const scrubX = rt.padL + (scrubProgress / 100) * rt.innerW
    const tooltipLeftPct = (scrubX / rt.width) * 100
    const chartWrapClass = compact ? 'max-h-[160px]' : 'max-h-[240px]'
    const placeholderPath = `M ${x1} ${rt.padT + rt.innerH * 0.1} L ${x1 + rt.innerW * 0.35} ${rt.padT + rt.innerH * 0.42} L ${x1 + rt.innerW * 0.72} ${rt.padT + rt.innerH * 0.68} L ${x2} ${bottomY - 4}`

    const videoShellClass = compact
      ? 'mx-auto w-full max-w-[200px] aspect-9/16 sm:max-w-[220px]'
      : 'mx-auto w-full max-w-[min(280px,85vw)] aspect-9/16'

    const chartPanelClass =
      'space-y-3 rounded-xl border border-zinc-800 bg-zinc-900/70 p-3 sm:p-4 ring-1 ring-white/5'

    const renderEmptyChartShell = (footerText) => (
      <div className={chartPanelClass}>
        <div className={`relative mx-auto w-full max-w-3xl pt-6 ${chartWrapClass}`}>
          <svg
            viewBox={`0 0 ${rt.width} ${rt.height}`}
            className="h-auto w-full min-h-[140px] sm:min-h-[160px]"
            preserveAspectRatio="xMidYMid meet"
          >
            <line
              x1={x1}
              y1={rt.padT}
              x2={x2}
              y2={rt.padT}
              stroke="#3f3f46"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <line
              x1={x1}
              y1={y50}
              x2={x2}
              y2={y50}
              stroke="#3f3f46"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <line
              x1={x1}
              y1={bottomY}
              x2={x2}
              y2={bottomY}
              stroke="#3f3f46"
              strokeWidth="1"
              strokeDasharray="4 4"
            />
            <text
              x={rt.width - 6}
              y={rt.padT + 12}
              textAnchor="end"
              fill="#71717a"
              fontSize="11"
              fontFamily="system-ui, sans-serif"
            >
              100%
            </text>
            <text
              x={rt.width - 6}
              y={y50 + 4}
              textAnchor="end"
              fill="#71717a"
              fontSize="11"
              fontFamily="system-ui, sans-serif"
            >
              50%
            </text>
            <path
              d={placeholderPath}
              fill="none"
              stroke="#52525b"
              strokeWidth="1.5"
              strokeDasharray="6 5"
              opacity={0.85}
            />
            <line
              x1={scrubX}
              y1={rt.padT}
              x2={scrubX}
              y2={bottomY}
              stroke="#a1a1aa"
              strokeWidth="1"
              strokeDasharray="3 3"
              opacity={0.9}
            />
          </svg>
        </div>
        {video?.videoUrl ? (
          <div className="mx-auto w-full max-w-3xl px-0.5">
            <input
              type="range"
              min={0}
              max={100}
              step={0.2}
              value={scrubProgress}
              onChange={(e) => {
                const v = Number(e.target.value)
                setScrubProgress(v)
                const el = retentionVideoRef.current
                if (el && Number.isFinite(el.duration) && el.duration > 0) {
                  el.currentTime = (v / 100) * el.duration
                }
              }}
              className="retention-scrub retention-scrub--dark"
              style={{ ['--ret-fill']: `${scrubProgress}%` }}
              aria-label="Tua video"
            />
            <div className="mt-2 flex justify-between text-xs tabular-nums text-zinc-400">
              <span>{formatClockFromSeconds((scrubProgress / 100) * effectiveVideoDuration)}</span>
              <span>{formatClockFromSeconds(effectiveVideoDuration)}</span>
            </div>
          </div>
        ) : null}
        <p className="text-center text-xs leading-relaxed text-zinc-500 sm:text-sm">{footerText}</p>
      </div>
    )

    return (
      <section className="rounded-2xl border border-zinc-800 bg-zinc-950/90 shadow-none ring-1 ring-white/5">
        <header className="border-b border-zinc-800 px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-1.5">
            <h2 className="text-base font-bold tracking-tight text-white sm:text-[17px]">Tỷ lệ giữ chân</h2>
            <span
              className="inline-flex text-zinc-500"
              title="Tỷ lệ phiên xem còn đạt tới từng mốc % thời lượng video (dựa trên watchedMs / durationMs từ client)."
            >
              <IoInformationCircleOutline className="h-5 w-5" aria-hidden />
            </span>
          </div>
        </header>

        <div className={`space-y-5 px-4 py-5 sm:px-6 ${compact ? 'sm:space-y-4 sm:py-4' : ''}`}>
          <p className="text-sm leading-relaxed text-zinc-400">
            Phần trăm phiên xem trong kỳ còn đạt tới từng mốc trên trục thời lượng (watchedMs / durationMs).
          </p>
          {retentionInsight ? (
            <p className="text-sm leading-relaxed text-zinc-200">{retentionInsight}</p>
          ) : null}

          <div className={`relative overflow-hidden rounded-2xl border border-zinc-800 bg-black ${videoShellClass}`}>
            {video?.videoUrl ? (
              <>
                <video
                  ref={retentionVideoRef}
                  src={video.videoUrl}
                  muted
                  playsInline
                  loop
                  controls={false}
                  className="h-full w-full cursor-pointer object-cover"
                  preload="metadata"
                  onClick={() => {
                    const el = retentionVideoRef.current
                    if (!el) return
                    if (el.paused) void el.play().catch(() => {})
                    else el.pause()
                  }}
                  onLoadedMetadata={(e) => {
                    const d = e.currentTarget.duration
                    if (Number.isFinite(d) && d > 0) setRetentionVideoDur(d)
                  }}
                  onTimeUpdate={(e) => {
                    const el = e.currentTarget
                    if (!Number.isFinite(el.duration) || el.duration <= 0) return
                    setScrubProgress(Math.min(100, Math.max(0, (el.currentTime / el.duration) * 100)))
                    const watchedMs = Math.floor(el.currentTime * 1000)
                    const d = el.duration
                    const durationMs =
                      Number.isFinite(d) && d > 0 ? Math.floor(d * 1000) : null

                    if (
                      durationMs != null &&
                      !retentionPlaythroughRecordedRef.current &&
                      watchTimeNearPlaythroughEnd(watchedMs, durationMs)
                    ) {
                      retentionPlaythroughRecordedRef.current = true
                      apiClient
                        .recordVideoView(String(publicId), {
                          watchedMs,
                          durationMs,
                        })
                        .then(() => {
                          setAnalyticsRefreshTick((t) => t + 1)
                        })
                        .catch(() => {
                          retentionPlaythroughRecordedRef.current = false
                        })
                      return
                    }

                    if (retentionQualifyRecordedRef.current) return
                    if (!watchTimeQualifiesForViewRecord(watchedMs, durationMs)) return
                    retentionQualifyRecordedRef.current = true
                    apiClient
                      .recordVideoView(String(publicId), {
                        watchedMs,
                        ...(durationMs != null ? { durationMs } : {}),
                      })
                      .then(() => {
                        setAnalyticsRefreshTick((t) => t + 1)
                      })
                      .catch(() => {
                        retentionQualifyRecordedRef.current = false
                      })
                  }}
                  onPlay={() => setRetentionUiPlaying(true)}
                  onPause={() => setRetentionUiPlaying(false)}
                  onEnded={() => {
                    setRetentionUiPlaying(false)
                  }}
                />
                {retentionUiPlaying ? (
                  <button
                    type="button"
                    className="absolute bottom-5 left-1/2 z-10 -translate-x-1/2 cursor-pointer border-0 bg-transparent p-2 text-white outline-none transition hover:opacity-90"
                    onClick={(e) => {
                      e.stopPropagation()
                      retentionVideoRef.current?.pause()
                    }}
                    aria-label="Tạm dừng"
                  >
                    <IoPauseOutline
                      className="h-11 w-11 drop-shadow-[0_2px_10px_rgba(0,0,0,0.9)] sm:h-12 sm:w-12"
                      aria-hidden
                    />
                  </button>
                ) : null}
              </>
            ) : (
              <div className="flex min-h-[200px] items-center justify-center px-4 py-16 text-center text-sm text-zinc-500">
                Chưa có video
              </div>
            )}
          </div>

          {loading ? (
            <p className="py-2 text-center text-sm text-zinc-500">Đang tải biểu đồ...</p>
          ) : null}

          {!loading && retention.length === 0 && (payload?.periodViews ?? 0) === 0
            ? renderEmptyChartShell('Chưa có lượt xem trong giai đoạn này — đường mảnh là minh họa, chưa có dữ liệu thật.')
            : null}

          {!loading && retention.length === 0 && (payload?.periodViews ?? 0) > 0 && (payload?.playbackSampleSize ?? 0) === 0
            ? renderEmptyChartShell(
                'Chưa có mẫu phát trong kỳ (watchedMs/duration) — xem video ở trên ít nhất ~2s để ghi nhận, hoặc chờ dữ liệu từ feed. Bạn vẫn có thể tua bằng thanh bên dưới.',
              )
            : null}

          {!loading && retention.length > 0 ? (
            <div className={chartPanelClass}>
              <div className={`relative mx-auto w-full max-w-3xl pt-8 ${chartWrapClass}`}>
                {scrubRetention != null ? (
                  <div
                    className="pointer-events-none absolute z-10 mb-1 min-w-17 -translate-x-1/2 rounded-lg border border-zinc-600 bg-zinc-900 px-2.5 py-1.5 text-center shadow-lg shadow-black/50"
                    style={{ left: `${tooltipLeftPct}%`, bottom: '100%' }}
                  >
                    <p className="text-[11px] font-semibold tabular-nums text-white">
                      {formatClockFromSeconds((scrubProgress / 100) * effectiveVideoDuration)}
                    </p>
                    <p className="mt-0.5 flex items-center justify-center gap-1 text-[11px] tabular-nums text-zinc-400">
                      <span className="inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-sky-400" aria-hidden />
                      Giữ chân ~{scrubRetention.toFixed(0)}%
                    </p>
                  </div>
                ) : null}
                <svg
                  viewBox={`0 0 ${rt.width} ${rt.height}`}
                  className="h-auto w-full min-h-[140px] sm:min-h-[160px]"
                  preserveAspectRatio="xMidYMid meet"
                >
                  <defs>
                    <linearGradient id={svgIds.ret} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.28" />
                      <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  <line
                    x1={x1}
                    y1={rt.padT}
                    x2={x2}
                    y2={rt.padT}
                    stroke="#3f3f46"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={x1}
                    y1={y50}
                    x2={x2}
                    y2={y50}
                    stroke="#3f3f46"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <line
                    x1={x1}
                    y1={bottomY}
                    x2={x2}
                    y2={bottomY}
                    stroke="#3f3f46"
                    strokeWidth="1"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={rt.width - 6}
                    y={rt.padT + 12}
                    textAnchor="end"
                    fill="#71717a"
                    fontSize="11"
                    fontFamily="system-ui, sans-serif"
                  >
                    100%
                  </text>
                  <text
                    x={rt.width - 6}
                    y={y50 + 4}
                    textAnchor="end"
                    fill="#71717a"
                    fontSize="11"
                    fontFamily="system-ui, sans-serif"
                  >
                    50%
                  </text>
                  {rt.areaPath ? (
                    <path d={rt.areaPath} fill={`url(#${svgIds.ret})`} stroke="none" />
                  ) : null}
                  <path d={rt.path} fill="none" stroke="#38bdf8" strokeWidth="2.25" />
                  <line
                    x1={scrubX}
                    y1={rt.padT}
                    x2={scrubX}
                    y2={bottomY}
                    stroke="#a1a1aa"
                    strokeWidth="1"
                    strokeDasharray="3 3"
                  />
                </svg>
              </div>

              <div className="mx-auto w-full max-w-3xl px-0.5">
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={0.2}
                  value={scrubProgress}
                  onChange={(e) => {
                    const v = Number(e.target.value)
                    setScrubProgress(v)
                    const el = retentionVideoRef.current
                    if (el && Number.isFinite(el.duration) && el.duration > 0) {
                      el.currentTime = (v / 100) * el.duration
                    }
                  }}
                  className="retention-scrub retention-scrub--dark"
                  style={{ ['--ret-fill']: `${scrubProgress}%` }}
                  aria-label="Vị trí trên video để xem tỷ lệ giữ chân"
                />
                <div className="mt-2 flex justify-between text-xs tabular-nums text-zinc-400">
                  <span>
                    {formatClockFromSeconds((scrubProgress / 100) * effectiveVideoDuration)}
                    {scrubRetention != null ? ` · giữ chân ~${scrubRetention.toFixed(0)}%` : ''}
                  </span>
                  <span>{formatClockFromSeconds(effectiveVideoDuration)}</span>
                </div>
              </div>

              <div className="flex justify-between px-0.5 text-[10px] text-zinc-500">
                <span>Đầu video (0% thời lượng)</span>
                <span>Cuối video (100% thời lượng)</span>
              </div>
            </div>
          ) : null}
        </div>
      </section>
    )
  }

  const trafficBlock = (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <h2 className="text-base font-semibold text-white">Nguồn traffic</h2>
      <p className="mt-2 text-sm text-zinc-500">Phân tích nguồn (For You, hồ sơ, tìm kiếm) sắp có.</p>
      <ul className="mt-4 space-y-2.5">
        {(trafficSources.length ? trafficSources : [{ id: 'x', label: '—', percent: null }]).map((row) => {
          const pct = row.percent != null ? Math.min(100, Math.max(0, Number(row.percent))) : null
          return (
            <li key={row.id} className="flex items-center gap-2 text-xs">
              <span className="w-28 shrink-0 text-zinc-400">{row.label}</span>
              <span className="h-2 flex-1 overflow-hidden rounded-full bg-zinc-800">
                {pct != null ? (
                  <span className="block h-full rounded-full bg-sky-500/90" style={{ width: `${pct}%` }} />
                ) : (
                  <span className="block h-full w-0" />
                )}
              </span>
              <span className="w-10 shrink-0 text-right tabular-nums text-zinc-500">
                {pct != null ? `${pct.toFixed(0)}%` : '—'}
              </span>
            </li>
          )
        })}
      </ul>
    </section>
  )

  const searchBlock = (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <h2 className="text-base font-semibold text-white">Từ khóa tìm kiếm</h2>
      {searchKeywords.length === 0 ? (
        <p className="mt-2 text-sm text-zinc-500">Chưa có dữ liệu từ khóa.</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-800">
          {searchKeywords.map((kw) => (
            <li key={kw.query} className="flex justify-between py-2 text-sm">
              <span className="text-zinc-200">{kw.query}</span>
              <span className="tabular-nums text-zinc-500">{kw.impressions}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )

  const semanticTagsBlock = (
    <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
      <h2 className="text-base font-semibold text-white">Thẻ ngữ nghĩa (CU)</h2>
      <p className="mt-1 text-sm text-zinc-500">Tag do Content Understanding gắn cho video này.</p>
      {topSemanticTags.length === 0 ? (
        <p className="mt-3 text-sm text-zinc-500">Chưa có thẻ ngữ nghĩa.</p>
      ) : (
        <ul className="mt-3 divide-y divide-zinc-800">
          {topSemanticTags.map((tag) => (
            <li key={tag.slug} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="min-w-0 truncate text-zinc-200">
                #{tag.slug}
                {tag.name && tag.name !== tag.slug ? (
                  <span className="ml-2 text-zinc-500">{tag.name}</span>
                ) : null}
              </span>
              <span className="shrink-0 tabular-nums text-zinc-500">
                {tag.confidence != null ? `${Math.round(Number(tag.confidence) * 100)}%` : '—'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )

  const engagementTab = (
    <div className="space-y-5">
      {videoHeader}
      {periodSelector}
      <div className="grid gap-3 sm:grid-cols-3">
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
          <p className="text-xs text-zinc-500">Thích (kỳ)</p>
          <p className="mt-2 text-2xl font-bold text-pink-400">{payload?.periodLikes ?? 0}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
          <p className="text-xs text-zinc-500">Bình luận (kỳ)</p>
          <p className="mt-2 text-2xl font-bold text-sky-400">{payload?.periodComments ?? 0}</p>
        </article>
        <article className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
          <p className="text-xs text-zinc-500">Đã lưu (kỳ)</p>
          <p className="mt-2 text-2xl font-bold text-amber-300">{payload?.periodBookmarks ?? 0}</p>
        </article>
      </div>
      <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
        <h2 className="text-base font-semibold text-white">Thích & bình luận theo ngày</h2>
        <div className="mt-4 rounded-lg border border-zinc-800 bg-black/40 p-3">
          {loading ? <p className="py-8 text-center text-sm text-zinc-500">Đang tải...</p> : null}
          {!loading ? (
            <svg viewBox="0 0 680 200" preserveAspectRatio="none" className="h-52 w-full">
              <path d={engagementChart.likesPath} fill="none" stroke="#f472b6" strokeWidth="2.5" />
              <path d={engagementChart.commentsPath} fill="none" stroke="#38bdf8" strokeWidth="2.5" />
            </svg>
          ) : null}
          {!loading ? (
            <div className="mt-2 flex flex-wrap items-center justify-center gap-4 text-xs text-zinc-500">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-4 rounded-sm bg-pink-400" aria-hidden />
                Thích
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-4 rounded-sm bg-sky-400" aria-hidden />
                Bình luận
              </span>
            </div>
          ) : null}
          {!loading ? (
            <div className="mt-1 flex items-center justify-between text-[11px] text-zinc-500">
              {engagementChart.labels.map((pt, idx) => (
                <span key={`${pt.day}-${idx}`} className={idx % 2 === 0 ? '' : 'opacity-0 sm:opacity-100'}>
                  {String(pt.day).slice(5)}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  )

  const viewersTab = (
    <div className="space-y-5">
      {videoHeader}
      {periodSelector}
      {viewsSection}
      {retentionBlock(false)}
      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
          <h3 className="text-sm font-semibold text-zinc-200">Độ tuổi</h3>
          <p className="mt-3 text-sm text-zinc-500">Sắp có — cần dữ liệu hồ sơ người xem theo chính sách riêng tư.</p>
        </section>
        <section className="rounded-xl border border-zinc-800 bg-zinc-950/80 p-4">
          <h3 className="text-sm font-semibold text-zinc-200">Giới tính</h3>
          <p className="mt-3 text-sm text-zinc-500">Sắp có.</p>
        </section>
      </div>
    </div>
  )

  const overviewTab = (
    <div className="space-y-5">
      {videoHeader}
      {periodSelector}
      {metricCards}
      {viewsSection}
      <div className="grid gap-4 lg:grid-cols-2">
        {retentionBlock(true)}
        <div className="space-y-4">
          {trafficBlock}
          {searchBlock}
          {semanticTagsBlock}
        </div>
      </div>
    </div>
  )

  return (
    <StudioLayout active="posts" hidePageHeader>
      <div className="mx-auto max-w-5xl space-y-5">
        <div className="border-b border-zinc-800/80 pb-4">
          <button
            type="button"
            onClick={() => navigate('/vibelystudio/posts')}
            className="inline-flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-sm text-zinc-300 transition hover:bg-zinc-800 hover:text-white"
          >
            <IoArrowBack className="h-4 w-4" aria-hidden />
            Bài đăng
          </button>
        </div>

        {tabBar}

        {error ? (
          <div className="rounded-xl border border-red-900/60 bg-red-950/40 px-4 py-3 text-sm text-red-200">
            {error}
          </div>
        ) : null}

        {!error && tab === 'overview' ? overviewTab : null}
        {!error && tab === 'viewers' ? viewersTab : null}
        {!error && tab === 'engagement' ? engagementTab : null}
      </div>
    </StudioLayout>
  )
}
