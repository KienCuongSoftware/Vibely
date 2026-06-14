import { describe, expect, it, vi } from 'vitest'
import { resolveWsUrl } from './wsUrl.js'

describe('resolveWsUrl', () => {
  it('uses same-origin host without JWT in query string', () => {
    vi.stubGlobal('window', { location: { protocol: 'http:', host: 'localhost:5173' } })
    expect(resolveWsUrl('cookie')).toBe('ws://localhost:5173/ws')
    expect(resolveWsUrl('jwt-token')).toBe('ws://localhost:5173/ws')
    vi.unstubAllGlobals()
  })
})
