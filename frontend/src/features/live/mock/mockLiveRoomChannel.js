import { LIVE_CONNECTION_STATE, LIVE_ROOM_EVENT } from '@/features/live/constants/liveConstants.js'
import {
  MOCK_CHAT_AUTHORS,
  MOCK_CHAT_LINES,
  MOCK_REALTIME,
} from '@/features/live/mock/liveMockData.js'

const pick = (list) => list[Math.floor(Math.random() * list.length)]

let mockCommentSeq = 0

function buildMockComment(liveId, createdAt = new Date()) {
  mockCommentSeq += 1
  return {
    id: `mock-room-comment-${mockCommentSeq}`,
    liveId,
    text: pick(MOCK_CHAT_LINES),
    createdAt: createdAt.toISOString(),
    author: { ...pick(MOCK_CHAT_AUTHORS) },
  }
}

/**
 * Mock implementation of the `LiveRoomChannel` interface (see `services/liveRoomChannel.js`).
 * Emits simulated room activity with timers — no socket is opened.
 */
export function createMockLiveRoomChannel({ liveId, initialViewerCount = 0 }) {
  const timers = new Set()
  let listener = null
  let viewerCount = Math.max(0, Number(initialViewerCount) || 0)
  let active = false

  const emit = (type, payload) => {
    if (active) listener?.onEvent?.({ type, payload })
  }

  const schedule = (fn, ms, repeat = false) => {
    const id = repeat ? setInterval(fn, ms) : setTimeout(fn, ms)
    timers.add({ id, repeat })
  }

  const clearTimers = () => {
    timers.forEach(({ id, repeat }) => (repeat ? clearInterval(id) : clearTimeout(id)))
    timers.clear()
  }

  return {
    connect(nextListener) {
      listener = nextListener
      active = true
      listener?.onStateChange?.(LIVE_CONNECTION_STATE.CONNECTING)

      schedule(() => {
        listener?.onStateChange?.(LIVE_CONNECTION_STATE.CONNECTED)
        const now = Date.now()
        for (let index = MOCK_REALTIME.INITIAL_COMMENT_COUNT; index > 0; index -= 1) {
          emit(
            LIVE_ROOM_EVENT.COMMENT,
            buildMockComment(liveId, new Date(now - index * MOCK_REALTIME.COMMENT_INTERVAL_MS)),
          )
        }
      }, MOCK_REALTIME.NETWORK_DELAY_MS)

      schedule(() => emit(LIVE_ROOM_EVENT.COMMENT, buildMockComment(liveId)), MOCK_REALTIME.COMMENT_INTERVAL_MS, true)

      schedule(() => {
        const drift = Math.round(viewerCount * MOCK_REALTIME.VIEWER_DRIFT_RATIO * (Math.random() * 2 - 1))
        viewerCount = Math.max(0, viewerCount + drift)
        emit(LIVE_ROOM_EVENT.VIEWER_COUNT, { count: viewerCount })
      }, MOCK_REALTIME.VIEWER_INTERVAL_MS, true)
    },

    async sendComment({ text, clientId, author }) {
      await new Promise((resolve) => setTimeout(resolve, MOCK_REALTIME.NETWORK_DELAY_MS))
      const comment = {
        id: `mock-own-comment-${clientId}`,
        clientId,
        liveId,
        text,
        createdAt: new Date().toISOString(),
        author,
      }
      emit(LIVE_ROOM_EVENT.COMMENT, comment)
      return comment
    },

    disconnect() {
      active = false
      clearTimers()
      listener?.onStateChange?.(LIVE_CONNECTION_STATE.IDLE)
      listener = null
    },
  }
}
