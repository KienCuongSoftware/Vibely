import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  IoArrowBack,
  IoBookmarkOutline,
  IoChatbubbleOutline,
  IoClose,
  IoEyeOutline,
  IoHeartOutline,
  IoShareSocialOutline,
  IoTrash,
} from 'react-icons/io5'
import { apiClient } from '../api/client.js'
import { AdminLayout } from '../components/AdminLayout.jsx'
import { useAuth } from '../state/useAuth.js'

function statusLabel(status) {
  const labels = {
    RAW: 'Bản nháp',
    PROCESSING: 'Đang xử lý',
    READY: 'Đã đăng',
    FAILED: 'Lỗi xử lý',
    REPORTED: 'Bị báo cáo',
    HIDDEN: 'Đã ẩn',
    REMOVED: 'Đã gỡ',
  }
  return labels[String(status ?? '').toUpperCase()] ?? 'Không rõ'
}

function formatDateTime(value) {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function compactNumber(value) {
  return new Intl.NumberFormat('vi-VN', { notation: 'compact', maximumFractionDigits: 1 }).format(Number(value ?? 0))
}

function StatusBadge({ status }) {
  const value = String(status ?? '').toUpperCase()
  const palette = {
    READY: 'bg-emerald-500/15 text-emerald-300 ring-emerald-500/30',
    PROCESSING: 'bg-sky-500/15 text-sky-300 ring-sky-500/30',
    FAILED: 'bg-red-500/15 text-red-300 ring-red-500/30',
    REPORTED: 'bg-amber-500/15 text-amber-300 ring-amber-500/30',
    HIDDEN: 'bg-zinc-500/15 text-zinc-300 ring-zinc-500/30',
    RAW: 'bg-violet-500/15 text-violet-300 ring-violet-500/30',
  }
  return (
    <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ${palette[value] ?? palette.RAW}`}>
      {statusLabel(value)}
    </span>
  )
}

function StatCard({ icon: Icon, label, value }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-zinc-500">
        <Icon className="text-base text-zinc-400" aria-hidden />
        {label}
      </div>
      <p className="mt-2 text-2xl font-bold text-zinc-100">{compactNumber(value)}</p>
    </div>
  )
}

function DeleteConfirmModal({ busy, error, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Xác nhận xóa bài đăng</h2>
            <p className="mt-1 text-sm text-zinc-500">Bài đăng sẽ bị gỡ khỏi hệ thống Admin và người dùng.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100"
            aria-label="Đóng"
          >
            <IoClose className="text-xl" aria-hidden />
          </button>
        </div>
        {error ? <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl border border-zinc-800 bg-black px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? 'Đang xóa...' : 'Xóa bài đăng'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminPostDetailPage() {
  const { publicId } = useParams()
  const navigate = useNavigate()
  const { token, user, authReady } = useAuth()
  const isAdmin = String(user?.role ?? '').toUpperCase() === 'ADMIN'
  const [post, setPost] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [deleteBusy, setDeleteBusy] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const title = post?.description || post?.title || 'Bài đăng không có mô tả'
  const playbackUrl = post?.masterPlaylistUrl || post?.videoUrl

  useEffect(() => {
    document.title = 'Vibely Admin | Chi tiết bài đăng'
  }, [])

  const loadPost = useCallback(async () => {
    if (!authReady) return
    if (!token || !isAdmin || !publicId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      setPost(await apiClient.getAdminPost(token, publicId))
    } catch (e) {
      setPost(null)
      setError(e.message ?? 'Không tải được chi tiết bài đăng.')
    } finally {
      setLoading(false)
    }
  }, [authReady, isAdmin, publicId, token])

  useEffect(() => {
    void loadPost()
  }, [loadPost])

  const stats = useMemo(
    () => [
      { icon: IoEyeOutline, label: 'Lượt xem', value: post?.viewCount },
      { icon: IoHeartOutline, label: 'Lượt thích', value: post?.likeCount },
      { icon: IoChatbubbleOutline, label: 'Bình luận', value: post?.commentCount },
      { icon: IoBookmarkOutline, label: 'Lượt lưu', value: post?.bookmarkCount },
      { icon: IoShareSocialOutline, label: 'Chia sẻ', value: post?.shareCount },
    ],
    [post],
  )

  const handleDelete = async () => {
    if (!post?.publicId) return
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await apiClient.deleteAdminPost(token, post.publicId)
      navigate('/admin/posts', { replace: true })
    } catch (e) {
      setDeleteError(e.message ?? 'Không xóa được bài đăng.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <AdminLayout
      active="posts"
      title="Chi tiết bài đăng"
      subtitle="Trang xem và kiểm tra bài đăng dành riêng cho quản trị viên."
    >
      {!authReady || loading ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center text-sm text-zinc-400">
          Đang tải chi tiết bài đăng...
        </section>
      ) : !isAdmin ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center">
          <p className="text-lg font-semibold text-zinc-100">Bạn không có quyền truy cập Admin</p>
        </section>
      ) : error ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center text-sm text-amber-400">
          {error}
        </section>
      ) : post ? (
        <>
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <Link
              to="/admin/posts"
              className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200"
            >
              <IoArrowBack aria-hidden />
              Quay lại danh sách
            </Link>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200"
            >
              <IoTrash aria-hidden />
              Xóa bài đăng
            </button>
          </div>

          <section className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
            <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
              <div className="overflow-hidden rounded-xl bg-black">
                {playbackUrl ? (
                  <video
                    key={playbackUrl}
                    src={playbackUrl}
                    poster={post.thumbnailUrl || undefined}
                    controls
                    playsInline
                    className="mx-auto aspect-video max-h-[68vh] w-full bg-black object-contain"
                  />
                ) : post.thumbnailUrl ? (
                  <img src={post.thumbnailUrl} alt="" className="mx-auto max-h-[68vh] w-full object-contain" />
                ) : (
                  <div className="flex aspect-video items-center justify-center text-sm text-zinc-500">
                    Không có file video để phát.
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Nội dung</p>
                    <h2 className="mt-2 line-clamp-4 text-lg font-bold text-zinc-100">{title}</h2>
                  </div>
                  <StatusBadge status={post.status} />
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-zinc-500">Mã bài đăng</dt>
                    <dd className="mt-1 break-all text-zinc-200">{post.publicId}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">Ngày tạo</dt>
                    <dd className="mt-1 text-zinc-200">{formatDateTime(post.createdAt)}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Tác giả</p>
                <p className="mt-2 font-bold text-zinc-100">{post.authorDisplayName || 'Người dùng Vibely'}</p>
                <p className="mt-1 text-sm text-zinc-500">@{post.authorUsername || 'unknown'}</p>
                <p className="mt-1 text-sm text-zinc-400">{post.authorEmail || 'Không có email'}</p>
              </section>
            </aside>
          </section>

          <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {stats.map((item) => (
              <StatCard key={item.label} icon={item.icon} label={item.label} value={item.value} />
            ))}
          </section>

          {deleteOpen ? (
            <DeleteConfirmModal
              busy={deleteBusy}
              error={deleteError}
              onClose={() => {
                if (deleteBusy) return
                setDeleteOpen(false)
                setDeleteError('')
              }}
              onConfirm={handleDelete}
            />
          ) : null}
        </>
      ) : null}
    </AdminLayout>
  )
}
