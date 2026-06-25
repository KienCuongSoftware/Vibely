import React, { useEffect, useMemo, useState } from 'react'
import {
  IoCompass,
  IoEllipsisHorizontal,
  IoHome,
  IoNotifications,
  IoPaperPlane,
  IoPeople,
  IoPerson,
  IoVideocam,
} from 'react-icons/io5'
import { MdOutlineFileUpload } from 'react-icons/md'
import { useNavigate, useParams } from 'react-router-dom'
import { apiClient } from '../api/client'
import { Sidebar } from '../components/Sidebar'
import { handleSidebarMenuSelect } from '../utils/sidebarNavigation.js'
import { DEFAULT_COVER, SoundGridVideoCard } from './SoundPage.jsx'
import { useAuth } from '../state/useAuth'
import { Seo } from '../seo/Seo.jsx'

function normalizeHashtag(raw) {
  return String(raw ?? '')
    .trim()
    .replace(/^#/, '')
}

export function HashtagPage() {
  const navigate = useNavigate()
  const { token, user, logout } = useAuth()
  const { tag } = useParams()
  const hashtag = useMemo(() => normalizeHashtag(tag), [tag])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [items, setItems] = useState([])
  const [hashtagGridPlayingId, setHashtagGridPlayingId] = useState(null)

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
    handleSidebarMenuSelect(navigate, id, {
      token,
      profilePath: token ? '/profile' : undefined,
    })
  }

  useEffect(() => {
    if (!hashtag) {
      setItems([])
      setError('Hashtag không hợp lệ.')
      setLoading(false)
      return
    }
    let cancelled = false
    setLoading(true)
    setError('')
    apiClient
      .getVideosByHashtag(hashtag, { page: 0, size: 60 })
      .then((res) => {
        if (!cancelled) setItems(Array.isArray(res?.items) ? res.items : [])
      })
      .catch((e) => {
        if (!cancelled) {
          setItems([])
          setError(e?.message || 'Không tải được danh sách hashtag.')
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [hashtag])

  const heroVideo = useMemo(() => {
    return String(items[0]?.videoUrl ?? '').trim()
  }, [items])

  const cover = useMemo(() => {
    const thumb = String(items[0]?.thumbnailUrl ?? '').trim()
    if (thumb) return thumb
    const avatar = String(items[0]?.authorAvatarUrl ?? items[0]?.avatarUrl ?? '').trim()
    if (avatar) return avatar
    return DEFAULT_COVER
  }, [items])

  const postCount = items.length
  const hashtagTitle = hashtag ? `#${hashtag} | Vibely` : 'Hashtag | Vibely'
  const hashtagDescription = hashtag
    ? `Khám phá các video liên quan đến #${hashtag}.`
    : 'Khám phá các video theo hashtag trên Vibely.'
  const hashtagCanonical = hashtag ? `/tag/${encodeURIComponent(hashtag)}` : '/foryou'

  const hashtagVideoIds = useMemo(
    () => items.map((video) => video?.publicId).filter(Boolean),
    [items],
  )

  useEffect(() => {
    setHashtagGridPlayingId((prev) => {
      if (prev != null && hashtagVideoIds.includes(prev)) {
        return prev
      }
      return null
    })
  }, [hashtagVideoIds])

  const focusHashtagGridVideo = React.useCallback((publicId) => {
    if (publicId == null) return
    setHashtagGridPlayingId(publicId)
  }, [])

  return (
    <section className="flex h-dvh max-h-dvh min-h-0 bg-black text-zinc-100">
      <Seo
        title={hashtagTitle}
        description={hashtagDescription}
        canonical={hashtagCanonical}
        image={cover}
      />
      <Sidebar
        menuItems={menuItems}
        activeMenu={null}
        onSelectMenu={handleSelectMenu}
        token={token}
        user={user}
        onLogout={token ? logout : undefined}
      />

      <div className="scrollbar-none min-w-0 flex-1 overflow-y-auto overscroll-y-contain">
        <div className="relative overflow-hidden border-b border-zinc-800/90">
          {heroVideo ? (
            <video
              src={heroVideo}
              poster={cover}
              muted
              autoPlay
              loop
              playsInline
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-25 blur-xl"
            />
          ) : cover !== DEFAULT_COVER ? (
            <img
              src={cover}
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20 blur-xl"
            />
          ) : null}
          <div className="absolute inset-0 bg-linear-to-b from-black/70 via-black/75 to-black" />
          <div className="relative mx-auto w-full max-w-[1240px] px-6 py-5">
            <header className="mt-2 flex flex-wrap items-start gap-4">
              <div className="flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-900 ring-1 ring-zinc-700">
                <span className="text-[56px] font-light leading-none text-zinc-300">#</span>
              </div>
              <div className="min-w-0 flex-1">
                <h1 className="line-clamp-2 text-[clamp(22px,3.2vw,42px)] font-extrabold leading-[1.08] tracking-tight">
                  #{hashtag || 'hashtag'}
                </h1>
                <p className="mt-1 text-xs text-zinc-400">
                  {postCount} {postCount === 1 ? 'bài đăng' : 'bài đăng'}
                </p>
              </div>
            </header>
          </div>
        </div>

        <div className="mx-auto w-full max-w-[1240px] px-6 py-6">
          <section>
            {loading ? <p className="text-zinc-400">Đang tải video…</p> : null}
            {error ? <p className="text-red-400">{error}</p> : null}
            {!loading && !error && items.length === 0 ? (
              <p className="text-zinc-500">Chưa có video nào dùng hashtag này.</p>
            ) : null}
            {items.length > 0 ? (
              <div className="grid grid-cols-3 gap-x-3 gap-y-4 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6">
                {items.map((video) => (
                  <SoundGridVideoCard
                    key={String(video.publicId)}
                    video={video}
                    coverFallback={cover}
                    wideSource={false}
                    soundPageHref={null}
                    soundOwnerVibelyId=""
                    narrowWidthClass="max-w-none"
                  playing={video.publicId === hashtagGridPlayingId}
                  onHoverPreview={focusHashtagGridVideo}
                  />
                ))}
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </section>
  )
}
