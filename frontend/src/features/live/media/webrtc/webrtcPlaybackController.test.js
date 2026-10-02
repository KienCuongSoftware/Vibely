import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LIVE_MEDIA_ERROR } from '@/features/live/media/mediaErrors.js'
import { createWebRtcPlaybackController } from '@/features/live/media/webrtc/webrtcPlaybackController.js'
import {
  createFakeSignalingFetch,
  FakePeerConnection,
  flushMicrotasks,
  installMediaGlobals,
} from '@/features/live/media/webrtc/webrtcTestDoubles.js'

const TIMING = {
  RECONNECT_BASE_MS: 100,
  RECONNECT_MAX_DELAY_MS: 400,
  RECONNECT_MAX_ATTEMPTS: 2,
  CONNECT_TIMEOUT_MS: 1000,
  DISCONNECTED_GRACE_MS: 200,
  PLAYBACK_WAIT_POLL_MS: 1000,
}

const playing = {
  type: 'webrtc',
  status: 'LIVE',
  publishing: true,
  whepUrl: '/rtc/v1/whep/?app=live&stream=sabc&token=viewer-token',
  iceServers: [],
  expiresAt: '2026-01-01T00:02:00Z',
}
const notPublishing = { ...playing, publishing: false, whepUrl: null }

describe('WebRTC viewer playback', () => {
  let fetchMock

  beforeEach(() => {
    installMediaGlobals()
    fetchMock = createFakeSignalingFetch()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('waits for the host, then plays over WHEP when the stream comes up', async () => {
    const getPlaybackInfo = vi.fn().mockResolvedValueOnce(notPublishing).mockResolvedValue(playing)
    const controller = createWebRtcPlaybackController({ getPlaybackInfo, timing: TIMING })

    controller.start()
    await flushMicrotasks()
    expect(controller.getState().status).toBe('waiting')
    expect(FakePeerConnection.instances).toHaveLength(0)

    controller.notifyStreamState({ publishing: true })
    await flushMicrotasks(20)

    const peer = FakePeerConnection.last
    expect(peer.transceivers.map((t) => [t.kind, t.direction])).toEqual([
      ['audio', 'recvonly'],
      ['video', 'recvonly'],
    ])
    expect(fetchMock.mock.calls[0][0]).toBe(playing.whepUrl)
    expect(controller.getState().status).toBe('playing')
    expect(controller.getState().stream).not.toBeNull()
    controller.dispose()
  })

  it('does not connect at all for an ended LIVE', async () => {
    const controller = createWebRtcPlaybackController({
      getPlaybackInfo: vi.fn(async () => ({ ...notPublishing, status: 'ENDED' })),
      timing: TIMING,
    })
    controller.start()
    await flushMicrotasks()
    expect(controller.getState().status).toBe('ended')
    expect(FakePeerConnection.instances).toHaveLength(0)
    controller.dispose()
  })

  it('closes the peer and the SRS session when the LIVE ends', async () => {
    const controller = createWebRtcPlaybackController({ getPlaybackInfo: vi.fn(async () => playing), timing: TIMING })
    controller.start()
    await flushMicrotasks(20)
    const peer = FakePeerConnection.last
    expect(controller.getState().status).toBe('playing')

    controller.notifyEnded()

    expect(peer.closed).toBe(true)
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('action=delete'),
      expect.objectContaining({ method: 'DELETE' }),
    )
    expect(controller.getState()).toMatchObject({ status: 'ended', stream: null })
    controller.dispose()
  })

  it('reconnects after a failure and stops with a retry option after the max attempts', async () => {
    vi.useFakeTimers()
    const getPlaybackInfo = vi.fn(async () => playing)
    const controller = createWebRtcPlaybackController({ getPlaybackInfo, timing: TIMING })
    controller.start()
    await flushMicrotasks(20)
    expect(controller.getState().status).toBe('playing')

    FakePeerConnection.autoConnect = false
    FakePeerConnection.last.setConnectionState('failed')
    expect(controller.getState()).toMatchObject({ status: 'reconnecting', reconnectAttempt: 1 })

    await vi.advanceTimersByTimeAsync(5000)
    await flushMicrotasks()
    expect(controller.getState()).toMatchObject({ status: 'failed', errorCode: expect.any(String) })
    const callsWhenFailed = getPlaybackInfo.mock.calls.length
    expect(callsWhenFailed).toBe(1 + TIMING.RECONNECT_MAX_ATTEMPTS)

    await vi.advanceTimersByTimeAsync(10000)
    expect(getPlaybackInfo).toHaveBeenCalledTimes(callsWhenFailed)

    FakePeerConnection.autoConnect = true
    controller.retry()
    await flushMicrotasks(20)
    expect(controller.getState().status).toBe('playing')
    controller.dispose()
  })

  it('ignores repeated stream signals so polling cannot cause a reconnect loop', async () => {
    const controller = createWebRtcPlaybackController({ getPlaybackInfo: vi.fn(async () => playing), timing: TIMING })
    controller.start()
    await flushMicrotasks(20)
    expect(FakePeerConnection.instances).toHaveLength(1)

    controller.notifyStreamState({ publishing: true })
    controller.notifyStreamState({ publishing: true })
    await flushMicrotasks(20)
    expect(FakePeerConnection.instances).toHaveLength(1)

    controller.notifyStreamState({ publishing: false })
    expect(controller.getState().hostReconnecting).toBe(true)
    controller.notifyStreamState({ publishing: true })
    await flushMicrotasks(20)
    expect(FakePeerConnection.instances).toHaveLength(2)
    expect(controller.getState()).toMatchObject({ status: 'playing', hostReconnecting: false })
    controller.dispose()
  })

  it('reports a LIVE the viewer may not watch without retrying', async () => {
    const forbidden = Object.assign(new Error('nope'), { status: 403 })
    const getPlaybackInfo = vi.fn(async () => {
      throw forbidden
    })
    const controller = createWebRtcPlaybackController({ getPlaybackInfo, timing: TIMING })
    controller.start()
    await flushMicrotasks()
    expect(controller.getState()).toMatchObject({ status: 'unavailable', errorCode: LIVE_MEDIA_ERROR.FORBIDDEN })
    expect(getPlaybackInfo).toHaveBeenCalledTimes(1)
    controller.dispose()
  })

  it('detects browsers without WebRTC', () => {
    vi.stubGlobal('RTCPeerConnection', undefined)
    const getPlaybackInfo = vi.fn()
    const controller = createWebRtcPlaybackController({ getPlaybackInfo, timing: TIMING })
    controller.start()
    expect(controller.getState().status).toBe('unsupported')
    expect(getPlaybackInfo).not.toHaveBeenCalled()
    controller.dispose()
  })
})
