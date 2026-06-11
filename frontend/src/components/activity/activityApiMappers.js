const TYPE_TO_FRONT = {
  FOLLOW: 'follow',
  VIDEO_LIKE: 'video_like',
  COMMENT_LIKE: 'comment_like',
  COMMENT_REPLY: 'comment_reply',
  MENTION: 'mention',
}

const TYPE_TO_FILTER = {
  FOLLOW: 'followers',
  VIDEO_LIKE: 'likes',
  COMMENT_LIKE: 'likes',
  COMMENT_REPLY: 'comments',
  MENTION: 'mentions',
}

function isToday(iso) {
  if (!iso) return false
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return false
  const now = new Date()
  return (
    date.getFullYear() === now.getFullYear()
    && date.getMonth() === now.getMonth()
    && date.getDate() === now.getDate()
  )
}

export function mapNotificationItem(row) {
  const type = TYPE_TO_FRONT[row?.type] ?? 'video_like'
  const activityAt = row.updatedAt ?? row.createdAt
  return {
    id: String(row.id),
    type,
    filter: TYPE_TO_FILTER[row?.type] ?? 'all',
    section: isToday(activityAt) ? 'today' : 'earlier',
    actor: row.actor
      ? {
          id: row.actor.id,
          username: row.actor.username,
          displayName: row.actor.displayName,
          avatarUrl: row.actor.avatarUrl,
        }
      : null,
    preview: row.preview ?? '',
    videoPublicId: row.videoPublicId ? String(row.videoPublicId) : null,
    videoAuthorUsername: row.videoAuthorUsername
      ? String(row.videoAuthorUsername).trim()
      : null,
    videoThumbnailUrl: row.videoThumbnailUrl ? String(row.videoThumbnailUrl) : null,
    viewerFollowsActor: Boolean(row.viewerFollowsActor),
    actorCount: Math.max(1, Number(row.actorCount ?? 1)),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt ?? row.createdAt,
    read: Boolean(row.read),
  }
}

export function mapSystemNotificationItem(row) {
  return {
    id: String(row.id),
    category: row.category ?? 'system',
    badge: row.badge ?? null,
    title: row.title ?? '',
    body: row.body ?? '',
    createdAt: row.createdAt,
  }
}
