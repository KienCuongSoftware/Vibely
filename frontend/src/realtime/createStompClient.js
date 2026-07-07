import { Client } from '@stomp/stompjs'
import { resolveWsUrl } from './wsUrl.js'

/**
 * STOMP client for Spring `/ws`. Uses an explicit WebSocket factory so Vite ESM
 * does not resolve a broken broker URL against the stomp bundle path.
 *
 * Auto-reconnect is disabled — callers schedule retries with backoff via realtimeRetry.
 */
export function createStompClient(token, onConnect, { onDisconnect } = {}) {
  const wsUrl = resolveWsUrl(token)
  let disconnectNotified = false

  const notifyDisconnect = () => {
    if (disconnectNotified) return
    disconnectNotified = true
    onDisconnect?.()
  }

  const client = new Client({
    webSocketFactory: () => new WebSocket(wsUrl),
    reconnectDelay: 0,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
  })

  client.onConnect = (frame) => {
    disconnectNotified = false
    onConnect?.(client, frame)
  }

  client.onStompError = () => {
    void client.deactivate()
    notifyDisconnect()
  }

  client.onWebSocketClose = () => {
    notifyDisconnect()
  }

  client.onDisconnect = () => {
    notifyDisconnect()
  }

  return client
}
