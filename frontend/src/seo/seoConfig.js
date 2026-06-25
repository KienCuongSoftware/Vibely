export const SITE_NAME = 'Vibely'
export const DEFAULT_SITE_ORIGIN = 'https://vibely.sbs'
export const DEFAULT_TITLE = 'Vibely - Nền tảng chia sẻ video ngắn'
export const DEFAULT_DESCRIPTION =
  'Vibely là nền tảng mạng xã hội chia sẻ video ngắn được xây dựng bằng React và Spring Boot.'
export const DEFAULT_KEYWORDS =
  'Vibely, video ngắn, mạng xã hội video, chia sẻ video, nền tảng video ngắn'
export const DEFAULT_OG_IMAGE = '/images/users/default-avatar.jpeg'

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
