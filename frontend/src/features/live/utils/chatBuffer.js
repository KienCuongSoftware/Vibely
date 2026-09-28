import { LIVE_CHAT } from '@/features/live/constants/liveConstants.js'

/**
 * Appends incoming comments, reconciling optimistic ones by `clientId`
 * and dropping duplicates by `id`. Keeps only the newest `max` messages.
 */
export function appendChatMessages(current, incoming, max = LIVE_CHAT.MAX_BUFFERED_MESSAGES) {
  if (!incoming.length) return current
  const next = current.slice()
  const idIndex = new Map()
  next.forEach((message, index) => {
    if (message.id) idIndex.set(message.id, index)
    if (message.clientId) idIndex.set(`client:${message.clientId}`, index)
  })

  for (const message of incoming) {
    const clientKey = message.clientId ? `client:${message.clientId}` : null
    const existing = clientKey && idIndex.has(clientKey)
      ? idIndex.get(clientKey)
      : idIndex.get(message.id)
    if (existing !== undefined) {
      next[existing] = { ...next[existing], ...message, pending: false, failed: false }
      continue
    }
    idIndex.set(message.id, next.length)
    if (clientKey) idIndex.set(clientKey, next.length)
    next.push(message)
  }

  return next.length > max ? next.slice(next.length - max) : next
}

export function markChatMessageFailed(current, clientId) {
  return current.map((message) =>
    message.clientId === clientId ? { ...message, pending: false, failed: true } : message,
  )
}
