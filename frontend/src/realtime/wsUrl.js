function resolveWsOrigin() {
  if (typeof window === 'undefined') return null
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
  return `${protocol}//${window.location.host}`
}

/** Same-origin WebSocket; auth via httpOnly cookies (never JWT in query string). */
export function resolveWsUrl(_token) {
  const base = resolveWsOrigin()
  if (!base) return '/ws'
  return `${base}/ws`
}
