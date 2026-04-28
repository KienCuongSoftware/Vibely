import React from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { UploadPage } from './UploadPage'
import { AuthContext } from '../state/auth-context'

describe('UploadPage', () => {
  it('shows login required when submitting without token', async () => {
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
        <UploadPage />
      </AuthContext.Provider>,
    )

    await userEvent.click(screen.getByRole('button', { name: 'Gửi' }))
    expect(screen.getByText('Bạn cần đăng nhập trước khi đăng tải.')).toBeInTheDocument()
  })
})
