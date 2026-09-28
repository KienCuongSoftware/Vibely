import { useCallback, useEffect, useRef, useState } from 'react'
import {
  LIVE_CONNECTION_STATE,
  LIVE_LIMITS,
  LIVE_ROOM_EVENT,
} from '@/features/live/constants/liveConstants.js'
import { appendChatMessages, markChatMessageFailed } from '@/features/live/utils/chatBuffer.js'

const createClientId = () =>
  globalThis.crypto?.randomUUID?.() ?? `c-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`

function toAuthor(user) {
  return {
    id: String(user?.id ?? 'me'),
    username: user?.username ?? '',
    displayName: user?.displayName || user?.fullName || user?.username || '',
    avatarUrl: user?.avatarUrl ?? null,
    verified: Boolean(user?.verified),
  }
}

/**
 * Chat state for a room: bounded message buffer, frame-batched incoming
 * messages and optimistic sending.
 */
export function useLiveChat({ room, user }) {
  const [messages, setMessages] = useState([])
  const queueRef = useRef([])
  const frameRef = useRef(0)

  useEffect(() => {
    const flush = () => {
      frameRef.current = 0
      const batch = queueRef.current
      queueRef.current = []
      setMessages((prev) => appendChatMessages(prev, batch))
    }
    const unsubscribe = room.subscribe(LIVE_ROOM_EVENT.COMMENT, (comment) => {
      queueRef.current.push(comment)
      if (!frameRef.current) frameRef.current = requestAnimationFrame(flush)
    })
    return () => {
      unsubscribe()
      if (frameRef.current) cancelAnimationFrame(frameRef.current)
      frameRef.current = 0
      queueRef.current = []
    }
  }, [room.subscribe])

  useEffect(
    () =>
      room.subscribe(LIVE_ROOM_EVENT.COMMENT_DELETED, (payload) => {
        if (!payload?.id) return
        setMessages((prev) => prev.filter((message) => message.id !== payload.id))
      }),
    [room.subscribe],
  )

  const deliver = useCallback(
    async (text, clientId) => {
      try {
        const accepted = await room.sendComment({ text, clientId, author: toAuthor(user) })
        setMessages((prev) => appendChatMessages(prev, [{ ...accepted, clientId }]))
      } catch {
        setMessages((prev) => markChatMessageFailed(prev, clientId))
      }
    },
    [room.sendComment, user],
  )

  const sendComment = useCallback(
    (rawText) => {
      const text = String(rawText ?? '').trim()
      if (!text || text.length > LIVE_LIMITS.COMMENT_MAX) return false
      const clientId = createClientId()
      setMessages((prev) =>
        appendChatMessages(prev, [
          {
            id: `local-${clientId}`,
            clientId,
            text,
            createdAt: new Date().toISOString(),
            author: toAuthor(user),
            pending: true,
          },
        ]),
      )
      void deliver(text, clientId)
      return true
    },
    [deliver, user],
  )

  const retryComment = useCallback(
    (message) => {
      if (!message?.clientId) return
      setMessages((prev) =>
        prev.map((item) =>
          item.clientId === message.clientId ? { ...item, pending: true, failed: false } : item,
        ),
      )
      void deliver(message.text, message.clientId)
    },
    [deliver],
  )

  const status =
    room.connectionState === LIVE_CONNECTION_STATE.ERROR
      ? 'error'
      : room.connectionState === LIVE_CONNECTION_STATE.CONNECTING && messages.length === 0
        ? 'loading'
        : 'ready'

  return { messages, status, sendComment, retryComment }
}
