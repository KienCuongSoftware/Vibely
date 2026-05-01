import React from 'react'
import { render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import App from './App'
import { AuthContext } from './state/auth-context'

const authMock = {
  token: null,
  user: null,
  login: async () => ({}),
  register: async () => ({}),
  refreshProfile: async () => null,
  logout: () => {},
}

describe('App smoke', () => {
  it('renders guest feed layout when unauthenticated', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => [],
    })

    render(
      <MemoryRouter initialEntries={['/foryou']}>
        <AuthContext.Provider value={authMock}>
          <App />
        </AuthContext.Provider>
      </MemoryRouter>,
    )

    expect(screen.getByText('Vibely')).toBeInTheDocument()
    expect(screen.getByText('Đề xuất')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getAllByRole('link', { name: 'Đăng nhập' }).length).toBeGreaterThan(0)
    })
  })
})
