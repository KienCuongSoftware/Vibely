import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { apiClient } from '../api/client'
import {
  emptySuggestPayload,
  normalizeSearchQuery,
  SEARCH_DEBOUNCE_MS,
} from '../components/search/searchUtils'
import { useDebouncedValue } from './useDebouncedValue'

export function useSearch({ enabled = true, token } = {}) {
  const [query, setQuery] = useState('')
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)
  const [suggest, setSuggest] = useState(emptySuggestPayload)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const requestIdRef = useRef(0)

  const normalizedDebounced = useMemo(
    () => normalizeSearchQuery(debouncedQuery),
    [debouncedQuery],
  )

  const refresh = useCallback(async () => {
    if (!enabled) return
    const requestId = ++requestIdRef.current
    setLoading(true)
    setError('')
    try {
      const data = await apiClient.getSearchSuggest(normalizedDebounced, { token })
      if (requestId !== requestIdRef.current) return
      setSuggest({
        trending: Array.isArray(data?.trending) ? data.trending : [],
        users: Array.isArray(data?.users) ? data.users : [],
        hashtags: Array.isArray(data?.hashtags) ? data.hashtags : [],
        videos: Array.isArray(data?.videos) ? data.videos : [],
      })
    } catch (err) {
      if (requestId !== requestIdRef.current) return
      setSuggest(emptySuggestPayload())
      setError(err?.message ?? 'Không tải được gợi ý tìm kiếm.')
    } finally {
      if (requestId === requestIdRef.current) {
        setLoading(false)
      }
    }
  }, [enabled, normalizedDebounced, token])

  useEffect(() => {
    if (!enabled) return undefined
    void refresh()
    return () => {
      requestIdRef.current += 1
    }
  }, [enabled, refresh])

  const isEmpty =
    !loading &&
    !error &&
    normalizedDebounced.length > 0 &&
    suggest.trending.length === 0 &&
    suggest.users.length === 0 &&
    suggest.hashtags.length === 0 &&
    suggest.videos.length === 0

  const showHistory = normalizedDebounced.length === 0

  return {
    query,
    setQuery,
    debouncedQuery: normalizedDebounced,
    suggest,
    loading,
    error,
    isEmpty,
    showHistory,
    refresh,
  }
}
