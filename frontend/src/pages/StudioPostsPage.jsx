import React from 'react'
import { useCallback, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import {
  IoBarChartOutline,
  IoChatbubbleEllipsesOutline,
  IoEllipsisHorizontal,
  IoPencil,
  IoTrashOutline,
} from 'react-icons/io5'
import { apiClient } from '../api/client'
import { StudioLayout } from '../components/StudioLayout'
import { useAuth } from '../state/useAuth'

export function StudioPostsPage() {
  const { token, authReady } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const successMessage = location.state?.successMessage

  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleteBusy, setDeleteBusy] = useState(false)
  /** Menu nổi (fixed + portal) tránh bị cắt bởi overflow-x-auto của khối bảng */
  const [moreMenu, setMoreMenu] = useState(null)

  const load = useCallback(async () => {
    if (!authReady) return
    if (!token) {
      setItems([])
      setTotal(0)
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await apiClient.getMyUploadedVideos(token, { page: 0, size: 48 })
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total ?? 0))
    } catch (e) {
      setError(e.message ?? 'Không tải được danh sách bài đăng.')
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [authReady, token])

  useEffect(() => {
    document.title = 'VibelyStudio | Bài đăng'
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  useEffect(() => {
    if (!successMessage) return
    void load()
    const t = setTimeout(() => {
      navigate(location.pathname, { replace: true, state: null })
    }, 3000)
    return () => clearTimeout(t)
  }, [successMessage, load, navigate, location.pathname])

  useEffect(() => {
    if (moreMenu == null) return undefined
    const onPointerDown = (e) => {
      const t = e.target
      if (!(t instanceof Element)) return
      if (t.closest('[data-studio-posts-more]') || t.closest('[data-studio-posts-menu]')) return
      setMoreMenu(null)
    }
    const onKey = (e) => {
      if (e.key === 'Escape') setMoreMenu(null)
    }
    const onScrollOrResize = () => setMoreMenu(null)
    document.addEventListener('pointerdown', onPointerDown, true)
    document.addEventListener('keydown', onKey)
    window.addEventListener('scroll', onScrollOrResize, true)
    window.addEventListener('resize', onScrollOrResize)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      document.removeEventListener('keydown', onKey)
      window.removeEventListener('scroll', onScrollOrResize, true)
      window.removeEventListener('resize', onScrollOrResize)
    }
  }, [moreMenu])

  const confirmDelete = async () => {
    if (!token || !deleteTarget) return
    setDeleteBusy(true)
    try {
      await apiClient.deleteVideo(deleteTarget.publicId, token)
      setDeleteTarget(null)
      await load()
    } catch (e) {
      setError(e.message ?? 'Không xóa được bài đăng.')
    } finally {
      setDeleteBusy(false)
    }
  }

  return (
    <StudioLayout active="posts" title="Bài đăng" subtitle="Quản lý video đã đăng và bản nháp">
      <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
        {successMessage ? (
          <div className="mb-4 rounded-lg border border-emerald-800/80 bg-emerald-950/40 px-4 py-2.5 text-sm text-emerald-300">
            {successMessage}
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {['Lượt xem', 'Lượt thích', 'Bình luận', 'Quyền riêng tư'].map((item) => (
              <span
                key={item}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-2.5 py-1 text-xs text-zinc-300"
              >
                {item}
              </span>
            ))}
          </div>
          <input
            className="w-64 rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm"
            placeholder="Tìm theo mô tả bài đăng"
            readOnly
          />
        </div>

        {error ? <p className="mt-4 text-sm text-amber-400">{error}</p> : null}

        {loading ? (
          <p className="mt-8 text-center text-sm text-zinc-500">Đang tải bài đăng…</p>
        ) : items.length === 0 ? (
          <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-16 text-center">
            <p className="text-2xl font-bold text-zinc-100">Chưa có bài đăng</p>
            <p className="mt-2 text-sm text-zinc-500">Video đã đăng sẽ xuất hiện ở đây.</p>
            <Link
              to="/vibelystudio/upload"
              className="mt-6 inline-block rounded-md bg-pink-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-pink-500"
            >
              Tải video đầu tiên
            </Link>
          </div>
        ) : (
          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-sm text-zinc-200">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                  <th className="py-3 pr-4 font-medium">Bài đăng</th>
                  <th className="py-3 px-2 font-medium">Thích</th>
                  <th className="py-3 px-2 font-medium">Bình luận</th>
                  <th className="py-3 pl-2 font-medium">Ngày tạo</th>
                  <th className="py-3 pl-4 text-right font-medium">Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {items.map((v) => {
                  const hasThumb = v.thumbnailUrl && String(v.thumbnailUrl).trim()
                  const desc = (v.description && String(v.description).trim()) || v.title || 'Không có mô tả'
                  const created = v.createdAt
                    ? new Date(v.createdAt).toLocaleString('vi-VN', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : '—'
                  return (
                    <tr key={v.publicId} className="border-b border-zinc-800/80">
                      <td className="py-3 pr-4">
                        <div className="flex items-center gap-3">
                          <div className="relative h-16 w-12 shrink-0 overflow-hidden rounded-md bg-zinc-800">
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
                          <div className="min-w-0">
                            <p className="line-clamp-2 font-medium text-zinc-100">{desc}</p>
                            <p className="mt-0.5 text-xs text-zinc-500">Mã #{v.publicId}</p>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-2 tabular-nums">{v.likeCount ?? 0}</td>
                      <td className="py-3 px-2 tabular-nums">{v.commentCount ?? 0}</td>
                      <td className="py-3 pl-2 text-xs text-zinc-400">{created}</td>
                      <td className="py-3 pl-4 text-right align-middle">
                        <div className="inline-flex items-center justify-end gap-0.5">
                          <button
                            type="button"
                            className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-pink-400"
                            title="Chỉnh sửa bài đăng"
                            aria-label="Chỉnh sửa bài đăng"
                            onClick={() => {
                              setMoreMenu(null)
                              navigate(`/vibelystudio/upload/post/${v.publicId}`)
                            }}
                          >
                            <IoPencil className="h-5 w-5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="cursor-pointer rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-pink-400"
                            title="Thống kê bài đăng"
                            aria-label="Thống kê bài đăng"
                            onClick={() => {
                              setMoreMenu(null)
                              navigate(`/vibelystudio/analytics/${v.publicId}`)
                            }}
                          >
                            <IoBarChartOutline className="h-5 w-5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-pink-400"
                            title="Mở bình luận"
                            aria-label="Xem bình luận"
                            onClick={() => {
                              setMoreMenu(null)
                              navigate(`/vibelystudio/comment/${v.publicId}`)
                            }}
                          >
                            <IoChatbubbleEllipsesOutline className="h-5 w-5" aria-hidden />
                          </button>
                          <button
                            type="button"
                            data-studio-posts-more
                            className="rounded-md p-2 text-zinc-400 transition hover:bg-zinc-800 hover:text-pink-400"
                            title="Thêm"
                            aria-label="Thêm thao tác"
                            aria-expanded={moreMenu?.video?.publicId === v.publicId}
                            onClick={(e) => {
                              e.stopPropagation()
                              const rect = e.currentTarget.getBoundingClientRect()
                              setMoreMenu((cur) =>
                                cur?.video?.publicId === v.publicId
                                  ? null
                                  : {
                                      video: v,
                                      top: rect.bottom + 6,
                                      right: Math.max(8, window.innerWidth - rect.right),
                                    },
                              )
                            }}
                          >
                            <IoEllipsisHorizontal className="h-5 w-5" aria-hidden />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {total > items.length ? (
              <p className="mt-2 text-center text-xs text-zinc-500">
                Hiển thị {items.length} / {total} bài
              </p>
            ) : null}
          </div>
        )}
      </section>

      {moreMenu
        ? createPortal(
            <div
              data-studio-posts-menu
              className="fixed z-[100] w-44 rounded-lg border border-zinc-700 bg-zinc-900 py-1 shadow-xl"
              style={{ top: moreMenu.top, right: moreMenu.right }}
              role="menu"
            >
              <button
                type="button"
                role="menuitem"
                className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-400 hover:bg-zinc-800"
                onClick={() => {
                  const v = moreMenu.video
                  setMoreMenu(null)
                  setDeleteTarget(v)
                }}
              >
                <IoTrashOutline className="h-4 w-4 shrink-0" aria-hidden />
                Xóa bài
              </button>
            </div>,
            document.body,
          )
        : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
          <div className="w-full max-w-sm rounded-xl border border-zinc-700 bg-zinc-900 p-6 text-center shadow-2xl">
            <p className="text-lg font-semibold text-zinc-100">Xóa bài đăng?</p>
            <p className="mt-2 text-sm text-zinc-400">
              Video sẽ được gỡ khỏi Vibely. Thao tác này không thể hoàn tác từ trang này.
            </p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                className="rounded-md bg-zinc-800 py-2 text-sm font-semibold text-zinc-200 hover:bg-zinc-700"
                onClick={() => setDeleteTarget(null)}
                disabled={deleteBusy}
              >
                Hủy
              </button>
              <button
                type="button"
                className="rounded-md bg-red-600 py-2 text-sm font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                onClick={() => void confirmDelete()}
                disabled={deleteBusy}
              >
                {deleteBusy ? 'Đang xóa…' : 'Xóa'}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </StudioLayout>
  )
}
