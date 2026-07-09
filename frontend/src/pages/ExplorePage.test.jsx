import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ExplorePage } from './ExplorePage'
import { AuthContext } from '../state/auth-context'

vi.mock('../api/client', () => ({
  apiClient: {
    getExploreCategories: vi.fn(),
    getExploreTabs: vi.fn(),
    getExploreTrending: vi.fn(),
    getExploreCategory: vi.fn(),
    searchExplore: vi.fn(),
  },
}))

import { apiClient } from '../api/client'

describe('ExplorePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))
    apiClient.getExploreTabs.mockResolvedValue([
      { slug: 'all', name: 'Tất cả', kind: 'category', videoCount: 5 },
      { slug: 'cong-nghe', name: 'Công nghệ', kind: 'category', videoCount: 2 },
      { slug: 'anime', name: 'Anime', kind: 'category', videoCount: 0 },
    ])
    apiClient.getExploreTrending.mockResolvedValue({ items: [], hasNext: false, nextCursor: null })
    apiClient.getExploreCategory.mockResolvedValue({ items: [], hasNext: false, nextCursor: null })
    apiClient.searchExplore.mockResolvedValue({ items: [], hasNext: false, nextCursor: null })
  })

  it('loads categories and trending feed on mount', async () => {
    render(
      <MemoryRouter initialEntries={['/explore']}>
        <AuthContext.Provider value={{ token: null, refreshToken: null, user: null, login: vi.fn(), register: vi.fn(), refreshSession: vi.fn(), refreshProfile: vi.fn(), logout: vi.fn(), authReady: true }}>
          <ExplorePage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(apiClient.getExploreTabs).toHaveBeenCalled()
      expect(apiClient.getExploreTrending).toHaveBeenCalled()
    })
    expect(screen.getByRole('button', { name: 'Tất cả' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Anime' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Công nghệ' })).toBeInTheDocument()
  })

  it('shows mobile search link on small screens', async () => {
    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: query.includes('max-width: 1023px'),
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    }))

    render(
      <MemoryRouter initialEntries={['/explore']}>
        <AuthContext.Provider value={{ token: null, refreshToken: null, user: null, login: vi.fn(), register: vi.fn(), refreshSession: vi.fn(), refreshProfile: vi.fn(), logout: vi.fn(), authReady: true }}>
          <ExplorePage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(apiClient.getExploreTrending).toHaveBeenCalled()
    })
    expect(screen.getByText(/tìm kiếm trên vibely/i)).toBeInTheDocument()
    expect(apiClient.searchExplore).not.toHaveBeenCalled()
  })
})
