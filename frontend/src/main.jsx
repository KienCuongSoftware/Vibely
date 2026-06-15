import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './state/AuthContext.jsx'
import { ActivityModalProvider } from './state/ActivityModalContext.jsx'
import { ChatInboxBadgeProvider } from './state/ChatInboxBadgeContext.jsx'
import { NotificationUnreadProvider } from './state/NotificationUnreadContext.jsx'
import { SearchModalProvider } from './state/SearchModalContext.jsx'
import { AppErrorBoundary } from './components/AppErrorBoundary.jsx'
import { syncFollowingFeedFlagOnDocumentLoad } from './utils/followingPageView.js'

syncFollowingFeedFlagOnDocumentLoad()

createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <AuthProvider>
      <SearchModalProvider>
        <ActivityModalProvider>
          <NotificationUnreadProvider>
            <ChatInboxBadgeProvider>
              <AppErrorBoundary>
                <App />
              </AppErrorBoundary>
            </ChatInboxBadgeProvider>
          </NotificationUnreadProvider>
        </ActivityModalProvider>
      </SearchModalProvider>
    </AuthProvider>
  </BrowserRouter>,
)
