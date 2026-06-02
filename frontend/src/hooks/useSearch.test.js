import { act, renderHook, waitFor } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { useSearch } from './useSearch'

vi.mock('../api/client', () => ({
  apiClient: {
    getSearchSuggest: vi.fn(),
  },
}))

import { apiClient } from '../api/client'

describe('useSearch', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    apiClient.getSearchSuggest.mockResolvedValue({
      trending: [{ keyword: 'dance', searchCount: 10 }],
      users: [],
      hashtags: [],
      videos: [],
    })
  })

  it('fetches suggest after debounced query changes', async () => {
    const { result } = renderHook(() => useSearch({ enabled: true }))

    act(() => {
      result.current.setQuery('dance')
    })

    await waitFor(
      () => {
        expect(apiClient.getSearchSuggest).toHaveBeenCalledWith('dance', {
          token: undefined,
        })
        expect(result.current.suggest.trending[0]?.keyword).toBe('dance')
      },
      { timeout: 1500 },
    )
  })

  it('marks empty when no results for query', async () => {
    apiClient.getSearchSuggest.mockResolvedValue({
      trending: [],
      users: [],
      hashtags: [],
      videos: [],
    })

    const { result } = renderHook(() => useSearch({ enabled: true }))

    act(() => {
      result.current.setQuery('xyznotfound')
    })

    await waitFor(
      () => {
        expect(result.current.isEmpty).toBe(true)
      },
      { timeout: 1500 },
    )
  })
})
