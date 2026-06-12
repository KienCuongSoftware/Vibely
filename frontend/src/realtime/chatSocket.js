import { createStompClient } from './createStompClient.js'

export function createChatSocketClient(token, onMessageEvent) {
  const client = createStompClient(token, (connected) => {
    connected.subscribe('/user/queue/chat.messages', (frame) => {
      try {
        const payload = JSON.parse(frame.body)
        onMessageEvent?.(payload)
      } catch {
        /* ignore invalid payload */
      }
    })
  })

  return client
}
