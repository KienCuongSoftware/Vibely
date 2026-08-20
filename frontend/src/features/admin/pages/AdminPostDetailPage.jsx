import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from "react-i18next";
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
import { adminApi } from '@/features/admin/api'
import { postApi } from '@/features/post/api'
import { AdminLayout } from '@/features/admin/components/AdminLayout.jsx'
import { useAuth } from '@/features/auth/hooks/useAuth.js'

const STATUS_LABEL_KEYS = {
  RAW: 'admin.status.draft',
  PROCESSING: 'admin.status.processing',
  READY: 'admin.status.published',
  FAILED: 'admin.status.failed',
  REPORTED: 'admin.status.reported',
  HIDDEN: 'admin.status.hidden',
  REMOVED: 'admin.status.removed',
}

function statusLabel(status, t) {
  const key = STATUS_LABEL_KEYS[String(status ?? '').toUpperCase()]
  return key ? t(key) : t('admin.status.unknown')
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

const CU_JOB_STATUS_KEYS = {
  NONE: 'admin.postDetail.cuNone',
  PENDING: 'admin.postDetail.cuPending',
  RUNNING: 'admin.postDetail.cuRunning',
  COMPLETED: 'admin.postDetail.cuCompleted',
  FAILED_RETRYABLE: 'admin.postDetail.cuFailedRetry',
  FAILED_TERMINAL: 'admin.postDetail.cuFailedTerminal',
}

const CU_SOURCE_KEYS = {
  metadata: 'admin.postDetail.srcMetadata',
  ocr: 'admin.postDetail.srcOcr',
  speech: 'admin.postDetail.srcSpeech',
  visual: 'admin.postDetail.srcVisual',
  object: 'admin.postDetail.srcObject',
  scene: 'admin.postDetail.srcScene',
  fusion: 'admin.postDetail.srcFusion',
}

const CU_MODALITY_KEYS = {
  hasContentSha: 'admin.postDetail.modContentId',
  visual: 'admin.postDetail.modVisual',
  speech: 'admin.postDetail.modSpeech',
  audio: 'admin.postDetail.modAudio',
  object: 'admin.postDetail.modObject',
  scene: 'admin.postDetail.modScene',
}

function cuJobStatusLabel(status, t) {
  const key = String(status ?? 'NONE').toUpperCase()
  return t(CU_JOB_STATUS_KEYS[key] || 'admin.postDetail.cuNone')
}

function cuSourceLabel(source, t) {
  const key = String(source ?? '').toLowerCase()
  return t(CU_SOURCE_KEYS[key] || 'admin.postDetail.unknown')
}

function cuModalityLabel(key, t) {
  return t(CU_MODALITY_KEYS[key] || key)
}

function localizeCuReason(reason, t) {
  let text = String(reason ?? '').trim()
  if (!text) return '—'
  text = text.replace(/\bkeyword hit:/gi, t('admin.postDetail.keywordMatch'))
  text = text.replace(/\bhashtag\s+#/gi, t('admin.postDetail.hashtag'))
  text = text.replace(/\byolo scene heuristic\b/gi, t('admin.postDetail.yoloHint'))
  text = text.replace(/\byolo:/gi, 'YOLO:')
  text = text.replace(/\bclip\b/gi, 'CLIP')
  return text
}

function StatusBadge({ status }) {
  const { t } = useTranslation()
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
      {statusLabel(value, t)}
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
  const { t } = useTranslation()
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/60">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">{t('admin.postDetail.confirmDeleteTitle')}</h2>
            <p className="mt-1 text-sm text-zinc-500">{t('admin.postDetail.confirmDeleteHint')}</p>
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
        {error ? <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-xl border border-zinc-800 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
          >
            {t('admin.cancel')}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={busy}
            className="rounded-xl border border-zinc-800 bg-black px-5 py-3 text-sm font-bold text-zinc-100 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {busy ? t("admin.deleting") : t('admin.postDetail.deletePost')}
          </button>
        </div>
      </div>
    </div>
  )
}

export function AdminPostDetailPage() {
  const { t } = useTranslation()
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
  const [cuAnalysis, setCuAnalysis] = useState(null)
  const [cuTags, setCuTags] = useState([])
  const [cuLoading, setCuLoading] = useState(false)
  const [cuError, setCuError] = useState('')
  const [reanalyzeBusy, setReanalyzeBusy] = useState(false)
  const [reanalyzeMsg, setReanalyzeMsg] = useState('')
  const [hlsReprocessBusy, setHlsReprocessBusy] = useState(false)
  const [hlsReprocessMsg, setHlsReprocessMsg] = useState('')

  const title = post?.description || post?.title || t('admin.postDetail.noDescription')
  const playbackUrl = post?.masterPlaylistUrl || post?.videoUrl

  useEffect(() => {
    document.title = t("admin.docTitle.postDetail")
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
      setPost(await adminApi.getAdminPost(token, publicId))
    } catch (e) {
      setPost(null)
      setError(e.message ?? t('admin.postDetail.loadFailed'))
    } finally {
      setLoading(false)
    }
  }, [authReady, isAdmin, publicId, token])

  const loadCu = useCallback(async () => {
    if (!token || !isAdmin || !publicId) return
    setCuLoading(true)
    setCuError('')
    try {
      const [analysis, tags] = await Promise.all([
        postApi.getVideoAnalysis(publicId, token),
        postApi.getVideoSemanticTags(publicId, token),
      ])
      setCuAnalysis(analysis)
      setCuTags(Array.isArray(tags) ? tags : [])
    } catch (e) {
      setCuAnalysis(null)
      setCuTags([])
      setCuError(e.message ?? t('admin.postDetail.understandingFailed'))
    } finally {
      setCuLoading(false)
    }
  }, [isAdmin, publicId, token])

  useEffect(() => {
    void loadPost()
  }, [loadPost])

  useEffect(() => {
    if (post?.publicId) void loadCu()
  }, [loadCu, post?.publicId])

  const stats = useMemo(
    () => [
      { icon: IoEyeOutline, label: t('admin.postDetail.views'), value: post?.viewCount },
      { icon: IoHeartOutline, label: t('admin.postDetail.likes'), value: post?.likeCount },
      { icon: IoChatbubbleOutline, label: t('admin.postDetail.comments'), value: post?.commentCount },
      { icon: IoBookmarkOutline, label: t('admin.postDetail.saves'), value: post?.bookmarkCount },
      { icon: IoShareSocialOutline, label: t('admin.postDetail.shares'), value: post?.shareCount },
    ],
    [post, t],
  )

  const handleDelete = async () => {
    if (!post?.publicId) return
    setDeleteBusy(true)
    setDeleteError('')
    try {
      await adminApi.deleteAdminPost(token, post.publicId)
      navigate('/admin/posts', { replace: true })
    } catch (e) {
      setDeleteError(e.message ?? t('admin.postDetail.deleteFailed'))
    } finally {
      setDeleteBusy(false)
    }
  }

  const handleReanalyze = async () => {
    if (!post?.publicId) return
    setReanalyzeBusy(true)
    setReanalyzeMsg('')
    try {
      const result = await adminApi.adminCuReanalyze(token, {
        publicId: post.publicId,
        force: true,
      })
      setReanalyzeMsg(
        result?.jobIds?.[0]
          ? t('admin.postDetail.reanalyzeQueuedJob', { id: result.jobIds[0] })
          : t('admin.postDetail.reanalyzeQueued'),
      )
      await loadCu()
    } catch (e) {
      setReanalyzeMsg(e.message ?? t('admin.postDetail.reanalyzeFailed'))
    } finally {
      setReanalyzeBusy(false)
    }
  }

  const handleReprocessHls = async () => {
    if (!post?.publicId) return
    setHlsReprocessBusy(true)
    setHlsReprocessMsg('')
    try {
      const result = await adminApi.adminReprocessVideoHls(token, [post.publicId])
      const n = Number(result?.queued ?? 0)
      setHlsReprocessMsg(
        n > 0
          ? t('admin.postDetail.reencodeQueued')
          : result?.skippedDetails?.[0] || t('admin.postDetail.queueFailed'),
      )
      await loadPost()
    } catch (e) {
      setHlsReprocessMsg(e.message ?? t('admin.postDetail.reencodeFailed'))
    } finally {
      setHlsReprocessBusy(false)
    }
  }

  return (
    <AdminLayout
      active="posts"
      title={t("admin.postDetail.title")}
      subtitle={t("admin.postDetail.subtitle")}
    >
      {!authReady || loading ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center text-sm text-zinc-400">
          {t('admin.postDetail.loading')}
        </section>
      ) : !isAdmin ? (
        <section className="rounded-xl border border-zinc-800 bg-zinc-900/70 px-4 py-16 text-center">
          <p className="text-lg font-semibold text-zinc-100">{t('admin.noAccess')}</p>
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
              {t('admin.postDetail.backToList')}
            </Link>
            <button
              type="button"
              onClick={() => setDeleteOpen(true)}
              className="inline-flex items-center gap-2 rounded-full border border-zinc-800 bg-zinc-950 px-4 py-2 text-sm font-semibold text-zinc-200 transition hover:border-red-500 hover:bg-red-500/10 hover:text-red-200"
            >
              <IoTrash aria-hidden />
              {t('admin.postDetail.deletePost')}
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
                    {t('admin.postDetail.noVideoFile')}
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-4">
              <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('admin.postDetail.content')}</p>
                    <h2 className="mt-2 line-clamp-4 text-lg font-bold text-zinc-100">{title}</h2>
                  </div>
                  <StatusBadge status={post.status} />
                </div>
                <dl className="mt-4 space-y-3 text-sm">
                  <div>
                    <dt className="text-zinc-500">{t('admin.postDetail.postId')}</dt>
                    <dd className="mt-1 break-all text-zinc-200">{post.publicId}</dd>
                  </div>
                  <div>
                    <dt className="text-zinc-500">{t('admin.postDetail.createdAt')}</dt>
                    <dd className="mt-1 text-zinc-200">{formatDateTime(post.createdAt)}</dd>
                  </div>
                </dl>
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">{t('admin.postDetail.author')}</p>
                <p className="mt-2 font-bold text-zinc-100">{post.authorDisplayName || t("admin.vibelyUser")}</p>
                <p className="mt-1 text-sm text-zinc-500">@{post.authorUsername || 'unknown'}</p>
                <p className="mt-1 text-sm text-zinc-400">{post.authorEmail || t("admin.noEmail")}</p>
              </section>
            </aside>
          </section>

          <section className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {stats.map((item) => (
              <StatCard key={item.label} icon={item.icon} label={item.label} value={item.value} />
            ))}
          </section>

          <section className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {t('admin.postDetail.understandingTitle')}
                </p>
                <p className="mt-1 text-sm text-zinc-400">
                  {t('admin.postDetail.understandingHint')}{' '}
                  <span className="font-semibold text-zinc-200">
                    {cuLoading
                      ? '…'
                      : cuJobStatusLabel(cuAnalysis?.jobStatus ?? 'NONE', t)}
                  </span>
                  {cuAnalysis?.featureVersion
                    ? t('admin.postDetail.version', { version: cuAnalysis.featureVersion })
                    : null}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleReanalyze}
                  disabled={reanalyzeBusy || cuLoading}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-emerald-500/50 hover:bg-emerald-500/10 disabled:opacity-50"
                >
                  {reanalyzeBusy ? t("admin.postDetail.reanalyzing") : t('admin.postDetail.reanalyze')}
                </button>
                <button
                  type="button"
                  onClick={() => void handleReprocessHls()}
                  disabled={hlsReprocessBusy}
                  className="rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-semibold text-zinc-100 transition hover:border-sky-500/50 hover:bg-sky-500/10 disabled:opacity-50"
                >
                  {hlsReprocessBusy ? t("admin.postDetail.queuing") : t('admin.postDetail.reencodeHls')}
                </button>
              </div>
            </div>
            {reanalyzeMsg ? (
              <p className="mt-2 text-sm text-zinc-400">{reanalyzeMsg}</p>
            ) : null}
            {hlsReprocessMsg ? (
              <p className="mt-2 text-sm text-zinc-400">{hlsReprocessMsg}</p>
            ) : null}
            {cuError ? (
              <p className="mt-3 text-sm text-amber-400">{cuError}</p>
            ) : null}
            {cuLoading ? (
              <p className="mt-3 text-sm text-zinc-500">{t('admin.postDetail.loadingLabels')}</p>
            ) : cuTags.length === 0 ? (
              <p className="mt-3 text-sm text-zinc-500">{t('admin.postDetail.noLabels')}</p>
            ) : (
              <ul className="mt-4 divide-y divide-zinc-800/80">
                {cuTags.map((tag) => (
                  <li key={`${tag.slug}-${tag.source}`} className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2.5 py-0.5 text-xs font-semibold text-zinc-100">
                        {tag.slug}
                      </span>
                      <span className="text-xs text-zinc-500">
                        {(Number(tag.confidence) * 100).toFixed(0)}% · {cuSourceLabel(tag.source, t)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-zinc-300">
                      {localizeCuReason(tag.reason, t) || tag.name || '—'}
                    </p>
                  </li>
                ))}
              </ul>
            )}
            {cuAnalysis?.modalityNotes ? (
              <div className="mt-4 flex flex-wrap gap-2 text-[11px] text-zinc-500">
                {Object.entries(cuAnalysis.modalityNotes)
                  .filter(([, v]) => typeof v === 'boolean')
                  .map(([k, v]) => (
                    <span
                      key={k}
                      className={`rounded-md border px-2 py-1 ${
                        v
                          ? 'border-emerald-500/30 text-emerald-300'
                          : 'border-zinc-800 text-zinc-600'
                      }`}
                    >
                      {cuModalityLabel(k, t)}: {v ? t('admin.postDetail.yes') : t('admin.postDetail.no')}
                    </span>
                  ))}
              </div>
            ) : null}
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
