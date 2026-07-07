import { Client } from '@stomp/stompjs'
import { resolveWsUrl } from './wsUrl.js'

const DEFAULT_RECONNECT_DELAY_MS = 8000
const MAX_RECONNECT_DELAY_MS = 60000

/**
 * STOMP client for Spring `/ws`. Uses an explicit WebSocket factory so Vite ESM
 * does not resolve a broken broker URL against the stomp bundle path.
 */
export function createStompClient(token, onConnect) {
  const wsUrl = resolveWsUrl(token)

  const client = new Client({
    webSocketFactory: () => new WebSocket(wsUrl),
    reconnectDelay: DEFAULT_RECONNECT_DELAY_MS,
    maxReconnectDelay: MAX_RECONNECT_DELAY_MS,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
  })

  client.onConnect = (frame) => {
    onConnect?.(client, frame)
  }
  client.onStompError = () => {
    client.reconnectDelay = 0
    client.deactivate()
  }

  return client
}
