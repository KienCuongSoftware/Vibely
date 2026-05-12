import React from 'react'
import { render, screen } from '@testing-library/react'
import { fireEvent } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { UploadPage } from './UploadPage'
import { AuthContext } from '../state/auth-context'

describe('UploadPage', () => {
  it('shows login required when submitting without token', async () => {
    render(
      <MemoryRouter>
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
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    const fileInput = document.querySelector('input[type="file"]')
    expect(fileInput).toBeTruthy()
    fireEvent.change(fileInput, {
      target: { files: [new File(['demo'], 'demo.mp4', { type: 'video/mp4' })] },
    })
    expect(screen.getByText('Bạn cần đăng nhập trước khi đăng tải.')).toBeInTheDocument()
  })
})
