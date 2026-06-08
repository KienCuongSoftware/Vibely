import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { FeedPage } from './FeedPage'
import { AuthContext } from '../state/auth-context'
import { MemoryRouter } from 'react-router-dom'

vi.mock('../api/client', () => ({
  apiClient: {
    getFeed: vi.fn(),
    getFollowingFeed: vi.fn(),
    getMyUploadedVideos: vi.fn(),
    getVideoMeState: vi.fn(),
    getComments: vi.fn(),
    likeVideo: vi.fn(),
    follow: vi.fn(),
    addComment: vi.fn(),
    reportVideo: vi.fn(),
    recordVideoView: vi.fn().mockResolvedValue(undefined),
  },
}))

import { apiClient } from '../api/client'

describe('FeedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.sessionStorage.clear()
    apiClient.getComments.mockResolvedValue([])
    apiClient.getMyUploadedVideos.mockResolvedValue({ items: [], hasNext: false })
    apiClient.getVideoMeState.mockResolvedValue({ liked: false, bookmarked: false })
  })

  it('loads the latest feed on mount', async () => {
    apiClient.getFeed.mockResolvedValue({
      items: [],
      page: 0,
      size: 5,
      total: 0,
      hasNext: false,
      sort: 'latest',
    })
    apiClient.getFollowingFeed.mockResolvedValue({
      items: [],
      page: 0,
      size: 5,
      total: 0,
      hasNext: false,
      sort: 'following',
    })

    render(
      <MemoryRouter initialEntries={['/foryou']}>
        <AuthContext.Provider
          value={{
            token: 'token',
            refreshToken: 'refresh',
            user: null,
            login: vi.fn(),
            register: vi.fn(),
            refreshSession: vi.fn(),
            refreshProfile: vi.fn(),
            logout: vi.fn(),
            authReady: true,
          }}
        >
          <FeedPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(apiClient.getFeed).toHaveBeenCalled()
    })
  })

  it('keeps the left sidebar visible when the comments panel is open', async () => {
    apiClient.getFeed.mockResolvedValue({
      items: [
        {
          publicId: '018fc2c7-f2e9-7a41-b9d7-0123456789ab',
          authorId: 1,
          authorUsername: 'demo_creator',
          authorDisplayName: 'Demo',
          authorAvatarUrl: '',
          title: 'Clip test',
          description: '',
          videoUrl: 'https://example.com/clip.mp4',
          thumbnailUrl: '',
          audioUrl: '',
          audioTitle: '',
          likeCount: 0,
          commentCount: 0,
          bookmarkCount: 0,
          shareCount: 0,
          createdAt: '2026-01-01T12:00:00',
          status: 'READY',
          masterPlaylistUrl: null,
          durationSeconds: 10,
          processingError: null,
        },
      ],
      page: 0,
      size: 8,
      total: 1,
      hasNext: false,
      sort: 'latest',
    })

    render(
      <MemoryRouter initialEntries={['/foryou']}>
        <AuthContext.Provider
          value={{
            token: null,
            refreshToken: null,
            user: null,
            login: vi.fn(),
            register: vi.fn(),
            refreshSession: vi.fn(),
            refreshProfile: vi.fn(),
            logout: vi.fn(),
            authReady: true,
          }}
        >
          <FeedPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Bình luận' }))

    expect(screen.getByRole('navigation')).toBeInTheDocument()
    expect(
      screen.getByRole('complementary', { name: /bình luận/i }),
    ).toBeInTheDocument()
  })

  it('links the author avatar to the author profile', async () => {
    apiClient.getFeed.mockResolvedValue({
      items: [
        {
          publicId: '018fc2c7-f2e9-7a41-b9d7-0123456789ab',
          authorId: 1,
          authorUsername: 'demo_creator',
          authorDisplayName: 'Demo',
          authorAvatarUrl: '',
          title: 'Clip test',
          description: '',
          videoUrl: 'https://example.com/clip.mp4',
          thumbnailUrl: '',
          audioUrl: '',
          audioTitle: '',
          likeCount: 0,
          commentCount: 0,
          bookmarkCount: 0,
          shareCount: 0,
          createdAt: '2026-01-01T12:00:00',
          status: 'READY',
          masterPlaylistUrl: null,
          durationSeconds: 10,
          processingError: null,
        },
      ],
      page: 0,
      size: 8,
      total: 1,
      hasNext: false,
      sort: 'latest',
    })

    render(
      <MemoryRouter initialEntries={['/foryou']}>
        <AuthContext.Provider
          value={{
            token: null,
            refreshToken: null,
            user: null,
            login: vi.fn(),
            register: vi.fn(),
            refreshSession: vi.fn(),
            refreshProfile: vi.fn(),
            logout: vi.fn(),
            authReady: true,
          }}
        >
          <FeedPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    const profileLink = await screen.findByRole('link', {
      name: /xem hồ sơ demo_creator/i,
    })

    expect(profileLink).toHaveAttribute('href', '/@demo_creator')
  })

  it('shows a follow success tick for one second after clicking the plus badge', async () => {
    apiClient.getFeed.mockResolvedValue({
      items: [
        {
          publicId: '018fc2c7-f2e9-7a41-b9d7-0123456789ab',
          authorId: 7,
          authorUsername: 'demo_creator',
          authorDisplayName: 'Demo',
          authorAvatarUrl: '',
          title: 'Clip test',
          description: '',
          videoUrl: 'https://example.com/clip.mp4',
          thumbnailUrl: '',
          audioUrl: '',
          audioTitle: '',
          likeCount: 0,
          commentCount: 0,
          bookmarkCount: 0,
          shareCount: 0,
          createdAt: '2026-01-01T12:00:00',
          status: 'READY',
          masterPlaylistUrl: null,
          durationSeconds: 10,
          processingError: null,
        },
      ],
      page: 0,
      size: 8,
      total: 1,
      hasNext: false,
      sort: 'latest',
    })
    apiClient.follow.mockResolvedValue(null)

    render(
      <MemoryRouter initialEntries={['/foryou']}>
        <AuthContext.Provider
          value={{
            token: 'token',
            refreshToken: 'refresh',
            user: { id: 1, username: 'viewer' },
            login: vi.fn(),
            register: vi.fn(),
            refreshSession: vi.fn(),
            refreshProfile: vi.fn(),
            logout: vi.fn(),
            authReady: true,
          }}
        >
          <FeedPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    const followBadge = await screen.findByRole('button', {
      name: /theo dõi demo_creator/i,
    })

    await userEvent.click(followBadge)

    expect(apiClient.follow).toHaveBeenCalledWith(7, 'token')
    expect(
      await screen.findByLabelText(/đã theo dõi demo_creator/i),
    ).toBeInTheDocument()
    await waitFor(() => {
      expect(
        screen.queryByRole('button', { name: /theo dõi demo_creator/i }),
      ).not.toBeInTheDocument()
      expect(
        screen.queryByLabelText(/đã theo dõi demo_creator/i),
      ).not.toBeInTheDocument()
    }, { timeout: 1000 })
  })

  it('keeps the plus badge hidden after returning to feed', async () => {
    const feedPayload = {
      items: [
        {
          publicId: '018fc2c7-f2e9-7a41-b9d7-0123456789ab',
          authorId: 7,
          authorUsername: 'demo_creator',
          authorDisplayName: 'Demo',
          authorAvatarUrl: '',
          title: 'Clip test',
          description: '',
          videoUrl: 'https://example.com/clip.mp4',
          thumbnailUrl: '',
          audioUrl: '',
          audioTitle: '',
          likeCount: 0,
          commentCount: 0,
          bookmarkCount: 0,
          shareCount: 0,
          createdAt: '2026-01-01T12:00:00',
          status: 'READY',
          masterPlaylistUrl: null,
          durationSeconds: 10,
          processingError: null,
        },
      ],
      page: 0,
      size: 8,
      total: 1,
      hasNext: false,
      sort: 'latest',
    }
    apiClient.getFeed.mockResolvedValue(feedPayload)
    apiClient.follow.mockResolvedValue(null)

    const authValue = {
      token: 'token',
      refreshToken: 'refresh',
      user: { id: 1, username: 'viewer' },
      login: vi.fn(),
      register: vi.fn(),
      refreshSession: vi.fn(),
      refreshProfile: vi.fn(),
      logout: vi.fn(),
      authReady: true,
    }

    const firstView = render(
      <MemoryRouter initialEntries={['/foryou']}>
        <AuthContext.Provider value={authValue}>
          <FeedPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    await userEvent.click(
      await screen.findByRole('button', { name: /theo dõi demo_creator/i }),
    )
    await waitFor(() => {
      expect(apiClient.follow).toHaveBeenCalledWith(7, 'token')
    })

    firstView.unmount()

    render(
      <MemoryRouter initialEntries={['/foryou']}>
        <AuthContext.Provider value={authValue}>
          <FeedPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(apiClient.getFeed.mock.calls.length).toBeGreaterThanOrEqual(2)
    })
    expect(
      screen.queryByRole('button', { name: /theo dõi demo_creator/i }),
    ).not.toBeInTheDocument()
  })
})
