import { ACTIVITY_SECTIONS } from './activityConstants.js'

export function filterActivityItems(items, filterId) {
  if (!filterId || filterId === 'all') return items
  return items.filter((item) => {
    if (item.type === 'system') return filterId === 'all'
    return item.filter === filterId
  })
}

export function groupActivityBySection(items) {
  const map = new Map(ACTIVITY_SECTIONS.map((section) => [section.id, []]))
  for (const item of items) {
    const bucket = map.get(item.section)
    if (bucket) bucket.push(item)
  }
  return ACTIVITY_SECTIONS.map((section) => ({
    ...section,
    items: map.get(section.id) ?? [],
  })).filter((section) => section.items.length > 0)
}

export function buildActivityActionText(item) {
  switch (item.type) {
    case 'comment_reply':
      return 'đã trả lời bình luận của bạn'
    case 'comment_like':
      return 'đã thích bình luận của bạn'
    case 'video_like':
      return 'đã thích video của bạn'
    case 'mention':
      return 'đã nhắc đến bạn trong bình luận'
    case 'follow':
      return 'đã bắt đầu follow bạn'
    default:
      return 'đã tương tác với bạn'
  }
}

export function buildActivityActorName(item) {
  if (item.type === 'system') return item.title ?? 'Thông báo hệ thống'
  return item.actor?.displayName || item.actor?.username || 'Ai đó'
}

export function formatActivityTimestamp(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return 'Vừa xong'
  if (diffMin < 60) return `${diffMin} phút`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} giờ`

  const sameYear = date.getFullYear() === now.getFullYear()
  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: sameYear ? 'numeric' : 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}
