import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LoginPage } from '@/features/auth/pages/LoginPage'
import { AuthContext } from '@/features/auth/store/auth-context'
import { ThemeProvider } from '@/shared/theme/ThemeContext.jsx'

const authMock = {
  token: null,
  user: null,
  login: async () => ({}),
  register: async () => ({}),
  refreshProfile: async () => null,
  logout: () => {},
  completeOAuthLogin: () => {},
}

describe('LoginPage', () => {
  it('renders Vibely login methods', () => {
    render(
      <ThemeProvider>
        <MemoryRouter>
          <AuthContext.Provider value={authMock}>
            <LoginPage />
          </AuthContext.Provider>
        </MemoryRouter>
      </ThemeProvider>,
    )

    expect(screen.getByRole('heading', { name: 'Đăng nhập vào Vibely' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dùng email / VibelyID' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Tiếp tục với Facebook' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Điều Khoản Dịch Vụ' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Chính Sách Quyền Riêng Tư' })).toBeInTheDocument()
  })
})
