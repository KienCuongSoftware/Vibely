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
 * Playback descriptor issued by the backend once a media server session exists.
 * `type: null` means no media is available yet (mock / pre-start).
 * @typedef {Object} LivePlayback
 * @property {'webrtc'|'hls'|null} type
 * @property {string|null} url            WHEP/HLS endpoint from the media server
 * @property {string|null} [token]        short-lived playback token
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
 * @property {string} description
 * @property {string} categoryId
 * @property {File|null} coverFile     uploaded via presigned URL by the real client
 * @property {LiveSettings} settings
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
 *   | { type: 'status', payload: { status: string } }} LiveRoomEvent
 */

export {}
