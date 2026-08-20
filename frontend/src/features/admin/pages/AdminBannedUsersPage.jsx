import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from "react-i18next";
import {
  IoClose,
  IoShieldCheckmarkOutline,
} from 'react-icons/io5'
import { adminApi } from '@/features/admin/api'
import { AdminLayout } from '@/features/admin/components/AdminLayout.jsx'
import { AdminPagination } from '@/features/admin/components/AdminPagination.jsx'
import { useAuth } from '@/features/auth/hooks/useAuth.js'
import {
  DEFAULT_AVATAR_URL,
  sanitizeAvatarUrl,
} from '@/features/profile/utils/avatarUrl.js'

const PAGE_SIZE = 20
const DEFAULT_AVATAR = DEFAULT_AVATAR_URL

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

function resolveAdminAvatarUrl(avatarUrl, userId) {
  return sanitizeAvatarUrl(avatarUrl, DEFAULT_AVATAR, userId)
}

/** Hide leaked regex / engine tokens in ban_reason (legacy rows). */
function formatBanReasonDisplay(raw) {
  const text = String(raw ?? '').trim()
  if (!text) return '—'
  if (
    text.includes('\\b') ||
    text.includes('\\s') ||
    text.includes('(?:') ||
    /caption spam/i.test(text)
  ) {
    return t('admin.banned.sampleReason')
  }
  return text
}

function UnbanConfirmModal({ user, submitting, error, onClose, onConfirm }) {
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">{t('admin.banned.unban')}</h2>
            <p className="mt-1 text-sm text-zinc-500">
              {t('admin.banned.unbanHint')}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-100"
            aria-label={t("admin.close")}
          >
            <IoClose className="text-xl" aria-hidden />
          </button>
        </div>

        <div className="mt-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm text-emerald-100">
          <p>
            {t('admin.banned.unbanAbout')} <strong>{user?.displayName || t("admin.vibelyUser")}</strong> (@
            {user?.username || 'unknown'}).
          </p>
          <p className="mt-2 break-all text-emerald-200/90">Email: {user?.email || t("admin.noEmail")}</p>
          {user?.banReason ? (
            <p className="mt-3 text-emerald-200/90">
              {t('admin.banned.previousReason')}{' '}
              <span className="text-emerald-50">{formatBanReasonDisplay(user.banReason)}</span>
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
            {t("admin.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={submitting}
            className="rounded-xl border border-zinc-800 bg-black px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-emerald-500 hover:bg-emerald-500/10 hover:text-emerald-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? t("admin.banned.processing") : t('admin.banned.unban')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminBannedUsersPage() {
  const { t } = useTranslation()
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
    document.title = t("admin.docTitle.banned")
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
      const data = await adminApi.getAdminBannedUsers(token, { page, size: PAGE_SIZE })
      setUsers(Array.isArray(data?.items) ? data.items : [])
      setTotal(Number(data?.total ?? 0))
      setHasNext(Boolean(data?.hasNext))
    } catch (e) {
      setUsers([])
      setTotal(0)
      setHasNext(false)
      setError(e.message ?? t('admin.banned.loadFailed'))
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
      await adminApi.unbanAdminUser(token, unbanningUser.id)
      setUnbanningUser(null)
      if (users.length === 1 && page > 0) {
        setPage((current) => Math.max(current - 1, 0))
      } else {
        await loadBannedUsers()
      }
    } catch (e) {
      setModalError(e.message ?? t('admin.banned.unbanFailed'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AdminLayout
      active="banned"
      title={t("admin.banned.title")}
      subtitle={t("admin.banned.subtitle")}
    >
      {!authReady || loading ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center text-sm text-zinc-400">
          {t('admin.banned.loading')}
        </section>
      ) : !isAdmin ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center">
          <p className="text-lg font-semibold text-zinc-100">{t('admin.noAccess')}</p>
          <p className="mt-2 text-sm text-zinc-400">
            {t('admin.noAccessHint')}
          </p>
        </section>
      ) : (
        <>
          <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-4">
            <div className="grid gap-3 xl:grid-cols-[minmax(160px,220px)_minmax(320px,1fr)] xl:items-center">
              <div className="min-w-0">
                <p className="text-sm font-bold uppercase tracking-wide text-zinc-200">
                  {t('admin.banned.total', { count: total })}
                </p>
              </div>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-12 w-full rounded-full border border-zinc-700 bg-zinc-950 px-5 text-sm text-zinc-100 outline-none transition placeholder:text-zinc-500 focus:border-red-500"
                placeholder={t("admin.banned.searchPlaceholder")}
              />
            </div>

            {error ? <p className="mt-4 text-sm text-amber-400">{error}</p> : null}

            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[1080px] border-collapse text-left text-sm text-zinc-200">
                <thead>
                  <tr className="border-b border-zinc-800 text-xs text-zinc-500">
                    <th className="py-3 pr-4 font-medium">{t('admin.table.user')}</th>
                    <th className="px-3 py-3 font-medium">Email</th>
                    <th className="px-3 py-3 font-medium">{t('admin.table.banReason')}</th>
                    <th className="px-3 py-3 font-medium">{t('admin.table.bannedAt')}</th>
                    <th className="px-3 py-3 text-right font-medium">{t('admin.table.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((item) => {
                    const avatarSrc = resolveAdminAvatarUrl(item.avatarUrl, item.id)
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
                                {item.displayName || t("admin.vibelyUser")}
                              </p>
                              <p className="mt-0.5 truncate text-xs text-zinc-500">@{item.username || 'unknown'}</p>
                            </div>
                          </div>
                        </td>
                        <td className="max-w-[220px] px-3 py-3 text-zinc-300">
                          <span className="block truncate" title={item.email || undefined}>
                            {item.email || '—'}
                          </span>
                        </td>
                        <td className="max-w-xs px-3 py-3 text-zinc-300">
                          <p className="line-clamp-3 whitespace-pre-wrap text-sm">
                            {formatBanReasonDisplay(item.banReason)}
                          </p>
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
                              {t("admin.banned.unban")}
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
                {t('admin.banned.empty')}
              </div>
            ) : null}

            <AdminPagination
              page={page}
              total={total}
              pageSize={PAGE_SIZE}
              hasNext={hasNext}
              onPageChange={setPage}
            />
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
