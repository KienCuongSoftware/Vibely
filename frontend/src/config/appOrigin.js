/**
 * Origin công khai của app (production, ngrok, Cloudflare Tunnel, preview deploy).
 * Dev: đặt VITE_PUBLIC_APP_URL=https://xxx.trycloudflare.com khi tunnel cổng 8001/5173.
 */
export function getConfiguredPublicAppOrigin() {
  const raw = import.meta.env.VITE_PUBLIC_APP_URL
  const trimmed = String(raw ?? '').trim().replace(/\/$/, '')
  return trimmed || ''
}

/** Origin dùng khi tạo link chia sẻ — ưu tiên VITE_PUBLIC_APP_URL, không thì window.origin. */
export function getAppOrigin() {
  const configured = getConfiguredPublicAppOrigin()
  if (configured) return configured
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  return ''
}

export function isNgrokOrigin(origin) {
  return /ngrok(-free)?\.(app|dev)/i.test(String(origin ?? ''))
}

/** true khi share link sẽ dùng URL ngrok từ env (dù đang mở localhost). */
export function isShareViaConfiguredPublicOrigin() {
  const configured = getConfiguredPublicAppOrigin()
  if (!configured) return false
  if (typeof window === 'undefined') return true
  return window.location.origin !== configured
}
