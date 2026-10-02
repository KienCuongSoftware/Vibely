import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { liveApi, normalizeLive } from '@/features/live/api/liveApi.js'
import { LIVE_CONNECTION_STATE, LIVE_ROOM_EVENT } from '@/features/live/constants/liveConstants.js'
import { createApiLiveRoomChannel } from '@/features/live/services/liveRoomChannel.js'

const stomp = vi.hoisted(() => ({ onConnect: null, onDisconnect: null, subscriptions: [], client: null }))

vi.mock('@/shared/realtime/wsAuth.js', () => ({
  resolveRealtimeWsToken: vi.fn(async (token) => token),
}))

vi.mock('@/shared/realtime/createStompClient.js', () => ({
  createStompClient: vi.fn((_token, onConnect, { onDisconnect } = {}) => {
    stomp.onConnect = onConnect
    stomp.onDisconnect = onDisconnect
    stomp.client = {
      activate: vi.fn(),
      deactivate: vi.fn(),
      subscribe: vi.fn((destination, handler) => stomp.subscriptions.push({ destination, handler })),
    }
    return stomp.client
  }),
}))

const LIVE_ID = '8f14e45f-ceea-467a-9b52-4f1c7c3f0a11'
const frame = (type, payload) => ({ body: JSON.stringify({ type, liveId: LIVE_ID, payload, timestamp: '2026-01-01T00:00:00Z' }) })
const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0))

describe('normalizeLive', () => {
  it('maps backend DTOs to the UI contract', () => {
    const live = normalizeLive({
      id: LIVE_ID,
      title: 'Hello',
      category: 'FREEFIRE',
      status: 'CREATED',
      host: { id: 7, username: 'kien', displayName: null, avatarUrl: null },
      isFollowing: true,
      isOwner: false,
      allowComments: true,
      allowGifts: true,
      giftsAvailable: false,
      viewerCount: 12,
      playback: null,
    })
    expect(live.status).toBe('SCHEDULED')
    expect(live.categoryId).toBe('freefire')
    expect(live.host).toMatchObject({ id: '7', displayName: 'kien', followedByViewer: true })
    expect(live.settings.allowGifts).toBe(false)
    expect(live.playback).toEqual({ type: null, url: null })
    expect(normalizeLive({ id: 'x', status: 'CANCELLED' }).status).toBe('ENDED')
  })
})

describe('API LIVE room channel', () => {
  beforeEach(() => {
    stomp.subscriptions = []
    vi.spyOn(liveApi, 'getComments').mockResolvedValue({ items: [], hasMore: false })
    vi.spyOn(liveApi, 'getStats').mockResolvedValue({ status: 'LIVE', viewerCount: 3, likeCount: 9 })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('subscribes to the room topic and maps realtime events', async () => {
    const onEvent = vi.fn()
    const onStateChange = vi.fn()
    const channel = createApiLiveRoomChannel({ liveId: LIVE_ID, token: 'tkn' })
    channel.connect({ onEvent, onStateChange })
    await flushPromises()

    stomp.onConnect(stomp.client)
    expect(stomp.subscriptions[0].destination).toBe(`/topic/live/${LIVE_ID}`)
    expect(onStateChange).toHaveBeenLastCalledWith(LIVE_CONNECTION_STATE.CONNECTED)

    const deliver = stomp.subscriptions[0].handler
    deliver(frame('COMMENT_CREATED', { id: 41, content: 'hi', author: { id: 2, username: 'an' }, createdAt: 'now', clientId: 'c-1' }))
    deliver(frame('VIEWER_COUNT_UPDATED', { viewerCount: 5 }))
    deliver(frame('LIKE_UPDATED', { likeCount: 20 }))
    deliver(frame('COMMENT_DELETED', { commentId: 41 }))
    deliver(frame('STREAM_STATE_UPDATED', { publishing: false, reconnectDeadline: '2026-01-01T00:01:00Z' }))
    deliver(frame('LIVE_ENDED', { status: 'ENDED', reason: 'host_disconnected' }))

    const events = onEvent.mock.calls.map(([event]) => event)
    expect(events).toContainEqual({
      type: LIVE_ROOM_EVENT.COMMENT,
      payload: expect.objectContaining({ id: '41', text: 'hi', clientId: 'c-1', liveId: LIVE_ID }),
    })
    expect(events).toContainEqual({ type: LIVE_ROOM_EVENT.VIEWER_COUNT, payload: { count: 5 } })
    expect(events).toContainEqual({ type: LIVE_ROOM_EVENT.LIKE_COUNT, payload: { count: 20 } })
    expect(events).toContainEqual({ type: LIVE_ROOM_EVENT.COMMENT_DELETED, payload: { id: '41' } })
    expect(events).toContainEqual({
      type: LIVE_ROOM_EVENT.STREAM,
      payload: { publishing: false, reconnectDeadline: '2026-01-01T00:01:00Z' },
    })
    expect(events).toContainEqual({ type: LIVE_ROOM_EVENT.STATUS, payload: { status: 'ENDED', reason: 'host_disconnected' } })
    expect(stomp.client.deactivate).toHaveBeenCalled()
    channel.disconnect()
  })

  it('reads the current counts once subscribed, so a join broadcast sent earlier is not lost', async () => {
    const onEvent = vi.fn()
    const channel = createApiLiveRoomChannel({ liveId: LIVE_ID, token: 'tkn' })
    channel.connect({ onEvent })
    await flushPromises()
    expect(liveApi.getStats).not.toHaveBeenCalled()

    stomp.onConnect(stomp.client)
    await flushPromises()

    expect(liveApi.getStats).toHaveBeenCalledWith(LIVE_ID, 'tkn')
    expect(onEvent).toHaveBeenCalledWith({ type: LIVE_ROOM_EVENT.VIEWER_COUNT, payload: { count: 3 } })
    channel.disconnect()
  })

  it('polls REST for guests without opening a socket', async () => {
    const onEvent = vi.fn()
    const channel = createApiLiveRoomChannel({ liveId: LIVE_ID, token: null })
    channel.connect({ onEvent })
    await flushPromises()

    expect(stomp.subscriptions).toHaveLength(0)
    expect(liveApi.getStats).toHaveBeenCalledWith(LIVE_ID, null)
    expect(onEvent).toHaveBeenCalledWith({ type: LIVE_ROOM_EVENT.VIEWER_COUNT, payload: { count: 3 } })
    expect(onEvent).toHaveBeenCalledWith({ type: LIVE_ROOM_EVENT.LIKE_COUNT, payload: { count: 9 } })
    channel.disconnect()
  })

  it('sends comments over REST and keeps the client id', async () => {
    vi.spyOn(liveApi, 'postComment').mockResolvedValue({ id: '9', text: 'yo', liveId: LIVE_ID })
    const channel = createApiLiveRoomChannel({ liveId: LIVE_ID, token: 'tkn' })
    const accepted = await channel.sendComment({ text: 'yo', clientId: 'c-9' })
    expect(liveApi.postComment).toHaveBeenCalledWith(LIVE_ID, 'yo', 'tkn', 'c-9')
    expect(accepted).toMatchObject({ id: '9', clientId: 'c-9' })
    channel.disconnect()
  })
})
