import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../api/client'
import { normalizeSearchQuery } from '../components/search/searchUtils'

function dedupeHistoryItems(rows) {
  const seen = new Set()
  const out = []
  for (const row of rows) {
    const key = String(row?.query ?? '').trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    out.push(row)
  }
  return out
}

export function useSearchHistory({ token, enabled = true, limit = 30 } = {}) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [removingId, setRemovingId] = useState(null)

  const refresh = useCallback(async () => {
    if (!enabled || !token) {
      setItems([])
      setLoading(false)
      setError('')
      return
    }
    setLoading(true)
    setError('')
    try {
      const rows = await apiClient.getSearchHistory(token, { limit })
      setItems(dedupeHistoryItems(Array.isArray(rows) ? rows : []))
    } catch (err) {
      setItems([])
      setError(err?.message ?? 'Không tải được lịch sử tìm kiếm.')
    } finally {
      setLoading(false)
    }
  }, [enabled, limit, token])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const record = useCallback(
    async (rawQuery) => {
      const query = normalizeSearchQuery(rawQuery)
      if (!token || !query) return null
      try {
        const saved = await apiClient.recordSearchHistory(token, query)
        setItems((prev) => {
          const withoutDup = prev.filter(
            (row) => String(row?.query ?? '').toLowerCase() !== query.toLowerCase(),
          )
          return saved ? [saved, ...withoutDup] : withoutDup
        })
        return saved
      } catch {
        return null
      }
    },
    [token],
  )

  const remove = useCallback(
    async (item) => {
      const id = item?.id
      if (!token || id == null) return
      setRemovingId(id)
      let rollback = null
      setItems((prev) => {
        rollback = prev
        return prev.filter((row) => row.id !== id)
      })
      setError('')
      try {
        await apiClient.deleteSearchHistoryItem(token, id)
      } catch (err) {
        if (rollback) setItems(rollback)
        setError(err?.message ?? 'Không xóa được mục lịch sử.')
      } finally {
        setRemovingId(null)
      }
    },
    [token],
  )

  return {
    items,
    loading,
    error,
    removingId,
    refresh,
    record,
    remove,
    canUseHistory: Boolean(token),
  }
}
