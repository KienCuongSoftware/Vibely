import { describe, expect, it } from 'vitest'
import { computeChatInboxBadgeCount } from './chatInboxBadge.js'

describe('computeChatInboxBadgeCount', () => {
  it('counts each message request as 1', () => {
    expect(
      computeChatInboxBadgeCount([{ messageRequest: true, unreadCount: 0 }]),
    ).toBe(1)
  })

  it('sums unread for normal conversations', () => {
    expect(
      computeChatInboxBadgeCount([
        { messageRequest: false, unreadCount: 2 },
        { messageRequest: false, unreadCount: 3 },
      ]),
    ).toBe(5)
  })

  it('combines requests and unread', () => {
    expect(
      computeChatInboxBadgeCount([
        { messageRequest: true, unreadCount: 4 },
        { messageRequest: false, unreadCount: 2 },
      ]),
    ).toBe(3)
  })
})
