import React, { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient } from '../api/client'
import { GridHoverVideoMedia } from './GridHoverVideoMedia.jsx'

/** Khối lưới cố định 3 cột, căn giữa — khoảng trống hai bên giống TikTok. */
const PANEL_SHELL_CLASS =
  'mx-auto w-full max-w-[580px] px-8 sm:max-w-[640px] sm:px-10 md:max-w-[690px] md:px-11'
const GRID_CLASS = 'grid grid-cols-3 gap-3 sm:gap-3.5'
const CARD_CLASS =
  'group relative w-full aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900'
const SKELETON_CLASS = `${CARD_CLASS} animate-pulse bg-zinc-900`
const DEFAULT_AVATAR = '/images/users/default-avatar.jpeg'

export function SuggestedCreatorCard({ creator, token, playing, onHover, onFollowed, onUnfollowed }) {
  const [followed, setFollowed] = useState(Boolean(creator?.followedByViewer))
  const [busy, setBusy] = useState(false)
  const username = String(creator?.username ?? '').trim()
  const profilePath = username ? `/@${encodeURIComponent(username)}` : '/foryou'
  const poster = String(creator?.previewThumbnailUrl ?? '').trim()
  const previewVideoUrl = String(creator?.previewVideoUrl ?? '').trim()
  const avatar = String(creator?.avatarUrl ?? '').trim() || DEFAULT_AVATAR
  const displayName = String(creator?.displayName ?? '').trim() || username || 'Nhà sáng tạo'

  useEffect(() => {
    setFollowed(Boolean(creator?.followedByViewer))
  }, [creator?.followedByViewer, creator?.id])

  const handleFollow = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    if (!token || busy || !creator?.id) return
    setBusy(true)
    try {
      if (followed) {
        await apiClient.unfollow(creator.id, token)
        setFollowed(false)
        onUnfollowed?.(creator.id)
      } else {
        await apiClient.follow(creator.id, token)
        setFollowed(true)
        onFollowed?.(creator.id)
      }
    } catch {
      /* noop */
    } finally {
      setBusy(false)
    }
  }

  return (
    <article
      className={CARD_CLASS}
      onMouseEnter={() => onHover?.(creator?.id)}
    >
      <div className="absolute inset-0">
        <GridHoverVideoMedia
          videoUrl={previewVideoUrl}
          thumbnailUrl={poster}
          playing={playing}
        />
      </div>
      <div
        className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-black/5"
        aria-hidden
      />
      <Link
        to={profilePath}
        className="absolute inset-0 z-[1] cursor-pointer"
        aria-label={`Xem trang cá nhân ${displayName}`}
      />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] flex flex-col items-center px-1.5 pb-3.5 pt-6 text-center sm:px-2 sm:pb-4">
        <img
          src={avatar}
          alt=""
          className="h-8 w-8 shrink-0 rounded-full object-cover ring-2 ring-white/90 sm:h-9 sm:w-9"
          referrerPolicy="no-referrer"
          onError={(e) => {
            e.currentTarget.src = DEFAULT_AVATAR
          }}
        />
        <span className="mt-1 line-clamp-1 w-full text-xs font-bold leading-tight text-white">
          {displayName}
        </span>
        <span className="mt-0.5 line-clamp-1 w-full text-[9px] text-zinc-200/90 sm:text-[10px]">
          @{username || 'user'}
        </span>
        <button
          type="button"
          disabled={busy || !token}
          onClick={(e) => void handleFollow(e)}
          className={`pointer-events-auto mt-1 w-full rounded-md py-1.5 text-[10px] font-semibold transition duration-200 sm:text-[11px] ${
            followed
              ? 'cursor-pointer border border-white/20 bg-white/10 text-white backdrop-blur-[2px] hover:border-white/10 hover:bg-zinc-950/75 hover:text-zinc-100'
              : 'cursor-pointer bg-[#FE2C55] text-white hover:bg-[#d81942] disabled:cursor-not-allowed disabled:opacity-60'
          }`}
        >
          {busy ? 'Đang xử lý…' : followed ? 'Following' : 'Follow'}
        </button>
      </div>
    </article>
  )
}

export function SuggestedCreatorsPanel({
  token,
  onCreatorFollowed,
  onCreatorUnfollowed,
  onMetaLoaded,
}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [page, setPage] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [error, setError] = useState('')
  const [previewCreatorId, setPreviewCreatorId] = useState(null)
  const onMetaLoadedRef = useRef(onMetaLoaded)
  onMetaLoadedRef.current = onMetaLoaded
  const onCreatorFollowedRef = useRef(onCreatorFollowed)
  onCreatorFollowedRef.current = onCreatorFollowed
  const onCreatorUnfollowedRef = useRef(onCreatorUnfollowed)
  onCreatorUnfollowedRef.current = onCreatorUnfollowed

  const loadPage = useCallback(async (nextPage, append = false) => {
    if (!token) return
    if (append) setLoadingMore(true)
    else setLoading(true)
    setError('')
    try {
      const res = await apiClient.getSuggestedCreators(token, { page: nextPage, size: 24 })
      const rows = Array.isArray(res?.items) ? res.items : []
      if (!append) {
        onMetaLoadedRef.current?.({
          viewerFollowingCount: Number(res?.viewerFollowingCount ?? 0),
        })
      }
      setItems((prev) => (append ? [...prev, ...rows] : rows))
      setPage(nextPage)
      setHasNext(Boolean(res?.hasNext))
    } catch (e) {
      if (!append) setItems([])
      setError(e instanceof Error ? e.message : 'Không tải được gợi ý.')
    } finally {
      setLoading(false)
      setLoadingMore(false)
    }
  }, [token])

  useEffect(() => {
    void loadPage(0, false)
  }, [loadPage])

  useEffect(() => {
    if (previewCreatorId == null) return
    if (!items.some((row) => row?.id === previewCreatorId)) {
      setPreviewCreatorId(null)
    }
  }, [items, previewCreatorId])

  const handleFollowed = useCallback((userId) => {
    setItems((prev) =>
      prev.map((row) =>
        row?.id === userId ? { ...row, followedByViewer: true } : row,
      ),
    )
    onCreatorFollowedRef.current?.(userId)
  }, [])

  const handleUnfollowed = useCallback((userId) => {
    setItems((prev) =>
      prev.map((row) =>
        row?.id === userId ? { ...row, followedByViewer: false } : row,
      ),
    )
    onCreatorUnfollowedRef.current?.(userId)
  }, [])

  const handleHoverCreator = useCallback((creatorId) => {
    if (creatorId == null) return
    setPreviewCreatorId(creatorId)
  }, [])

  if (loading) {
    return (
      <div className="scrollbar-none min-h-0 w-full flex-1 overflow-y-auto overscroll-y-contain pb-4">
        <div className={PANEL_SHELL_CLASS}>
          <div className={GRID_CLASS}>
            {Array.from({ length: 9 }).map((_, index) => (
              <div key={index} className={SKELETON_CLASS} aria-hidden />
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-sm text-red-400">{error}</p>
        <button
          type="button"
          onClick={() => void loadPage(0, false)}
          className="mt-4 rounded-full border border-zinc-600 px-4 py-2 text-sm font-semibold text-zinc-100 hover:bg-zinc-900"
        >
          Thử lại
        </button>
      </div>
    )
  }

  if (!items.length) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
        <p className="text-lg font-semibold text-zinc-100">Chưa có gợi ý</p>
        <p className="mt-2 max-w-sm text-sm text-zinc-400">
          Khi có thêm nhà sáng tạo đăng video, chúng tôi sẽ gợi ý tại đây.
        </p>
      </div>
    )
  }

  return (
    <div className="scrollbar-none min-h-0 w-full flex-1 overflow-y-auto overscroll-y-contain pb-4">
      <div className={PANEL_SHELL_CLASS}>
        <div className={GRID_CLASS}>
          {items.map((creator) => (
            <SuggestedCreatorCard
              key={String(creator.id)}
              creator={creator}
              token={token}
              playing={previewCreatorId === creator.id}
              onHover={handleHoverCreator}
              onFollowed={handleFollowed}
              onUnfollowed={handleUnfollowed}
            />
          ))}
        </div>
        {hasNext ? (
          <button
            type="button"
            disabled={loadingMore}
            onClick={() => void loadPage(page + 1, true)}
            className="mx-auto mt-8 block rounded-lg border border-zinc-700 px-5 py-2.5 text-sm font-semibold text-zinc-100 hover:bg-zinc-900 disabled:opacity-50"
          >
            {loadingMore ? 'Đang tải…' : 'Xem thêm'}
          </button>
        ) : null}
      </div>
    </div>
  )
}

export default SuggestedCreatorsPanel
