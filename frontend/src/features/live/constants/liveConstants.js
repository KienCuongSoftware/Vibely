export const LIVE_PATHS = Object.freeze({
  discovery: '/live',
  create: '/live/create',
  detail: (liveId) => `/live/${encodeURIComponent(liveId)}`,
  host: (liveId) => `/live/${encodeURIComponent(liveId)}/host`,
})

export const LIVE_STATUS = Object.freeze({
  SCHEDULED: 'SCHEDULED',
  LIVE: 'LIVE',
  ENDED: 'ENDED',
})

export const LIVE_VISIBILITY = Object.freeze({
  PUBLIC: 'PUBLIC',
  FOLLOWERS: 'FOLLOWERS',
  FRIENDS: 'FRIENDS',
})

export const LIVE_VISIBILITY_OPTIONS = [
  { id: LIVE_VISIBILITY.PUBLIC, labelKey: 'livePage.create.visibility.public' },
  { id: LIVE_VISIBILITY.FOLLOWERS, labelKey: 'livePage.create.visibility.followers' },
  { id: LIVE_VISIBILITY.FRIENDS, labelKey: 'livePage.create.visibility.friends' },
]

/** `following` and `recommended` are feed filters, not categories a host can pick. */
export const LIVE_FEED_FILTER = Object.freeze({
  RECOMMENDED: 'recommended',
  FOLLOWING: 'following',
})

export const LIVE_CATEGORIES = [
  { id: LIVE_FEED_FILTER.RECOMMENDED, labelKey: 'livePage.categories.recommended', selectable: false },
  { id: LIVE_FEED_FILTER.FOLLOWING, labelKey: 'livePage.categories.following', selectable: false },
  { id: 'gaming', labelKey: 'livePage.categories.gaming', selectable: true },
  { id: 'lifestyle', labelKey: 'livePage.categories.lifestyle', selectable: true },
  { id: 'freefire', labelKey: 'livePage.categories.freeFire', selectable: true },
  { id: 'pubg', labelKey: 'livePage.categories.pubg', selectable: true },
  { id: 'music', labelKey: 'livePage.categories.music', selectable: true },
  { id: 'outdoor', labelKey: 'livePage.categories.outdoor', selectable: true },
  { id: 'chat', labelKey: 'livePage.categories.chat', selectable: true },
  { id: 'food', labelKey: 'livePage.categories.food', selectable: true },
]

export const LIVE_SELECTABLE_CATEGORIES = LIVE_CATEGORIES.filter((category) => category.selectable)

export function getLiveCategoryLabelKey(categoryId) {
  return (
    LIVE_CATEGORIES.find((category) => category.id === categoryId)?.labelKey ??
    'livePage.categories.recommended'
  )
}

/**
 * Discovery page sections. `categoryIds` decides which LIVEs belong to the rail;
 * `seeAllCategory` is the filter applied by its "See all" link.
 */
export const LIVE_DISCOVERY_SECTIONS = [
  { id: 'gaming', titleKey: 'livePage.sections.gaming', categoryIds: ['gaming', 'freefire', 'pubg'], seeAllCategory: 'gaming' },
  { id: 'lifestyle', titleKey: 'livePage.sections.lifestyle', categoryIds: ['lifestyle', 'music', 'outdoor', 'chat', 'food'], seeAllCategory: 'lifestyle' },
]

export const LIVE_LIMITS = Object.freeze({
  TITLE_MAX: 80,
  DESCRIPTION_MAX: 300,
  COMMENT_MAX: 150,
  COVER_MAX_BYTES: 5 * 1024 * 1024,
  COVER_ACCEPTED_TYPES: ['image/jpeg', 'image/png', 'image/webp'],
})

export const LIVE_CHAT = Object.freeze({
  /** Messages kept in memory; older ones are dropped so long streams stay light. */
  MAX_BUFFERED_MESSAGES: 200,
  /** Distance from the bottom (px) within which new messages auto-scroll. */
  AUTO_SCROLL_THRESHOLD_PX: 80,
})

export const LIVE_LIKE = Object.freeze({
  /** Taps are aggregated and flushed at most once per window. */
  BATCH_WINDOW_MS: 1000,
  /** Upper bound per flush so a stuck tab cannot send huge batches. */
  MAX_BATCH_SIZE: 500,
  BURST_LIFETIME_MS: 900,
  MAX_VISIBLE_BURSTS: 12,
})

export const LIVE_DISCOVERY = Object.freeze({
  HERO_LIMIT: 4,
  SECTION_LIMIT: 8,
  SIDEBAR_CREATOR_LIMIT: 5,
})

export const LIVE_ROOM_EVENT = Object.freeze({
  COMMENT: 'comment',
  VIEWER_COUNT: 'viewerCount',
  LIKE_COUNT: 'likeCount',
  GIFT: 'gift',
  STATUS: 'status',
})

export const LIVE_CONNECTION_STATE = Object.freeze({
  IDLE: 'idle',
  CONNECTING: 'connecting',
  CONNECTED: 'connected',
  ERROR: 'error',
})

/** Media layout breakpoint — matches the feed's mobile layout (max-width: 1023px). */
export const LIVE_MOBILE_MEDIA_QUERY = '(max-width: 1023px)'
