import { describe, expect, it } from 'vitest'
import {
  filterVideosFromFollowedCreators,
  isVideoFromFollowedCreator,
} from './feedFollowState.js'

describe('feedFollowState following feed filter', () => {
  it('keeps videos from followed creators only', () => {
    const followed = new Set([7, 9])
    const items = [
      { authorId: 7, followedByViewer: true, publicId: 'a' },
      { authorId: 99, followedByViewer: false, publicId: 'b' },
      { authorId: 9, followedByViewer: false, publicId: 'c' },
    ]
    const filtered = filterVideosFromFollowedCreators(items, followed)
    expect(filtered.map((v) => v.publicId)).toEqual(['a', 'c'])
  })

  it('uses followedByViewer from API', () => {
    expect(
      isVideoFromFollowedCreator({ authorId: 1, followedByViewer: true }, new Set()),
    ).toBe(true)
    expect(
      isVideoFromFollowedCreator({ authorId: 1, followedByViewer: false }, new Set()),
    ).toBe(false)
  })
})
