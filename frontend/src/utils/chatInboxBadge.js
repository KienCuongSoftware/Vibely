/** Badge tin nhắn: mỗi yêu cầu = 1 + tổng unread hội thoại thường (bỏ qua đã tắt tiếng). */
export function computeChatInboxBadgeCount(conversations) {
  if (!Array.isArray(conversations)) return 0
  let count = 0
  for (const row of conversations) {
    if (row?.muted) continue
    if (row?.messageRequest) {
      count += 1
      continue
    }
    const unread = Number(row?.unreadCount ?? 0)
    if (Number.isFinite(unread) && unread > 0) {
      count += unread
    }
  }
  return count
}
