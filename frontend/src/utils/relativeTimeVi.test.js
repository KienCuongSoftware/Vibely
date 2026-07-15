import { describe, expect, it, vi, afterEach } from 'vitest'
import { formatApiDateTimeVi, formatRelativeTimeVi, parseApiDateTime } from './relativeTimeVi.js'

describe('parseApiDateTime', () => {
  afterEach(() => {
    vi.useRealTimers()
  })

  it('treats naive ISO from API as UTC', () => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-09T14:38:00+07:00'))

    const parsed = parseApiDateTime('2026-07-09T07:38:00')
    expect(parsed?.toISOString()).toBe('2026-07-09T07:38:00.000Z')
    expect(formatRelativeTimeVi('2026-07-09T07:38:00')).toBe('Vừa xong')
  })

  it('keeps explicit offset timestamps', () => {
    const parsed = parseApiDateTime('2026-07-09T07:38:00Z')
    expect(parsed?.toISOString()).toBe('2026-07-09T07:38:00.000Z')
  })

  it('formatApiDateTimeVi shows local VN wall clock from UTC instant', () => {
    // 17:26 UTC → 00:26 next day in Asia/Ho_Chi_Minh
    const label = formatApiDateTimeVi('2026-07-15T17:26:00')
    expect(label).toMatch(/16\/07\/2026/)
    expect(label).toMatch(/00:26|0:26/)
  })
})
