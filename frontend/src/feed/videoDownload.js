import { resolveApiBaseUrl } from '../config/apiBase.js'
import { isCookieSession } from '../auth/session.js'

function readCsrfToken() {
  if (typeof document === 'undefined') return null
  const match = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/)
  return match ? decodeURIComponent(match[1]) : null
}

/**
 * @param {string} publicId
 * @param {string} username
 * @param {{ token?: string }} [options]
 */
export async function downloadWatermarkedVideo(publicId, username, { token } = {}) {
  const id = String(publicId ?? '').trim()
  if (!id) {
    throw new Error('Không có video để tải.')
  }
  const headers = {}
  if (token && !isCookieSession(token)) {
    headers.Authorization = `Bearer ${token}`
  }
  const csrf = readCsrfToken()
  if (csrf) {
    headers['X-XSRF-TOKEN'] = csrf
  }
  const response = await fetch(`${resolveApiBaseUrl()}/api/videos/${encodeURIComponent(id)}/download`, {
    method: 'GET',
    credentials: 'include',
    headers,
  })
  if (!response.ok) {
    let message = `Tải video thất bại (mã ${response.status})`
    try {
      const payload = await response.json()
      if (payload?.error?.message) message = payload.error.message
      else if (payload?.message) message = payload.message
    } catch {
      /* binary error body */
    }
    throw new Error(message)
  }
  const blob = await response.blob()
  const handle = String(username ?? 'vibely')
    .trim()
    .replace(/^@+/, '')
  const filename = `vibely-${handle || 'video'}-${id.slice(0, 8)}.mp4`
  const objectUrl = URL.createObjectURL(blob)
  try {
    const anchor = document.createElement('a')
    anchor.href = objectUrl
    anchor.download = filename
    anchor.rel = 'noopener'
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}
