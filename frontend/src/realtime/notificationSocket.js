import { createStompClient } from './createStompClient.js'

export function createNotificationSocketClient(token, onEvent, options = {}) {
  const client = createStompClient(token, (connected) => {
    connected.subscribe('/user/queue/notifications', (frame) => {
      try {
        const payload = JSON.parse(frame.body)
        onEvent?.(payload)
      } catch {
        /* ignore invalid payload */
      }
    })
  }, options)

  return client
}
