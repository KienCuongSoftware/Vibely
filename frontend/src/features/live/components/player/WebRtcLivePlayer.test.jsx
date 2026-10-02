import React from 'react'
import i18n from '@/i18n/i18n.js'
import { act, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { WebRtcLivePlayer } from '@/features/live/components/player/WebRtcLivePlayer.jsx'
import {
  createFakeSignalingFetch,
  FakePeerConnection,
  flushMicrotasks,
  installMediaGlobals,
} from '@/features/live/media/webrtc/webrtcTestDoubles.js'

const service = vi.hoisted(() => ({ getPlayback: vi.fn() }))
vi.mock('@/features/live/services/liveService.js', () => ({ liveService: service }))
vi.mock('@/features/auth/hooks/useAuth', () => ({ useAuth: () => ({ token: 'tkn' }) }))

const live = { id: 'live-1', title: 'Hello', status: 'LIVE', coverUrl: null, playback: { type: 'webrtc' } }
const playing = {
  type: 'webrtc',
  status: 'LIVE',
  publishing: true,
  whepUrl: '/rtc/v1/whep/?app=live&stream=sabc&token=v',
  iceServers: [],
}

describe('WebRtcLivePlayer', () => {
  beforeEach(async () => {
    await i18n.changeLanguage('en')
    installMediaGlobals()
    vi.stubGlobal('fetch', createFakeSignalingFetch())
    service.getPlayback.mockReset()
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('shows a waiting state until the host publishes', async () => {
    service.getPlayback.mockResolvedValue({ ...playing, publishing: false, whepUrl: null })
    render(<WebRtcLivePlayer live={live} />)
    expect(await screen.findByText("Waiting for the host's video…")).toBeInTheDocument()
    expect(service.getPlayback).toHaveBeenCalledWith('live-1', 'tkn')
  })

  it('offers tap-to-play when the browser blocks autoplay, and closes the session on unmount', async () => {
    service.getPlayback.mockResolvedValue(playing)
    const blocked = Object.assign(new Error('blocked'), { name: 'NotAllowedError' })
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValueOnce(blocked)

    const { unmount } = render(<WebRtcLivePlayer live={live} muted />)
    await act(() => flushMicrotasks(30))
    const button = await screen.findByRole('button', { name: /Tap to play/ })

    play.mockResolvedValue(undefined)
    fireEvent.click(button)
    await act(() => flushMicrotasks())
    expect(screen.queryByRole('button', { name: /Tap to play/ })).not.toBeInTheDocument()

    const peer = FakePeerConnection.last
    unmount()
    expect(peer.closed).toBe(true)
    play.mockRestore()
  })

  it('shows the ended state with the end reason and never connects', async () => {
    render(<WebRtcLivePlayer live={{ ...live, status: 'ENDED', endReason: 'host_disconnected' }} ended />)
    expect(await screen.findByText('This LIVE ended because the host lost connection.')).toBeInTheDocument()
    expect(service.getPlayback).not.toHaveBeenCalled()
    expect(FakePeerConnection.instances).toHaveLength(0)
  })
})
