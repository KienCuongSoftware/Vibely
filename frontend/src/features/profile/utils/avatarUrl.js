export const DEFAULT_AVATAR_URL = '/images/users/default-avatar.jpeg'

function isUnreliableOAuthCdn(url) {
  const lower = String(url ?? '').trim().toLowerCase()
  if (!lower || lower.startsWith('/')) return false
  return (
    lower.includes('fbsbx.com')
    || lower.includes('fbcdn.net')
    || lower.includes('lookaside.fbsbx.com')
  )
}

/** Prefer local uploads; OAuth CDN URLs are served via backend proxy. */
export function sanitizeAvatarUrl(url, fallback = DEFAULT_AVATAR_URL) {
  const trimmed = String(url ?? '').trim()
  if (!trimmed) return fallback
  if (trimmed.startsWith('/api/users/oauth-avatar/')) return trimmed
  if (isUnreliableOAuthCdn(trimmed)) return fallback
  return trimmed
}
