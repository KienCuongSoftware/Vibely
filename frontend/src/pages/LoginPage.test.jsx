import React from 'react'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { LoginPage } from './LoginPage'
import { AuthContext } from '../state/auth-context'

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
      <MemoryRouter>
        <AuthContext.Provider value={authMock}>
          <LoginPage />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Đăng nhập vào Vibely' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dùng email / username' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Tiếp tục với Google' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Tiếp tục với Facebook' }),
    ).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Điều Khoản Dịch Vụ' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Chính Sách Quyền Riêng Tư' })).toBeInTheDocument()
  })
})
