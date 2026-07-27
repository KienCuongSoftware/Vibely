const CANONICAL_HOST = 'www.vibely.sbs'

/**
 * Force production traffic onto www so auth cookies and OAuth callbacks share one host.
 * Skip localhost / preview tunnels.
 */
export function redirectToCanonicalHost() {
  if (typeof window === 'undefined') return false
  const { hostname, protocol, pathname, search, hash } = window.location
  if (!hostname) return false
  if (hostname === 'localhost' || hostname === '127.0.0.1') return false
  if (hostname.endsWith('.localhost')) return false
  if (hostname.includes('ngrok') || hostname.includes('trycloudflare') || hostname.includes('loca.lt')) {
    return false
  }
  if (hostname !== 'vibely.sbs') return false

  const next = `${protocol}//${CANONICAL_HOST}${pathname}${search}${hash}`
  window.location.replace(next)
  return true
}
