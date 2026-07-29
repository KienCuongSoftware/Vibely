export const DEFAULT_AVATAR_URL = '/images/users/default-avatar.jpeg'

function isUnreliableOAuthCdn(url) {
  const lower = String(url ?? '').trim().toLowerCase()
  if (!lower || lower.startsWith('/')) return false
  // Keep in sync with UserAvatarResolver.isOAuthCdnUrl (backend).
  return (
    lower.includes('fbsbx.com')
    || lower.includes('fbcdn.net')
    || lower.includes('lookaside.fbsbx.com')
    || lower.includes('googleusercontent.com')
    || lower.includes('ggpht.com')
    || lower.includes('google.com/a/')
  )
}

/**
 * Prefer local uploads / oauth proxy; drop raw OAuth CDN URLs that often 403/500 in &lt;img&gt;.
 * When user id is known, prefer the backend proxy path for OAuth photos.
 */
export function sanitizeAvatarUrl(url, fallback = DEFAULT_AVATAR_URL, userId) {
  const trimmed = String(url ?? '').trim()
  if (!trimmed) return fallback
  if (trimmed.startsWith('/api/users/oauth-avatar/')) return trimmed
  if (isUnreliableOAuthCdn(trimmed)) {
    const id = Number(userId)
    if (Number.isFinite(id) && id > 0) {
      return `/api/users/oauth-avatar/${id}`
    }
    return fallback
  }
  return trimmed
}
