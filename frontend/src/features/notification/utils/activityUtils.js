import { ACTIVITY_SECTIONS } from '@/features/notification/utils/activityConstants.js'
import i18n from '@/i18n/i18n.js'

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

function aggregatedOthersAction(singularKey, count) {
  const total = Math.max(1, Number(count ?? 1))
  const singular = i18n.t(singularKey)
  if (total <= 1) return singular
  return i18n.t('activityPage.actions.andOthers', {
    count: total - 1,
    action: singular,
  })
}

export function buildActivityActionText(item) {
  switch (item.type) {
    case 'comment_reply':
      return aggregatedOthersAction('activityPage.actions.commentReply', item.actorCount)
    case 'comment_like':
      return aggregatedOthersAction('activityPage.actions.commentLike', item.actorCount)
    case 'video_like':
      return aggregatedOthersAction('activityPage.actions.videoLike', item.actorCount)
    case 'mention':
      return aggregatedOthersAction('activityPage.actions.mention', item.actorCount)
    case 'follow':
      return aggregatedOthersAction('activityPage.actions.follow', item.actorCount)
    case 'follow_request':
      return i18n.t('activityPage.actions.followRequest')
    default:
      return i18n.t('activityPage.actions.interacted')
  }
}

export function buildActivityActorName(item) {
  if (item.type === 'system') {
    return item.title ?? i18n.t('activityPage.system')
  }
  return item.actor?.displayName || item.actor?.username || i18n.t('activityPage.actions.someone')
}

export function formatActivityTimestamp(iso, fallbackIso) {
  const source = iso ?? fallbackIso
  if (!source) return ''
  const date = new Date(source)
  if (Number.isNaN(date.getTime())) return ''

  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60_000)
  if (diffMin < 1) return i18n.t('activityPage.time.justNow')
  if (diffMin < 60) return i18n.t('activityPage.time.minutes', { count: diffMin })

  const diffHours = Math.floor(diffMin / 60)
  if (diffHours < 24) return i18n.t('activityPage.time.hours', { count: diffHours })

  const sameYear = date.getFullYear() === now.getFullYear()
  const locale = i18n.language || 'en'
  return date.toLocaleDateString(locale, {
    day: 'numeric',
    month: sameYear ? 'numeric' : 'short',
    ...(sameYear ? {} : { year: 'numeric' }),
  })
}
