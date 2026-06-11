import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../api/client.js'
import {
  mapNotificationItem,
  mapSystemNotificationItem,
} from '../components/activity/activityApiMappers.js'

export function useActivityNotifications({ token, enabled, filter = 'all' }) {
  const [items, setItems] = useState([])
  const [systemInboxPreview, setSystemInboxPreview] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!token) {
      setItems([])
      setSystemInboxPreview('')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getNotifications(token, { filter })
      const mapped = Array.isArray(data?.items) ? data.items.map(mapNotificationItem) : []
      setItems(mapped)
      setSystemInboxPreview(String(data?.systemInboxPreview ?? '').trim())
    } catch (err) {
      setError(err)
      setItems([])
      setSystemInboxPreview('')
    } finally {
      setLoading(false)
    }
  }, [filter, token])

  useEffect(() => {
    if (!enabled || !token) return undefined
    void refresh()
    return undefined
  }, [enabled, refresh, token])

  return {
    items,
    systemInboxPreview,
    loading,
    error,
    refresh,
  }
}

export function useSystemNotifications({ token, enabled, filter = 'all' }) {
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const refresh = useCallback(async () => {
    if (!token) {
      setItems([])
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await apiClient.getSystemNotifications(token, { filter })
      setItems(Array.isArray(data?.items) ? data.items.map(mapSystemNotificationItem) : [])
    } catch (err) {
      setError(err)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [filter, token])

  useEffect(() => {
    if (!enabled || !token) return undefined
    void refresh()
    return undefined
  }, [enabled, refresh, token])

  return {
    items,
    loading,
    error,
    refresh,
  }
}
