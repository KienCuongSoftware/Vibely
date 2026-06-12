import { Client } from '@stomp/stompjs'
import { resolveWsUrl } from './wsUrl.js'

/**
 * STOMP client for Spring `/ws`. Uses an explicit WebSocket factory so Vite ESM
 * does not resolve a broken broker URL against the stomp bundle path.
 */
export function createStompClient(token, onConnect) {
  const wsUrl = resolveWsUrl(token)
  const client = new Client({
    webSocketFactory: () => new WebSocket(wsUrl),
    reconnectDelay: 2500,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
  })

  client.onConnect = (frame) => {
    onConnect?.(client, frame)
  }
  client.onStompError = () => {}
  client.onWebSocketError = () => {}

  return client
}
