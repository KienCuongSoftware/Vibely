import { describe, expect, it } from 'vitest'
import { formatNotificationBadgeCount } from './notificationBadge.js'

describe('formatNotificationBadgeCount', () => {
  it('caps display at 99+', () => {
    expect(formatNotificationBadgeCount(0)).toBe('')
    expect(formatNotificationBadgeCount(1)).toBe('1')
    expect(formatNotificationBadgeCount(99)).toBe('99')
    expect(formatNotificationBadgeCount(100)).toBe('99+')
    expect(formatNotificationBadgeCount(500)).toBe('99+')
  })
})
