import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { FeedPage } from './FeedPage'
import { AuthContext } from '../state/auth-context'

vi.mock('../api/client', () => ({
  apiClient: {
    getFeed: vi.fn(),
    getFollowingFeed: vi.fn(),
    getComments: vi.fn(),
    likeVideo: vi.fn(),
    addComment: vi.fn(),
    reportVideo: vi.fn(),
  },
}))

import { apiClient } from '../api/client'

describe('FeedPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.getComments.mockResolvedValue([])
  })

  it('switches between latest and following feed calls', async () => {
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
        }}
      >
        <FeedPage />
      </AuthContext.Provider>,
    )

    await waitFor(() => {
      expect(apiClient.getFeed).toHaveBeenCalled()
    })

    await userEvent.click(screen.getByRole('button', { name: 'Đã follow' }))

    await waitFor(() => {
      expect(apiClient.getFollowingFeed).toHaveBeenCalled()
    })
  })
})
