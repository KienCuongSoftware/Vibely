import { getAppOrigin } from '../config/appOrigin.js'
import {
  buildVideoEmbedUrl,
  normalizeVideoPublicId,
} from './videoPublicId.js'

/** Path hoặc URL đầy đủ → URL tuyệt đối với origin chia sẻ. */
export function buildAbsoluteUrl(pathOrUrl) {
  const raw = String(pathOrUrl ?? '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  const path = raw.startsWith('/') ? raw : `/${raw}`
  const origin = getAppOrigin()
  if (!origin) return path
  return `${origin.replace(/\/$/, '')}${path}`
}

/** Link chia sẻ công khai — crawler đọc OG meta tại /share/video/{id}. */
export function buildSharePreviewPath(publicId) {
  const id = normalizeVideoPublicId(publicId)
  if (!id) return ''
  return `/share/video/${id}`
}

/** Link xem video để chia sẻ (preview OG + redirect tới trang xem). */
export function buildShareableVideoUrl(publicId) {
  const path = buildSharePreviewPath(publicId)
  if (!path) return ''
  return buildAbsoluteUrl(path)
}

export function buildShareableEmbedUrl(publicId) {
  const url = buildVideoEmbedUrl(publicId)
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return buildAbsoluteUrl(url)
}

/** URL trang hiện tại (pathname + search) với origin chia sẻ. */
export function buildCurrentPageShareUrl() {
  if (typeof window === 'undefined') return ''
  const path = `${window.location.pathname}${window.location.search}`
  return buildAbsoluteUrl(path)
}
