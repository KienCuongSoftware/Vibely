import React from 'react'
import { render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProfilePage } from './ProfilePage'
import { AuthContext } from '../state/auth-context'

vi.mock('../api/client', () => ({
  apiClient: {
    getPublicProfile: vi.fn().mockResolvedValue({}),
    getVideosByUsername: vi.fn().mockResolvedValue({ items: [] }),
    getProfileFollowers: vi.fn().mockResolvedValue({ items: [], hasNext: false, page: 0, size: 20 }),
    getProfileFollowing: vi.fn().mockResolvedValue({ items: [], hasNext: false, page: 0, size: 20 }),
    getMyBookmarkedVideos: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getMyLikedVideos: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    follow: vi.fn().mockResolvedValue(null),
    unfollow: vi.fn().mockResolvedValue(null),
  },
}))

import { apiClient } from '../api/client'

describe('ProfilePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.getPublicProfile.mockResolvedValue({})
    apiClient.getVideosByUsername.mockResolvedValue({ items: [] })
    apiClient.getProfileFollowers.mockResolvedValue({ items: [], hasNext: false, page: 0, size: 20 })
    apiClient.getProfileFollowing.mockResolvedValue({ items: [], hasNext: false, page: 0, size: 20 })
    apiClient.getMyBookmarkedVideos.mockResolvedValue({ items: [], total: 0 })
    apiClient.getMyLikedVideos.mockResolvedValue({ items: [], total: 0 })
    apiClient.follow.mockResolvedValue(null)
    apiClient.unfollow.mockResolvedValue(null)
  })

  it('renders login prompt when unauthenticated', () => {
    render(
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
        <MemoryRouter initialEntries={['/profile']}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(screen.getByText('Vui lòng đăng nhập để xem hồ sơ.')).toBeInTheDocument()
  })

  it('calls refreshProfile on mount and still renders own profile when refresh fails', async () => {
    const refreshProfile = vi.fn().mockRejectedValue(new Error('Profile API failed'))
    render(
      <AuthContext.Provider
        value={{
          token: 'token',
          refreshToken: 'refresh',
          user: { id: 1, username: 'demo', email: 'demo@vibely.dev', bio: '' },
          login: vi.fn(),
          register: vi.fn(),
          refreshSession: vi.fn(),
          refreshProfile,
          logout: vi.fn(),
          authReady: true,
        }}
      >
        <MemoryRouter initialEntries={['/profile']}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    await waitFor(() => {
      expect(refreshProfile).toHaveBeenCalled()
    })
    expect(screen.getByText('@demo')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hồ sơ' })).toHaveAttribute('aria-current', 'page')
  })

  it('shows Yêu thích empty state when URL has tab=favorites', async () => {
    const refreshProfile = vi.fn().mockResolvedValue(null)
    render(
      <AuthContext.Provider
        value={{
          token: 'token',
          refreshToken: 'refresh',
          user: {
            id: 1,
            username: 'meuser',
            email: 'me@vibely.dev',
            bio: '',
            displayName: 'Me User',
          },
          login: vi.fn(),
          register: vi.fn(),
          refreshSession: vi.fn(),
          refreshProfile,
          updateProfile: vi.fn(),
          logout: vi.fn(),
          authReady: true,
        }}
      >
        <MemoryRouter initialEntries={['/profile?tab=favorites']}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Bài đăng 0')).toBeInTheDocument()
    })
    expect(
      screen.getByText('Bài đăng bạn yêu thích sẽ xuất hiện tại đây.'),
    ).toBeInTheDocument()
  })

  it('shows Đã thích empty state when URL has tab=liked', async () => {
    const refreshProfile = vi.fn().mockResolvedValue(null)
    render(
      <AuthContext.Provider
        value={{
          token: 'token',
          refreshToken: 'refresh',
          user: {
            id: 1,
            username: 'meuser',
            email: 'me@vibely.dev',
            bio: '',
            displayName: 'Me User',
          },
          login: vi.fn(),
          register: vi.fn(),
          refreshSession: vi.fn(),
          refreshProfile,
          updateProfile: vi.fn(),
          logout: vi.fn(),
          authReady: true,
        }}
      >
        <MemoryRouter initialEntries={['/profile?tab=liked']}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    await waitFor(() => {
      expect(screen.getByText('Video đã thích')).toBeInTheDocument()
    })
    expect(screen.getByText('Các video bạn thích sẽ xuất hiện tại đây.')).toBeInTheDocument()
  })

  it('opens create collection modal and reaches Chọn video empty state', async () => {
    const user = userEvent.setup()
    const refreshProfile = vi.fn().mockResolvedValue(null)
    render(
      <AuthContext.Provider
        value={{
          token: 'token',
          refreshToken: 'refresh',
          user: {
            id: 1,
            username: 'meuser',
            email: 'me@vibely.dev',
            bio: '',
            displayName: 'Me User',
          },
          login: vi.fn(),
          register: vi.fn(),
          refreshSession: vi.fn(),
          refreshProfile,
          updateProfile: vi.fn(),
          logout: vi.fn(),
          authReady: true,
        }}
      >
        <MemoryRouter initialEntries={['/profile?tab=favorites']}>
          <Routes>
            <Route path="/profile" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    const createCollectionBtn = await screen.findByRole('button', { name: /Tạo bộ sưu tập mới/ })
    await user.click(createCollectionBtn)

    expect(screen.getByRole('heading', { name: 'Bộ sưu tập mới' })).toBeInTheDocument()
    await user.type(screen.getByPlaceholderText('Nhập tên bộ sưu tập'), 'BST của tôi')
    await user.click(screen.getByRole('button', { name: 'Tiếp' }))

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Chọn video' })).toBeInTheDocument()
    })
    expect(screen.getByText('Không có video yêu thích để thêm vào')).toBeInTheDocument()
    expect(
      screen.getByText('Toàn bộ video yêu thích của bạn hiện đã có trong bộ sưu tập.'),
    ).toBeInTheDocument()
  })

  it('shows follow actions on another user profile and toggles follow', async () => {
    const user = userEvent.setup()
    apiClient.getPublicProfile.mockResolvedValue({
      id: 7,
      username: 'creator',
      displayName: 'Creator',
      bio: '',
      avatarUrl: '',
      followingCount: 10,
      followerCount: 20,
      totalLikeCount: 30,
      totalViewCount: 40,
      followedByViewer: false,
    })

    render(
      <AuthContext.Provider
        value={{
          token: 'token',
          refreshToken: 'refresh',
          user: {
            id: 1,
            username: 'viewer',
            email: 'viewer@vibely.dev',
            bio: '',
            displayName: 'Viewer',
          },
          login: vi.fn(),
          register: vi.fn(),
          refreshSession: vi.fn(),
          refreshProfile: vi.fn(),
          updateProfile: vi.fn(),
          logout: vi.fn(),
          authReady: true,
        }}
      >
        <MemoryRouter initialEntries={['/@creator']}>
          <Routes>
            <Route path="/:username" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(await screen.findByRole('button', { name: 'Follow' })).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'Tin nhắn' }).length).toBeGreaterThan(0)
    expect(screen.getByRole('button', { name: 'Hồ sơ' })).not.toHaveAttribute('aria-current')

    await user.click(screen.getByRole('button', { name: 'Follow' }))

    expect(apiClient.follow).toHaveBeenCalledWith(7, 'token')
    await waitFor(() => {
      expect(screen.getAllByRole('button', { name: 'Đã follow' }).length).toBeGreaterThan(0)
    })
  })

  it('opens follower modal from profile stats', async () => {
    const user = userEvent.setup()
    apiClient.getPublicProfile.mockResolvedValue({
      id: 7,
      username: 'creator',
      displayName: 'Creator',
      bio: '',
      avatarUrl: '',
      followingCount: 10,
      followerCount: 20,
      totalLikeCount: 30,
      totalViewCount: 40,
      followedByViewer: false,
    })
    apiClient.getProfileFollowers.mockResolvedValue({
      items: [
        {
          id: 11,
          username: 'fanone',
          displayName: 'Fan One',
          avatarUrl: '',
          followedByViewer: false,
          self: false,
        },
      ],
      hasNext: false,
      page: 0,
      size: 20,
    })

    render(
      <AuthContext.Provider
        value={{
          token: 'token',
          refreshToken: 'refresh',
          user: {
            id: 1,
            username: 'viewer',
            email: 'viewer@vibely.dev',
            bio: '',
            displayName: 'Viewer',
          },
          login: vi.fn(),
          register: vi.fn(),
          refreshSession: vi.fn(),
          refreshProfile: vi.fn(),
          updateProfile: vi.fn(),
          logout: vi.fn(),
          authReady: true,
        }}
      >
        <MemoryRouter initialEntries={['/@creator']}>
          <Routes>
            <Route path="/:username" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    await user.click(await screen.findByRole('button', { name: 'Mở danh sách follower' }))

    const dialog = await screen.findByRole('dialog', { name: 'Creator' })
    expect(dialog).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Bạn bè/ })).toBeInTheDocument()
    expect(within(dialog).getByRole('button', { name: /Được đề xuất/ })).toBeInTheDocument()
    expect(apiClient.getProfileFollowers).toHaveBeenCalledWith('creator', {
      page: 0,
      size: 20,
      token: 'token',
    })
    expect(apiClient.getProfileFollowing).toHaveBeenCalledWith('creator', {
      page: 0,
      size: 20,
      token: 'token',
    })
    expect(await screen.findByText('Fan One')).toBeInTheDocument()
  })

  it('hides videos for private profile when viewer is not logged in', async () => {
    apiClient.getPublicProfile.mockResolvedValue({
      id: 7,
      username: 'creator',
      displayName: 'Creator',
      bio: '',
      avatarUrl: '',
      followingCount: 0,
      followerCount: 0,
      totalLikeCount: 4,
      totalViewCount: 100,
      privateAccount: true,
      contentVisible: false,
      followedByViewer: false,
      followRequestPending: false,
    })

    render(
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
        <MemoryRouter initialEntries={['/@creator']}>
          <Routes>
            <Route path="/:username" element={<ProfilePage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>,
    )

    expect(await screen.findByText('Đây là tài khoản riêng tư')).toBeInTheDocument()
    expect(apiClient.getVideosByUsername).not.toHaveBeenCalled()
  })
})
