const FAVORITES_KEY = 'vibely:sound-favorites'
const RECENT_KEY = 'vibely:sound-recent'
const MAX_RECENT = 30

function readList(key) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function writeList(key, items) {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch {
    // ignore quota errors
  }
}

export function normalizeSoundItem(item) {
  if (!item?.audioUrl) return null
  return {
    audioUrl: String(item.audioUrl).trim(),
    audioTitle: String(item.audioTitle || '').trim() || 'original sound',
    thumbnailUrl: String(item.thumbnailUrl || '').trim(),
    durationSeconds: Number(item.durationSeconds) || 0,
    authorDisplayName: String(item.authorDisplayName || '').trim(),
    usageCount: Number(item.usageCount) || 0,
  }
}

export function getFavoriteSounds() {
  return readList(FAVORITES_KEY)
    .map(normalizeSoundItem)
    .filter(Boolean)
}

export function getRecentSounds() {
  return readList(RECENT_KEY)
    .map(normalizeSoundItem)
    .filter(Boolean)
}

export function isFavoriteSound(audioUrl) {
  const url = String(audioUrl || '').trim()
  if (!url) return false
  return getFavoriteSounds().some((s) => s.audioUrl === url)
}

export function toggleFavoriteSound(item) {
  const sound = normalizeSoundItem(item)
  if (!sound) return false
  const list = getFavoriteSounds()
  const idx = list.findIndex((s) => s.audioUrl === sound.audioUrl)
  if (idx >= 0) {
    list.splice(idx, 1)
    writeList(FAVORITES_KEY, list)
    return false
  }
  writeList(FAVORITES_KEY, [sound, ...list])
  return true
}

export function pushRecentSound(item) {
  const sound = normalizeSoundItem(item)
  if (!sound) return
  const list = getRecentSounds().filter((s) => s.audioUrl !== sound.audioUrl)
  writeList(RECENT_KEY, [sound, ...list].slice(0, MAX_RECENT))
}

export function filterSounds(items, query) {
  const q = String(query || '').trim().toLowerCase()
  if (!q) return items
  return items.filter((s) => {
    const hay = `${s.audioTitle} ${s.authorDisplayName}`.toLowerCase()
    return hay.includes(q)
  })
}

export function formatSoundDuration(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}
