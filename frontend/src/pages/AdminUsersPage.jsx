import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { apiClient } from '../api/client.js'
import { AdminLayout } from '../components/AdminLayout.jsx'
import { useAuth } from '../state/useAuth.js'

const PAGE_SIZE = 20
const DEFAULT_AVATAR = '/images/users/default-avatar.jpeg'

function roleLabel(role) {
  return String(role ?? '').toUpperCase() === 'ADMIN' ? 'Quản trị viên' : 'Người dùng'
}

function resolveAdminAvatarUrl(avatarUrl) {
  const value = String(avatarUrl ?? '').trim()
  if (!value || value.startsWith('/api/users/oauth-avatar/')) {
    return DEFAULT_AVATAR
  }
  return value
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

function RoleBadge({ role }) {
  const admin = String(role ?? '').toUpperCase() === 'ADMIN'
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${
        admin
          ? 'bg-fuchsia-500/15 text-fuchsia-300 ring-1 ring-fuchsia-500/30'
          : 'bg-sky-500/15 text-sky-300 ring-1 ring-sky-500/30'
      }`}
    >
      {roleLabel(role)}
    </span>
  )
}

function OnboardingBadge({ completed }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
        completed
          ? 'bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/30'
          : 'bg-amber-500/15 text-amber-300 ring-1 ring-amber-500/30'
      }`}
    >
      {completed ? 'Đã hoàn tất' : 'Chưa hoàn tất'}
    </span>
  )
}

export function AdminUsersPage() {
  const { token, user, authReady } = useAuth()
  const isAdmin = String(user?.role ?? '').toUpperCase() === 'ADMIN'
  const [page, setPage] = useState(0)
  const [users, setUsers] = useState([])
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selectedRole, setSelectedRole] = useState('ALL')

  useEffect(() => {
    document.title = 'Vibely Admin | Quản lý tài khoản'
  }, [])

  const loadUsers = useCallback(async () => {
    if (!authReady) return
    if (!token || !isAdmin) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await apiClient.getAdminUsers(token, { page, size: PAGE_SIZE })
      setUsers(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total ?? 0))
      setHasNext(Boolean(data?.hasNext))
    } catch (e) {
      setUsers([])
      setTotal(0)
      setHasNext(false)
      setError(e.message ?? 'Không tải được danh sách tài khoản.')
    } finally {
      setLoading(false)
    }
  }, [authReady, isAdmin, page, token])

  useEffect(() => {
    void loadUsers()
  }, [loadUsers])

  const filteredUsers = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    return users.filter((item) =>
      (selectedRole === 'ALL' || String(item.role ?? '').toUpperCase() === selectedRole) &&
      (!keyword ||
        [item.username, item.displayName, item.email, roleLabel(item.role)]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(keyword))),
    )
  }, [query, selectedRole, users])

  const availableRoles = useMemo(() => {
    const roles = new Set(users.map((item) => String(item.role ?? '').toUpperCase()).filter(Boolean))
    return Array.from(roles).sort((a, b) => roleLabel(a).localeCompare(roleLabel(b), 'vi'))
  }, [users])

  const pageStart = total === 0 ? 0 : page * PAGE_SIZE + 1
  const pageEnd = Math.min(total, page * PAGE_SIZE + users.length)

  return (
    <AdminLayout
      active="users"
      title="Quản lý tài khoản người dùng"
      subtitle="Theo dõi danh sách tài khoản, vai trò và trạng thái hoàn tất hồ sơ."
    >
      {!authReady || loading ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center text-sm text-zinc-400">
          Đang tải danh sách tài khoản...
        </section>
      ) : !isAdmin ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center">
          <p className="text-lg font-semibold text-zinc-100">Bạn không có quyền truy cập Admin</p>
          <p className="mt-2 text-sm text-zinc-400">
            Tài khoản hiện tại cần vai trò Quản trị viên để xem khu vực quản trị.
          </p>
        </section>
      ) : (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-200">Tổng tài khoản: {total}</p>
              <p className="mt-1 text-xs text-zinc-500">
                Đang hiển thị {pageStart}-{pageEnd}
                {filteredUsers.length !== users.length ? ` • Kết quả lọc: ${filteredUsers.length}` : ''}
              </p>
            </div>
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition focus:border-pink-500"
                aria-label="Lọc theo vai trò"
              >
                <option value="ALL">Tất cả vai trò</option>
                {availableRoles.map((role) => (
                  <option key={role} value={role}>
                    {roleLabel(role)}
                  </option>
                ))}
              </select>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-pink-500 sm:w-72"
                placeholder="Tìm tên, email, vai trò..."
              />
            </div>
          </div>

          {error ? <p className="mt-4 text-sm text-amber-400">{error}</p> : null}

          <div className="mt-4 overflow-x-auto">
            <table className="w-full min-w-[900px] border-collapse text-left text-sm text-zinc-200">
              <thead>
                <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                  <th className="py-3 pr-4 font-medium">Người dùng</th>
                  <th className="px-3 py-3 font-medium">Email</th>
                  <th className="px-3 py-3 font-medium">Vai trò</th>
                  <th className="px-3 py-3 font-medium">Hồ sơ</th>
                  <th className="px-3 py-3 font-medium">Ngày tạo</th>
                  <th className="px-3 py-3 font-medium">Cập nhật</th>
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
                            <p className="truncate font-semibold text-zinc-100">{item.displayName || 'Người dùng Vibely'}</p>
                            <p className="mt-0.5 truncate text-xs text-zinc-500">@{item.username || 'unknown'}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-zinc-300">{item.email || '—'}</td>
                      <td className="px-3 py-3">
                        <RoleBadge role={item.role} />
                      </td>
                      <td className="px-3 py-3">
                        <OnboardingBadge completed={item.onboardingCompleted} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-zinc-400">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-zinc-400">
                        {formatDateTime(item.updatedAt)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {filteredUsers.length === 0 ? (
            <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-12 text-center text-sm text-zinc-500">
              Không có tài khoản phù hợp.
            </div>
          ) : null}

          <div className="mt-4 flex items-center justify-end gap-2">
            <button
              type="button"
              disabled={page === 0}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((current) => Math.max(current - 1, 0))}
            >
              Trước
            </button>
            <span className="px-2 text-sm text-zinc-500">Trang {page + 1}</span>
            <button
              type="button"
              disabled={!hasNext}
              className="rounded-md border border-zinc-700 px-3 py-2 text-sm text-zinc-200 transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => setPage((current) => current + 1)}
            >
              Sau
            </button>
          </div>
        </section>
      )}
    </AdminLayout>
  )
}
