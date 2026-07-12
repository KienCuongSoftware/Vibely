import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  IoChevronBack,
  IoChevronForward,
  IoClose,
  IoMailOutline,
} from 'react-icons/io5'
import { apiClient } from '../api/client.js'
import { AdminLayout } from '../components/AdminLayout.jsx'
import { AdminBanAppealsPageSkeleton } from '../components/admin/AdminListSkeletons.jsx'
import { useAuth } from '../state/useAuth.js'

const PAGE_SIZE = 20

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả' },
  { value: 'PENDING', label: 'Chờ xử lý' },
  { value: 'IN_REVIEW', label: 'Đang xem xét' },
  { value: 'APPROVED', label: 'Chấp nhận' },
  { value: 'REJECTED', label: 'Từ chối' },
]

const STATUS_LABELS = {
  PENDING: 'Chờ xử lý',
  IN_REVIEW: 'Đang xem xét',
  APPROVED: 'Chấp nhận',
  REJECTED: 'Từ chối',
}

const STATUS_BADGE_CLASS = {
  PENDING: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  IN_REVIEW: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  APPROVED: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  REJECTED: 'border-red-500/40 bg-red-500/10 text-red-300',
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

function StatusBadge({ status }) {
  const normalized = String(status ?? 'PENDING').toUpperCase()
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        STATUS_BADGE_CLASS[normalized] ?? STATUS_BADGE_CLASS.PENDING
      }`}
    >
      {STATUS_LABELS[normalized] ?? normalized}
    </span>
  )
}

function AppealDetailModal({ appeal, submitting, error, onClose, onUpdateStatus }) {
  const [status, setStatus] = useState(appeal?.status ?? 'PENDING')
  const [adminNotes, setAdminNotes] = useState(appeal?.adminNotes ?? '')

  useEffect(() => {
    setStatus(appeal?.status ?? 'PENDING')
    setAdminNotes(appeal?.adminNotes ?? '')
  }, [appeal])

  if (!appeal) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="scrollbar-none max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-zinc-100">Khiếu nại #{appeal.id}</h2>
              <StatusBadge status={appeal.status} />
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              Gửi lúc {formatDateTime(appeal.createdAt)}
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

        <div className="mt-5 space-y-4">
          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Email liên hệ</p>
            <p className="mt-2 break-all text-sm text-zinc-100">{appeal.contactEmail}</p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Mô tả</p>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-200">
              {appeal.description}
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Email tài khoản (ẩn)
              </p>
              <p className="mt-2 text-sm text-zinc-200">{appeal.maskedAccountEmail || '—'}</p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Tài khoản liên kết
              </p>
              {appeal.userId ? (
                <p className="mt-2 text-sm text-zinc-200">
                  {appeal.displayName || 'Người dùng Vibely'}{' '}
                  <span className="text-zinc-500">(@{appeal.username || 'unknown'})</span>
                </p>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">Chưa xác định</p>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Lý do cấm (nội bộ)
            </p>
            <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-300">
              {appeal.banReason || '—'}
            </p>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Trạng thái xử lý
            </label>
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              disabled={submitting}
              className="mt-2 h-11 w-full rounded-lg border border-zinc-700 bg-zinc-950 px-3 text-sm text-zinc-100 outline-none focus:border-red-500"
            >
              {STATUS_FILTERS.filter((item) => item.value).map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          <div className="rounded-xl border border-zinc-800 bg-zinc-900/60 p-4">
            <label className="block text-xs font-semibold uppercase tracking-wide text-zinc-500">
              Ghi chú admin
            </label>
            <textarea
              value={adminNotes}
              onChange={(event) => setAdminNotes(event.target.value)}
              disabled={submitting}
              maxLength={1000}
              rows={4}
              className="mt-2 w-full resize-none rounded-lg border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-red-500"
              placeholder="Ghi chú nội bộ khi xử lý khiếu nại..."
            />
          </div>

          {appeal.reviewedAt ? (
            <p className="text-xs text-zinc-500">
              Cập nhật lần cuối: {formatDateTime(appeal.reviewedAt)}
            </p>
          ) : null}
        </div>

        {error ? (
          <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p>
        ) : null}

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={() => onUpdateStatus({ status, adminNotes })}
            disabled={submitting}
            className="rounded-xl border border-zinc-800 bg-black px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Đang lưu...' : 'Lưu trạng thái'}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminBanAppealsPage() {
  const { token, user, authReady } = useAuth()
  const isAdmin = String(user?.role ?? '').toUpperCase() === 'ADMIN'
  const [page, setPage] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [appeals, setAppeals] = useState([])
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [selectedAppeal, setSelectedAppeal] = useState(null)
  const [modalError, setModalError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'Vibely Admin | Khiếu nại cấm'
  }, [])

  const loadAppeals = useCallback(async () => {
    if (!authReady) return
    if (!token || !isAdmin) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await apiClient.getAdminBanAppeals(token, {
        page,
        size: PAGE_SIZE,
        status: statusFilter || undefined,
      })
      setAppeals(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total ?? 0))
      setHasNext(Boolean(data?.hasNext))
    } catch (e) {
      setAppeals([])
      setTotal(0)
      setHasNext(false)
      setError(e.message ?? 'Không tải được danh sách khiếu nại.')
    } finally {
      setLoading(false)
    }
  }, [authReady, isAdmin, page, statusFilter, token])

  useEffect(() => {
    void loadAppeals()
  }, [loadAppeals])

  useEffect(() => {
    setPage(0)
  }, [statusFilter])

  const filteredAppeals = useMemo(() => {
    const keyword = query.trim().toLowerCase()
    if (!keyword) return appeals
    return appeals.filter((item) =>
      [
        item.contactEmail,
        item.description,
        item.banReason,
        item.maskedAccountEmail,
        item.username,
        item.displayName,
        String(item.id),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(keyword)),
    )
  }, [appeals, query])

  const closeModal = () => {
    if (submitting) return
    setSelectedAppeal(null)
    setModalError('')
  }

  const handleUpdateStatus = async ({ status, adminNotes }) => {
    if (!selectedAppeal?.id) return
    setSubmitting(true)
    setModalError('')
    try {
      const updated = await apiClient.updateAdminBanAppealStatus(token, selectedAppeal.id, {
        status,
        adminNotes: adminNotes.trim() || undefined,
      })
      setSelectedAppeal(updated)
      await loadAppeals()
    } catch (e) {
      setModalError(e.message ?? 'Không cập nhật được trạng thái khiếu nại.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminLayout
      active="appeals"
      title="Khiếu nại cấm tài khoản"
      subtitle="Theo dõi và xử lý khiếu nại từ người dùng bị cấm."
    >
      {!authReady || loading ? (
        <AdminBanAppealsPageSkeleton />
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
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-zinc-200">
                  Tổng khiếu nại: {total}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                {STATUS_FILTERS.map((item) => {
                  const active = statusFilter === item.value
                  return (
                    <button
                      key={item.value || 'all'}
                      type="button"
                      onClick={() => setStatusFilter(item.value)}
                      className={`rounded-full border px-4 py-2 text-xs font-semibold transition ${
                        active
                          ? 'border-red-500 bg-red-500/10 text-red-200'
                          : 'border-zinc-700 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200'
                      }`}
                    >
                      {item.label}
                    </button>
                  )
                })}
              </div>
            </div>

            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="mt-4 h-12 w-full rounded-full border border-zinc-700 bg-zinc-950 px-5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-red-500"
              placeholder="Tìm theo email, mô tả, lý do cấm hoặc mã khiếu nại..."
            />

            {error ? <p className="mt-4 text-sm text-amber-400">{error}</p> : null}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[980px] border-collapse text-left text-sm text-zinc-200">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                    <th className="py-3 pr-4 font-medium">Mã</th>
                    <th className="px-3 py-3 font-medium">Email liên hệ</th>
                    <th className="px-3 py-3 font-medium">Mô tả</th>
                    <th className="px-3 py-3 font-medium">Trạng thái</th>
                    <th className="px-3 py-3 font-medium">Thời gian</th>
                    <th className="px-3 py-3 text-right font-medium">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAppeals.map((item) => (
                    <tr key={item.id} className="border-b border-zinc-800/80">
                      <td className="py-3 pr-4 font-mono text-xs text-zinc-400">#{item.id}</td>
                      <td className="px-3 py-3 text-zinc-300">{item.contactEmail}</td>
                      <td className="max-w-sm px-3 py-3 text-zinc-300">
                        <p className="line-clamp-2 whitespace-pre-wrap text-sm">{item.description}</p>
                      </td>
                      <td className="px-3 py-3">
                        <StatusBadge status={item.status} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-zinc-400">
                        {formatDateTime(item.createdAt)}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex items-center justify-end">
                          <button
                            type="button"
                            onClick={() => {
                              setModalError('')
                              setSelectedAppeal(item)
                            }}
                            className="inline-flex h-9 items-center gap-2 rounded-full border border-zinc-700 px-4 text-xs font-semibold text-zinc-200 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200"
                          >
                            <IoMailOutline className="text-base" aria-hidden />
                            Xem chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {filteredAppeals.length === 0 ? (
              <div className="mt-4 rounded-lg border border-zinc-800 bg-zinc-950 px-4 py-12 text-center text-sm text-zinc-500">
                Chưa có khiếu nại phù hợp.
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

          {selectedAppeal ? (
            <AppealDetailModal
              appeal={selectedAppeal}
              submitting={submitting}
              error={modalError}
              onClose={closeModal}
              onUpdateStatus={handleUpdateStatus}
            />
          ) : null}
        </>
      )}
    </AdminLayout>
  )
}
