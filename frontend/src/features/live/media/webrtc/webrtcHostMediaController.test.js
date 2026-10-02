import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { LIVE_MEDIA_ERROR } from '@/features/live/media/mediaErrors.js'
import { createWebRtcHostMediaController } from '@/features/live/media/webrtc/webrtcHostMediaController.js'
import {
  createFakeMediaDevices,
  createFakeSignalingFetch,
  FakePeerConnection,
  flushMicrotasks,
  installMediaGlobals,
} from '@/features/live/media/webrtc/webrtcTestDoubles.js'

const TIMING = {
  RECONNECT_BASE_MS: 100,
  RECONNECT_MAX_DELAY_MS: 400,
  RECONNECT_MAX_ATTEMPTS: 3,
  CONNECT_TIMEOUT_MS: 1000,
  DISCONNECTED_GRACE_MS: 200,
}

const publishInfo = (overrides = {}) => ({
  whipUrl: '/rtc/v1/whip/?app=live&stream=sabc&token=one-time',
  iceServers: [{ urls: ['stun:stun.example.org:3478'] }],
  expiresAt: '2026-01-01T00:05:00Z',
  activePublisher: false,
  ...overrides,
})

function setup({ getPublishInfo = vi.fn(async () => publishInfo()), mediaDevices = createFakeMediaDevices() } = {}) {
  const controller = createWebRtcHostMediaController({ getPublishInfo, timing: TIMING, mediaDevices })
  return { controller, getPublishInfo, mediaDevices }
}

describe('WebRTC host publisher', () => {
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

  it('captures camera + mic and toggles the real tracks', async () => {
    const { controller, mediaDevices } = setup()
    await controller.prepare()

    expect(mediaDevices.getUserMedia).toHaveBeenCalledWith(
      expect.objectContaining({ audio: expect.any(Object), video: expect.any(Object) }),
    )
    const state = controller.getState()
    expect(state.status).toBe('ready')
    expect(state.devices.videoinput).toHaveLength(2)

    const stream = state.previewStream
    controller.setMicEnabled(false)
    controller.setCameraEnabled(false)
    expect(stream.getAudioTracks()[0].enabled).toBe(false)
    expect(stream.getVideoTracks()[0].enabled).toBe(false)
    expect(controller.getState()).toMatchObject({ micEnabled: false, cameraEnabled: false })

    controller.setCameraEnabled(true)
    expect(stream.getVideoTracks()[0].enabled).toBe(true)
    controller.dispose()
  })

  it('reports a denied camera/mic permission and recovers on retry', async () => {
    const mediaDevices = createFakeMediaDevices()
    const denied = Object.assign(new Error('denied'), { name: 'NotAllowedError' })
    mediaDevices.getUserMedia.mockRejectedValueOnce(denied)
    const { controller } = setup({ mediaDevices })

    await controller.prepare()
    expect(controller.getState()).toMatchObject({
      status: 'error',
      previewStream: null,
      error: { code: LIVE_MEDIA_ERROR.PERMISSION_DENIED, stage: 'capture' },
    })

    await controller.retry()
    expect(controller.getState().status).toBe('ready')
    expect(controller.getState().error).toBeNull()
    controller.dispose()
  })

  it('publishes over WHIP with a fresh credential and tears the session down on unpublish', async () => {
    const { controller, getPublishInfo } = setup()
    await controller.prepare()
    await controller.publish()
    await flushMicrotasks()

    expect(getPublishInfo).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(publishInfo().whipUrl)
    expect(init).toMatchObject({ method: 'POST', body: expect.stringContaining('v=0') })
    expect(init.headers['Content-Type']).toBe('application/sdp')

    const peer = FakePeerConnection.last
    expect(peer.config.iceServers).toEqual(publishInfo().iceServers)
    expect(peer.transceivers.map((t) => [t.kind, t.direction])).toEqual([
      ['audio', 'sendonly'],
      ['video', 'sendonly'],
    ])
    expect(controller.getState().status).toBe('publishing')

    await controller.unpublish()
    expect(peer.closed).toBe(true)
    expect(fetchMock).toHaveBeenLastCalledWith(
      expect.stringContaining('/rtc/v1/whip/?action=delete'),
      expect.objectContaining({ method: 'DELETE', keepalive: true }),
    )
    expect(controller.getState().status).toBe('ready')
    expect(controller.getState().previewStream).not.toBeNull()
    controller.dispose()
  })

  it('reconnects with backoff and a new credential after the peer fails', async () => {
    vi.useFakeTimers()
    const { controller, getPublishInfo } = setup()
    await controller.prepare()
    await controller.publish()
    await flushMicrotasks()
    const first = FakePeerConnection.last
    expect(controller.getState().status).toBe('publishing')

    first.setConnectionState('failed')
    expect(controller.getState()).toMatchObject({ status: 'reconnecting', reconnectAttempt: 1 })
    expect(first.closed).toBe(true)

    await vi.advanceTimersByTimeAsync(TIMING.RECONNECT_BASE_MS)
    await flushMicrotasks()
    expect(getPublishInfo).toHaveBeenCalledTimes(2)
    expect(FakePeerConnection.instances).toHaveLength(2)
    expect(controller.getState()).toMatchObject({ status: 'publishing', reconnectAttempt: 0 })
    controller.dispose()
  })

  it('waits out a short `disconnected` blip without reconnecting', async () => {
    vi.useFakeTimers()
    const { controller, getPublishInfo } = setup()
    await controller.prepare()
    await controller.publish()
    await flushMicrotasks()
    const peer = FakePeerConnection.last

    peer.setConnectionState('disconnected')
    await vi.advanceTimersByTimeAsync(TIMING.DISCONNECTED_GRACE_MS / 2)
    peer.setConnectionState('connected')
    await vi.advanceTimersByTimeAsync(TIMING.DISCONNECTED_GRACE_MS)

    expect(getPublishInfo).toHaveBeenCalledTimes(1)
    expect(controller.getState().status).toBe('publishing')
    controller.dispose()
  })

  it('gives up after the maximum number of attempts instead of looping', async () => {
    vi.useFakeTimers()
    const unavailable = Object.assign(new Error('busy'), { status: 503 })
    const getPublishInfo = vi.fn(async () => {
      throw unavailable
    })
    const { controller } = setup({ getPublishInfo })
    await controller.prepare()
    await controller.publish()
    await vi.advanceTimersByTimeAsync(5000)
    await flushMicrotasks()

    expect(getPublishInfo).toHaveBeenCalledTimes(1 + TIMING.RECONNECT_MAX_ATTEMPTS)
    expect(controller.getState()).toMatchObject({
      status: 'error',
      error: { code: LIVE_MEDIA_ERROR.SERVER_UNAVAILABLE, stage: 'publish' },
    })
    await vi.advanceTimersByTimeAsync(10000)
    expect(getPublishInfo).toHaveBeenCalledTimes(1 + TIMING.RECONNECT_MAX_ATTEMPTS)
    controller.dispose()
  })

  it('stops without retrying once the backend says the LIVE has ended', async () => {
    vi.useFakeTimers()
    const ended = Object.assign(new Error('ended'), { status: 400, code: 'LIVE_ALREADY_ENDED' })
    const getPublishInfo = vi.fn(async () => {
      throw ended
    })
    const { controller } = setup({ getPublishInfo })
    await controller.prepare()
    await controller.publish()
    await vi.advanceTimersByTimeAsync(5000)

    expect(getPublishInfo).toHaveBeenCalledTimes(1)
    expect(controller.getState().status).toBe('ended')
    controller.dispose()
  })

  it('explains a refusal caused by another active publisher', async () => {
    vi.stubGlobal('fetch', createFakeSignalingFetch({ status: 400 }))
    const getPublishInfo = vi.fn(async () => publishInfo({ activePublisher: true }))
    const { controller } = setup({ getPublishInfo })
    await controller.prepare()
    await controller.publish()
    await flushMicrotasks()

    expect(controller.getState()).toMatchObject({
      status: 'reconnecting',
      error: { code: LIVE_MEDIA_ERROR.PUBLISHER_BUSY },
    })
    controller.dispose()
  })

  it('switches camera without renegotiating', async () => {
    const { controller } = setup()
    await controller.prepare()
    await controller.publish()
    await flushMicrotasks()
    const oldVideo = controller.getState().previewStream.getVideoTracks()[0]
    const videoSender = FakePeerConnection.last.transceivers[1].sender

    await controller.switchDevice('videoinput', 'video-usb')

    expect(oldVideo.stop).toHaveBeenCalled()
    expect(videoSender.replaceTrack).toHaveBeenCalledWith(expect.objectContaining({ deviceId: 'video-usb' }))
    expect(controller.getState().selectedDeviceIds.videoinput).toBe('video-usb')
    expect(FakePeerConnection.instances).toHaveLength(1)
    controller.dispose()
  })

  it('release (LIVE ended) stops every track and closes the peer', async () => {
    const { controller } = setup()
    await controller.prepare()
    await controller.publish()
    await flushMicrotasks()
    const tracks = controller.getState().previewStream.getTracks()
    const peer = FakePeerConnection.last

    controller.release()

    expect(peer.closed).toBe(true)
    tracks.forEach((track) => expect(track.stop).toHaveBeenCalled())
    expect(controller.getState()).toMatchObject({ status: 'idle', previewStream: null })
    controller.dispose()
  })

  it('refuses to capture outside a secure context', async () => {
    Object.defineProperty(window, 'isSecureContext', { value: false, configurable: true })
    try {
      const { controller, mediaDevices } = setup()
      await controller.prepare()
      expect(mediaDevices.getUserMedia).not.toHaveBeenCalled()
      expect(controller.getState().error).toMatchObject({ code: LIVE_MEDIA_ERROR.INSECURE_CONTEXT })
      controller.dispose()
    } finally {
      delete window.isSecureContext
    }
  })
})
