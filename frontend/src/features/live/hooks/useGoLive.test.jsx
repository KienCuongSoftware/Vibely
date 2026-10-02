import { act, renderHook } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { useGoLive } from '@/features/live/hooks/useGoLive.js'
import { hostMediaPreferencesFor } from '@/features/live/media/hostMediaPreferences.js'

const service = vi.hoisted(() => ({
  createLive: vi.fn(),
  startLive: vi.fn(),
}))

vi.mock('@/features/live/services/liveService.js', () => ({ liveService: service }))

function fakeMedia(status = 'ready', overrides = {}) {
  const state = {
    status,
    micEnabled: true,
    cameraEnabled: true,
    previewStream: status === 'ready' ? {} : null,
    error: null,
    selectedDeviceIds: { audioinput: 'mic-1', videoinput: 'cam-2' },
    ...overrides,
  }
  return {
    state,
    getState: vi.fn(() => state),
    prepare: vi.fn(async () => {}),
  }
}

const created = { id: 'live-9', status: 'SCHEDULED' }
const started = { ...created, status: 'LIVE' }

function setup(media) {
  return renderHook(() => useGoLive({ token: 't', media, defaultTitle: "Kien's LIVE" }))
}

describe('useGoLive', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('asks for camera/mic first and does nothing while access is missing', async () => {
    const media = fakeMedia('error')
    const { result } = setup(media)

    let live
    await act(async () => {
      live = await result.current.goLive()
    })

    expect(media.prepare).toHaveBeenCalled()
    expect(service.createLive).not.toHaveBeenCalled()
    expect(live).toBeNull()
  })

  it('creates the LIVE without a category, with the default title, then starts it', async () => {
    service.createLive.mockResolvedValue(created)
    service.startLive.mockResolvedValue(started)
    const media = fakeMedia('ready', { micEnabled: false })
    const { result } = setup(media)

    let live
    await act(async () => {
      live = await result.current.goLive()
    })

    expect(service.createLive).toHaveBeenCalledWith({ title: "Kien's LIVE" }, 't')
    expect(service.startLive).toHaveBeenCalledWith('live-9', 't')
    expect(live).toEqual(started)
    expect(hostMediaPreferencesFor('live-9')).toEqual({
      micEnabled: false,
      cameraEnabled: true,
      selectedDeviceIds: { audioinput: 'mic-1', videoinput: 'cam-2' },
    })
  })

  it('uses the typed title, trimmed', async () => {
    service.createLive.mockResolvedValue(created)
    service.startLive.mockResolvedValue(started)
    const { result } = setup(fakeMedia('ready'))

    act(() => result.current.setTitle('  Free Fire tối nay  '))
    await act(async () => {
      await result.current.goLive()
    })

    expect(service.createLive).toHaveBeenCalledWith({ title: 'Free Fire tối nay' }, 't')
  })

  it('retries the same LIVE when starting fails instead of creating another one', async () => {
    service.createLive.mockResolvedValue(created)
    service.startLive.mockRejectedValueOnce(new Error('busy')).mockResolvedValueOnce(started)
    const { result } = setup(fakeMedia('ready'))

    await act(async () => {
      await result.current.goLive()
    })
    expect(result.current.error?.message).toBe('busy')

    let live
    await act(async () => {
      live = await result.current.goLive()
    })

    expect(service.createLive).toHaveBeenCalledTimes(1)
    expect(service.startLive).toHaveBeenCalledTimes(2)
    expect(live).toEqual(started)
    expect(result.current.error).toBeNull()
  })
})
