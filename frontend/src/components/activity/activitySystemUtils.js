export function filterSystemNotifications(items, filterId) {
  if (!filterId || filterId === 'all') return items
  return items.filter((item) => item.category === filterId)
}

export function formatSystemNotificationTime(iso) {
  if (!iso) return ''
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const diffSec = Math.floor((now.getTime() - date.getTime()) / 1000)
  if (diffSec < 60) return `${Math.max(1, diffSec)} giây`

  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin} phút`

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return `${diffHours} giờ`

  const sameYear = date.getFullYear() === now.getFullYear()
  if (sameYear) {
    return `${date.getMonth() + 1}-${date.getDate()}`
  }

  return date.toLocaleDateString('vi-VN', {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}
