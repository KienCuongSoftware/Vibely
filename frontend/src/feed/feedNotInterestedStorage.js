import { videoPublicIdOf } from '../utils/videoPublicId.js'

const STORAGE_KEY = 'vibely_feed_not_interested_ids'
const MAX_IDS = 400

/**
 * @returns {Set<string>}
 */
export function readNotInterestedIds() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return new Set()
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return new Set()
    return new Set(parsed.map((id) => String(id)).filter(Boolean))
  } catch {
    return new Set()
  }
}

/**
 * @param {Set<string> | string[]} ids
 */
function writeNotInterestedIds(ids) {
  try {
    const list = [...ids]
    const trimmed = list.length > MAX_IDS ? list.slice(list.length - MAX_IDS) : list
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed))
  } catch {
    /* ignore quota / private mode */
  }
}

/**
 * @param {string | number | null | undefined} publicId
 */
export function markVideoNotInterested(publicId) {
  const id = publicId == null ? '' : String(publicId).trim()
  if (!id) return
  const next = readNotInterestedIds()
  next.add(id)
  writeNotInterestedIds(next)
}

/**
 * @param {string | number | null | undefined} publicId
 */
export function isVideoNotInterested(publicId) {
  const id = publicId == null ? '' : String(publicId).trim()
  if (!id) return false
  return readNotInterestedIds().has(id)
}

/**
 * @template {{ publicId?: string | number }} T
 * @param {T[]} items
 * @returns {T[]}
 */
export function filterNotInterestedVideos(items) {
  if (!Array.isArray(items) || items.length === 0) return items ?? []
  const ids = readNotInterestedIds()
  if (ids.size === 0) return items
  return items.filter((item) => {
    const id = videoPublicIdOf(item)
    return !id || !ids.has(String(id))
  })
}

export const FEED_NOT_INTERESTED_TOAST_MESSAGE =
  'Chúng tôi đã xóa video này khỏi bảng tin của bạn'
