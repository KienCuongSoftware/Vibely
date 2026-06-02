import { describe, expect, it } from 'vitest'
import { buildSearchNavItems } from './SearchSuggestionList'

describe('buildSearchNavItems', () => {
  it('prioritizes history items when showHistory is true', () => {
    const items = buildSearchNavItems({
      showHistory: true,
      historyItems: [{ id: 1, query: 'dance' }],
      suggest: { trending: [{ keyword: 'vibely' }], users: [], hashtags: [], videos: [] },
    })
    expect(items).toHaveLength(1)
    expect(items[0].type).toBe('history')
  })

  it('flattens suggest groups when not showing history', () => {
    const items = buildSearchNavItems({
      showHistory: false,
      historyItems: [],
      suggest: {
        trending: [{ keyword: 'a' }],
        users: [{ id: 2, username: 'u' }],
        hashtags: [{ id: 3, tag: 'tag' }],
        videos: [{ publicId: 'v1' }],
      },
    })
    expect(items.map((row) => row.type)).toEqual([
      'trending',
      'user',
      'hashtag',
      'video',
    ])
  })
})
