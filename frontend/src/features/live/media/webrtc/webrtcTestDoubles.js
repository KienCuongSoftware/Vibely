import { vi } from 'vitest'

/**
 * Test doubles for the browser media APIs (jsdom has none). They record what the
 * controllers do; they are only used by tests, never by application code.
 */

export class FakeTrack {
  constructor(kind, deviceId = `${kind}-default`) {
    this.kind = kind
    this.deviceId = deviceId
    this.enabled = true
    this.readyState = 'live'
    this.listeners = new Map()
    this.stop = vi.fn(() => {
      this.readyState = 'ended'
    })
  }

  getSettings() {
    return { deviceId: this.deviceId }
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, new Set())
    this.listeners.get(type).add(handler)
  }

  removeEventListener(type, handler) {
    this.listeners.get(type)?.delete(handler)
  }

  emit(type) {
    this.listeners.get(type)?.forEach((handler) => handler())
  }
}

export class FakeMediaStream {
  constructor(tracks = []) {
    this.tracks = [...tracks]
  }

  getTracks() {
    return [...this.tracks]
  }

  getAudioTracks() {
    return this.tracks.filter((track) => track.kind === 'audio')
  }

  getVideoTracks() {
    return this.tracks.filter((track) => track.kind === 'video')
  }

  addTrack(track) {
    this.tracks.push(track)
  }

  removeTrack(track) {
    this.tracks = this.tracks.filter((item) => item !== track)
  }
}

export class FakePeerConnection extends EventTarget {
  static instances = []
  /** When true, applying the SDP answer moves the peer to `connected`. */
  static autoConnect = true

  constructor(config) {
    super()
    this.config = config
    this.connectionState = 'new'
    this.transceivers = []
    this.closed = false
    this.onconnectionstatechange = null
    this.ontrack = null
    FakePeerConnection.instances.push(this)
  }

  addTransceiver(trackOrKind, init) {
    const transceiver = {
      direction: init?.direction,
      kind: typeof trackOrKind === 'string' ? trackOrKind : trackOrKind.kind,
      sender: {
        track: typeof trackOrKind === 'string' ? null : trackOrKind,
        replaceTrack: vi.fn(async (track) => {
          transceiver.sender.track = track
        }),
      },
      setCodecPreferences: vi.fn(),
    }
    this.transceivers.push(transceiver)
    return transceiver
  }

  async createOffer() {
    return { type: 'offer', sdp: 'v=0\r\no=- offer' }
  }

  async setLocalDescription(description) {
    this.localDescription = description
  }

  async setRemoteDescription(description) {
    this.remoteDescription = description
    if (FakePeerConnection.autoConnect) {
      queueMicrotask(() => {
        if (!this.closed) this.setConnectionState('connected')
      })
    }
  }

  setConnectionState(next) {
    this.connectionState = next
    this.dispatchEvent(new Event('connectionstatechange'))
    this.onconnectionstatechange?.()
  }

  close() {
    this.closed = true
    this.connectionState = 'closed'
  }

  static reset() {
    FakePeerConnection.instances = []
    FakePeerConnection.autoConnect = true
  }

  static get last() {
    return FakePeerConnection.instances.at(-1)
  }
}

export function createFakeMediaDevices() {
  return {
    getUserMedia: vi.fn(async (constraints) => {
      const tracks = []
      if (constraints.audio) tracks.push(new FakeTrack('audio', constraints.audio.deviceId?.exact))
      if (constraints.video) tracks.push(new FakeTrack('video', constraints.video.deviceId?.exact))
      return new FakeMediaStream(tracks)
    }),
    enumerateDevices: vi.fn(async () => [
      { kind: 'audioinput', deviceId: 'audio-default', label: 'Built-in mic' },
      { kind: 'videoinput', deviceId: 'video-default', label: 'Built-in camera' },
      { kind: 'videoinput', deviceId: 'video-usb', label: 'USB camera' },
    ]),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }
}

function sdpResponse(status, body, location) {
  return {
    ok: status >= 200 && status < 300,
    status,
    text: async () => body,
    headers: { get: (name) => (name.toLowerCase() === 'location' ? location ?? null : null) },
  }
}

/** SRS-like WHIP/WHEP endpoint: 201 + SDP answer + Location, 200 for DELETE. */
export function createFakeSignalingFetch({ status = 201 } = {}) {
  return vi.fn(async (url, init = {}) => {
    if (init.method === 'DELETE') return sdpResponse(200, '')
    if (status !== 201) return sdpResponse(status, '')
    return sdpResponse(201, 'v=0\r\no=- answer', '/rtc/v1/whip/?action=delete&token=t&session=s1')
  })
}

export function installMediaGlobals() {
  FakePeerConnection.reset()
  vi.stubGlobal('RTCPeerConnection', FakePeerConnection)
  vi.stubGlobal('MediaStream', FakeMediaStream)
}

export const flushMicrotasks = async (rounds = 10) => {
  for (let i = 0; i < rounds; i += 1) await Promise.resolve()
}
