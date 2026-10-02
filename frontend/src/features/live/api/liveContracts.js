/**
 * Data contracts shared by the REST client, the mock service and the UI.
 * `api/liveApi.js` normalizes the Spring Boot DTOs (standard `{ success, data, error }`
 * envelope handled by `shared/api/http.js`) into these shapes.
 */

/**
 * @typedef {Object} LiveHost
 * @property {string} id
 * @property {string} username
 * @property {string} displayName
 * @property {string|null} avatarUrl
 * @property {boolean} verified
 * @property {boolean} [followedByViewer]
 */

/**
 * @typedef {Object} LiveSettings
 * @property {'PUBLIC'|'FOLLOWERS'|'FRIENDS'} visibility
 * @property {boolean} allowComments
 * @property {boolean} allowGifts
 * @property {boolean} allowGuests
 * @property {boolean} [matureContent]
 */

/**
 * Playback descriptor on LIVE metadata. `type` selects the player/publisher implementation;
 * `type: null` means the backend has no media server enabled (mock UI).
 * Endpoints are never part of the metadata: they are issued per viewer/attempt below.
 * @typedef {Object} LivePlayback
 * @property {'webrtc'|null} type
 */

/**
 * `POST /api/lives/{id}/publish-credential` (host only). The WHIP URL embeds a single-use
 * token that is revoked by the next request, so it is fetched for every connection attempt.
 * @typedef {Object} LivePublishInfo
 * @property {string|null} whipUrl
 * @property {RTCIceServer[]} iceServers
 * @property {string|null} expiresAt
 * @property {boolean} activePublisher     SRS already has a publisher (another tab/device, or a stale session)
 */

/**
 * `GET /api/lives/{id}/playback`. `whepUrl` (short-lived, per viewer) is null until the host publishes.
 * @typedef {Object} LivePlaybackInfo
 * @property {'webrtc'|null} type
 * @property {'SCHEDULED'|'LIVE'|'ENDED'} status
 * @property {boolean} publishing
 * @property {string|null} whepUrl
 * @property {RTCIceServer[]} iceServers
 * @property {string|null} expiresAt
 */

/**
 * @typedef {Object} LiveSummary
 * @property {string} id
 * @property {string} title
 * @property {string} categoryId
 * @property {'SCHEDULED'|'LIVE'|'ENDED'} status
 * @property {string|null} coverUrl
 * @property {string|null} portraitCoverUrl
 * @property {number} viewerCount
 * @property {LiveHost} host
 */

/**
 * @typedef {LiveSummary & {
 *   description: string,
 *   likeCount: number,
 *   startedAt: string|null,
 *   endedAt: string|null,
 *   settings: LiveSettings,
 *   playback: LivePlayback,
 *   isOwner: boolean,
 *   peakViewerCount?: number,
 *   giftsAvailable?: boolean,   false while the platform has no gift wallet (settings.allowGifts is then false too)
 *   canModerate?: boolean,
 * }} LiveDetail
 */

/**
 * @typedef {Object} LiveListQuery
 * @property {string} [category]   category id or `recommended` / `following`
 * @property {string} [section]    discovery section id
 * @property {number} [limit]
 * @property {string} [cursor]
 */

/**
 * @typedef {Object} LiveListPage
 * @property {LiveSummary[]} items
 * @property {string|null} nextCursor
 */

/**
 * @typedef {Object} LiveDiscovery
 * @property {LiveSummary[]} featured          hero carousel
 * @property {LiveSummary[]} recommended       personalised rail (excludes featured)
 * @property {{ id: string, items: LiveSummary[] }[]} sections   per-category rails
 * @property {LiveSummary[]} recommendedHosts
 */

/**
 * @typedef {Object} CreateLivePayload
 * @property {string} title
 * @property {string} [description]
 * @property {string} [categoryId]     omitted: the backend classifies the LIVE from its title
 * @property {File|null} [coverFile]   uploaded via presigned URL by the real client (best effort)
 * @property {Partial<LiveSettings>} [settings]
 */

/**
 * @typedef {Object} LiveComment
 * @property {string} id
 * @property {string} liveId
 * @property {string} text
 * @property {string} createdAt
 * @property {{ id: string, username: string, displayName: string, avatarUrl: string|null, verified?: boolean }} author
 * @property {boolean} [pending]   optimistic, not yet acknowledged
 * @property {boolean} [failed]
 */

/**
 * @typedef {Object} LiveGift
 * @property {string} id
 * @property {string} name
 * @property {string} icon       emoji or image URL
 * @property {number} coinPrice
 */

/**
 * Realtime events pushed to a room channel (see `LIVE_ROOM_EVENT`).
 * @typedef {{ type: 'comment', payload: LiveComment }
 *   | { type: 'commentDeleted', payload: { id: string } }
 *   | { type: 'viewerCount', payload: { count: number } }
 *   | { type: 'likeCount', payload: { count: number } }
 *   | { type: 'gift', payload: { gift: LiveGift, sender: LiveComment['author'] } }
 *   | { type: 'status', payload: { status: string, reason?: string } }
 *   | { type: 'stream', payload: { publishing: boolean, reconnectDeadline: string|null } }} LiveRoomEvent
 */

export {}
