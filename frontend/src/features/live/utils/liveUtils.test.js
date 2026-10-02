import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { appendChatMessages, markChatMessageFailed } from '@/features/live/utils/chatBuffer.js'
import { formatLiveViewerCount } from '@/features/live/utils/formatLiveCount.js'
import { createLikeBatcher } from '@/features/live/utils/likeBatcher.js'
import { removeFromDiscovery } from '@/features/live/utils/removeFromDiscovery.js'
import { availableLiveCategories } from '@/features/live/utils/availableLiveCategories.js'

describe('availableLiveCategories', () => {
  const ids = (lives) => availableLiveCategories(lives).map((category) => category.id)

  it('shows no tab when nobody is live', () => {
    expect(ids([])).toEqual([])
    expect(ids(undefined)).toEqual([])
  })

  it('keeps only tabs with a broadcasting LIVE, groups included', () => {
    expect(ids([{ id: '1', categoryId: 'pubg', host: { followedByViewer: false } }])).toEqual([
      'recommended',
      'gaming',
      'pubg',
    ])
  })

  it('shows Following only when a followed host is live', () => {
    expect(ids([{ id: '1', categoryId: 'chat', host: { followedByViewer: true } }])).toEqual([
      'recommended',
      'following',
      'lifestyle',
      'chat',
    ])
  })
})

describe('removeFromDiscovery', () => {
  it('drops an ended LIVE from every rail', () => {
    const a = { id: 'a' }
    const b = { id: 'b' }
    const result = removeFromDiscovery(
      { featured: [a, b], recommended: [b], sections: [{ id: 'gaming', items: [a] }], recommendedHosts: [a, b], allLives: [a, b] },
      'a',
    )
    expect(result).toEqual({
      featured: [b],
      recommended: [b],
      sections: [{ id: 'gaming', items: [] }],
      recommendedHosts: [b],
      allLives: [b],
    })
    expect(removeFromDiscovery(null, 'a')).toBeNull()
  })
})

describe('formatLiveViewerCount', () => {
  it.each([
    [0, '0'],
    [999, '999'],
    [1200, '1.2K'],
    [12000, '12K'],
    [1200000, '1.2M'],
    [15000000, '15M'],
  ])('formats %s as %s', (input, expected) => {
    expect(formatLiveViewerCount(input)).toBe(expected)
  })
})

describe('createLikeBatcher', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('aggregates rapid taps into one flush per window', async () => {
    const flush = vi.fn()
    const batcher = createLikeBatcher({ flush, windowMs: 1000 })
    for (let i = 0; i < 7; i += 1) batcher.add()
    expect(flush).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1000)
    expect(flush).toHaveBeenCalledTimes(1)
    expect(flush).toHaveBeenCalledWith(7)
  })

  it('caps each batch and flushes the rest on dispose', async () => {
    const flush = vi.fn()
    const batcher = createLikeBatcher({ flush, windowMs: 1000, maxBatch: 3 })
    batcher.add(5)
    batcher.dispose()
    await Promise.resolve()
    await Promise.resolve()
    expect(flush.mock.calls.map(([count]) => count)).toEqual([3, 2])
    batcher.add()
    await vi.advanceTimersByTimeAsync(2000)
    expect(flush).toHaveBeenCalledTimes(2)
  })
})

describe('appendChatMessages', () => {
  const msg = (id, extra = {}) => ({ id, text: id, ...extra })

  it('drops the oldest messages beyond the buffer size', () => {
    const next = appendChatMessages([msg('a'), msg('b')], [msg('c'), msg('d')], 3)
    expect(next.map((m) => m.id)).toEqual(['b', 'c', 'd'])
  })

  it('reconciles optimistic messages by clientId and ignores duplicates', () => {
    const pending = msg('tmp-1', { clientId: 'c1', pending: true })
    let next = appendChatMessages([pending], [msg('srv-1', { clientId: 'c1' })])
    expect(next).toHaveLength(1)
    expect(next[0]).toMatchObject({ id: 'srv-1', pending: false })
    next = appendChatMessages(next, [msg('srv-1', { clientId: 'c1' })])
    expect(next).toHaveLength(1)
  })

  it('marks a failed optimistic message', () => {
    const next = markChatMessageFailed([msg('tmp', { clientId: 'x', pending: true })], 'x')
    expect(next[0]).toMatchObject({ pending: false, failed: true })
  })
})