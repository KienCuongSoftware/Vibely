import { describe, expect, it } from 'vitest'
import { deltaOf, formatMetricDeltaLabel, previousPeriodTotal } from '@/features/studio/utils/studioMetricDelta.js'

describe('deltaOf', () => {
  it('shows 0% when both periods are empty', () => {
    expect(deltaOf(0, 0)).toEqual({ diff: 0, percent: 0 })
  })

  it('treats growth from zero as 100%', () => {
    expect(deltaOf(2, 0)).toEqual({ diff: 2, percent: 100 })
  })

  it('computes percent vs the previous period', () => {
    expect(deltaOf(2, 1)).toEqual({ diff: 1, percent: 100 })
    expect(deltaOf(1, 2)).toEqual({ diff: -1, percent: -50 })
  })
})

describe('previousPeriodTotal', () => {
  it('subtracts the current window from the doubled window', () => {
    expect(previousPeriodTotal(3, 2)).toBe(1)
    expect(previousPeriodTotal(2, 2)).toBe(0)
  })
})

describe('formatMetricDeltaLabel', () => {
  it('matches TikTok empty integer metrics', () => {
    expect(formatMetricDeltaLabel(0, 0).text).toBe('0 (--)')
  })

  it('shows percent when the current period has data', () => {
    expect(formatMetricDeltaLabel(2, 0).text).toBe('+2 (100.0%)')
    expect(formatMetricDeltaLabel(8, 5).text).toBe('+3 (60.0%)')
    expect(formatMetricDeltaLabel(1, 2).text).toBe('-1 (50.0%)')
  })

  it('always shows a percent for estimated rewards', () => {
    expect(formatMetricDeltaLabel(0, 0, { money: true }).text).toBe('$0.00 (0.0%)')
  })
})
