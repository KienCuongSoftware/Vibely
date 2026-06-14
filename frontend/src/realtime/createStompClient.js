import { Client } from '@stomp/stompjs'
import { resolveWsUrl } from './wsUrl.js'

/**
 * STOMP client for Spring `/ws`. Uses an explicit WebSocket factory so Vite ESM
 * does not resolve a broken broker URL against the stomp bundle path.
 */
export function createStompClient(token, onConnect) {
  const wsUrl = resolveWsUrl(token)
  let authFailed = false

  const client = new Client({
    webSocketFactory: () => new WebSocket(wsUrl),
    reconnectDelay: 2500,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
  })

  client.onConnect = (frame) => {
    authFailed = false
    onConnect?.(client, frame)
  }
  client.onStompError = () => {
    authFailed = true
    client.reconnectDelay = 0
    client.deactivate()
  }
  client.onWebSocketError = () => {
    if (authFailed) return
    authFailed = true
    client.reconnectDelay = 0
    client.deactivate()
  }

  return client
}
