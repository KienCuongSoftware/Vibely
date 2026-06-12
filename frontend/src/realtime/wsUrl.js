import { isCookieSession } from '../auth/session.js'

function resolveWsOrigin() {
  if (typeof window === 'undefined') return null
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

export function resolveWsUrl(token) {
  const base = resolveWsOrigin()
  if (!base) return '/ws'
  if (token && !isCookieSession(token)) {
    return `${base}/ws?token=${encodeURIComponent(token)}`
  }
  return `${base}/ws`
}
