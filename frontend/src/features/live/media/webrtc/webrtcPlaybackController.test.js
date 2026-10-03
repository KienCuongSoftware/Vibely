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

  it('keeps an attached video element on the current stream and clears it on detach', async () => {
    const controller = createWebRtcPlaybackController({ getPlaybackInfo: vi.fn(async () => playing), timing: TIMING })
    const video = { srcObject: null }
    controller.attach(video)
    expect(controller.getConnectionState()).toBe('DISCONNECTED')

    controller.start()
    await flushMicrotasks(20)
    expect(controller.getConnectionState()).toBe('CONNECTED')
    expect(video.srcObject).toBe(controller.getState().stream)

    controller.detach()
    expect(video.srcObject).toBeNull()
    controller.notifyEnded()
    expect(controller.getConnectionState()).toBe('ENDED')
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
    const controller = createWebRtcPlaybackController({
      getPlaybackInfo,
      timing: TIMING,
      hlsSupported: () => false,
    })
    controller.start()
    expect(controller.getState().status).toBe('unsupported')
    expect(getPlaybackInfo).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('shows the interrupted state while the host reconnects', async () => {
    const getPlaybackInfo = vi.fn(async () => ({ ...notPublishing, interrupted: true }))
    const controller = createWebRtcPlaybackController({ getPlaybackInfo, timing: TIMING })
    controller.start()
    await flushMicrotasks()
    expect(controller.getState()).toMatchObject({ status: 'waiting', hostReconnecting: true })
    controller.dispose()
  })

  it('marks a waiting viewer as interrupted from the room event', async () => {
    const controller = createWebRtcPlaybackController({ getPlaybackInfo: vi.fn(async () => notPublishing), timing: TIMING })
    controller.start()
    await flushMicrotasks()
    expect(controller.getState().hostReconnecting).toBe(false)
    controller.notifyStreamState({ publishing: false, reconnectDeadline: '2026-01-01T00:01:00Z' })
    expect(controller.getState()).toMatchObject({ status: 'waiting', hostReconnecting: true })
    controller.dispose()
  })
})

describe('HLS fallback', () => {
  const HLS_TIMING = { ...TIMING, RECONNECT_MAX_ATTEMPTS: 4, HLS_FALLBACK_AFTER_ATTEMPTS: 2 }
  const withHls = { ...playing, hlsUrl: 'https://example.test/live-hls/sabc.m3u8?token=hls-token' }
  let fetchMock

  const createHlsDouble = () => {
    const handles = []
    const attachHls = vi.fn((element, url, { onFatal }) => {
      const handle = { element, url, onFatal, detach: vi.fn() }
      handles.push(handle)
      return handle.detach
    })
    return { attachHls, handles }
  }

  beforeEach(() => {
    installMediaGlobals()
    fetchMock = createFakeSignalingFetch()
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('switches to HLS once after repeated WebRTC failures and never loops back by itself', async () => {
    vi.useFakeTimers()
    const { attachHls, handles } = createHlsDouble()
    const getPlaybackInfo = vi.fn(async () => withHls)
    const controller = createWebRtcPlaybackController({ getPlaybackInfo, timing: HLS_TIMING, attachHls })
    const video = { srcObject: null }
    controller.attach(video)
    controller.start()
    await flushMicrotasks(20)
    expect(controller.getState()).toMatchObject({ status: 'playing', transport: 'webrtc' })
    expect(attachHls).not.toHaveBeenCalled()

    FakePeerConnection.autoConnect = false
    FakePeerConnection.last.setConnectionState('failed')
    await vi.advanceTimersByTimeAsync(5000)
    await flushMicrotasks(20)

    expect(controller.getState()).toMatchObject({ status: 'playing', transport: 'hls', hlsUrl: withHls.hlsUrl, stream: null })
    expect(video.srcObject).toBeNull()
    expect(attachHls).toHaveBeenCalledTimes(1)
    expect(handles[0]).toMatchObject({ element: video, url: withHls.hlsUrl })
    const peersAfterSwitch = FakePeerConnection.instances.length
    expect(FakePeerConnection.instances.every((peer) => peer.closed)).toBe(true)
    await expect(controller.getStats()).resolves.toBeNull()

    handles[0].onFatal()
    expect(controller.getState()).toMatchObject({ status: 'failed', errorCode: LIVE_MEDIA_ERROR.PLAYBACK_FAILED, transport: 'hls' })
    expect(handles[0].detach).toHaveBeenCalled()
    const callsWhenFailed = getPlaybackInfo.mock.calls.length
    await vi.advanceTimersByTimeAsync(20000)
    expect(getPlaybackInfo).toHaveBeenCalledTimes(callsWhenFailed)
    expect(FakePeerConnection.instances).toHaveLength(peersAfterSwitch)
    expect(attachHls).toHaveBeenCalledTimes(1)

    FakePeerConnection.autoConnect = true
    controller.retry()
    await flushMicrotasks(20)
    expect(controller.getState()).toMatchObject({ status: 'playing', transport: 'webrtc', hlsUrl: null })
    expect(video.srcObject).toBe(controller.getState().stream)
    controller.dispose()
  })

  it('ignores a late fatal error from an HLS player that was already replaced', async () => {
    vi.useFakeTimers()
    const { attachHls, handles } = createHlsDouble()
    const controller = createWebRtcPlaybackController({ getPlaybackInfo: vi.fn(async () => withHls), timing: HLS_TIMING, attachHls })
    controller.attach({ srcObject: null })
    controller.start()
    await flushMicrotasks(20)
    FakePeerConnection.autoConnect = false
    FakePeerConnection.last.setConnectionState('failed')
    await vi.advanceTimersByTimeAsync(5000)
    await flushMicrotasks(20)
    expect(controller.getState().transport).toBe('hls')

    controller.detach()
    handles[0].onFatal()
    expect(controller.getState()).toMatchObject({ status: 'playing', transport: 'hls' })
    controller.dispose()
  })

  it('stays on WebRTC retries when the backend offers no HLS playlist', async () => {
    vi.useFakeTimers()
    const { attachHls } = createHlsDouble()
    const controller = createWebRtcPlaybackController({ getPlaybackInfo: vi.fn(async () => playing), timing: HLS_TIMING, attachHls })
    controller.start()
    await flushMicrotasks(20)
    FakePeerConnection.autoConnect = false
    FakePeerConnection.last.setConnectionState('failed')
    await vi.advanceTimersByTimeAsync(20000)
    await flushMicrotasks(20)
    expect(controller.getState()).toMatchObject({ status: 'failed', transport: 'webrtc' })
    expect(attachHls).not.toHaveBeenCalled()
    controller.dispose()
  })

  it('plays over HLS straight away when the browser has no WebRTC', async () => {
    vi.stubGlobal('RTCPeerConnection', undefined)
    const { attachHls } = createHlsDouble()
    const controller = createWebRtcPlaybackController({
      getPlaybackInfo: vi.fn(async () => withHls),
      timing: HLS_TIMING,
      attachHls,
      hlsSupported: () => true,
    })
    const video = { srcObject: null }
    controller.attach(video)
    controller.start()
    await flushMicrotasks()
    expect(controller.getState()).toMatchObject({ status: 'playing', transport: 'hls' })
    expect(attachHls).toHaveBeenCalledWith(video, withHls.hlsUrl, expect.any(Object))
    controller.dispose()
  })

  it('reports unsupported when neither WebRTC nor an HLS playlist is available', async () => {
    vi.stubGlobal('RTCPeerConnection', undefined)
    const controller = createWebRtcPlaybackController({
      getPlaybackInfo: vi.fn(async () => playing),
      timing: HLS_TIMING,
      attachHls: vi.fn(),
      hlsSupported: () => true,
    })
    controller.start()
    await flushMicrotasks()
    expect(controller.getState()).toMatchObject({ status: 'unsupported', errorCode: LIVE_MEDIA_ERROR.UNSUPPORTED })
    controller.dispose()
  })
})
