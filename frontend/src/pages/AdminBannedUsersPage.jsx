import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  IoChevronBack,
  IoChevronForward,
  IoClose,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5'
import { apiClient } from '../api/client.js'
import { AdminLayout } from '../components/AdminLayout.jsx'
import { useAuth } from '../state/useAuth.js'

const PAGE_SIZE = 20
const DEFAULT_AVATAR = '/images/users/default-avatar.jpeg'

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

function resolveAdminAvatarUrl(avatarUrl) {
  const value = String(avatarUrl ?? '').trim()
  if (!value || value.startsWith('/api/users/oauth-avatar/')) {
    return DEFAULT_AVATAR
  }
  return value
}

function UnbanConfirmModal({ user, submitting, error, onClose, onConfirm }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">Bỏ cấm tài khoản</h2>
            <p className="mt-1 text-sm text-zinc-500">
              Người dùng sẽ có thể đăng nhập lại sau khi bỏ cấm.
            </p>
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

        <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <p>
            Bạn sắp bỏ cấm <strong>{user?.displayName || 'Người dùng Vibely'}</strong> (@
            {user?.username || 'unknown'}).
          </p>
          <p className="mt-2 text-emerald-200/90">Email: {user?.email || 'Không có email'}</p>
          {user?.banReason ? (
            <p className="mt-3 text-emerald-200/90">
              Lý do cấm trước đó: <span className="text-emerald-50">{user.banReason}</span>
            </p>
          ) : null}
        </div>

        {error ? <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-xl border border-zinc-800 bg-black px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Đang xử lý...' : 'Bỏ cấm tài khoản'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminBannedUsersPage() {
  const { token, user, authReady } = useAuth()
  const isAdmin = String(user?.role ?? '').toUpperCase() === 'ADMIN'
  const [page, setPage] = useState(0)
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [unbanningUser, setUnbanningUser] = useState(null)
  const [modalError, setModalError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'Vibely Admin | Tài khoản bị cấm'
  }, [])

  const loadBannedUsers = useCallback(async () => {
    if (!authReady) return
    if (!token || !isAdmin) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await apiClient.getAdminBannedUsers(token, { page, size: PAGE_SIZE })
      setUsers(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total ?? 0))
      setHasNext(Boolean(data?.hasNext))
    } catch (e) {
      setUsers([])
      setTotal(0)
      setHasNext(false)
      setError(e.message ?? 'Không tải được danh sách tài khoản bị cấm.')
    } finally {
      setLoading(false)
    }
  }, [authReady, isAdmin, page, token])

  useEffect(() => {
    void loadBannedUsers()
  }, [loadBannedUsers])

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return users
    return users.filter((item) =>
      [item.username, item.displayName, item.email, item.banReason]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    )
  }, [query, users])

  const closeModal = () => {
    if (submitting) return
    setUnbanningUser(null)
    setModalError('')
  }

  const handleUnban = async () => {
    if (!unbanningUser?.id) return
    setSubmitting(true)
    setModalError('')
    try {
      await apiClient.unbanAdminUser(token, unbanningUser.id)
      setUnbanningUser(null)
      if (users.length === 1 && page > 0) {
        setPage((current) => Math.max(current - 1, 0))
      } else {
        await loadBannedUsers()
      }
    } catch (e) {
      setModalError(e.message ?? 'Không bỏ cấm được tài khoản.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminLayout
      active="banned"
      title="Danh sách tài khoản bị cấm"
      subtitle="Theo dõi tài khoản đã bị cấm, lý do cấm và thời điểm thực hiện."
    >
      {!authReady || loading ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center text-sm text-zinc-400">
          Đang tải danh sách tài khoản bị cấm...
        </section>
      ) : !isAdmin ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center">
          <p className="text-lg font-semibold text-zinc-100">Bạn không có quyền truy cập Admin</p>
          <p className="mt-2 text-sm text-zinc-400">
            Tài khoản hiện tại cần vai trò Quản trị viên để xem khu vực quản trị.
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(160px,220px)_minmax(320px,1fr)] xl:items-center">
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-zinc-200">
                  Tổng tài khoản bị cấm: {total}
                </p>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 w-full rounded-full border border-zinc-700 bg-zinc-950 px-5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-red-500"
                placeholder="Tìm theo tên, email, Vibely ID hoặc lý do cấm..."
              />
            </div>

            {error ? <p className="mt-4 text-sm text-amber-400">{error}</p> : null}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse text-left text-sm text-zinc-200">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                    <th className="py-3 pr-4 font-medium">Người dùng</th>
                    <th className="px-3 py-3 font-medium">Email</th>
                    <th className="px-3 py-3 font-medium">Lý do cấm</th>
                    <th className="px-3 py-3 font-medium">Thời điểm cấm</th>
                    <th className="px-3 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item) => {
                    const avatarSrc = resolveAdminAvatarUrl(item.avatarUrl)
                    return (
                      <tr key={item.id} className="border-b border-zinc-800/80">
                        <td className="py-3 pr-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={avatarSrc}
                              alt=""
                              className="h-10 w-10 shrink-0 rounded-full object-cover ring-1 ring-zinc-800"
                              referrerPolicy="no-referrer"
                              onError={(e) => {
                                e.currentTarget.src = DEFAULT_AVATAR
                              }}
                            />
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-zinc-100">
                                {item.displayName || 'Người dùng Vibely'}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-zinc-500">@{item.username || 'unknown'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-zinc-300">{item.email || '—'}</td>
                        <td className="max-w-xs px-3 py-3 text-zinc-300">
                          <p className="line-clamp-3 whitespace-pre-wrap text-sm">{item.banReason || '—'}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs text-zinc-400">
                          {formatDateTime(item.bannedAt)}
                        </td>
                        <td className="px-3 py-3">
                          <div className="flex items-center justify-end">
                            <button
                              type="button"
                              onClick={() => {
                                setModalError('')
                                setUnbanningUser(item)
                              }}
                              className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-700 px-4 text-xs font-semibold text-zinc-200 transition hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-300"
                            >
                              <IoShieldCheckmarkOutline className="text-base" aria-hidden />
                              Bỏ cấm
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filteredUsers.length === 0 ? (
              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-12 text-center text-sm text-zinc-500">
                Không có tài khoản bị cấm phù hợp.
              </div>
            ) : null}

            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                disabled={page === 0}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Trang trước"
                onClick={() => setPage((current) => Math.max(current - 1, 0))}
              >
                <IoChevronBack className="text-lg" aria-hidden />
              </button>
              <span className="px-2 text-sm text-zinc-500">Trang {page + 1}</span>
              <button
                type="button"
                disabled={!hasNext}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-zinc-700 text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label="Trang sau"
                onClick={() => setPage((current) => current + 1)}
              >
                <IoChevronForward className="text-lg" aria-hidden />
              </button>
            </div>
          </section>

          {unbanningUser ? (
            <UnbanConfirmModal
              user={unbanningUser}
              submitting={submitting}
              error={modalError}
              onClose={closeModal}
              onConfirm={handleUnban}
            />
          ) : null}
        </>
      )}
    </AdminLayout>
  )
}
