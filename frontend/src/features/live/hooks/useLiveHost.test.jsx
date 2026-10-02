import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useLiveHostSession } from '@/features/live/hooks/useLiveHost.js'

const service = vi.hoisted(() => ({
  startLive: vi.fn(),
  endLive: vi.fn(),
}))

vi.mock('@/features/live/services/liveService.js', () => ({ liveService: service }))

function fakeMedia(status = 'ready') {
  const state = { status, micEnabled: true, cameraEnabled: true, previewStream: null, error: null }
  return {
    controller: { id: 'controller-1' },
    kind: 'webrtc',
    requiresCapture: true,
    state,
    getState: vi.fn(() => state),
    prepare: vi.fn(async () => {}),
    publish: vi.fn(async () => {}),
    release: vi.fn(),
  }
}

const scheduled = { id: 'live-1', status: 'SCHEDULED', startedAt: null }
const onAir = { ...scheduled, status: 'LIVE', startedAt: '2026-01-01T00:00:00Z' }

describe('useLiveHostSession', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('does not go LIVE while camera/mic access is missing', async () => {
    const media = fakeMedia('error')
    const setLive = vi.fn()
    const { result } = renderHook(() => useLiveHostSession({ live: scheduled, setLive, token: 't', media }))

    await act(() => result.current.start())

    expect(media.prepare).toHaveBeenCalled()
    expect(service.startLive).not.toHaveBeenCalled()
  })

  it('goes LIVE, then publishes exactly once', async () => {
    service.startLive.mockResolvedValue(onAir)
    const media = fakeMedia('ready')
    const setLive = vi.fn()
    const { result, rerender } = renderHook(
      ({ live }) => useLiveHostSession({ live, setLive, token: 't', media }),
      { initialProps: { live: scheduled } },
    )
    expect(media.publish).not.toHaveBeenCalled()

    await act(() => result.current.start())
    expect(service.startLive).toHaveBeenCalledWith('live-1', 't')
    expect(setLive).toHaveBeenCalledWith(onAir)
    rerender({ live: onAir })
    rerender({ live: { ...onAir } })

    expect(media.publish).toHaveBeenCalledTimes(1)
  })

  it('ends the LIVE on the backend first, then releases the camera', async () => {
    const ended = { ...onAir, status: 'ENDED' }
    service.endLive.mockResolvedValue(ended)
    const media = fakeMedia('publishing')
    const setLive = vi.fn()
    const { result } = renderHook(() => useLiveHostSession({ live: onAir, setLive, token: 't', media }))

    await act(() => result.current.end())

    expect(service.endLive).toHaveBeenCalledWith('live-1', 't')
    expect(setLive).toHaveBeenCalledWith(ended)
    expect(media.release).toHaveBeenCalled()
    expect(service.endLive.mock.invocationCallOrder[0]).toBeLessThan(media.release.mock.invocationCallOrder[0])
  })

  it('marks the LIVE ended when the publisher learns it was ended elsewhere', () => {
    const media = fakeMedia('ended')
    const setLive = vi.fn()
    renderHook(() => useLiveHostSession({ live: onAir, setLive, token: 't', media }))

    const update = setLive.mock.calls[0][0]
    expect(update(onAir)).toMatchObject({ status: 'ENDED' })
  })
})
