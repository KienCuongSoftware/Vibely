import React from 'react'
import i18n from 'i18next'
import { fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { AuthContext } from '@/features/auth/store/auth-context'
import { ThemeProvider } from '@/shared/theme/ThemeContext.jsx'
import { CreateLivePage } from '@/features/live/pages/CreateLivePage.jsx'
import { LiveHostPage } from '@/features/live/pages/LiveHostPage.jsx'
import { LiveDetailPage } from '@/features/live/pages/LiveDetailPage.jsx'

const authMock = {
  token: 'tkn',
  user: { id: 'me', username: 'me', displayName: 'Me' },
  login: async () => ({}),
  register: async () => ({}),
  refreshProfile: async () => null,
  logout: () => {},
  completeOAuthLogin: () => {},
}

function renderAt(path) {
  return render(
    <ThemeProvider>
      <AuthContext.Provider value={authMock}>
        <MemoryRouter initialEntries={[path]}>
          <Routes>
            <Route path="/live/create" element={<CreateLivePage />} />
            <Route path="/live/:liveId" element={<LiveDetailPage />} />
            <Route path="/live/:liveId/host" element={<LiveHostPage />} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </ThemeProvider>,
  )
}

describe('LIVE flow', () => {
  it('validates, creates, starts and ends a LIVE', async () => {
    await i18n.changeLanguage('en')
    renderAt('/live/create')
    fireEvent.click(await screen.findByRole('button', { name: 'Create LIVE' }))
    expect(await screen.findByText('Please enter a title.')).toBeInTheDocument()
    expect(screen.getByText('Please choose a category.')).toBeInTheDocument()

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: 'My first LIVE' } })
    fireEvent.click(screen.getByRole('radio', { name: 'Gaming' }))
    fireEvent.click(screen.getByRole('button', { name: 'Create LIVE' }))

    expect((await screen.findAllByText('Ready', {}, { timeout: 3000 })).length).toBeGreaterThan(0)
    expect(screen.getAllByText('My first LIVE').length).toBeGreaterThan(0)
    const goLiveButtons = screen.getAllByRole('button', { name: 'Go LIVE' })
    fireEvent.click(goLiveButtons[goLiveButtons.length - 1])

    const endBtn = await screen.findByRole('button', { name: 'End LIVE' }, { timeout: 3000 })
    fireEvent.click(endBtn)
    const dialog = await screen.findByRole('dialog')
    fireEvent.click(within(dialog).getByRole('button', { name: 'End LIVE' }))
    expect(await screen.findByText('Your LIVE has ended', {}, { timeout: 3000 })).toBeInTheDocument()
  })

  it('renders viewer room and not-found state', async () => {
    await i18n.changeLanguage('en')
    const { unmount } = renderAt('/live/does-not-exist')
    expect(await screen.findByText('LIVE not found', {}, { timeout: 3000 })).toBeInTheDocument()
    unmount()
  })

  it('blocks non-owners from host studio', async () => {
    await i18n.changeLanguage('en')
    renderAt('/live/pubg-rank-push/host')
    expect(await screen.findByText("You can't manage this LIVE", {}, { timeout: 3000 })).toBeInTheDocument()
  })
})
