import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { apiClient } from '../api/client.js'
import { createChatSocketClient } from '../realtime/chatSocket.js'
import { resolveRealtimeWsToken, SessionExpiredError } from '../realtime/wsAuth.js'
import { computeChatInboxBadgeCount } from '../utils/chatInboxBadge.js'
import { useAuth } from './useAuth.js'

const ChatInboxBadgeContext = createContext(null)

export function ChatInboxBadgeProvider({ children }) {
  const { token, authReady, logout } = useAuth()
  const [badgeCount, setBadgeCount] = useState(0)

  const syncFromConversations = useCallback((conversations) => {
    setBadgeCount(computeChatInboxBadgeCount(conversations))
  }, [])

  const refreshChatInboxBadge = useCallback(async () => {
    if (!token) {
      setBadgeCount(0)
      return
    }
    try {
      const data = await apiClient.getChatConversations(token)
      const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      setBadgeCount(computeChatInboxBadgeCount(rows))
    } catch {
      /* keep last known count */
    }
  }, [token])

  useEffect(() => {
    void refreshChatInboxBadge()
  }, [refreshChatInboxBadge])

  useEffect(() => {
    if (!token) return undefined
    const onFocus = () => {
      void refreshChatInboxBadge()
    }
    window.addEventListener('focus', onFocus)
    return () => window.removeEventListener('focus', onFocus)
  }, [refreshChatInboxBadge, token])

  useEffect(() => {
    if (!authReady || !token) return undefined

    let cancelled = false
    let socket

    async function connect() {
      try {
        const wsToken = await resolveRealtimeWsToken(token)
        if (cancelled || !wsToken) return

        socket = createChatSocketClient(wsToken, () => {
          void refreshChatInboxBadge()
        })
        socket.activate()
      } catch (err) {
        if (err instanceof SessionExpiredError) {
          logout()
        }
      }
    }

    void connect()
    return () => {
      cancelled = true
      socket?.deactivate()
    }
  }, [authReady, logout, refreshChatInboxBadge, token])

  const value = useMemo(
    () => ({
      chatInboxBadgeCount: badgeCount,
      refreshChatInboxBadge,
      syncChatInboxBadgeFromConversations: syncFromConversations,
    }),
    [badgeCount, refreshChatInboxBadge, syncFromConversations],
  )

  return (
    <ChatInboxBadgeContext.Provider value={value}>
      {children}
    </ChatInboxBadgeContext.Provider>
  )
}

const NOOP_CHAT_BADGE = {
  chatInboxBadgeCount: 0,
  refreshChatInboxBadge: async () => {},
  syncChatInboxBadgeFromConversations: () => {},
}

export function useChatInboxBadge() {
  return useContext(ChatInboxBadgeContext) ?? NOOP_CHAT_BADGE
}
