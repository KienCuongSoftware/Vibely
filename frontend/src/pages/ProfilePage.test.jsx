import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { ProfilePage } from './ProfilePage'
import { AuthContext } from '../state/auth-context'

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
})
