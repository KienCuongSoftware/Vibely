import { describe, expect, it } from 'vitest'
import { formatNotificationBadgeCount, formatUnreadDocumentTitle } from '@/features/notification/utils/notificationBadge.js'

describe('formatNotificationBadgeCount', () => {
  it('caps display at 99+', () => {
    expect(formatNotificationBadgeCount(0)).toBe('')
    expect(formatNotificationBadgeCount(1)).toBe('1')
    expect(formatNotificationBadgeCount(99)).toBe('99')
    expect(formatNotificationBadgeCount(100)).toBe('99+')
    expect(formatNotificationBadgeCount(500)).toBe('99+')
  })
})

describe('formatUnreadDocumentTitle', () => {
  it('prefixes the activity unread count like TikTok', () => {
    expect(formatUnreadDocumentTitle('Vibely - Make Your Day', 0)).toBe('Vibely - Make Your Day')
    expect(formatUnreadDocumentTitle('Vibely - Make Your Day', 1)).toBe('(1) Vibely - Make Your Day')
    expect(formatUnreadDocumentTitle('(1) Vibely - Make Your Day', 19)).toBe('(19) Vibely - Make Your Day')
    expect(formatUnreadDocumentTitle('For You | Vibely', 100)).toBe('(99+) For You | Vibely')
  })
})


describe('formatNotificationBadgeCount', () => {
  it('caps display at 99+', () => {
    expect(formatNotificationBadgeCount(0)).toBe('')
    expect(formatNotificationBadgeCount(1)).toBe('1')
    expect(formatNotificationBadgeCount(99)).toBe('99')
    expect(formatNotificationBadgeCount(100)).toBe('99+')
    expect(formatNotificationBadgeCount(500)).toBe('99+')
  })
})
