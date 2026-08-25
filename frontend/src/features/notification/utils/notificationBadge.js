/** Hiển thị badge thông báo chưa đọc — tối đa 99, quá thì 99+. */
export function formatNotificationBadgeCount(count) {
  const n = Number(count ?? 0)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n > 99) return '99+'
  return String(n)
}

/** TikTok-style browser tab: "(1) For You | Vibely". */
export function formatUnreadDocumentTitle(baseTitle, unreadCount) {
  const base = String(baseTitle ?? '').replace(/^\(\d+\+?\)\s+/, '').trim()
  const badge = formatNotificationBadgeCount(unreadCount)
  if (!base) return badge ? `(${badge})` : ''
  return badge ? `(${badge}) ${base}` : base
}
