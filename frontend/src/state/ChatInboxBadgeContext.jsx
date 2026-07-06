import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { apiClient } from '../api/client.js'
import { ChatMessageNotificationToast } from '../components/chat/ChatMessageNotificationToast.jsx'
import { createChatSocketClient } from '../realtime/chatSocket.js'
import { resolveRealtimeWsToken, SessionExpiredError } from '../realtime/wsAuth.js'
import { computeChatInboxBadgeCount } from '../utils/chatInboxBadge.js'
import { useAuth } from './useAuth.js'

const ChatInboxBadgeContext = createContext(null)

function isConversationMuted(conversations, conversationId) {
  const row = conversations.find((conv) => Number(conv.id) === Number(conversationId))
  return Boolean(row?.muted)
}

export function ChatInboxBadgeProvider({ children }) {
  const { token, authReady, logout, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [badgeCount, setBadgeCount] = useState(0)
  const [toastNotification, setToastNotification] = useState(null)
  const conversationsRef = useRef([])
  const activeConversationIdRef = useRef(null)

  const syncFromConversations = useCallback((conversations) => {
    conversationsRef.current = Array.isArray(conversations) ? conversations : []
    setBadgeCount(computeChatInboxBadgeCount(conversationsRef.current))
  }, [])

  const refreshChatInboxBadge = useCallback(async () => {
    if (!token) {
      conversationsRef.current = []
      setBadgeCount(0)
      return
    }
    try {
      const data = await apiClient.getChatConversations(token)
      const rows = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []
      conversationsRef.current = rows
      setBadgeCount(computeChatInboxBadgeCount(rows))
    } catch {
      /* keep last known count */
    }
  }, [token])

  const setActiveChatConversationId = useCallback((conversationId) => {
    activeConversationIdRef.current =
      conversationId == null || conversationId === ''
        ? null
        : Number(conversationId)
  }, [])

  const dismissToast = useCallback(() => {
    setToastNotification(null)
  }, [])

  const openToastConversation = useCallback(
    (notification) => {
      const conversationId = Number(notification?.payload?.conversationId)
      if (!Number.isFinite(conversationId)) return
      dismissToast()
      navigate(`/messages?c=${conversationId}`)
    },
    [dismissToast, navigate],
  )

  const handleRealtimeEvent = useCallback(
    (event) => {
      if (event?.type !== 'message.created') {
        void refreshChatInboxBadge()
        return
      }

      const incoming = event.payload
      const conversationId = Number(incoming?.conversationId)
      if (!Number.isFinite(conversationId)) {
        void refreshChatInboxBadge()
        return
      }

      const isMine = Number(incoming?.senderId) === Number(user?.id)
      const muted = isConversationMuted(conversationsRef.current, conversationId)
      const onMessagesRoute = location.pathname === '/messages'
      const viewingConversation =
        onMessagesRoute &&
        Number(activeConversationIdRef.current) === conversationId

      if (!isMine && !muted && !viewingConversation) {
        setToastNotification(event)
      }

      void refreshChatInboxBadge()
    },
    [location.pathname, refreshChatInboxBadge, user?.id],
  )

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

        socket = createChatSocketClient(wsToken, handleRealtimeEvent)
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
  }, [authReady, handleRealtimeEvent, logout, token])

  const value = useMemo(
    () => ({
      chatInboxBadgeCount: badgeCount,
      refreshChatInboxBadge,
      syncChatInboxBadgeFromConversations: syncFromConversations,
      setActiveChatConversationId,
    }),
    [badgeCount, refreshChatInboxBadge, setActiveChatConversationId, syncFromConversations],
  )

  return (
    <ChatInboxBadgeContext.Provider value={value}>
      {children}
      <ChatMessageNotificationToast
        notification={toastNotification}
        token={token}
        onDismiss={dismissToast}
        onOpen={openToastConversation}
      />
    </ChatInboxBadgeContext.Provider>
  )
}

const NOOP_CHAT_BADGE = {
  chatInboxBadgeCount: 0,
  refreshChatInboxBadge: async () => {},
  syncChatInboxBadgeFromConversations: () => {},
  setActiveChatConversationId: () => {},
}

export function useChatInboxBadge() {
  return useContext(ChatInboxBadgeContext) ?? NOOP_CHAT_BADGE
}
