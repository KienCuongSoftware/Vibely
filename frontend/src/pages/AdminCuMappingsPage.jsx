import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { IoAdd, IoClose, IoPencil, IoRefresh, IoTrash } from 'react-icons/io5'
import { apiClient } from '../api/client.js'
import { AdminLayout } from '../components/AdminLayout.jsx'
import { useAuth } from '../state/useAuth.js'

function MappingModal({ mode, initial, categories, tags, submitting, error, onClose, onSubmit }) {
  const [categoryId, setCategoryId] = useState(String(initial?.categoryId ?? categories[0]?.id ?? ''))
  const [tagId, setTagId] = useState(String(initial?.tagId ?? tags[0]?.id ?? ''))
  const [weight, setWeight] = useState(String(initial?.weight ?? 1))
  const [priority, setPriority] = useState(String(initial?.priority ?? 100))
  const [minTagConfidence, setMinTagConfidence] = useState(String(initial?.minTagConfidence ?? 0.4))

  const canSubmit = categoryId && tagId && !submitting

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4 py-6">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!canSubmit) return
          onSubmit({
            categoryId: Number(categoryId),
            tagId: Number(tagId),
            weight: Number(weight),
            priority: Number(priority),
            minTagConfidence: Number(minTagConfidence),
            rule: 'weighted_sum',
          })
        }}
        className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/60"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-zinc-100">
              {mode === 'edit' ? 'Sửa mapping' : 'Thêm mapping'}
            </h2>
            <p className="mt-1 text-sm text-zinc-500">
              Tag ngữ nghĩa → category Explore (không cần retrain model).
            </p>
          </div>
          <button type="button" onClick={onClose} className="rounded-full p-2 text-zinc-500 hover:bg-zinc-900">
            <IoClose className="text-xl" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <label className="block text-sm text-zinc-400">
            Category
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2.5 text-zinc-100"
            >
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.slug})
                </option>
              ))}
            </select>
          </label>
          <label className="block text-sm text-zinc-400">
            Semantic tag
            <select
              value={tagId}
              onChange={(e) => setTagId(e.target.value)}
              className="mt-1 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2.5 text-zinc-100"
            >
              {tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name} ({t.slug})
                </option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-3 gap-3">
            <label className="block text-sm text-zinc-400">
              Weight
              <input
                type="number"
                step="0.05"
                min="0.01"
                max="10"
                value={weight}
                onChange={(e) => setWeight(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2.5 text-zinc-100"
              />
            </label>
            <label className="block text-sm text-zinc-400">
              Priority
              <input
                type="number"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2.5 text-zinc-100"
              />
            </label>
            <label className="block text-sm text-zinc-400">
              Min conf
              <input
                type="number"
                step="0.05"
                min="0"
                max="1"
                value={minTagConfidence}
                onChange={(e) => setMinTagConfidence(e.target.value)}
                className="mt-1 w-full rounded-xl border border-zinc-800 bg-black px-3 py-2.5 text-zinc-100"
              />
            </label>
          </div>
        </div>

        {error ? <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}

        <div className="mt-6 flex justify-end gap-2">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-zinc-800 px-5 py-2.5 text-sm text-zinc-300 hover:bg-zinc-900"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={!canSubmit}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          >
            {submitting ? 'Đang lưu...' : 'Lưu'}
          </button>
        </div>
      </form>
    </div>
  )
}

export function AdminCuMappingsPage() {
  const { token, user, authReady } = useAuth()
  const isAdmin = String(user?.role ?? '').toUpperCase() === 'ADMIN'
  const [mappings, setMappings] = useState([])
  const [categories, setCategories] = useState([])
  const [tags, setTags] = useState([])
  const [jobs, setJobs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [modalError, setModalError] = useState('')
  const [backfillLimit, setBackfillLimit] = useState('50')
  const [reanalyzePublicId, setReanalyzePublicId] = useState('')

  const load = useCallback(async () => {
    if (!token || !isAdmin) return
    setLoading(true)
    setError('')
    try {
      const [m, c, t, j] = await Promise.all([
        apiClient.getAdminCuMappings(token),
        apiClient.getAdminCuCategories(token),
        apiClient.getAdminCuSemanticTags(token),
        apiClient.getAdminCuJobs(token, { page: 0, size: 10 }),
      ])
      setMappings(Array.isArray(m) ? m : m?.items ?? [])
      setCategories(Array.isArray(c) ? c : [])
      setTags(Array.isArray(t) ? t : [])
      setJobs(Array.isArray(j?.items) ? j.items : [])
    } catch (err) {
      setError(err?.message || 'Không tải được dữ liệu CU')
    } finally {
      setLoading(false)
    }
  }, [token, isAdmin])

  useEffect(() => {
    if (authReady) load()
  }, [authReady, load])

  const sortedMappings = useMemo(
    () => [...mappings].sort((a, b) => (a.priority ?? 0) - (b.priority ?? 0)),
    [mappings]
  )

  const handleSave = async (payload) => {
    setSubmitting(true)
    setModalError('')
    try {
      if (modal?.mode === 'edit') {
        await apiClient.updateAdminCuMapping(token, modal.row.id, payload)
      } else {
        await apiClient.createAdminCuMapping(token, payload)
      }
      setModal(null)
      setNotice('Đã lưu mapping')
      await load()
    } catch (err) {
      setModalError(err?.message || 'Lưu thất bại')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (row) => {
    if (!window.confirm(`Xóa mapping ${row.tagSlug} → ${row.categorySlug}?`)) return
    try {
      await apiClient.deleteAdminCuMapping(token, row.id)
      setNotice('Đã xóa mapping')
      await load()
    } catch (err) {
      setError(err?.message || 'Xóa thất bại')
    }
  }

  const handleBackfill = async () => {
    setNotice('')
    setError('')
    try {
      const res = await apiClient.adminCuBackfill(token, {
        limit: Number(backfillLimit) || 50,
        onlyMissing: true,
        force: false,
        priority: 50,
      })
      setNotice(`Backfill: enqueue ${res?.enqueued ?? 0} job(s)`)
      await load()
    } catch (err) {
      setError(err?.message || 'Backfill thất bại')
    }
  }

  const handleReanalyze = async () => {
    const publicId = reanalyzePublicId.trim()
    if (!publicId) return
    setNotice('')
    setError('')
    try {
      const res = await apiClient.adminCuReanalyze(token, { publicId, force: true, priority: 200 })
      setNotice(`Reanalyze: job ${res?.jobIds?.[0] || 'ok'}`)
      setReanalyzePublicId('')
      await load()
    } catch (err) {
      setError(err?.message || 'Reanalyze thất bại')
    }
  }

  if (!authReady) return null
  if (!isAdmin) {
    return (
      <AdminLayout active="cu-mappings">
        <p className="p-6 text-zinc-400">Bạn không có quyền admin.</p>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout active="cu-mappings">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-black text-zinc-100">Content Understanding</h1>
            <p className="mt-1 text-sm text-zinc-500">
              Category ↔ Tag mapping, backfill / reanalyze jobs (Phase 3).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setModal({ mode: 'create' })}
            className="inline-flex items-center gap-2 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-bold text-white"
          >
            <IoAdd /> Thêm mapping
          </button>
        </div>

        {notice ? <p className="mt-4 rounded-xl bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">{notice}</p> : null}
        {error ? <p className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-300">{error}</p> : null}

        <section className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 p-4">
          <h2 className="text-sm font-semibold text-zinc-200">Backfill / Reanalyze</h2>
          <div className="mt-3 flex flex-wrap items-end gap-3">
            <label className="text-xs text-zinc-500">
              Limit
              <input
                value={backfillLimit}
                onChange={(e) => setBackfillLimit(e.target.value)}
                className="ml-2 w-20 rounded-lg border border-zinc-800 bg-black px-2 py-1.5 text-sm text-zinc-100"
              />
            </label>
            <button
              type="button"
              onClick={handleBackfill}
              className="inline-flex items-center gap-2 rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              <IoRefresh /> Backfill thiếu job
            </button>
            <label className="text-xs text-zinc-500">
              publicId
              <input
                value={reanalyzePublicId}
                onChange={(e) => setReanalyzePublicId(e.target.value)}
                placeholder="uuid video"
                className="ml-2 w-64 rounded-lg border border-zinc-800 bg-black px-2 py-1.5 text-sm text-zinc-100"
              />
            </label>
            <button
              type="button"
              onClick={handleReanalyze}
              className="rounded-xl border border-zinc-700 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-900"
            >
              Reanalyze 1 video
            </button>
          </div>
        </section>

        <section className="mt-6 overflow-x-auto rounded-2xl border border-zinc-800">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Tag</th>
                <th className="px-4 py-3">Weight</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Min conf</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-zinc-500">
                    Đang tải...
                  </td>
                </tr>
              ) : sortedMappings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-zinc-500">
                    Chưa có mapping
                  </td>
                </tr>
              ) : (
                sortedMappings.map((row) => (
                  <tr key={row.id} className="border-t border-zinc-900 text-zinc-200">
                    <td className="px-4 py-3">
                      {row.categoryName}
                      <span className="ml-1 text-zinc-500">({row.categorySlug})</span>
                    </td>
                    <td className="px-4 py-3">
                      {row.tagName}
                      <span className="ml-1 text-zinc-500">({row.tagSlug})</span>
                    </td>
                    <td className="px-4 py-3">{row.weight}</td>
                    <td className="px-4 py-3">{row.priority}</td>
                    <td className="px-4 py-3">{row.minTagConfidence}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => setModal({ mode: 'edit', row })}
                        className="mr-2 rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-zinc-100"
                        aria-label="Sửa"
                      >
                        <IoPencil />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(row)}
                        className="rounded-lg p-2 text-zinc-400 hover:bg-zinc-900 hover:text-red-400"
                        aria-label="Xóa"
                      >
                        <IoTrash />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </section>

        <section className="mt-6">
          <h2 className="mb-2 text-sm font-semibold text-zinc-300">Jobs gần đây</h2>
          <div className="overflow-x-auto rounded-2xl border border-zinc-800">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-900/80 text-xs uppercase text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Video</th>
                  <th className="px-4 py-3">Trigger</th>
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">Created</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-t border-zinc-900 text-zinc-300">
                    <td className="px-4 py-2 font-mono text-xs">{j.status}</td>
                    <td className="px-4 py-2 font-mono text-xs">{j.videoPublicId || j.videoId}</td>
                    <td className="px-4 py-2">{j.triggerReason}</td>
                    <td className="px-4 py-2">{j.attempts}</td>
                    <td className="px-4 py-2 text-xs text-zinc-500">{j.createdAt}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {modal ? (
        <MappingModal
          mode={modal.mode}
          initial={modal.row}
          categories={categories}
          tags={tags}
          submitting={submitting}
          error={modalError}
          onClose={() => setModal(null)}
          onSubmit={handleSave}
        />
      ) : null}
    </AdminLayout>
  )
}
