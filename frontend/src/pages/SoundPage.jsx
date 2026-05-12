import React, { useEffect, useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { apiClient } from '../api/client'

const DEFAULT_COVER = '/images/users/default-avatar.jpeg'

function formatCompactCount(value) {
  const count = Number(value ?? 0)
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`
  if (count >= 1_000) return `${(count / 1_000).toFixed(1).replace(/\.0$/, '')}K`
  return String(count)
}

export function SoundPage() {
  const [searchParams] = useSearchParams()
  const audioUrl = String(searchParams.get('audioUrl') ?? '').trim()
  const audioTitleFromQuery = String(searchParams.get('title') ?? '').trim()
  const creatorFromQuery = String(searchParams.get('creator') ?? '').trim()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])

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

  const cover = useMemo(() => {
    if (items[0]?.thumbnailUrl?.trim()) return items[0].thumbnailUrl
    return DEFAULT_COVER
  }, [items])

  const title = items[0]?.audioTitle || audioTitleFromQuery || 'Âm thanh gốc'
  const creator = items[0]?.authorDisplayName || creatorFromQuery || 'Nhà sáng tạo'
  const creatorUsername = String(items[0]?.authorUsername ?? '').trim().replace(/^@/, '')
  const creatorProfileHref = creatorUsername ? `/@${encodeURIComponent(creatorUsername)}` : ''
  const heroVideo = items[0]?.videoUrl?.trim() ? items[0].videoUrl : ''

  return (
    <div className="min-h-screen bg-black text-zinc-100">
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
            <div className="relative h-24 w-20 overflow-hidden rounded-md ring-1 ring-zinc-700">
              {items[0]?.videoUrl?.trim() ? (
                <video
                  src={items[0].videoUrl}
                  poster={cover}
                  muted
                  autoPlay
                  loop
                  playsInline
                  className="h-full w-full object-cover"
                />
              ) : (
                <img src={cover} alt="" className="h-full w-full object-cover" />
              )}
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
              <p className="mt-1 text-xs text-zinc-400">{items.length} videos</p>
              {audioUrl ? (
                <audio className="mt-2.5 w-full max-w-md" controls src={audioUrl}>
                  Trình duyệt không hỗ trợ phát audio.
                </audio>
              ) : null}
            </div>
          </header>
        </div>
      </div>

      <div className="mx-auto w-full max-w-[1200px] px-4 py-6">
        <section>
          {loading ? <p className="text-zinc-400">Đang tải video…</p> : null}
          {error ? <p className="text-red-400">{error}</p> : null}
          {!loading && !error && items.length === 0 ? (
            <p className="text-zinc-500">Chưa có video nào dùng âm thanh này.</p>
          ) : null}
          {items.length > 0 ? (
            <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
              {items.map((v) => (
                <Link key={String(v.id)} to="/foryou" state={{ focusVideoId: v.id }} className="group">
                  <div className="relative aspect-9/16 overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-800 transition group-hover:ring-zinc-600">
                    {v.thumbnailUrl?.trim() ? (
                      <img src={v.thumbnailUrl} alt="" className="h-full w-full object-cover" />
                    ) : v.videoUrl?.trim() ? (
                      <video
                        src={v.videoUrl}
                        poster={cover}
                        muted
                        playsInline
                        preload="metadata"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <img src={DEFAULT_COVER} alt="" className="h-full w-full object-cover" />
                    )}
                    <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-linear-to-t from-black/85 via-black/25 to-transparent px-2 py-1.5">
                      <p className="line-clamp-1 text-[10px] font-medium text-zinc-100">
                        {v.authorDisplayName || v.authorUsername || 'Vibely'}
                      </p>
                    </div>
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1.5 py-0.5 text-[10px] text-zinc-200">
                      ♥ {formatCompactCount(v.likeCount)}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          ) : null}
        </section>
      </div>
    </div>
  )
}

