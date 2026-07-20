export const SITE_NAME = 'Vibely'
export const DEFAULT_SITE_ORIGIN = 'https://vibely.sbs'
/** Short brand + tagline (TikTok-style: "TikTok - Make Your Day"). */
export const DEFAULT_TITLE = 'Vibely - Make Your Vibe'
/** Starts with brand name so Google/Messenger snippets bold it like TikTok. */
export const DEFAULT_DESCRIPTION =
  'Vibely - nơi khởi đầu các vibe. Trên thiết bị hoặc trên web, người xem có thể xem và khám phá hàng triệu video ngắn dành riêng cho mình.'
export const DEFAULT_KEYWORDS =
  'Vibely, video ngắn, mạng xã hội video, chia sẻ video, video thịnh hành, creator Việt Nam, cộng đồng giải trí'
/** Branded Open Graph / Twitter share card (16:9). Avoid default avatar — crawlers show a tiny silhouette. */
export const DEFAULT_OG_IMAGE = '/images/og-share.png'
export const DEFAULT_OG_IMAGE_WIDTH = 1920
export const DEFAULT_OG_IMAGE_HEIGHT = 1080
export const DEFAULT_OG_IMAGE_ALT = 'Vibely'

export function getSiteOrigin() {
  const configured = String(import.meta.env.VITE_PUBLIC_APP_URL ?? '').trim().replace(/\/$/, '')
  if (configured) return configured
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return DEFAULT_SITE_ORIGIN
}

export function absoluteUrl(pathOrUrl) {
  const raw = String(pathOrUrl ?? '').trim()
  if (!raw) return ''
  if (/^https?:\/\//i.test(raw)) return raw
  const path = raw.startsWith('/') ? raw : `/${raw}`
  return `${getSiteOrigin()}${path}`
}

export function canonicalUrl(pathOrUrl) {
  const raw = String(pathOrUrl ?? '').trim()
  if (!raw && typeof window !== 'undefined') {
    return absoluteUrl(`${window.location.pathname}${window.location.search}`)
  }
  return absoluteUrl(raw || '/')
}

export function cleanText(value, fallback = '') {
  return String(value ?? fallback).replace(/\s+/g, ' ').trim()
}

export function truncateText(value, max = 160) {
  const text = cleanText(value)
  if (text.length <= max) return text
  return `${text.slice(0, Math.max(0, max - 1)).trim()}…`
}
