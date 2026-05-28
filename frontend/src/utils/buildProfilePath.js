function deriveVibelyIdFromEmail(email) {
  const safeEmail = String(email ?? '').trim()
  if (!safeEmail) return 'vibely.user'

  const localPart = safeEmail.split('@')[0] ?? ''
  const withoutDiacritics = localPart
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')

  let base = withoutDiacritics.toLowerCase().replace(/[^a-z0-9]/g, '')
  if (!base) base = 'vibelyuser'

  while (base.length < 4) base = `${base}user`
  if (base.length > 24) base = base.slice(0, 24)
  return base
}

function decodeJwtSubject(token) {
  try {
    if (!token) return ''
    const parts = String(token).split('.')
    if (parts.length < 2) return ''
    const payload = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = payload.padEnd(
      payload.length + ((4 - (payload.length % 4)) % 4),
      '=',
    )
    const json = atob(padded)
    const data = JSON.parse(json)
    return data?.sub ?? data?.subject ?? ''
  } catch {
    return ''
  }
}

export function buildProfilePath(token, user) {
  if (!token) return '/login'
  const username = user?.username
    ? String(user.username).trim().replace(/^@/, '')
    : ''
  const emailFromUser = user?.email
  const emailFromToken = decodeJwtSubject(token)
  const vibelyId = username
    ? username
    : deriveVibelyIdFromEmail(emailFromUser || emailFromToken)
  return `/@${encodeURIComponent(vibelyId || 'vibely.user')}`
}
