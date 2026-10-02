import { liveApi, normalizeLiveComment, normalizeLiveStatus } from '@/features/live/api/liveApi.js'
import {
  LIVE_CONNECTION_STATE,
  LIVE_REALTIME,
  LIVE_ROOM_EVENT,
  LIVE_STATUS,
} from '@/features/live/constants/liveConstants.js'
import { createMockLiveRoomChannel } from '@/features/live/mock/mockLiveRoomChannel.js'
import { LIVE_DATA_SOURCE, liveDataSource } from '@/features/live/services/liveService.js'
import { createStompClient } from '@/shared/realtime/createStompClient.js'
import { resolveRealtimeWsToken } from '@/shared/realtime/wsAuth.js'

/**
 * Realtime boundary for one LIVE room (chat, viewer count, likes, status).
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
 * Backend mapping (Spring `/ws`, simple broker):
 *   SUBSCRIBE /topic/live/{liveId}  -> { type, liveId, payload, timestamp }
 *     COMMENT_CREATED       -> LIVE_ROOM_EVENT.COMMENT
 *     COMMENT_DELETED       -> LIVE_ROOM_EVENT.COMMENT_DELETED
 *     VIEWER_COUNT_UPDATED  -> LIVE_ROOM_EVENT.VIEWER_COUNT
 *     LIKE_UPDATED          -> LIVE_ROOM_EVENT.LIKE_COUNT
 *     LIVE_STARTED/ENDED    -> LIVE_ROOM_EVENT.STATUS (`reason` on LIVE_ENDED)
 *     STREAM_STATE_UPDATED  -> LIVE_ROOM_EVENT.STREAM (host media up/down on SRS)
 *   Without a media server, subscribing is what counts a viewer; with one, starting WebRTC playback does.
 *   Comments are sent over REST (validated, persisted, then broadcast).
 *   Guests have no WebSocket session, so they (and anyone whose socket drops) poll REST instead.
 */

function parseFrame(frame) {
  try {
    return JSON.parse(frame.body)
  } catch {
    return null
  }
}

export function createApiLiveRoomChannel({ liveId, token }) {
  let listener = null
  let client = null
  let pollTimer = 0
  let retryTimer = 0
  let disposed = false
  let ended = false
  let lastCommentId = 0

  const emit = (type, payload) => listener?.onEvent?.({ type, payload })
  const setState = (state) => listener?.onStateChange?.(state)

  const emitComment = (comment) => {
    const numericId = Number(comment.id)
    if (Number.isFinite(numericId) && numericId > lastCommentId) lastCommentId = numericId
    emit(LIVE_ROOM_EVENT.COMMENT, comment)
  }

  const applyStatus = (status, reason) => {
    emit(LIVE_ROOM_EVENT.STATUS, reason ? { status, reason } : { status })
    if (status !== LIVE_STATUS.ENDED) return
    ended = true
    stopPolling()
    clearTimeout(retryTimer)
    void client?.deactivate()
    client = null
  }

  const handleEvent = (event) => {
    const payload = event?.payload ?? {}
    switch (event?.type) {
      case 'COMMENT_CREATED':
        emitComment(normalizeLiveComment(payload, liveId))
        break
      case 'COMMENT_DELETED':
        emit(LIVE_ROOM_EVENT.COMMENT_DELETED, { id: String(payload.commentId) })
        break
      case 'VIEWER_COUNT_UPDATED':
        emit(LIVE_ROOM_EVENT.VIEWER_COUNT, { count: Number(payload.viewerCount) || 0 })
        break
      case 'LIKE_UPDATED':
        emit(LIVE_ROOM_EVENT.LIKE_COUNT, { count: Number(payload.likeCount) || 0 })
        break
      case 'LIVE_STARTED':
      case 'LIVE_ENDED':
        applyStatus(normalizeLiveStatus(payload.status), payload.reason)
        break
      case 'STREAM_STATE_UPDATED':
        emit(LIVE_ROOM_EVENT.STREAM, {
          publishing: Boolean(payload.publishing),
          reconnectDeadline: payload.reconnectDeadline ?? null,
        })
        break
      default:
        break
    }
  }

  /** Loads the latest history first, then only comments newer than the last one seen. */
  const catchUpComments = async () => {
    const page = await liveApi.getComments(liveId, lastCommentId ? { afterId: lastCommentId } : {}, token)
    if (!disposed) page.items.forEach(emitComment)
  }

  function stopPolling() {
    clearTimeout(pollTimer)
    pollTimer = 0
  }

  const poll = async () => {
    pollTimer = 0
    if (disposed || ended || client) return
    try {
      const [, stats] = await Promise.all([catchUpComments(), liveApi.getStats(liveId, token)])
      if (disposed || client) return
      emit(LIVE_ROOM_EVENT.VIEWER_COUNT, { count: stats.viewerCount })
      emit(LIVE_ROOM_EVENT.LIKE_COUNT, { count: stats.likeCount })
      if (typeof stats.publishing === 'boolean') {
        emit(LIVE_ROOM_EVENT.STREAM, { publishing: stats.publishing, reconnectDeadline: null })
      }
      if (stats.status !== LIVE_STATUS.LIVE) applyStatus(stats.status)
      setState(LIVE_CONNECTION_STATE.CONNECTED)
    } catch {
      if (!disposed) setState(LIVE_CONNECTION_STATE.ERROR)
    }
    if (!disposed && !ended && !client && !pollTimer) {
      pollTimer = setTimeout(poll, LIVE_REALTIME.POLL_INTERVAL_MS)
    }
  }

  const startPolling = () => {
    if (!pollTimer) void poll()
  }

  const scheduleSocketRetry = () => {
    clearTimeout(retryTimer)
    retryTimer = setTimeout(() => void openSocket(), LIVE_REALTIME.SOCKET_RETRY_MS)
  }

  async function openSocket() {
    if (disposed || ended || !token) return
    const wsToken = await resolveRealtimeWsToken(token).catch(() => null)
    if (disposed || ended) return
    if (!wsToken) {
      startPolling()
      return
    }
    const stomp = createStompClient(
      wsToken,
      (connected) => {
        if (disposed) return
        connected.subscribe(LIVE_REALTIME.topic(liveId), (frame) => handleEvent(parseFrame(frame)))
        stopPolling()
        setState(LIVE_CONNECTION_STATE.CONNECTED)
        void catchUpComments().catch(() => {})
      },
      {
        onDisconnect: () => {
          if (client === stomp) client = null
          if (disposed || ended) return
          startPolling()
          scheduleSocketRetry()
        },
      },
    )
    client = stomp
    stomp.activate()
  }

  return {
    connect(nextListener) {
      listener = nextListener
      setState(LIVE_CONNECTION_STATE.CONNECTING)
      if (token) void openSocket()
      else startPolling()
    },
    async sendComment({ text, clientId }) {
      const comment = await liveApi.postComment(liveId, text, token, clientId)
      return { ...comment, clientId }
    },
    disconnect() {
      disposed = true
      listener = null
      stopPolling()
      clearTimeout(retryTimer)
      void client?.deactivate()
      client = null
    },
  }
}

/** @returns {LiveRoomChannel} */
export function createLiveRoomChannel({ liveId, token, initialViewerCount }) {
  if (liveDataSource === LIVE_DATA_SOURCE.API) {
    return createApiLiveRoomChannel({ liveId, token })
  }
  return createMockLiveRoomChannel({ liveId, initialViewerCount })
}
