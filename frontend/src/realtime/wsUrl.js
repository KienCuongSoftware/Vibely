import { isCookieSession } from '../auth/session.js'

export function resolveWsUrl(token) {
  if (typeof window !== 'undefined') {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    const base = `${protocol}//${window.location.host}`
    if (token && !isCookieSession(token)) {
      return `${base}/ws?token=${encodeURIComponent(token)}`
    }
    return `${base}/ws`
  }
  return '/ws'
}
