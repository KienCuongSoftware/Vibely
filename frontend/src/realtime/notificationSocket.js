import { Client } from '@stomp/stompjs'
import { resolveWsUrl } from './wsUrl.js'

export function createNotificationSocketClient(token, onEvent) {
  const client = new Client({
    brokerURL: resolveWsUrl(token),
    reconnectDelay: 2500,
    heartbeatIncoming: 10000,
    heartbeatOutgoing: 10000,
    debug: () => {},
  })

  client.onConnect = () => {
    client.subscribe('/user/queue/notifications', (frame) => {
      try {
        const payload = JSON.parse(frame.body)
        onEvent?.(payload)
      } catch {
        /* ignore invalid payload */
      }
    })
  }

  client.onStompError = () => {}
  client.onWebSocketError = () => {}

  return client
}
