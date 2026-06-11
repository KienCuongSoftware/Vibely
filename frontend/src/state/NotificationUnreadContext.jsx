import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { apiClient } from '../api/client.js'
import { createNotificationSocketClient } from '../realtime/notificationSocket.js'
import { useAuth } from './useAuth.js'

const NotificationUnreadContext = createContext(null)

function normalizeUnreadCount(value) {
  const count = Number(value ?? 0)
  return Number.isFinite(count) && count > 0 ? count : 0
}

export function NotificationUnreadProvider({ children }) {
  const { token } = useAuth()
  const [unreadCount, setUnreadCount] = useState(0)
  const listenersRef = useRef(new Set())

  const refreshUnreadCount = useCallback(async () => {
    if (!token) {
      setUnreadCount(0)
      return
    }
    try {
      const data = await apiClient.getNotificationUnreadCount(token)
      setUnreadCount(normalizeUnreadCount(data?.count))
    } catch {
      /* keep last known count */
    }
  }, [token])

  const decrementUnreadCount = useCallback((by = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - by))
  }, [])

  const subscribeRealtime = useCallback((listener) => {
    if (typeof listener !== 'function') return () => {}
    listenersRef.current.add(listener)
    return () => {
      listenersRef.current.delete(listener)
    }
  }, [])

  const emitRealtime = useCallback((event) => {
    for (const listener of listenersRef.current) {
      try {
        listener(event)
      } catch {
        /* listener owns recovery */
      }
    }
  }, [])

  useEffect(() => {
    void refreshUnreadCount()
  }, [refreshUnreadCount])

  useEffect(() => {
    if (!token) return undefined
    const onFocus = () => {
      void refreshUnreadCount()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshUnreadCount, token])

  useEffect(() => {
    if (!token) return undefined

    const socket = createNotificationSocketClient(token, (event) => {
      if (event?.unreadCount != null) {
        setUnreadCount(normalizeUnreadCount(event.unreadCount))
      }
      if (event?.type === 'notification.updated' || event?.type === 'notification.removed') {
        emitRealtime(event)
      }
    })

    socket.activate()
    return () => {
      socket.deactivate()
    }
  }, [emitRealtime, token])

  const value = useMemo(
    () => ({
      unreadCount,
      refreshUnreadCount,
      decrementUnreadCount,
      subscribeRealtime,
    }),
    [decrementUnreadCount, refreshUnreadCount, subscribeRealtime, unreadCount],
  )

  return (
    <NotificationUnreadContext.Provider value={value}>
      {children}
    </NotificationUnreadContext.Provider>
  )
}

const NOOP_UNREAD = {
  unreadCount: 0,
  refreshUnreadCount: async () => {},
  decrementUnreadCount: () => {},
  subscribeRealtime: () => () => {},
}

export function useNotificationUnread() {
  return useContext(NotificationUnreadContext) ?? NOOP_UNREAD
}
