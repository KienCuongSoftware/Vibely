import React from 'react'
import { HelmetProvider } from 'react-helmet-async'
import { BrowserRouter } from 'react-router-dom'
import { AuthProvider } from '@/store/AuthContext.jsx'
import { ActivityModalProvider } from '@/features/notification/store/ActivityModalContext.jsx'
import { ChatInboxBadgeProvider } from '@/features/chat/store/ChatInboxBadgeContext.jsx'
import { NotificationUnreadProvider } from '@/features/notification/store/NotificationUnreadContext.jsx'
import { SearchModalProvider } from '@/features/search/store/SearchModalContext.jsx'
import { AppErrorBoundary } from '@/shared/components/AppErrorBoundary.jsx'

export function AppProviders({ children }) {
  return (
    <HelmetProvider>
      <BrowserRouter>
        <AuthProvider>
          <SearchModalProvider>
            <ActivityModalProvider>
              <NotificationUnreadProvider>
                <ChatInboxBadgeProvider>
                  <AppErrorBoundary>{children}</AppErrorBoundary>
                </ChatInboxBadgeProvider>
              </NotificationUnreadProvider>
            </ActivityModalProvider>
          </SearchModalProvider>
        </AuthProvider>
      </BrowserRouter>
    </HelmetProvider>
  )
}
