/** Hiển thị badge thông báo chưa đọc — tối đa 99, quá thì 99+. */
export function formatNotificationBadgeCount(count) {
  const n = Number(count ?? 0)
  if (!Number.isFinite(n) || n <= 0) return ''
  if (n > 99) return '99+'
  return String(n)
}
