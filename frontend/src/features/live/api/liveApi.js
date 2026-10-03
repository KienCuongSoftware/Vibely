import { followApi } from '@/features/follow/api/followApi.js'
import {
  LIVE_DISCOVERY,
  LIVE_DISCOVERY_SECTIONS,
  LIVE_FEED_FILTER,
  LIVE_STATUS,
} from '@/features/live/constants/liveConstants.js'
import { request, toQuery } from '@/shared/api/http.js'

/**
 * REST client for the LIVE domain (Spring Boot `/api/lives`). Every method mirrors
 * `mock/liveMockService.js` so `services/liveService.js` can swap them.
 * Backend DTOs are normalized to the shapes in `liveContracts.js`.
 *
 * Video never flows through these endpoints — playback URLs point to the media server.
 */

const DISCOVERY_FETCH_SIZE = 50

const livePath = (liveId, suffix = '') => `/api/lives/${encodeURIComponent(liveId)}${suffix}`

/** CREATED -> SCHEDULED, CANCELLED -> ENDED; the UI only knows three states. */
export function normalizeLiveStatus(status) {
  if (status === 'CREATED') return LIVE_STATUS.SCHEDULED
  if (status === 'CANCELLED') return LIVE_STATUS.ENDED
  return status
}

export function normalizeLiveUser(user) {
  if (!user) return null
  return {
    id: String(user.id),
    username: user.username ?? '',
    displayName: user.displayName || user.username || '',
    avatarUrl: user.avatarUrl ?? null,
    verified: false,
  }
}

/** @returns {import('./liveContracts.js').LiveDetail} */
export function normalizeLive(dto) {
  const giftsAvailable = Boolean(dto.giftsAvailable)
  return {
    id: String(dto.id),
    title: dto.title ?? '',
    description: dto.description ?? '',
    categoryId: String(dto.category ?? '').toLowerCase(),
    status: normalizeLiveStatus(dto.status),
    coverUrl: dto.coverUrl ?? null,
    portraitCoverUrl: dto.coverUrl ?? null,
    viewerCount: Number(dto.viewerCount) || 0,
    peakViewerCount: Number(dto.peakViewerCount) || 0,
    likeCount: Number(dto.likeCount) || 0,
    startedAt: dto.startedAt ?? null,
    endedAt: dto.endedAt ?? null,
    host: { ...normalizeLiveUser(dto.host), followedByViewer: Boolean(dto.isFollowing) },
    settings: {
      visibility: dto.visibility,
      allowComments: Boolean(dto.allowComments),
      allowGifts: Boolean(dto.allowGifts) && giftsAvailable,
      allowGuests: Boolean(dto.allowGuests),
      matureContent: Boolean(dto.matureContent),
    },
    giftsAvailable,
    recordingEnabled: Boolean(dto.recordingEnabled),
    playback: dto.playback ?? { type: null, url: null },
    isOwner: Boolean(dto.isOwner),
    canModerate: Boolean(dto.canModerate),
  }
}

/** Media URLs from the backend are relative to this origin or absolute http(s). */
function safeMediaUrl(url) {
  return typeof url === 'string' && /^(\/(?!\/)|https?:\/\/)/i.test(url) ? url : null
}

const toNumberOrNull = (value) => (value == null || !Number.isFinite(Number(value)) ? null : Number(value))

/** @returns {import('./liveContracts.js').LiveReplay} */
export function normalizeLiveReplay(dto) {
  return {
    liveId: String(dto?.liveId ?? ''),
    title: dto?.title ?? '',
    status: dto?.status ?? null,
    isOwner: Boolean(dto?.isOwner),
    published: Boolean(dto?.published),
    videoId: dto?.videoId ?? null,
    authorUsername: dto?.authorUsername ?? null,
    playbackUrl: safeMediaUrl(dto?.playbackUrl),
    thumbnailUrl: safeMediaUrl(dto?.thumbnailUrl),
    durationSeconds: toNumberOrNull(dto?.durationSeconds),
    expiresAt: dto?.expiresAt ?? null,
    liveStartedAt: dto?.liveStartedAt ?? null,
    liveEndedAt: dto?.liveEndedAt ?? null,
    failureReason: dto?.failureReason ?? null,
  }
}

/** @returns {import('./liveContracts.js').LiveAnalytics} */
export function normalizeLiveAnalytics(dto) {
  return {
    liveId: String(dto?.liveId ?? ''),
    durationSeconds: Number(dto?.durationSeconds) || 0,
    uniqueViewers: Number(dto?.uniqueViewers) || 0,
    totalWatchSeconds: Number(dto?.totalWatchSeconds) || 0,
    averageWatchSeconds: Number(dto?.averageWatchSeconds) || 0,
    averageViewers: Number(dto?.averageViewers) || 0,
    peakViewers: Number(dto?.peakViewers) || 0,
    likeCount: Number(dto?.likeCount) || 0,
    commentCount: Number(dto?.commentCount) || 0,
    reconnectCount: Number(dto?.reconnectCount) || 0,
    endReason: dto?.endReason ?? null,
  }
}

/** @returns {import('./liveContracts.js').LiveComment} */
export function normalizeLiveComment(dto, liveId) {
  return {
    id: String(dto.id),
    liveId: String(liveId),
    text: dto.content ?? '',
    createdAt: dto.createdAt,
    author: normalizeLiveUser(dto.author),
    ...(dto.clientId ? { clientId: dto.clientId } : {}),
  }
}

/** Only well-formed entries reach RTCPeerConnection (it throws on malformed ICE servers). */
function normalizeIceServers(list) {
  if (!Array.isArray(list)) return []
  return list
    .map((server) => {
      const urls = (Array.isArray(server?.urls) ? server.urls : [server?.urls]).filter(
        (url) => typeof url === 'string' && /^(stun|stuns|turn|turns):/i.test(url),
      )
      if (!urls.length) return null
      return {
        urls,
        ...(server.username ? { username: server.username } : {}),
        ...(server.credential ? { credential: server.credential } : {}),
      }
    })
    .filter(Boolean)
}

function normalizeGift(gift) {
  return { id: gift.id, name: gift.name, icon: gift.iconUrl ?? '', coinPrice: Number(gift.coinCost) || 0 }
}

/** Feed filter / category id -> `GET /api/lives` query. Groups (gaming, lifestyle) are expanded by the backend. */
function discoveryQuery(category, size) {
  if (category === LIVE_FEED_FILTER.FOLLOWING) return { size, following: true }
  if (!category || category === LIVE_FEED_FILTER.RECOMMENDED) return { size }
  return { size, category }
}

async function fetchLivePage(query, token) {
  const page = await request(`/api/lives${toQuery(query)}`, { token })
  return {
    items: (page?.items ?? []).map(normalizeLive),
    hasNext: Boolean(page?.hasNext),
    page: Number(page?.page) || 0,
  }
}

export const liveApi = {
  /**
   * The backend returns broadcasting LIVEs sorted by viewers; featured/recommended/section
   * rails are composed here so the discovery page needs at most two requests.
   * @returns {Promise<import('./liveContracts.js').LiveDiscovery>}
   */
  async getDiscovery({ category } = {}, token) {
    const empty = { featured: [], recommended: [], sections: LIVE_DISCOVERY_SECTIONS.map(({ id }) => ({ id, items: [] })), recommendedHosts: [] }
    const needsAll = Boolean(category) && category !== LIVE_FEED_FILTER.RECOMMENDED
    if (category === LIVE_FEED_FILTER.FOLLOWING && !token) {
      const all = await fetchLivePage({ size: DISCOVERY_FETCH_SIZE }, token)
      return {
        ...empty,
        recommendedHosts: all.items.filter((live) => !live.isOwner).slice(0, LIVE_DISCOVERY.SIDEBAR_CREATOR_LIMIT),
        allLives: all.items,
      }
    }
    const [filtered, all] = await Promise.all([
      fetchLivePage(discoveryQuery(category, DISCOVERY_FETCH_SIZE), token),
      needsAll ? fetchLivePage({ size: DISCOVERY_FETCH_SIZE }, token) : null,
    ])
    const visible = filtered.items
    const featured = visible.slice(0, LIVE_DISCOVERY.HERO_LIMIT)
    const featuredIds = new Set(featured.map((live) => live.id))
    return {
      featured,
      recommended: visible.filter((live) => !featuredIds.has(live.id)).slice(0, LIVE_DISCOVERY.SECTION_LIMIT),
      sections: LIVE_DISCOVERY_SECTIONS.map((section) => ({
        id: section.id,
        items: visible
          .filter((live) => section.categoryIds.includes(live.categoryId))
          .slice(0, LIVE_DISCOVERY.SECTION_LIMIT),
      })),
      recommendedHosts: (all ?? filtered).items
        .filter((live) => !live.isOwner)
        .slice(0, LIVE_DISCOVERY.SIDEBAR_CREATOR_LIMIT),
      allLives: (all ?? filtered).items,
    }
  },

  /** @returns {Promise<import('./liveContracts.js').LiveListPage>} */
  async getLives({ category, limit = LIVE_DISCOVERY.SECTION_LIMIT, page = 0 } = {}, token) {
    const result = await fetchLivePage({ ...discoveryQuery(category, limit), page }, token)
    return { items: result.items, nextCursor: result.hasNext ? String(result.page + 1) : null }
  },

  /** @returns {Promise<import('./liveContracts.js').LiveDetail>} */
  getLive: async (liveId, token) => normalizeLive(await request(livePath(liveId), { token })),

  /**
   * The host comes from the session and the host's avatar serves as the cover.
   * Without `categoryId` the backend classifies the LIVE from its title.
   * @returns {Promise<import('./liveContracts.js').LiveDetail>}
   */
  async createLive({ title, description, categoryId, settings = {} }, token) {
    const dto = await request('/api/lives', {
      method: 'POST',
      token,
      body: {
        title,
        description,
        category: categoryId || undefined,
        visibility: settings.visibility,
        allowComments: settings.allowComments,
        allowGifts: settings.allowGifts,
        allowGuests: settings.allowGuests,
        matureContent: settings.matureContent,
        recordingEnabled: settings.recordingEnabled || undefined,
      },
    })
    return normalizeLive(dto)
  },

  /**
   * What the deployment supports (recording, HLS fallback, limits). Public, cheap.
   * @returns {Promise<import('./liveContracts.js').LiveCapabilities>}
   */
  async getCapabilities(token) {
    const dto = await request('/api/lives/capabilities', { token })
    return {
      media: Boolean(dto?.media),
      recording: Boolean(dto?.recording),
      hlsFallback: Boolean(dto?.hlsFallback),
      maxDurationMinutes: Number(dto?.maxDurationMinutes) || 0,
      maxReplaySeconds: Number(dto?.maxReplaySeconds) || 0,
    }
  },

  /**
   * Replay of an ended LIVE. The host sees every state; others only a published replay
   * (404 `REPLAY_NOT_FOUND` otherwise). `playbackUrl` is a short-lived signed URL.
   * @returns {Promise<import('./liveContracts.js').LiveReplay>}
   */
  getReplay: async (liveId, token) => normalizeLiveReplay(await request(livePath(liveId, '/replay'), { token })),

  /** Host only, after the LIVE ended. */
  getAnalytics: async (liveId, token) => normalizeLiveAnalytics(await request(livePath(liveId, '/analytics'), { token })),

  startLive: async (liveId, token) =>
    normalizeLive(await request(livePath(liveId, '/start'), { method: 'POST', token })),

  endLive: async (liveId, token) =>
    normalizeLive(await request(livePath(liveId, '/end'), { method: 'POST', token })),

  /** Aggregated taps — one request per batch window, never per click. */
  sendLikes: (liveId, count, token) =>
    request(livePath(liveId, '/likes'), { method: 'POST', body: { count }, token }),

  /** Reuses the existing follow system; the host id comes from LIVE metadata. */
  followHost: (hostId, token) => followApi.follow(hostId, token),

  unfollowHost: (hostId, token) => followApi.unfollow(hostId, token),

  async postComment(liveId, text, token, clientId) {
    const dto = await request(livePath(liveId, '/comments'), {
      method: 'POST',
      body: { content: text, ...(clientId ? { clientId } : {}) },
      token,
    })
    return normalizeLiveComment(dto, liveId)
  },

  /** Chronological page; `afterId` returns only newer comments (used to catch up after reconnect). */
  async getComments(liveId, { afterId, beforeId, size } = {}, token) {
    const page = await request(livePath(liveId, `/comments${toQuery({ afterId, beforeId, size })}`), { token })
    return {
      items: (page?.items ?? []).map((comment) => normalizeLiveComment(comment, liveId)),
      hasMore: Boolean(page?.hasMore),
    }
  },

  async getStats(liveId, token) {
    const stats = await request(livePath(liveId, '/stats'), { token })
    return {
      status: normalizeLiveStatus(stats?.status),
      viewerCount: Number(stats?.viewerCount) || 0,
      likeCount: Number(stats?.likeCount) || 0,
      publishing: typeof stats?.publishing === 'boolean' ? stats.publishing : null,
    }
  },

  /**
   * Host only. Issues a fresh single-use WHIP endpoint for this LIVE's media session;
   * every call revokes the previous credential, so it is requested per connection attempt.
   * @returns {Promise<import('./liveContracts.js').LivePublishInfo>}
   */
  async getPublishInfo(liveId, token) {
    const dto = await request(livePath(liveId, '/publish-credential'), { method: 'POST', token })
    return {
      whipUrl: dto?.whipUrl ?? null,
      iceServers: normalizeIceServers(dto?.iceServers),
      expiresAt: dto?.expiresAt ?? null,
      activePublisher: Boolean(dto?.activePublisher),
    }
  },

  /**
   * Short-lived WHEP endpoint for the current viewer. `whepUrl` is null while the host
   * is not publishing yet (or is reconnecting: `interrupted`). `hlsUrl` is the optional
   * fallback playlist (only when the deployment enables HLS).
   * @returns {Promise<import('./liveContracts.js').LivePlaybackInfo>}
   */
  async getPlayback(liveId, token) {
    const dto = await request(livePath(liveId, '/playback'), { token })
    return {
      type: dto?.type ?? null,
      status: normalizeLiveStatus(dto?.status),
      publishing: Boolean(dto?.publishing),
      whepUrl: dto?.whepUrl ?? null,
      iceServers: normalizeIceServers(dto?.iceServers),
      expiresAt: dto?.expiresAt ?? null,
      interrupted: Boolean(dto?.interrupted),
      hlsUrl: safeMediaUrl(dto?.hlsUrl),
    }
  },

  getGiftCatalog: async (token) => {
    const items = await request('/api/lives/gifts', { token })
    return Array.isArray(items) ? items.map(normalizeGift) : []
  },

  sendGift: (liveId, giftId, token) =>
    request(livePath(liveId, '/gifts'), { method: 'POST', body: { giftId, quantity: 1 }, token }),
}
