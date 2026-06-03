import { normalizeVideoPublicId, videoPublicIdOf } from './videoPublicId.js'

const KEY_PREFIX = 'vibely.profile.lastWatched.'

export function profileLastWatchedStorageKey(rawUsername) {
  const key = String(rawUsername ?? '')
    .trim()
    .replace(/^@/, '')
    .toLowerCase()
  return key || null
}

/**
 * @param {string} rawUsername
 * @param {string|number} publicId
 * @param {{ tab?: 'videos'|'favorites'|'liked', favoritesSubTab?: string }} [context]
 */
export function saveProfileLastWatched(rawUsername, publicId, context = {}) {
  const profileKey = profileLastWatchedStorageKey(rawUsername)
  const videoId = normalizeVideoPublicId(publicId)
  if (!profileKey || !videoId) return
  const payload = {
    publicId: videoId,
    tab: context.tab === 'favorites' || context.tab === 'liked' ? context.tab : 'videos',
    favoritesSubTab:
      context.favoritesSubTab === 'collections' ? 'collections' : 'posts',
  }
  try {
    sessionStorage.setItem(`${KEY_PREFIX}${profileKey}`, JSON.stringify(payload))
  } catch {
    /* ignore quota / private mode */
  }
}

function parseStored(raw) {
  if (!raw || typeof raw !== 'string') return null
  const trimmed = raw.trim()
  if (!trimmed) return null
  if (trimmed.startsWith('{')) {
    try {
      const data = JSON.parse(trimmed)
      const publicId = normalizeVideoPublicId(data?.publicId)
      if (!publicId) return null
      const tab =
        data.tab === 'favorites' || data.tab === 'liked' ? data.tab : 'videos'
      const favoritesSubTab =
        data.favoritesSubTab === 'collections' ? 'collections' : 'posts'
      return { publicId, tab, favoritesSubTab }
    } catch {
      return null
    }
  }
  const publicId = normalizeVideoPublicId(trimmed)
  return publicId ? { publicId, tab: 'videos', favoritesSubTab: 'posts' } : null
}

/** @returns {{ publicId: string, tab: 'videos'|'favorites'|'liked', favoritesSubTab: string } | null} */
export function loadProfileLastWatched(rawUsername) {
  const profileKey = profileLastWatchedStorageKey(rawUsername)
  if (!profileKey) return null
  try {
    return parseStored(sessionStorage.getItem(`${KEY_PREFIX}${profileKey}`))
  } catch {
    return null
  }
}

/**
 * Ghi nhận video vừa xem cho hồ sơ tác giả (For You, Following, trang xem, v.v.).
 * @param {{ authorUsername?: unknown, publicId?: unknown } | null | undefined} video
 * @param {{ tab?: 'videos'|'favorites'|'liked', favoritesSubTab?: string }} [context]
 */
export function recordProfileLastWatchedFromVideo(video, context = {}) {
  const author = String(video?.authorUsername ?? '')
    .trim()
    .replace(/^@/, '')
  const publicId = videoPublicIdOf(video)
  if (!author || !publicId) return
  saveProfileLastWatched(author, publicId, context)
}
