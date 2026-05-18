import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  IoArrowBack,
  IoAt,
  IoBookmarkOutline,
  IoChatbubbleEllipsesOutline,
  IoChevronDown,
  IoCloseOutline,
  IoHappyOutline,
  IoHeartOutline,
  IoSearchOutline,
  IoShareSocialOutline,
  IoTrashOutline,
  IoVideocamOutline,
} from 'react-icons/io5'
import { apiClient } from '../api/client'
import { StudioCommentDateRangePicker } from '../components/StudioCommentDateRangePicker'
import { StudioLayout } from '../components/StudioLayout'
import { useAuth } from '../state/useAuth'

function formatCount(n) {
  const v = Math.max(0, Number(n) || 0)
  if (v >= 1_000_000) return `${(v / 1_000_000).toFixed(1)}M`
  if (v >= 10_000) return `${Math.round(v / 1000)}K`
  if (v >= 1000) return `${(v / 1000).toFixed(1)}K`
  return String(v)
}

function formatClockFromSeconds(totalSec) {
  const s = Math.max(0, Math.floor(Number(totalSec) || 0))
  const m = Math.floor(s / 60)
  const r = s % 60
  return m > 0 ? `${m}:${String(r).padStart(2, '0')}` : `0:${String(r).padStart(2, '0')}`
}

function formatRelativePostTime(iso) {
  if (!iso) return '—'
  try {
    const d = new Date(iso)
    const diff = Date.now() - d.getTime()
    const sec = Math.floor(diff / 1000)
    if (sec < 45) return 'Vừa xong'
    const min = Math.floor(sec / 60)
    if (min < 60) return `${min} phút trước`
    const h = Math.floor(min / 60)
    if (h < 24) return `${h} giờ trước`
    const days = Math.floor(h / 24)
    if (days < 14) return `${days} ngày trước`
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    })
  } catch {
    return '—'
  }
}

function startOfLocalDay(d) {
  const x = new Date(d)
  x.setHours(0, 0, 0, 0)
  return x.getTime()
}

function endOfLocalDay(d) {
  const x = new Date(d)
  x.setHours(23, 59, 59, 999)
  return x.getTime()
}

/** ISO instant từ API → YYYY-MM-DD theo giờ địa phương (lọc ngày bình luận). */
function instantToLocalYmd(iso) {
  if (!iso) return undefined
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return undefined
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const selectPillClass =
  'max-w-full cursor-pointer appearance-none rounded-full border border-zinc-600 bg-zinc-950 py-1.5 pr-8 pl-3 text-xs font-medium text-zinc-200 outline-none transition hover:border-zinc-500 focus:border-pink-500/70 focus:ring-1 focus:ring-pink-500/30'

const QUICK_EMOJIS = ['😀', '😂', '❤️', '🔥', '👍', '🎉', '😮', '💯']

function commentTimeOrder(a, b, sortOrder) {
  const ta = new Date(a?.createdAt).getTime()
  const tb = new Date(b?.createdAt).getTime()
  return sortOrder === 'latest' ? tb - ta : ta - tb
}

const STUDIO_REPLY_MAX_LEN = 150

/** Tìm id comment gốc của luồng (tổ tiên cao nhất còn trong tập lọc). */
function threadRootId(comment, byId) {
  let cur = comment
  const seen = new Set()
  for (;;) {
    const id = Number(cur?.id)
    if (!Number.isFinite(id) || seen.has(id)) return id
    seen.add(id)
    const pid = cur.parentCommentId != null ? Number(cur.parentCommentId) : null
    if (pid == null || Number.isNaN(pid) || !byId.has(pid)) return id
    cur = byId.get(pid)
  }
}

/**
 * Comment gốc = không có cha trong tập lọc.
 * Mọi reply (dù trả lời gốc hay reply lồng nhau) gom dưới cùng một cột thụt — giống TikTok Studio.
 */
function buildCommentThreadModel(flatSorted, sortOrder) {
  const flat = Array.isArray(flatSorted) ? flatSorted : []
  const byId = new Map(flat.map((c) => [Number(c.id), c]))
  const rootComments = flat.filter((c) => {
    const pid = c.parentCommentId != null ? Number(c.parentCommentId) : null
    return pid == null || Number.isNaN(pid) || !byId.has(pid)
  })
  const repliesByRootId = new Map()
  for (const c of flat) {
    const rid = threadRootId(c, byId)
    const cid = Number(c.id)
    if (cid === rid) continue
    if (!repliesByRootId.has(rid)) repliesByRootId.set(rid, [])
    repliesByRootId.get(rid).push(c)
  }
  for (const arr of repliesByRootId.values()) {
    arr.sort((a, b) => commentTimeOrder(a, b, sortOrder))
  }
  return { rootComments, repliesByRootId }
}

function StudioCommentRow({
  comment,
  videoAuthorId,
  currentUserId,
  onReply,
  onDelete,
  deletingId,
}) {
  const handle = String(comment.username ?? 'user')
    .trim()
    .replace(/^@/, '')
  const isCreator = Number(comment.userId) === Number(videoAuthorId)
  const isVideoOwner = Number(currentUserId) === Number(videoAuthorId)
  const isMine = Number(comment.userId) === Number(currentUserId)
  const canDelete = isVideoOwner || isMine

  return (
    <div className="flex gap-3">
      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full bg-zinc-800 ring-1 ring-zinc-700/80">
        {comment.authorAvatarUrl ? (
          <img
            src={comment.authorAvatarUrl}
            alt=""
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs font-bold text-zinc-500">
            {(handle || '?').slice(0, 1).toUpperCase()}
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-semibold text-zinc-100">@{handle || 'user'}</span>
          {isCreator ? (
            <span className="rounded border border-[#fe2c55]/40 bg-[#fe2c55]/10 px-1.5 py-px text-[11px] font-semibold uppercase tracking-wide text-[#fe2c55]">
              Nhà sáng tạo
            </span>
          ) : null}
        </div>
        <p className="mt-1.5 whitespace-pre-wrap break-words text-sm leading-relaxed text-zinc-300">
          {comment.content}
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
          <time className="text-zinc-500" dateTime={comment.createdAt}>
            {formatRelativePostTime(comment.createdAt)}
          </time>
          <button
            type="button"
            className="inline-flex items-center gap-1 font-semibold text-[#fe2c55] transition hover:text-[#ff506d]"
            onClick={() => onReply(comment)}
          >
            <IoChatbubbleEllipsesOutline className="h-4 w-4 shrink-0" aria-hidden />
            Trả lời
          </button>
          <span
            className="inline-flex cursor-not-allowed items-center gap-1 text-zinc-600"
            title="Sắp có"
            aria-disabled="true"
          >
            <IoHeartOutline className="h-4 w-4" aria-hidden />
            <span className="tabular-nums">0</span>
          </span>
          {canDelete ? (
            <button
              type="button"
              disabled={deletingId === comment.id}
              className="inline-flex items-center gap-1 text-zinc-400 transition hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => onDelete(comment)}
            >
              <IoTrashOutline className="h-4 w-4 shrink-0" aria-hidden />
              Xóa
            </button>
          ) : null}
        </div>
      </div>
    </div>
  )
}

/** Trang bình luận theo video — layout theo TikTok Studio (theme tối). */
export function StudioPostCommentsPage() {
  const { videoId: videoIdParam } = useParams()
  const navigate = useNavigate()
  const { token, user } = useAuth()
  const draftRef = useRef(null)

  const videoId = useMemo(() => {
    const n = Number(videoIdParam)
    return Number.isFinite(n) && n > 0 ? n : null
  }, [videoIdParam])

  const [video, setVideo] = useState(null)
  const [comments, setComments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [draft, setDraft] = useState('')
  const [submitBusy, setSubmitBusy] = useState(false)
  const [sortOrder, setSortOrder] = useState('latest')
  const [commentScope, setCommentScope] = useState('all')
  const [postedBy, setPostedBy] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [replyingTo, setReplyingTo] = useState(null)
  const [deletingId, setDeletingId] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [postPickerOpen, setPostPickerOpen] = useState(false)
  const [postPickerVideos, setPostPickerVideos] = useState([])
  const [postPickerLoading, setPostPickerLoading] = useState(false)
  const [postPickerError, setPostPickerError] = useState('')

  const loadPostPickerList = useCallback(async () => {
    if (!token) return
    setPostPickerLoading(true)
    setPostPickerError('')
    try {
      const data = await apiClient.getMyUploadedVideos(token, { page: 0, size: 100 })
      setPostPickerVideos(Array.isArray(data?.items) ? data.items : [])
    } catch (e) {
      setPostPickerError(e.message ?? 'Không tải được danh sách bài đăng.')
      setPostPickerVideos([])
    } finally {
      setPostPickerLoading(false)
    }
  }, [token])

  const openPostPicker = useCallback(() => {
    setPostPickerOpen(true)
    void loadPostPickerList()
  }, [loadPostPickerList])

  const closePostPicker = useCallback(() => {
    setPostPickerOpen(false)
  }, [])

  const loadAll = useCallback(async () => {
    if (!token || !videoId) {
      setVideo(null)
      setComments([])
      setLoading(false)
      return
    }
    if (user?.id == null) {
      setLoading(true)
      return
    }
    setLoading(true)
    setError('')
    try {
      const v = await apiClient.getVideo(videoId, { token })
      setVideo(v)
      if (Number(v?.authorId) !== Number(user.id)) {
        setError('Bạn chỉ xem được bình luận của bài đăng của chính mình.')
        setComments([])
        return
      }
      const list = await apiClient.getComments(videoId, { token })
      setComments(Array.isArray(list) ? list : [])
    } catch (e) {
      setError(e.message ?? 'Không tải được dữ liệu.')
      setVideo(null)
      setComments([])
    } finally {
      setLoading(false)
    }
  }, [token, videoId, user?.id])

  useEffect(() => {
    document.title = 'VibelyStudio | Bình luận'
  }, [])

  useEffect(() => {
    void loadAll()
  }, [loadAll])

  const myUsername = String(user?.username ?? '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase()

  const filteredComments = useMemo(() => {
    let list = [...comments]
    const q = String(search).trim().toLowerCase()
    if (q) {
      list = list.filter(
        (c) =>
          String(c?.content ?? '')
            .toLowerCase()
            .includes(q) ||
          String(c?.username ?? '')
            .toLowerCase()
            .includes(q),
      )
    }
    if (commentScope === 'question') {
      list = list.filter((c) => /[?？]/.test(String(c?.content ?? '')))
    }
    if (postedBy === 'me' && myUsername) {
      list = list.filter(
        (c) =>
          String(c?.username ?? '')
            .trim()
            .replace(/^@/, '')
            .toLowerCase() === myUsername,
      )
    }
    if (dateFrom) {
      const t0 = startOfLocalDay(dateFrom)
      list = list.filter((c) => {
        const t = new Date(c?.createdAt).getTime()
        return !Number.isNaN(t) && t >= t0
      })
    }
    if (dateTo) {
      const t1 = endOfLocalDay(dateTo)
      list = list.filter((c) => {
        const t = new Date(c?.createdAt).getTime()
        return !Number.isNaN(t) && t <= t1
      })
    }
    list.sort((a, b) => {
      const ta = new Date(a?.createdAt).getTime()
      const tb = new Date(b?.createdAt).getTime()
      return sortOrder === 'latest' ? tb - ta : ta - tb
    })
    return list
  }, [
    comments,
    search,
    sortOrder,
    commentScope,
    postedBy,
    dateFrom,
    dateTo,
    myUsername,
  ])

  const { rootComments, repliesByRootId } = useMemo(
    () => buildCommentThreadModel(filteredComments, sortOrder),
    [filteredComments, sortOrder],
  )

  const hasActiveFilters = useMemo(() => {
    return (
      Boolean(String(search).trim()) ||
      sortOrder !== 'latest' ||
      commentScope !== 'all' ||
      postedBy !== 'all' ||
      Boolean(dateFrom) ||
      Boolean(dateTo)
    )
  }, [search, sortOrder, commentScope, postedBy, dateFrom, dateTo])

  const clearAllFilters = () => {
    setSearch('')
    setSortOrder('latest')
    setCommentScope('all')
    setPostedBy('all')
    setDateFrom('')
    setDateTo('')
  }

  const postTitle =
    (video?.description && String(video.description).trim()) ||
    (video?.title && String(video.title).trim()) ||
    'Bài đăng'

  const submitReply = async () => {
    if (!token || !videoId || submitBusy) return
    const text = draft.trim()
    if (!text) return
    setSubmitBusy(true)
    setError('')
    try {
      const parentId = replyingTo?.id != null ? Number(replyingTo.id) : undefined
      await apiClient.addComment(videoId, text, token, {
        parentCommentId: Number.isFinite(parentId) ? parentId : undefined,
      })
      setDraft('')
      setEmojiOpen(false)
      setReplyingTo(null)
      await loadAll()
    } catch (e) {
      setError(e.message ?? 'Không gửi được bình luận.')
    } finally {
      setSubmitBusy(false)
    }
  }

  const openDeleteModal = useCallback((row) => {
    setDeleteTarget(row)
  }, [])

  const closeDeleteModal = useCallback(() => {
    if (deletingId) return
    setDeleteTarget(null)
  }, [deletingId])

  const confirmDeleteComment = async () => {
    const c = deleteTarget
    if (!c || !token || !videoId || deletingId != null) return
    setDeletingId(c.id)
    setError('')
    try {
      await apiClient.deleteComment(videoId, c.id, token)
      setReplyingTo(null)
      setDeleteTarget(null)
      await loadAll()
    } catch (e) {
      setError(e.message ?? 'Không xóa được bình luận.')
    } finally {
      setDeletingId(null)
    }
  }

  useEffect(() => {
    if (!deleteTarget) return
    const onKey = (e) => {
      if (e.key === 'Escape') closeDeleteModal()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [deleteTarget, closeDeleteModal])

  useEffect(() => {
    if (replyingTo && draftRef.current) {
      try {
        draftRef.current.focus()
      } catch {
        /* noop */
      }
    }
  }, [replyingTo])

  useEffect(() => {
    if (!postPickerOpen) return
    const onKey = (e) => {
      if (e.key === 'Escape') closePostPicker()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [postPickerOpen, closePostPicker])

  const insertAtCursor = (snippet) => {
    const el = draftRef.current
    if (el && typeof el.selectionStart === 'number') {
      const start = el.selectionStart
      const end = el.selectionEnd
      const v = draft
      const next = v.slice(0, start) + snippet + v.slice(end)
      setDraft(next)
      requestAnimationFrame(() => {
        try {
          el.focus()
          const pos = start + snippet.length
          el.setSelectionRange(pos, pos)
        } catch {
          /* noop */
        }
      })
      return
    }
    setDraft((d) => d + snippet)
  }

  const ownershipBlocked = Boolean(
    error && error.includes('chính mình') && video,
  )

  if (!videoId) {
    return (
      <StudioLayout active="comments" title="Bình luận" subtitle="Mã video không hợp lệ">
        <p className="text-sm text-amber-400">Đường dẫn không hợp lệ.</p>
        <Link
          to="/vibelystudio/posts"
          className="mt-4 inline-flex items-center gap-2 text-sm text-pink-400 hover:text-pink-300"
        >
          <IoArrowBack className="h-4 w-4" aria-hidden />
          Về danh sách bài đăng
        </Link>
      </StudioLayout>
    )
  }

  return (
    <>
    <StudioLayout active="comments" hidePageHeader title="Bình luận" subtitle="">
      <div className="mx-auto max-w-5xl px-0 sm:px-1">
        <div
          className="rounded-2xl border border-zinc-800/90 bg-zinc-900/95 shadow-[0_24px_80px_rgba(0,0,0,0.45)]"
          style={{ minHeight: 'min(70vh, 720px)' }}
        >
          <div className="flex flex-col border-b border-zinc-800/90 px-4 py-3 sm:px-6 sm:py-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => navigate('/vibelystudio/posts')}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-zinc-300 transition hover:text-white"
              >
                <IoArrowBack className="h-4 w-4 shrink-0" aria-hidden />
                Về danh sách bài đăng
              </button>
              <button
                type="button"
                onClick={openPostPicker}
                className="rounded-full border border-[#fe2c55] bg-transparent px-4 py-1.5 text-sm font-semibold text-[#fe2c55] transition hover:bg-[#fe2c55]/10"
              >
                Chọn bài khác
              </button>
            </div>
          </div>

          <div className="px-4 py-5 sm:px-6 sm:py-6">
            {loading ? (
              <p className="py-16 text-center text-sm text-zinc-500">Đang tải…</p>
            ) : !video ? (
              <p className="py-16 text-center text-sm text-amber-400">
                {error || 'Không tìm thấy video.'}
              </p>
            ) : (
              <>
                <div className="flex flex-col gap-5 border-b border-zinc-800/90 pb-6 sm:flex-row sm:items-start sm:gap-6">
                  <div className="relative mx-auto aspect-[9/16] w-[7.5rem] shrink-0 overflow-hidden rounded-lg bg-zinc-800 sm:mx-0 sm:w-28">
                    {video.thumbnailUrl && String(video.thumbnailUrl).trim() ? (
                      <img
                        src={video.thumbnailUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    ) : video.videoUrl ? (
                      <video
                        src={video.videoUrl}
                        muted
                        playsInline
                        className="h-full w-full object-cover"
                        preload="metadata"
                      />
                    ) : null}
                    {video.durationSeconds > 0 ? (
                      <span className="absolute bottom-1.5 right-1.5 rounded bg-black/80 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-white">
                        {formatClockFromSeconds(video.durationSeconds)}
                      </span>
                    ) : null}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h1 className="text-base font-semibold leading-snug text-zinc-100 sm:text-lg">
                      {postTitle}
                    </h1>
                    <p className="mt-1 text-xs text-zinc-500">Mã #{video.id}</p>
                    <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 border-t border-zinc-800/80 pt-4 text-[13px] text-zinc-400">
                      <span className="inline-flex items-center gap-1.5" title="Lượt xem">
                        <IoVideocamOutline className="h-[18px] w-[18px] text-zinc-500" aria-hidden />
                        <span className="tabular-nums text-zinc-200">
                          {formatCount(video.viewCount)}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5" title="Thích">
                        <IoHeartOutline className="h-[18px] w-[18px] text-zinc-500" aria-hidden />
                        <span className="tabular-nums text-zinc-200">
                          {formatCount(video.likeCount)}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5" title="Bình luận">
                        <IoChatbubbleEllipsesOutline
                          className="h-[18px] w-[18px] text-zinc-500"
                          aria-hidden
                        />
                        <span className="tabular-nums text-zinc-200">
                          {formatCount(video.commentCount)}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5" title="Chia sẻ">
                        <IoShareSocialOutline
                          className="h-[18px] w-[18px] text-zinc-500"
                          aria-hidden
                        />
                        <span className="tabular-nums text-zinc-200">
                          {formatCount(video.shareCount)}
                        </span>
                      </span>
                      <span className="inline-flex items-center gap-1.5" title="Lưu">
                        <IoBookmarkOutline
                          className="h-[18px] w-[18px] text-zinc-500"
                          aria-hidden
                        />
                        <span className="tabular-nums text-zinc-200">
                          {formatCount(video.bookmarkCount)}
                        </span>
                      </span>
                    </div>
                    <p className="mt-3 text-xs text-zinc-500">
                      {formatRelativePostTime(video.createdAt)}
                    </p>
                  </div>
                </div>

                {error && video && !ownershipBlocked ? (
                  <p className="mt-4 text-sm text-amber-400">{error}</p>
                ) : null}

                {!ownershipBlocked ? (
                  <>
                    {replyingTo ? (
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border border-zinc-700/90 bg-zinc-950/90 px-3 py-2.5 text-sm text-zinc-300">
                        <p className="min-w-0">
                          Đang trả lời{' '}
                          <span className="font-semibold text-zinc-100">
                            @
                            {String(replyingTo.username ?? 'user')
                              .trim()
                              .replace(/^@/, '') || 'user'}
                          </span>
                        </p>
                        <button
                          type="button"
                          onClick={() => setReplyingTo(null)}
                          className="shrink-0 text-sm font-semibold text-pink-400 transition hover:text-pink-300"
                        >
                          Hủy
                        </button>
                      </div>
                    ) : null}
                    <div className="mt-6">
                      <label htmlFor="studio-post-reply" className="sr-only">
                        Trả lời bình luận
                      </label>
                      <div className="rounded-xl border border-zinc-700 bg-zinc-950/80 focus-within:border-pink-500/50 focus-within:ring-1 focus-within:ring-pink-500/25">
                        <textarea
                          ref={draftRef}
                          id="studio-post-reply"
                          rows={4}
                          maxLength={STUDIO_REPLY_MAX_LEN}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          placeholder="Trả lời bình luận"
                          className="w-full resize-y border-0 bg-transparent px-3 py-3 text-sm text-zinc-100 placeholder:text-zinc-600 focus:outline-none"
                        />
                        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-800/90 px-2 py-2">
                          <span className="pl-1 text-xs tabular-nums text-zinc-500">
                            {draft.length} / {STUDIO_REPLY_MAX_LEN}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                              title="Chèn @"
                              aria-label="Chèn @"
                              onClick={() => insertAtCursor('@')}
                            >
                              <IoAt className="h-5 w-5" aria-hidden />
                            </button>
                            <div className="relative">
                              <button
                                type="button"
                                className="rounded-lg p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                                title="Biểu tượng cảm xúc"
                                aria-expanded={emojiOpen}
                                aria-label="Chèn emoji"
                                onClick={() => setEmojiOpen((o) => !o)}
                              >
                                <IoHappyOutline className="h-5 w-5" aria-hidden />
                              </button>
                              {emojiOpen ? (
                                <div
                                  className="absolute bottom-full right-0 z-20 mb-1 flex max-w-[220px] flex-wrap gap-1 rounded-lg border border-zinc-700 bg-zinc-900 p-2 shadow-xl"
                                  role="listbox"
                                >
                                  {QUICK_EMOJIS.map((em) => (
                                    <button
                                      key={em}
                                      type="button"
                                      className="rounded-md px-2 py-1 text-lg leading-none hover:bg-zinc-800"
                                      onClick={() => {
                                        insertAtCursor(em)
                                        setEmojiOpen(false)
                                      }}
                                    >
                                      {em}
                                    </button>
                                  ))}
                                </div>
                              ) : null}
                            </div>
                            <button
                              type="button"
                              disabled={submitBusy || !draft.trim()}
                              onClick={() => void submitReply()}
                              className="ml-1 rounded-full bg-[#fe2c55] px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-white transition hover:bg-[#e62a4d] disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              {submitBusy ? '…' : 'Đăng'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="relative mt-6">
                      <IoSearchOutline
                        className="pointer-events-none absolute left-3 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-zinc-500"
                        aria-hidden
                      />
                      <input
                        type="search"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Tìm theo bình luận hoặc tên người dùng"
                        className="w-full rounded-full border border-zinc-700 bg-zinc-950 py-2.5 pl-10 pr-4 text-sm text-zinc-100 placeholder:text-zinc-600 focus:border-pink-500/50 focus:outline-none focus:ring-1 focus:ring-pink-500/25"
                      />
                    </div>

                    <div className="mt-4 flex flex-wrap items-center gap-2 overflow-visible">
                      <div className="relative inline-flex">
                        <select
                          className={selectPillClass}
                          value={sortOrder}
                          onChange={(e) => setSortOrder(e.target.value)}
                          aria-label="Sắp xếp"
                        >
                          <option value="latest">Mới nhất trước</option>
                          <option value="oldest">Cũ nhất trước</option>
                        </select>
                        <IoChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                      </div>
                      <div className="relative inline-flex">
                        <select
                          className={selectPillClass}
                          value={commentScope}
                          onChange={(e) => setCommentScope(e.target.value)}
                          aria-label="Loại bình luận"
                        >
                          <option value="all">Tất cả bình luận</option>
                          <option value="question">Có dấu hỏi</option>
                        </select>
                        <IoChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                      </div>
                      <div className="relative inline-flex">
                        <select
                          className={selectPillClass}
                          value={postedBy}
                          onChange={(e) => setPostedBy(e.target.value)}
                          aria-label="Người đăng"
                        >
                          <option value="all">Mọi người đăng</option>
                          <option value="me">Bình luận của tôi</option>
                        </select>
                        <IoChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-500" />
                      </div>
                      <div className="relative inline-flex min-w-0">
                        <select
                          className={`${selectPillClass} text-zinc-500`}
                          disabled
                          aria-label="Số follower (sắp có)"
                          title="Sắp có: lọc theo số follower người bình luận"
                          defaultValue="all"
                        >
                          <option value="all">Mọi mức follower</option>
                        </select>
                        <IoChevronDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-zinc-600" />
                      </div>
                      <StudioCommentDateRangePicker
                        from={dateFrom}
                        to={dateTo}
                        minDate={video?.createdAt ? instantToLocalYmd(video.createdAt) : undefined}
                        onApply={({ from, to }) => {
                          setDateFrom(from || '')
                          setDateTo(to || '')
                        }}
                      />
                    </div>

                    <div className="mt-2 min-h-[280px]">
                      {rootComments.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-center">
                          <p className="text-sm font-medium text-zinc-400">
                            {comments.length === 0 && !hasActiveFilters
                              ? 'Chưa có bình luận'
                              : 'Không tìm thấy kết quả'}
                          </p>
                          {comments.length > 0 && hasActiveFilters ? (
                            <button
                              type="button"
                              onClick={clearAllFilters}
                              className="mt-5 rounded-full border border-[#fe2c55] bg-transparent px-6 py-2 text-sm font-semibold text-[#fe2c55] transition hover:bg-[#fe2c55]/10"
                            >
                              Xóa tất cả bộ lọc
                            </button>
                          ) : null}
                        </div>
                      ) : (
                        <ul className="divide-y divide-zinc-800/90">
                          {rootComments.map((c) => {
                            const replies = repliesByRootId.get(Number(c.id)) ?? []
                            return (
                              <li key={c.id} className="py-4">
                                <StudioCommentRow
                                  comment={c}
                                  videoAuthorId={video?.authorId}
                                  currentUserId={user?.id}
                                  onReply={setReplyingTo}
                                  onDelete={openDeleteModal}
                                  deletingId={deletingId}
                                />
                                {replies.length > 0 ? (
                                  <ul className="mt-2 ml-[3.25rem] border-l border-zinc-800/90 pl-4 sm:ml-14">
                                    {replies.map((r) => (
                                      <li key={r.id} className="py-3 first:pt-1">
                                        <StudioCommentRow
                                          comment={r}
                                          videoAuthorId={video?.authorId}
                                          currentUserId={user?.id}
                                          onReply={setReplyingTo}
                                          onDelete={openDeleteModal}
                                          deletingId={deletingId}
                                        />
                                      </li>
                                    ))}
                                  </ul>
                                ) : null}
                              </li>
                            )
                          })}
                        </ul>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="mt-6 text-center text-sm text-amber-400">{error}</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {deleteTarget ? (
        <div
          className="fixed inset-0 z-[80] flex items-center justify-center bg-black/75 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-comment-dialog-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) closeDeleteModal()
          }}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-zinc-700 bg-zinc-900 px-5 py-6 text-center shadow-[0_24px_80px_rgba(0,0,0,0.6)]"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="delete-comment-dialog-title" className="text-lg font-bold text-zinc-50">
              Xóa bình luận?
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              Bạn sẽ không thể khôi phục lại.
            </p>
            <div className="mt-6 flex flex-col gap-3">
              <button
                type="button"
                disabled={deletingId != null}
                onClick={() => void confirmDeleteComment()}
                className="w-full rounded-xl bg-[#fe2c55] py-3 text-sm font-bold text-white transition hover:bg-[#e62a4d] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {deletingId != null ? 'Đang xóa…' : 'Xóa'}
              </button>
              <button
                type="button"
                disabled={deletingId != null}
                onClick={closeDeleteModal}
                className="w-full rounded-xl border border-zinc-600 bg-zinc-950 py-3 text-sm font-semibold text-zinc-100 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Hủy
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </StudioLayout>

    {postPickerOpen
      ? createPortal(
          <div className="fixed inset-0 z-[240] flex justify-end">
            <button
              type="button"
              className="absolute inset-0 bg-black/60"
              aria-label="Đóng"
              onClick={closePostPicker}
            />
            <aside
              className="relative flex h-full w-[min(100vw,22rem)] flex-col border-l border-zinc-800 bg-zinc-900 shadow-[-12px_0_40px_rgba(0,0,0,0.45)] sm:max-w-md"
              role="dialog"
              aria-modal="true"
              aria-labelledby="studio-post-picker-title"
            >
              <div className="flex shrink-0 items-center gap-2 border-b border-zinc-800 px-3 py-3 sm:px-4">
                <button
                  type="button"
                  onClick={closePostPicker}
                  className="rounded-lg p-1.5 text-zinc-400 transition hover:bg-zinc-800 hover:text-zinc-100"
                  aria-label="Đóng"
                >
                  <IoCloseOutline className="h-5 w-5" aria-hidden />
                </button>
                <h2 id="studio-post-picker-title" className="min-w-0 flex-1 text-sm font-bold text-zinc-100 sm:text-base">
                  Chọn bài khác
                </h2>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2 sm:px-3">
                {postPickerLoading ? (
                  <p className="py-10 text-center text-sm text-zinc-500">Đang tải…</p>
                ) : postPickerError ? (
                  <p className="py-6 text-center text-sm text-amber-400">{postPickerError}</p>
                ) : postPickerVideos.length === 0 ? (
                  <p className="py-10 text-center text-sm text-zinc-500">Chưa có bài đăng.</p>
                ) : (
                  <ul className="divide-y divide-zinc-800/90">
                    {postPickerVideos.map((v) => {
                      const hasThumb = v.thumbnailUrl && String(v.thumbnailUrl).trim()
                      const line =
                        (v.description && String(v.description).trim()) ||
                        (v.title && String(v.title).trim()) ||
                        'Bài đăng'
                      const posted = v.createdAt
                        ? new Date(v.createdAt).toLocaleString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'
                      const isCurrent = Number(v.id) === Number(videoId)
                      return (
                        <li key={v.id}>
                          <button
                            type="button"
                            onClick={() => {
                              closePostPicker()
                              if (!isCurrent) {
                                navigate(`/vibelystudio/comment/${v.id}`)
                              }
                            }}
                            className={`flex w-full gap-3 rounded-lg px-2 py-3 text-left transition sm:px-3 ${
                              isCurrent
                                ? 'bg-zinc-800/90 ring-1 ring-[#fe2c55]/50'
                                : 'hover:bg-zinc-800/70'
                            }`}
                          >
                            <div className="relative h-[4.5rem] w-12 shrink-0 overflow-hidden rounded-md bg-zinc-800">
                              {hasThumb ? (
                                <img
                                  src={v.thumbnailUrl}
                                  alt=""
                                  className="h-full w-full object-cover"
                                />
                              ) : v.videoUrl ? (
                                <video
                                  src={v.videoUrl}
                                  muted
                                  playsInline
                                  className="h-full w-full object-cover"
                                  preload="metadata"
                                />
                              ) : null}
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="line-clamp-2 text-xs font-medium leading-snug text-zinc-100 sm:text-sm">
                                {line}
                              </p>
                              <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-zinc-500">
                                <span className="inline-flex items-center gap-0.5 tabular-nums" title="Lượt xem">
                                  <IoVideocamOutline className="h-3.5 w-3.5" aria-hidden />
                                  {formatCount(v.viewCount)}
                                </span>
                                <span className="inline-flex items-center gap-0.5 tabular-nums" title="Thích">
                                  <IoHeartOutline className="h-3.5 w-3.5" aria-hidden />
                                  {formatCount(v.likeCount)}
                                </span>
                                <span className="inline-flex items-center gap-0.5 tabular-nums" title="Bình luận">
                                  <IoChatbubbleEllipsesOutline className="h-3.5 w-3.5" aria-hidden />
                                  {formatCount(v.commentCount)}
                                </span>
                                <span className="inline-flex items-center gap-0.5 tabular-nums" title="Chia sẻ">
                                  <IoShareSocialOutline className="h-3.5 w-3.5" aria-hidden />
                                  {formatCount(v.shareCount)}
                                </span>
                                <span className="inline-flex items-center gap-0.5 tabular-nums" title="Lưu">
                                  <IoBookmarkOutline className="h-3.5 w-3.5" aria-hidden />
                                  {formatCount(v.bookmarkCount)}
                                </span>
                              </div>
                              <p className="mt-1.5 text-[11px] text-zinc-500">
                                Đăng: {posted}
                                {isCurrent ? (
                                  <span className="ml-2 font-semibold text-[#fe2c55]">· Đang mở</span>
                                ) : null}
                              </p>
                            </div>
                          </button>
                        </li>
                      )
                    })}
                  </ul>
                )}
              </div>
            </aside>
          </div>,
          document.body,
        )
      : null}
    </>
  )
}
