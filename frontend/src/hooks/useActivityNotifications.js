import { useCallback, useEffect, useState } from 'react'
import { apiClient } from '../api/client.js'
import {
  mapNotificationItem,
  mapSystemNotificationItem,
} from '../components/activity/activityApiMappers.js'
import { useNotificationUnread } from '../state/NotificationUnreadContext.jsx'

function matchesActivityFilter(item, filter) {
  if (!filter || filter === 'all') return true
  return item.filter === filter
}

function mergeRealtimeNotification(prev, incoming) {
  const next = prev.filter((item) => item.id !== incoming.id)
  return [incoming, ...next]
}

export function useActivityNotifications({ token, enabled, filter = 'all' }) {
  const { subscribeRealtime } = useNotificationUnread()
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

  useEffect(() => {
    if (!token) return undefined
    return subscribeRealtime((event) => {
      if (event?.type === 'notification.updated' && event.payload) {
        const incoming = mapNotificationItem(event.payload)
        if (!matchesActivityFilter(incoming, filter)) return
        setItems((prev) => mergeRealtimeNotification(prev, incoming))
        return
      }
      if (event?.type === 'notification.removed' && event.payload?.id != null) {
        const removedId = String(event.payload.id)
        setItems((prev) => prev.filter((item) => item.id !== removedId))
      }
    })
  }, [filter, subscribeRealtime, token])

  const markItemRead = useCallback((notificationId) => {
    const id = String(notificationId ?? '')
    if (!id) return
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, read: true } : item)),
    )
  }, [])

  return {
    items,
    systemInboxPreview,
    loading,
    error,
    refresh,
    markItemRead,
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
