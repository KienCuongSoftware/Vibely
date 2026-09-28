import { LIVE_CONNECTION_STATE } from '@/features/live/constants/liveConstants.js'
import { createMockLiveRoomChannel } from '@/features/live/mock/mockLiveRoomChannel.js'
import { LIVE_DATA_SOURCE, liveDataSource, liveService } from '@/features/live/services/liveService.js'

/**
 * Realtime boundary for one LIVE room (chat, viewer count, likes, gifts).
 *
 * @typedef {Object} LiveRoomListener
 * @property {(event: import('../api/liveContracts.js').LiveRoomEvent) => void} [onEvent]
 * @property {(state: string) => void} [onStateChange]   one of LIVE_CONNECTION_STATE
 *
 * @typedef {Object} LiveRoomChannel
 * @property {(listener: LiveRoomListener) => void} connect
 * @property {(message: { text: string, clientId: string, author: object }) => Promise<import('../api/liveContracts.js').LiveComment>} sendComment
 *   Resolves with the accepted comment. Implementations that also broadcast it back must keep `clientId`.
 * @property {() => void} disconnect   must release sockets/timers; safe to call twice
 *
 * Planned STOMP mapping (Spring `/ws`, see `shared/realtime/createStompClient.js`):
 *   SUBSCRIBE /topic/lives/{liveId}/comments   -> LIVE_ROOM_EVENT.COMMENT
 *   SUBSCRIBE /topic/lives/{liveId}/stats      -> VIEWER_COUNT / LIKE_COUNT
 *   SUBSCRIBE /topic/lives/{liveId}/gifts      -> GIFT
 *   SUBSCRIBE /topic/lives/{liveId}/status     -> STATUS
 *   SEND      /app/lives/{liveId}/comments     { text, clientId }
 *   SEND      /app/lives/{liveId}/presence     join/leave heartbeat (viewer count)
 */
export const LIVE_ROOM_DESTINATIONS = Object.freeze({
  comments: (liveId) => `/topic/lives/${liveId}/comments`,
  stats: (liveId) => `/topic/lives/${liveId}/stats`,
  gifts: (liveId) => `/topic/lives/${liveId}/gifts`,
  status: (liveId) => `/topic/lives/${liveId}/status`,
  sendComment: (liveId) => `/app/lives/${liveId}/comments`,
  presence: (liveId) => `/app/lives/${liveId}/presence`,
})

/**
 * Until the realtime backend exists, API mode posts comments over REST and
 * receives nothing live. Replace with a STOMP channel using LIVE_ROOM_DESTINATIONS.
 */
function createRestOnlyLiveRoomChannel({ liveId, token }) {
  let listener = null
  return {
    connect(nextListener) {
      listener = nextListener
      listener?.onStateChange?.(LIVE_CONNECTION_STATE.IDLE)
    },
    async sendComment({ text, clientId }) {
      const comment = await liveService.postComment(liveId, text, token)
      return { ...comment, clientId }
    },
    disconnect() {
      listener = null
    },
  }
}

/** @returns {LiveRoomChannel} */
export function createLiveRoomChannel({ liveId, token, initialViewerCount }) {
  if (liveDataSource === LIVE_DATA_SOURCE.API) {
    return createRestOnlyLiveRoomChannel({ liveId, token })
  }
  return createMockLiveRoomChannel({ liveId, initialViewerCount })
}
