export const SITE_NAME = 'Vibely'
export const DEFAULT_SITE_ORIGIN = 'https://vibely.sbs'
/** Same pattern as TikTok ("TikTok - Make Your Day") — keep English tagline. */
export const DEFAULT_TITLE = 'Vibely - Make Your Day'
/**
 * TikTok EN: "TikTok - trends start here. On a device or on the web, viewers can
 * watch and discover millions of personalized short videos. Download the app to get started."
 * → Vietnamese + Vibely brand.
 */
export const DEFAULT_DESCRIPTION =
  'Vibely - xu hướng bắt đầu tại đây. Trên thiết bị hoặc trên web, người xem có thể xem và khám phá hàng triệu video ngắn được cá nhân hóa. Tải ứng dụng để bắt đầu.'
export const DEFAULT_KEYWORDS =
  'Vibely, video ngắn, mạng xã hội video, chia sẻ video, video thịnh hành, creator Việt Nam, cộng đồng giải trí'
/** Brand mark for Open Graph / Twitter (existing 512px icon — nốt nhạc cyan/đỏ). */
export const DEFAULT_OG_IMAGE = '/favicon-512x512.png'
export const DEFAULT_OG_IMAGE_WIDTH = 512
export const DEFAULT_OG_IMAGE_HEIGHT = 512
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
