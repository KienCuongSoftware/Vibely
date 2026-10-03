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
 * @property {boolean} [recordingEnabled]   create only: request a replay recording
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
 * @property {boolean} interrupted     host media dropped; the reconnect grace period is running
 * @property {string|null} hlsUrl      HLS fallback playlist (tokenized), only when the deployment enables HLS
 */

/**
 * `GET /api/lives/capabilities`.
 * @typedef {Object} LiveCapabilities
 * @property {boolean} media
 * @property {boolean} recording        recording can be requested when creating a LIVE
 * @property {boolean} hlsFallback
 * @property {number} maxDurationMinutes   0 = unlimited
 * @property {number} maxReplaySeconds
 */

/**
 * `GET /api/lives/{id}/replay`. The replay is a regular video of the host (a Studio draft until
 * the host publishes it). `playbackUrl` is a short-lived signed URL, only when READY.
 * @typedef {Object} LiveReplay
 * @property {string} liveId
 * @property {string} title
 * @property {'RECORDING'|'PROCESSING'|'READY'|'FAILED'|'DELETED'|null} status
 * @property {boolean} isOwner
 * @property {boolean} published
 * @property {string|null} videoId          public id of the replay video
 * @property {string|null} authorUsername
 * @property {string|null} playbackUrl
 * @property {string|null} thumbnailUrl
 * @property {number|null} durationSeconds
 * @property {string|null} expiresAt
 * @property {string|null} liveStartedAt
 * @property {string|null} liveEndedAt
 * @property {string|null} failureReason    host only
 */

/**
 * `GET /api/lives/{id}/analytics` (host only, after the end).
 * @typedef {Object} LiveAnalytics
 * @property {string} liveId
 * @property {number} durationSeconds
 * @property {number} uniqueViewers
 * @property {number} totalWatchSeconds
 * @property {number} averageWatchSeconds
 * @property {number} averageViewers
 * @property {number} peakViewers
 * @property {number} likeCount
 * @property {number} commentCount
 * @property {number} reconnectCount
 * @property {string|null} endReason
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
 *   recordingEnabled?: boolean, the host asked for a replay recording (and the deployment supports it)
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
 * @property {LiveSummary[]} allLives          every broadcasting LIVE, whatever the active filter
 */

/**
 * @typedef {Object} CreateLivePayload
 * @property {string} title
 * @property {string} [description]
 * @property {string} [categoryId]     omitted: the backend classifies the LIVE from its title
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
