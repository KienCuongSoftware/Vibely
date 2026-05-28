import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  FOLLOWING_PREFER_FEED_FLAG,
  FOLLOWING_SHOW_FEED_FLAG,
  clearFollowingVideoFeedFlag,
  clearFollowingPreferFeedFromSidebar,
  markFollowingPreferFeedFromSidebar,
  peekFollowingPreferFeedFromSidebar,
  resolveFollowingViewMode,
  shouldShowFollowingVideoFeed,
  syncFollowingFeedFlagOnDocumentLoad,
} from './followingPageView.js'

vi.mock('../api/client.js', () => ({
  apiClient: {
    getSuggestedCreators: vi.fn(),
    getFollowingFeed: vi.fn(),
  },
}))

import { apiClient } from '../api/client.js'

describe('followingPageView', () => {
  beforeEach(() => {
    sessionStorage.clear()
    vi.clearAllMocks()
    vi.stubGlobal('performance', {
      getEntriesByType: vi.fn(() => [{ type: 'navigate' }]),
    })
    Object.defineProperty(window, 'location', {
      value: { pathname: '/foryou' },
      writable: true,
      configurable: true,
    })
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('sets feed flag only when document reloads on /following', () => {
    performance.getEntriesByType.mockReturnValue([{ type: 'reload' }])
    window.location.pathname = '/following'
    syncFollowingFeedFlagOnDocumentLoad()
    expect(shouldShowFollowingVideoFeed()).toBe(true)

    performance.getEntriesByType.mockReturnValue([{ type: 'reload' }])
    window.location.pathname = '/foryou'
    syncFollowingFeedFlagOnDocumentLoad()
    expect(shouldShowFollowingVideoFeed()).toBe(false)
  })

  it('sidebar prefer flag clears after resolve', () => {
    markFollowingPreferFeedFromSidebar()
    expect(peekFollowingPreferFeedFromSidebar()).toBe(true)
    clearFollowingPreferFeedFromSidebar()
    expect(peekFollowingPreferFeedFromSidebar()).toBe(false)
  })

  it('returns feed when preferFeed and followed creators have videos', async () => {
    apiClient.getSuggestedCreators.mockResolvedValue({ viewerFollowingCount: 2 })
    apiClient.getFollowingFeed.mockResolvedValue({
      items: [{ publicId: '018fc2c7-f2e9-7a41-b9d7-0123456789ab' }],
    })

    const mode = await resolveFollowingViewMode('token', { preferFeed: true })
    expect(mode).toBe('feed')
    expect(apiClient.getFollowingFeed).toHaveBeenCalled()
  })

  it('returns grid when preferFeed but no videos from follows', async () => {
    apiClient.getSuggestedCreators.mockResolvedValue({ viewerFollowingCount: 1 })
    apiClient.getFollowingFeed.mockResolvedValue({ items: [] })

    const mode = await resolveFollowingViewMode('token', { preferFeed: true })
    expect(mode).toBe('grid')
  })

  it('returns grid without preferFeed even if user follows someone', async () => {
    apiClient.getSuggestedCreators.mockResolvedValue({ viewerFollowingCount: 1 })

    const mode = await resolveFollowingViewMode('token', { preferFeed: false })
    expect(mode).toBe('grid')
    expect(apiClient.getFollowingFeed).not.toHaveBeenCalled()
  })

  it('clears reload flag after consuming', async () => {
    sessionStorage.setItem(FOLLOWING_SHOW_FEED_FLAG, '1')
    apiClient.getSuggestedCreators.mockResolvedValue({ viewerFollowingCount: 1 })
    apiClient.getFollowingFeed.mockResolvedValue({
      items: [{ publicId: '018fc2c7-f2e9-7a41-b9d7-0123456789ab' }],
    })

    await resolveFollowingViewMode('token', { preferFeed: false })
    expect(shouldShowFollowingVideoFeed()).toBe(false)
    clearFollowingVideoFeedFlag()
  })
})
