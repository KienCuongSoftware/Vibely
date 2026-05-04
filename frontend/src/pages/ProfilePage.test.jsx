import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProfilePage } from './ProfilePage'
import { AuthContext } from '../state/auth-context'

vi.mock('../api/client', () => ({
  apiClient: {
    getPublicProfile: vi.fn().mockResolvedValue({}),
    getMyBookmarkedVideos: vi.fn().mockResolvedValue({ items: [], total: 0 }),
    getMyLikedVideos: vi.fn().mockResolvedValue({ items: [], total: 0 }),
  },
}))

describe('ProfilePage', () => {
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

  it('shows fetch error from profile refresh', async () => {
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
      expect(screen.getByText('Profile API failed')).toBeInTheDocument()
    })
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
})
