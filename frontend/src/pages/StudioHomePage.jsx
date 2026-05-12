import React from 'react'
import { useEffect, useMemo, useState } from 'react'
import { apiClient } from '../api/client'
import { StudioLayout } from '../components/StudioLayout'
import { useAuth } from '../state/useAuth'

const PERIOD_OPTIONS = [7, 28, 60, 90]
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

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

export function StudioHomePage() {
  const { token } = useAuth()
  const [days, setDays] = useState(7)
  const [loading, setLoading] = useState(false)
  const [overview, setOverview] = useState({
    totalViews: 0,
    totalLikes: 0,
    totalComments: 0,
    points: buildZeroPoints(7),
    latestComments: [],
  })

  useEffect(() => {
    document.title = 'VibelyStudio | Home'
  }, [])

  useEffect(() => {
    if (!token) return
    let cancelled = false
    setLoading(true)
    ;(async () => {
      const maxAttempts = 2
      for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
          const data = await apiClient.getStudioAnalyticsOverview(token, { days })
          if (cancelled) return
          setOverview({
            totalViews: Number(data?.totalViews ?? 0),
            totalLikes: Number(data?.totalLikes ?? 0),
            totalComments: Number(data?.totalComments ?? 0),
            points: Array.isArray(data?.points) && data.points.length ? data.points : buildZeroPoints(days),
            latestComments: Array.isArray(data?.latestComments) ? data.latestComments : [],
          })
          if (!cancelled) setLoading(false)
          return
        } catch {
          if (attempt < maxAttempts) {
            await sleep(500)
            continue
          }
          if (!cancelled) {
            // Fallback mềm để dashboard vẫn hiển thị biểu đồ 0 khi backend tạm thời unavailable.
            setOverview({
              totalViews: 0,
              totalLikes: 0,
              totalComments: 0,
              points: buildZeroPoints(days),
              latestComments: [],
            })
          }
        } finally {
          if (!cancelled && attempt === maxAttempts) setLoading(false)
        }
      }
    })()
    return () => {
      cancelled = true
    }
  }, [token, days])

  const metricCards = useMemo(
    () => [
      { label: 'Lượt xem video', value: overview.totalViews },
      { label: 'Lượt thích', value: overview.totalLikes },
      { label: 'Bình luận', value: overview.totalComments },
    ],
    [overview.totalComments, overview.totalLikes, overview.totalViews],
  )
  const chartMeta = useMemo(() => {
    const points = overview.points ?? []
    if (!points.length) return { path: '', labels: [] }
    const maxY = Math.max(...points.map((p) => Number(p.views ?? 0)), 1)
    const width = 680
    const height = 180
    const pad = 16
    const stepX = points.length > 1 ? (width - pad * 2) / (points.length - 1) : 0
    const coords = points.map((p, idx) => {
      const x = pad + idx * stepX
      const y = height - pad - (Number(p.views ?? 0) / maxY) * (height - pad * 2)
      return { x, y, day: p.day }
    })
    const path = coords.map((c, idx) => `${idx === 0 ? 'M' : 'L'} ${c.x} ${c.y}`).join(' ')
    return { path, labels: coords }
  }, [overview.points])

  return (
    <StudioLayout active="home" title="Home" subtitle="Thống kê hiệu suất kênh của bạn">
      <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold">Chỉ số chính</h2>
          <div className="flex items-center gap-1 rounded-md border border-zinc-700 bg-zinc-950 p-1">
            {PERIOD_OPTIONS.map((option) => (
              <button
                key={option}
                type="button"
                className={`rounded px-2.5 py-1 text-xs ${days === option ? 'bg-zinc-700 text-white' : 'text-zinc-400 hover:bg-zinc-800'}`}
                onClick={() => setDays(option)}
              >
                {option} ngày
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {metricCards.map((m) => (
            <article key={m.label} className="rounded-lg border border-zinc-800 bg-zinc-950 p-3">
              <p className="text-xs text-zinc-500">{m.label}</p>
              <p className="mt-2 text-2xl font-bold text-zinc-100">{m.value}</p>
            </article>
          ))}
        </div>
        {loading ? <p className="mt-3 text-sm text-zinc-400">Đang tải thống kê...</p> : null}
      </div>

      <div className="mt-4 space-y-4">
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
          <h3 className="text-base font-semibold">Biểu đồ lượt xem</h3>
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-3">
            <svg viewBox="0 0 680 180" preserveAspectRatio="none" className="h-48 w-full">
              <path d={chartMeta.path} fill="none" stroke="#38bdf8" strokeWidth="3" />
            </svg>
            <div className="mt-2 flex items-center justify-between text-[11px] text-zinc-500">
              {chartMeta.labels.map((pt, idx) => (
                <span key={`${pt.day}-${idx}`} className={idx % 2 === 0 ? '' : 'opacity-0 sm:opacity-100'}>
                  {String(pt.day).slice(5)}
                </span>
              ))}
            </div>
            {overview.points.every((p) => Number(p.views ?? 0) === 0) ? (
              <p className="mt-2 text-center text-xs text-zinc-500">0 lượt xem trong giai đoạn này</p>
            ) : null}
          </div>

          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-base font-semibold">Bài đăng gần đây</h3>
            <div className="mt-3 rounded-md border border-zinc-800 bg-zinc-900/50 px-3 py-6 text-center text-sm text-zinc-500">
              Chưa có bài đăng nào
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 p-4">
            <h3 className="text-base font-semibold">Bình luận mới nhất</h3>
            {overview.latestComments.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">Chưa có bình luận nào trên video của bạn</p>
            ) : (
              <div className="mt-3 space-y-2">
                {overview.latestComments.map((comment) => (
                  <article key={comment.commentId} className="rounded-md border border-zinc-800 bg-zinc-900/50 p-3">
                    <p className="text-xs text-zinc-500">
                      @{comment.commenterUsername} • {new Date(comment.createdAt).toLocaleString('vi-VN')}
                    </p>
                    <p className="mt-1 text-sm text-zinc-200">{comment.content}</p>
                    <p className="mt-1 text-xs text-zinc-500">Video: {comment.videoTitle}</p>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </StudioLayout>
  )
}
