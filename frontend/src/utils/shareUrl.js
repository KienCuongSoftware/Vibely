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

/**
 * Nguồn client sinh link (`source`).
 * Web hiện tại luôn `web`; Flutter sau này truyền `android` / `ios`.
 */
export function resolveShareSource(options = {}) {
  const raw = String(options.source ?? '').trim().toLowerCase()
  if (raw === 'web' || raw === 'android' || raw === 'ios') return raw
  return 'web'
}

/**
 * Loại thiết bị (`device`): `pc` | `mobile`.
 */
export function resolveShareDevice(
  nav = typeof navigator !== 'undefined' ? navigator : null,
  options = {},
) {
  const override = String(options.device ?? '').trim().toLowerCase()
  if (override === 'pc' || override === 'mobile') return override
  if (!nav) return 'pc'
  if (nav.userAgentData && typeof nav.userAgentData.mobile === 'boolean') {
    return nav.userAgentData.mobile ? 'mobile' : 'pc'
  }
  const ua = String(nav.userAgent || '')
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(ua)) {
    return 'mobile'
  }
  return 'pc'
}

/** @deprecated Dùng resolveShareDevice */
export function resolveShareSenderDevice(nav) {
  return resolveShareDevice(nav)
}

const SHARE_METHOD_ALIASES = {
  copy: 'copy_link',
  copy_link: 'copy_link',
  facebook: 'facebook',
  messenger: 'messenger',
  whatsapp: 'whatsapp',
  telegram: 'telegram',
  twitter: 'x',
  x: 'x',
  email: 'email',
  linkedin: 'linkedin',
  reddit: 'reddit',
  line: 'line',
  pinterest: 'pinterest',
  embed: 'embed',
  direct: 'direct',
}

/** Chuẩn hóa `share_method` cho analytics. */
export function normalizeShareMethod(method) {
  const key = String(method ?? '')
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, '_')
  if (!key) return ''
  return SHARE_METHOD_ALIASES[key] || key
}

/**
 * Query tracking: source + device (+ share_method nếu có).
 * Ví dụ: source=web&device=pc&share_method=copy_link
 */
export function buildShareTrackingParams(options = {}) {
  const source = resolveShareSource(options)
  const device = resolveShareDevice(
    typeof navigator !== 'undefined' ? navigator : null,
    options,
  )
  const params = new URLSearchParams({ source, device })
  const shareMethod = normalizeShareMethod(options.shareMethod ?? options.share_method)
  if (shareMethod) params.set('share_method', shareMethod)
  return params
}

/** Gắn query tracking vào URL tuyệt đối (giữ path/query cũ nếu có). */
export function appendShareTracking(url, options = {}) {
  const base = String(url ?? '').trim()
  if (!base) return ''
  const tracking = buildShareTrackingParams(options)
  try {
    const absolute = /^https?:\/\//i.test(base)
      ? new URL(base)
      : new URL(base, 'https://vibely.local')
    for (const [key, value] of tracking.entries()) {
      absolute.searchParams.set(key, value)
    }
    if (/^https?:\/\//i.test(base)) return absolute.toString()
    return `${absolute.pathname}${absolute.search}${absolute.hash}`
  } catch {
    const joiner = base.includes('?') ? '&' : '?'
    return `${base}${joiner}${tracking.toString()}`
  }
}

/**
 * Link xem video để chia sẻ (preview OG + redirect tới trang xem).
 * @param {unknown} publicId
 * @param {string|object} [usernameOrOptions]
 * @param {object} [maybeOptions]
 */
export function buildShareableVideoUrl(publicId, usernameOrOptions, maybeOptions) {
  const path = buildSharePreviewPath(publicId)
  if (!path) return ''
  const options =
    usernameOrOptions &&
    typeof usernameOrOptions === 'object' &&
    !Array.isArray(usernameOrOptions)
      ? usernameOrOptions
      : maybeOptions && typeof maybeOptions === 'object'
        ? maybeOptions
        : {}
  return appendShareTracking(buildAbsoluteUrl(path), options)
}

export function buildShareableEmbedUrl(publicId) {
  const url = buildVideoEmbedUrl(publicId)
  if (!url) return ''
  if (/^https?:\/\//i.test(url)) return url
  return buildAbsoluteUrl(url)
}

/** Normalize Vibely username for profile share links. */
export function normalizeShareUsername(username) {
  const raw = String(username ?? '')
    .trim()
    .replace(/^@+/, '')
  if (!raw) return ''
  return raw
}

/**
 * Public profile share URL.
 * Ví dụ: https://vibely.sbs/@user?source=web&device=pc&share_method=copy_link
 */
export function buildShareableProfileUrl(username, options = {}) {
  const handle = normalizeShareUsername(username)
  if (!handle) return ''
  const path = `/@${encodeURIComponent(handle)}`
  return appendShareTracking(buildAbsoluteUrl(path), options)
}

/** Standalone embed page for iframe embeds. */
export function buildShareableProfileEmbedUrl(username) {
  const handle = normalizeShareUsername(username)
  if (!handle) return ''
  return buildAbsoluteUrl(`/embed/profile/${encodeURIComponent(handle)}`)
}

/** HTML snippet shown in the profile embed modal. */
export function buildProfileEmbedSnippet(username) {
  const handle = normalizeShareUsername(username)
  if (!handle) return ''
  const profileUrl = buildAbsoluteUrl(`/@${encodeURIComponent(handle)}`)
  const embedUrl = buildShareableProfileEmbedUrl(handle)
  return [
    `<blockquote class="vibely-embed" cite="${profileUrl}" data-unique-id="${handle}" data-embed-type="creator" style="max-width:780px;min-width:288px;">`,
    ` <section>`,
    ` <a target="_blank" title="@${handle}" href="${profileUrl}">@${handle}</a>`,
    ` </section>`,
    `</blockquote>`,
    `<iframe src="${embedUrl}" width="780" height="500" style="max-width:100%;border:0;border-radius:12px;overflow:hidden;" allowfullscreen loading="lazy" title="Vibely @${handle}"></iframe>`,
  ].join('')
}

/** URL trang hiện tại (pathname + search) với origin chia sẻ. */
export function buildCurrentPageShareUrl() {
  if (typeof window === 'undefined') return ''
  const path = `${window.location.pathname}${window.location.search}`
  return buildAbsoluteUrl(path)
}
