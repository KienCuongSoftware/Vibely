import {
  LIVE_DISCOVERY,
  LIVE_DISCOVERY_SECTIONS,
  LIVE_FEED_FILTER,
  LIVE_STATUS,
} from '@/features/live/constants/liveConstants.js'
import {
  MOCK_FEATURED_LIVE_IDS,
  MOCK_FOLLOWED_HOST_IDS,
  MOCK_GIFTS,
  MOCK_LIVES,
  MOCK_REALTIME,
} from '@/features/live/mock/liveMockData.js'

/**
 * In-memory implementation of the `liveApi` interface. State lives for the
 * browser session only; delete this module once the backend is live.
 */

const MOCK_SELF_HOST = Object.freeze({
  id: 'mock-self',
  username: 'me',
  displayName: 'Me',
  avatarUrl: null,
  verified: false,
})

const store = {
  lives: new Map(MOCK_LIVES.map((live) => [live.id, { ...live, isOwner: false }])),
  followedHostIds: new Set(MOCK_FOLLOWED_HOST_IDS),
  sequence: 0,
}

const delay = (ms = MOCK_REALTIME.NETWORK_DELAY_MS) =>
  new Promise((resolve) => setTimeout(resolve, ms))

function notFound() {
  const error = new Error('LIVE not found')
  error.status = 404
  error.code = 'NOT_FOUND'
  return error
}

function toSummary(live) {
  return {
    id: live.id,
    title: live.title,
    categoryId: live.categoryId,
    status: live.status,
    coverUrl: live.coverUrl,
    portraitCoverUrl: live.portraitCoverUrl,
    viewerCount: live.viewerCount,
    host: { ...live.host },
  }
}

function toDetail(live) {
  return {
    ...toSummary(live),
    description: live.description,
    likeCount: live.likeCount,
    startedAt: live.startedAt,
    endedAt: live.endedAt,
    settings: { ...live.settings },
    playback: { ...live.playback },
    isOwner: Boolean(live.isOwner),
    host: { ...live.host, followedByViewer: store.followedHostIds.has(live.host.id) },
  }
}

function requireLive(liveId) {
  const live = store.lives.get(String(liveId))
  if (!live) throw notFound()
  return live
}

function matchesFilter(live, category) {
  if (!category || category === LIVE_FEED_FILTER.RECOMMENDED) return true
  if (category === LIVE_FEED_FILTER.FOLLOWING) return store.followedHostIds.has(live.host.id)
  const group = LIVE_DISCOVERY_SECTIONS.find((section) => section.seeAllCategory === category)
  return group ? group.categoryIds.includes(live.categoryId) : live.categoryId === category
}

function publicLiveList() {
  return [...store.lives.values()]
    .filter((live) => live.status === LIVE_STATUS.LIVE && !live.isOwner)
    .sort((a, b) => b.viewerCount - a.viewerCount)
}

export const liveMockService = {
  async getDiscovery({ category } = {}) {
    await delay()
    const visible = publicLiveList().filter((live) => matchesFilter(live, category))
    const featuredPool = category && category !== LIVE_FEED_FILTER.RECOMMENDED
      ? visible
      : MOCK_FEATURED_LIVE_IDS.map((id) => store.lives.get(id)).filter(Boolean)
    const featured = featuredPool.slice(0, LIVE_DISCOVERY.HERO_LIMIT)
    const featuredIds = new Set(featured.map((live) => live.id))

    return {
      featured: featured.map(toSummary),
      recommended: visible
        .filter((live) => !featuredIds.has(live.id))
        .slice(0, LIVE_DISCOVERY.SECTION_LIMIT)
        .map(toSummary),
      sections: LIVE_DISCOVERY_SECTIONS.map((section) => ({
        id: section.id,
        items: visible
          .filter((live) => section.categoryIds.includes(live.categoryId))
          .slice(0, LIVE_DISCOVERY.SECTION_LIMIT)
          .map(toSummary),
      })),
      recommendedHosts: publicLiveList()
        .slice(0, LIVE_DISCOVERY.SIDEBAR_CREATOR_LIMIT)
        .map(toSummary),
      allLives: publicLiveList().map(toSummary),
    }
  },

  async getLives({ category, limit = LIVE_DISCOVERY.SECTION_LIMIT } = {}) {
    await delay()
    const items = publicLiveList().filter((live) => matchesFilter(live, category))
    return { items: items.slice(0, limit).map(toSummary), nextCursor: null }
  },

  async getLive(liveId) {
    await delay()
    return toDetail(requireLive(liveId))
  },

  async createLive({ title, description, categoryId, settings }) {
    await delay()
    store.sequence += 1
    const id = `mock-live-${Date.now().toString(36)}-${store.sequence}`
    const live = {
      id,
      title,
      description,
      categoryId: categoryId || 'lifestyle',
      status: LIVE_STATUS.SCHEDULED,
      coverUrl: null,
      portraitCoverUrl: null,
      viewerCount: 0,
      likeCount: 0,
      startedAt: null,
      endedAt: null,
      host: { ...MOCK_SELF_HOST },
      settings: { ...settings },
      playback: { type: null, url: null },
      isOwner: true,
    }
    store.lives.set(id, live)
    return toDetail(live)
  },

  async startLive(liveId) {
    await delay()
    const live = requireLive(liveId)
    live.status = LIVE_STATUS.LIVE
    live.startedAt = new Date().toISOString()
    return toDetail(live)
  },

  async endLive(liveId) {
    await delay()
    const live = requireLive(liveId)
    live.status = LIVE_STATUS.ENDED
    live.endedAt = new Date().toISOString()
    return toDetail(live)
  },

  async sendLikes(liveId, count) {
    await delay()
    const live = requireLive(liveId)
    live.likeCount += Math.max(0, Number(count) || 0)
    return { likeCount: live.likeCount }
  },

  async followHost(hostId) {
    await delay()
    store.followedHostIds.add(String(hostId))
    return { following: true }
  },

  async unfollowHost(hostId) {
    await delay()
    store.followedHostIds.delete(String(hostId))
    return { following: false }
  },

  async postComment(liveId, text) {
    await delay()
    requireLive(liveId)
    return {
      id: `mock-comment-${Date.now().toString(36)}`,
      liveId: String(liveId),
      text,
      createdAt: new Date().toISOString(),
      author: { ...MOCK_SELF_HOST },
    }
  },

  async getGiftCatalog() {
    await delay()
    return MOCK_GIFTS.map((gift) => ({ ...gift }))
  },

  async sendGift(liveId, giftId) {
    await delay()
    requireLive(liveId)
    const gift = MOCK_GIFTS.find((item) => item.id === giftId)
    if (!gift) throw notFound()
    return { gift: { ...gift } }
  },
}
