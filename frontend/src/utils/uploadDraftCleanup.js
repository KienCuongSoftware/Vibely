import { isCookieSession } from '../auth/session.js'
import { buildApiUrl } from '../config/apiBase.js'

export const UPLOAD_DRAFT_STORAGE_KEY = 'vibely-studio-upload-drafts'

function readCsrfToken() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

export function readUploadDraftPublicIds() {
  try {
    const raw = sessionStorage.getItem(UPLOAD_DRAFT_STORAGE_KEY)
    const parsed = JSON.parse(raw || '[]')
    if (!Array.isArray(parsed)) return []
    return [...new Set(parsed.map((id) => String(id || '').trim()).filter(Boolean))]
  } catch {
    return []
  }
}

export function trackUploadDraftPublicId(publicId) {
  const id = String(publicId || '').trim()
  if (!id || typeof sessionStorage === 'undefined') return
  const next = readUploadDraftPublicIds()
  if (!next.includes(id)) next.push(id)
  sessionStorage.setItem(UPLOAD_DRAFT_STORAGE_KEY, JSON.stringify(next))
}

export function untrackUploadDraftPublicId(publicId) {
  const id = String(publicId || '').trim()
  if (!id || typeof sessionStorage === 'undefined') return
  const next = readUploadDraftPublicIds().filter((x) => x !== id)
  if (next.length === 0) sessionStorage.removeItem(UPLOAD_DRAFT_STORAGE_KEY)
  else sessionStorage.setItem(UPLOAD_DRAFT_STORAGE_KEY, JSON.stringify(next))
}

export function clearAllUploadDraftPublicIds() {
  if (typeof sessionStorage === 'undefined') return
  sessionStorage.removeItem(UPLOAD_DRAFT_STORAGE_KEY)
}

/** Best-effort DELETE that survives tab close / reload. */
export function deleteUploadDraftKeepalive(publicId, token) {
  const id = String(publicId || '').trim()
  if (!id || typeof fetch === 'undefined') return
  const headers = { 'Content-Type': 'application/json' }
  if (token && !isCookieSession(token)) {
    headers.Authorization = `Bearer ${token}`
  }
  const csrf = readCsrfToken()
  if (csrf) headers['X-XSRF-TOKEN'] = csrf
  try {
    void fetch(buildApiUrl(`/api/videos/${encodeURIComponent(id)}`), {
      method: 'DELETE',
      headers,
      credentials: 'include',
      keepalive: true,
    })
  } catch {
    // ignore
  }
}
