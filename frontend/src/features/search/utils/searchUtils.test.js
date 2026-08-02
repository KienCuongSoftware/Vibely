import { describe, expect, it } from 'vitest'
import {
  buildHashtagHref,
  buildProfileHref,
  buildSearchResultsHref,
  buildVideoHref,
  normalizeSearchQuery,
  resolveVideoSearchCaption,
  suggestKeywordMatchesQuery,
} from '@/features/search/utils/searchUtils'

describe('searchUtils', () => {
  it('normalizes whitespace, strips hashtag, and lowercases', () => {
    expect(normalizeSearchQuery('  #dance  ')).toBe('dance')
    expect(normalizeSearchQuery('hello   world')).toBe('hello world')
    expect(normalizeSearchQuery('Music')).toBe('music')
    expect(normalizeSearchQuery('Hình Nền Động')).toBe('hình nền động')
  })

  it('sanitizes unsafe characters and caps length', () => {
    expect(normalizeSearchQuery('hello<script>')).toBe('helloscript')
    expect(normalizeSearchQuery("a\"b'c`d")).toBe('abcd')
    expect(normalizeSearchQuery('a\nb\tc')).toBe('a b c')
    expect(normalizeSearchQuery('x'.repeat(250))).toHaveLength(200)
  })

  it('prefers description over auto-generated file titles', () => {
    expect(
      resolveVideoSearchCaption({
        title: 'snaptik.vn_7608787640745331975',
        description: 'bùa yêu #lyrics #gfx #fyp',
      }),
    ).toBe('bùa yêu #lyrics #gfx #fyp')
    expect(
      resolveVideoSearchCaption({
        title: 'snaptik.vn_7608787640745331975',
        description: '',
      }),
    ).toBe('Xem video')
  })

  it('matches suggest keywords only when related to typed query', () => {
    expect(suggestKeywordMatchesQuery('admin.vibely', 'kiencuonh')).toBe(false)
    expect(suggestKeywordMatchesQuery('kiencuongdev', 'kiencuong')).toBe(true)
    expect(suggestKeywordMatchesQuery('dance', 'dance')).toBe(true)
  })

  it('builds profile and hashtag routes', () => {
    expect(buildProfileHref('@creator')).toBe('/@creator')
    expect(buildHashtagHref('#dance')).toBe('/tag/dance')
    expect(buildVideoHref('550e8400-e29b-41d4-a716-446655440000')).toContain(
      '550e8400-e29b-41d4-a716-446655440000',
    )
    expect(buildSearchResultsHref('hello world')).toBe(
      '/search?q=hello%20world',
    )
  })
})
