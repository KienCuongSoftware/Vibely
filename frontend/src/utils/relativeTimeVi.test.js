import { describe, expect, it, vi, afterEach } from 'vitest'
import { formatRelativeTimeVi, parseApiDateTime } from './relativeTimeVi.js'

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
})
