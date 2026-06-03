import { renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useSearchHistory } from './useSearchHistory'

vi.mock('../api/client', () => ({
  apiClient: {
    getSearchHistory: vi.fn(),
    recordSearchHistory: vi.fn(),
    clearSearchHistory: vi.fn(),
  },
}))

import { apiClient } from '../api/client'

describe('useSearchHistory', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.getSearchHistory.mockResolvedValue([
      { id: 1, query: 'dance', createdAt: '2026-01-01T00:00:00' },
    ])
    apiClient.recordSearchHistory.mockResolvedValue({
      id: 2,
      query: 'vibely',
      createdAt: '2026-01-02T00:00:00',
    })
    apiClient.clearSearchHistory.mockResolvedValue(null)
  })

  it('loads history when token is present', async () => {
    const { result } = renderHook(() =>
      useSearchHistory({ token: 'jwt', enabled: true }),
    )

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].query).toBe('dance')
    })
  })

  it('records a new history item', async () => {
    const { result } = renderHook(() =>
      useSearchHistory({ token: 'jwt', enabled: true }),
    )

    await waitFor(() => expect(result.current.items).toHaveLength(1))

    await result.current.record('vibely')

    await waitFor(() => {
      expect(apiClient.recordSearchHistory).toHaveBeenCalledWith('jwt', 'vibely')
      expect(result.current.items[0].query).toBe('vibely')
    })
  })

  it('dedupes same query from backend history', async () => {
    apiClient.getSearchHistory.mockResolvedValue([
      { id: 10, query: 'admin.vibely', createdAt: '2026-01-03T00:00:00' },
      { id: 11, query: 'Admin.Vibely', createdAt: '2026-01-02T00:00:00' },
    ])

    const { result } = renderHook(() =>
      useSearchHistory({ token: 'jwt', enabled: true }),
    )

    await waitFor(() => {
      expect(result.current.items).toHaveLength(1)
      expect(result.current.items[0].query).toBe('admin.vibely')
    })
  })
})
