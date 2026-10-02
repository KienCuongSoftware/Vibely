import React from 'react'
import i18n from 'i18next'
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createFakeMediaDevices, installMediaGlobals } from '@/features/live/media/webrtc/webrtcTestDoubles.js'
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
  let mediaDevices

  beforeEach(() => {
    installMediaGlobals()
    mediaDevices = createFakeMediaDevices()
    Object.defineProperty(navigator, 'mediaDevices', { value: mediaDevices, configurable: true })
  })

  afterEach(() => {
    delete navigator.mediaDevices
    vi.unstubAllGlobals()
  })

  it('goes LIVE from the camera preview in one tap, then ends the LIVE', async () => {
    await i18n.changeLanguage('en')
    renderAt('/live/create')

    expect(screen.queryByRole('radiogroup')).not.toBeInTheDocument()
    await waitFor(() => expect(mediaDevices.getUserMedia).toHaveBeenCalled())
    fireEvent.change(screen.getByLabelText('LIVE title'), { target: { value: 'My first LIVE' } })
    await waitFor(() => expect(screen.getByRole('button', { name: 'Turn off camera' })).toBeEnabled())
    const goLiveButtons = screen.getAllByRole('button', { name: 'Go LIVE' })
    fireEvent.click(goLiveButtons[goLiveButtons.length - 1])

    const endBtn = await screen.findByRole('button', { name: 'End LIVE' }, { timeout: 3000 })
    expect(screen.getAllByText('My first LIVE').length).toBeGreaterThan(0)
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
