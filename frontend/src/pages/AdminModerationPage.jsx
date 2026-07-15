import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  IoChevronBack,
  IoChevronForward,
  IoClose,
  IoHandLeftOutline,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5'
import { apiClient } from '../api/client.js'
import { AdminLayout } from '../components/AdminLayout.jsx'
import { useAuth } from '../state/useAuth.js'

const PAGE_SIZE = 20

const STATE_FILTERS = [
  { value: '', label: 'Mở + đang claim' },
  { value: 'OPEN', label: 'Chờ claim' },
  { value: 'CLAIMED', label: 'Đang xử lý' },
  { value: 'RESOLVED', label: 'Đã xong' },
]

const DECISION_OPTIONS = [
  { value: 'ALLOW', label: 'ALLOW — phân phối bình thường' },
  { value: 'LIMIT', label: 'LIMIT — bỏ Explore / For-You' },
  { value: 'REVIEW', label: 'REVIEW — giữ ẩn chờ thêm' },
  { value: 'BLOCK', label: 'BLOCK — gỡ khỏi nền tảng' },
  { value: 'DELETE', label: 'DELETE — gỡ (takedown)' },
]

const DECISION_BADGE = {
  ALLOW: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-200',
  LIMIT: 'border-amber-500/40 bg-amber-500/10 text-amber-200',
  REVIEW: 'border-sky-500/40 bg-sky-500/10 text-sky-200',
  BLOCK: 'border-red-500/40 bg-red-500/10 text-red-300',
  DELETE: 'border-red-600/50 bg-red-600/15 text-red-200',
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

function DecisionBadge({ decision }) {
  const key = String(decision ?? '').toUpperCase()
  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-1 text-[11px] font-semibold ${
        DECISION_BADGE[key] ?? 'border-zinc-700 text-zinc-300'
      }`}
    >
      {key || '—'}
    </span>
  )
}

function ResolvePanel({ detail, queueId, submitting, error, onClose, onResolve, onClaim }) {
  const report = detail?.report || {}
  const [decision, setDecision] = useState(report.decision || 'ALLOW')
  const [reasonText, setReasonText] = useState('')

  useEffect(() => {
    setDecision(report.decision || 'ALLOW')
    setReasonText('')
  }, [report.decision, detail?.videoPublicId])

  if (!detail) return null

  const evidence = Array.isArray(detail.evidence) ? detail.evidence : []
  const tags = Array.isArray(detail.semanticTags) ? detail.semanticTags : []
  const mediaUrl = detail.videoUrl || detail.thumbnailUrl

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-3 py-4 sm:px-4 sm:py-6">
      <div className="scrollbar-none flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-3 border-b border-zinc-800 px-4 py-3 sm:px-5">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate text-lg font-bold text-zinc-100">
                {detail.title || 'Video không tiêu đề'}
              </h2>
              <DecisionBadge decision={report.decision} />
              {report.status === 'SHADOW' ? (
                <span className="rounded-full border border-zinc-600 px-2 py-0.5 text-[10px] font-semibold text-zinc-400">
                  AI shadow
                </span>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-zinc-500">
              @{detail.authorUsername || '—'} · risk {report.risk ?? '—'} · conf{' '}
              {report.confidence != null ? Number(report.confidence).toFixed(2) : '—'}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100"
            aria-label="Đóng"
          >
            <IoClose className="text-xl" aria-hidden />
          </button>
        </div>

        <div className="scrollbar-none grid min-h-0 flex-1 gap-4 overflow-y-auto p-4 sm:grid-cols-2 sm:p-5">
          <div className="space-y-3">
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-black">
              {mediaUrl ? (
                <video
                  key={mediaUrl}
                  src={detail.videoUrl || undefined}
                  poster={detail.thumbnailUrl || undefined}
                  controls
                  playsInline
                  className="aspect-[9/16] max-h-[420px] w-full object-contain"
                />
              ) : (
                <div className="flex aspect-[9/16] max-h-[420px] items-center justify-center text-sm text-zinc-500">
                  Không có media
                </div>
              )}
            </div>
            <p className="text-xs text-zinc-500">
              Status video: <span className="text-zinc-300">{detail.status || '—'}</span>
              {detail.queueState ? (
                <>
                  {' '}
                  · Queue: <span className="text-zinc-300">{detail.queueState}</span>
                </>
              ) : null}
            </p>
            {detail.videoPublicId ? (
              <Link
                to={`/admin/posts/${detail.videoPublicId}`}
                className="text-xs font-semibold text-sky-400 hover:text-sky-300"
              >
                Mở trang Admin bài đăng →
              </Link>
            ) : null}
          </div>

          <div className="space-y-4">
            <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Evidence ({evidence.length})
              </h3>
              <ul className="mt-2 max-h-40 space-y-2 overflow-y-auto text-sm">
                {evidence.length === 0 ? (
                  <li className="text-zinc-500">Không có evidence</li>
                ) : (
                  evidence.map((item, idx) => (
                    <li
                      key={`${item.reasonCode}-${idx}`}
                      className="rounded-lg border border-zinc-800/80 bg-black/40 px-2.5 py-2"
                    >
                      <p className="font-semibold text-zinc-200">
                        {item.reasonCode}{' '}
                        <span className="font-normal text-zinc-500">· {item.sourceModality}</span>
                      </p>
                      {item.snippet ? (
                        <p className="mt-1 line-clamp-3 text-xs text-zinc-400">{item.snippet}</p>
                      ) : null}
                    </li>
                  ))
                )}
              </ul>
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Semantic tags
              </h3>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {tags.length === 0 ? (
                  <span className="text-xs text-zinc-500">—</span>
                ) : (
                  tags.slice(0, 16).map((tag) => (
                    <span
                      key={tag.slug}
                      className="rounded-md border border-zinc-700 px-2 py-0.5 text-[11px] text-zinc-300"
                    >
                      {tag.slug}{' '}
                      <span className="text-zinc-500">
                        {Number(tag.confidence ?? 0).toFixed(2)}
                      </span>
                    </span>
                  ))
                )}
              </div>
              {detail.originality?.decision ? (
                <p className="mt-2 text-xs text-zinc-400">
                  Originality:{' '}
                  <span className="text-zinc-200">{detail.originality.decision}</span>
                  {detail.originality.overallConfidence != null
                    ? ` · conf ${Number(detail.originality.overallConfidence).toFixed(2)}`
                    : null}
                </p>
              ) : null}
            </section>

            <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-3">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                Quyết định moderator
              </h3>
              <p className="mt-1 text-[11px] text-zinc-500">
                Resolve luôn áp dụng lever thật (không shadow), kể cả khi AI chạy shadow.
              </p>
              <label className="mt-3 block text-xs text-zinc-400">
                Decision
                <select
                  value={decision}
                  onChange={(e) => setDecision(e.target.value)}
                  disabled={submitting}
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100"
                >
                  {DECISION_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="mt-3 block text-xs text-zinc-400">
                Lý do (bắt buộc khi override)
                <textarea
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  disabled={submitting}
                  rows={3}
                  placeholder="VD: Xác nhận AI / false positive spam / …"
                  className="mt-1 w-full rounded-lg border border-zinc-700 bg-black px-3 py-2 text-sm text-zinc-100"
                />
              </label>
              {error ? <p className="mt-2 text-sm text-red-400">{error}</p> : null}
              <div className="mt-3 flex flex-wrap gap-2">
                {queueId && detail.queueState === 'OPEN' ? (
                  <button
                    type="button"
                    disabled={submitting}
                    onClick={() => onClaim(queueId)}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-600 px-3 py-2 text-xs font-semibold text-zinc-200 hover:bg-zinc-900 disabled:opacity-50"
                  >
                    <IoHandLeftOutline aria-hidden />
                    Claim
                  </button>
                ) : null}
                <button
                  type="button"
                  disabled={submitting || !queueId}
                  onClick={() =>
                    onResolve(queueId, {
                      decision,
                      reasonCode:
                        String(decision).toUpperCase() === String(report.decision || '').toUpperCase()
                          ? 'CONFIRM_AI'
                          : 'HUMAN_OVERRIDE',
                      reasonText: reasonText.trim() || undefined,
                    })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3 py-2 text-xs font-semibold text-white hover:bg-red-500 disabled:opacity-50"
                >
                  <IoShieldCheckmarkOutline aria-hidden />
                  {submitting ? 'Đang lưu…' : 'Resolve & áp dụng'}
                </button>
              </div>
            </section>
          </div>
        </div>
      </div>
    </div>
  )
}

export function AdminModerationPage() {
  const { token, user, authReady } = useAuth()
  const isAdmin = String(user?.role ?? '').toUpperCase() === 'ADMIN'
  const [page, setPage] = useState(0)
  const [stateFilter, setStateFilter] = useState('')
  const [items, setItems] = useState([])
  const [total, setTotal] = useState(0)
  const [hasNext, setHasNext] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedPublicId, setSelectedPublicId] = useState(null)
  const [selectedQueueId, setSelectedQueueId] = useState(null)
  const [detail, setDetail] = useState(null)
  const [modalError, setModalError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    document.title = 'Vibely Admin | Kiểm duyệt nội dung'
  }, [])

  const loadQueue = useCallback(async () => {
    if (!authReady) return
    if (!token || !isAdmin) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await apiClient.getAdminModerationQueue(token, {
        page,
        size: PAGE_SIZE,
        state: stateFilter || undefined,
      })
      setItems(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total ?? 0))
      setHasNext(Boolean(data?.hasNext))
    } catch (e) {
      setItems([])
      setTotal(0)
      setHasNext(false)
      setError(e.message ?? 'Không tải được hàng đợi kiểm duyệt.')
    } finally {
      setLoading(false)
    }
  }, [authReady, isAdmin, page, stateFilter, token])

  useEffect(() => {
    void loadQueue()
  }, [loadQueue])

  useEffect(() => {
    setPage(0)
  }, [stateFilter])

  const openDetail = async (item) => {
    if (!item?.videoPublicId) return
    setSelectedPublicId(item.videoPublicId)
    setSelectedQueueId(item.queueId)
    setModalError('')
    setDetail(null)
    try {
      const data = await apiClient.getAdminModerationVideo(token, item.videoPublicId)
      setDetail(data)
      if (data?.queueId) setSelectedQueueId(data.queueId)
    } catch (e) {
      setModalError(e.message ?? 'Không tải được chi tiết.')
    }
  }

  const closeModal = (force = false) => {
    if (submitting && !force) return
    setSelectedPublicId(null)
    setSelectedQueueId(null)
    setDetail(null)
    setModalError('')
  }

  const handleClaim = async (queueId) => {
    setSubmitting(true)
    setModalError('')
    try {
      await apiClient.claimAdminModerationQueue(token, queueId)
      if (selectedPublicId) {
        const data = await apiClient.getAdminModerationVideo(token, selectedPublicId)
        setDetail(data)
      }
      await loadQueue()
    } catch (e) {
      setModalError(e.message ?? 'Claim thất bại.')
    } finally {
      setSubmitting(false)
    }
  }

  const handleResolve = async (queueId, payload) => {
    if (!queueId) {
      setModalError('Thiếu queue id — video chưa có mục hàng đợi mở.')
      return
    }
    if (
      String(payload.decision).toUpperCase() !== String(detail?.report?.decision || '').toUpperCase()
      && !payload.reasonText
    ) {
      setModalError('Ghi lý do khi override khác quyết định AI.')
      return
    }
    setSubmitting(true)
    setModalError('')
    try {
      await apiClient.resolveAdminModerationQueue(token, queueId, payload)
      await loadQueue()
      setSubmitting(false)
      closeModal(true)
    } catch (e) {
      setModalError(e.message ?? 'Resolve thất bại.')
      setSubmitting(false)
    }
  }

  const emptyHint = useMemo(
    () =>
      stateFilter
        ? 'Không có mục với bộ lọc này.'
        : 'Hàng đợi trống. Video REVIEW từ AI (kể cả shadow) sẽ xuất hiện tại đây.',
    [stateFilter],
  )

  return (
    <AdminLayout
      active="moderation"
      title="Kiểm duyệt nội dung"
      subtitle="Hàng đợi REVIEW — claim, xem evidence, override ALLOW / LIMIT / BLOCK."
    >
      {!authReady || loading ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center text-sm text-zinc-400">
          Đang tải hàng đợi…
        </section>
      ) : !isAdmin ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center">
          <p className="text-lg font-semibold text-zinc-100">Bạn không có quyền truy cập Admin</p>
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between">
              <p className="text-sm font-bold uppercase tracking-wide text-zinc-200">
                Tổng mục: {total}
              </p>
              <div className="flex flex-wrap gap-2">
                {STATE_FILTERS.map((item) => {
                  const active = stateFilter === item.value
                  return (
                    <button
                      key={item.value || 'open'}
                      type="button"
                      onClick={() => setStateFilter(item.value)}
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

            {error ? (
              <p className="mt-4 text-sm text-red-400">{error}</p>
            ) : items.length === 0 ? (
              <p className="mt-6 text-center text-sm text-zinc-500">{emptyHint}</p>
            ) : (
              <div className="mt-4 overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="border-b border-zinc-800 text-xs uppercase tracking-wide text-zinc-500">
                    <tr>
                      <th className="px-2 py-2 font-semibold">Video</th>
                      <th className="px-2 py-2 font-semibold">AI</th>
                      <th className="px-2 py-2 font-semibold">Risk</th>
                      <th className="px-2 py-2 font-semibold">Queue</th>
                      <th className="px-2 py-2 font-semibold">Tạo lúc</th>
                      <th className="px-2 py-2 font-semibold" />
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item) => (
                      <tr key={item.queueId} className="border-b border-zinc-800/70">
                        <td className="px-2 py-3">
                          <div className="flex items-center gap-3">
                            {item.thumbnailUrl ? (
                              <img
                                src={item.thumbnailUrl}
                                alt=""
                                className="h-12 w-9 rounded object-cover"
                              />
                            ) : (
                              <div className="h-12 w-9 rounded bg-zinc-800" />
                            )}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-zinc-100">
                                {item.title || 'Không tiêu đề'}
                              </p>
                              <p className="truncate text-xs text-zinc-500">
                                @{item.authorUsername}
                                {item.reportShadow ? ' · shadow' : ''}
                              </p>
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-3">
                          <DecisionBadge decision={item.aiDecision} />
                        </td>
                        <td className="px-2 py-3 text-zinc-300">
                          {item.risk}
                          <span className="text-zinc-500">
                            {' '}
                            / {Number(item.confidence ?? 0).toFixed(2)}
                          </span>
                        </td>
                        <td className="px-2 py-3 text-zinc-300">
                          {item.queueState}
                          {item.claimedBy ? (
                            <span className="block text-[11px] text-zinc-500">{item.claimedBy}</span>
                          ) : null}
                        </td>
                        <td className="px-2 py-3 text-xs text-zinc-500">
                          {formatDateTime(item.createdAt)}
                        </td>
                        <td className="px-2 py-3 text-right">
                          <button
                            type="button"
                            onClick={() => void openDetail(item)}
                            className="rounded-lg border border-zinc-700 px-3 py-1.5 text-xs font-semibold text-zinc-200 hover:bg-zinc-900"
                          >
                            Xử lý
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                disabled={page <= 0}
                onClick={() => setPage((p) => Math.max(0, p - 1))}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs disabled:opacity-40"
              >
                <IoChevronBack aria-hidden /> Trước
              </button>
              <span className="text-xs text-zinc-500">Trang {page + 1}</span>
              <button
                type="button"
                disabled={!hasNext}
                onClick={() => setPage((p) => p + 1)}
                className="inline-flex items-center gap-1 rounded-lg border border-zinc-700 px-3 py-1.5 text-xs disabled:opacity-40"
              >
                Sau <IoChevronForward aria-hidden />
              </button>
            </div>
          </section>

          {selectedPublicId ? (
            <ResolvePanel
              detail={detail}
              queueId={selectedQueueId}
              submitting={submitting}
              error={modalError}
              onClose={closeModal}
              onClaim={handleClaim}
              onResolve={handleResolve}
            />
          ) : null}
        </>
      )}
    </AdminLayout>
  )
}
