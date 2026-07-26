import React from 'react'
import { createRoot } from 'react-dom/client'
import '@/index.css'
import App from '@/app/App.jsx'
import { AppProviders } from '@/app/providers/AppProviders.jsx'
import { syncFollowingFeedFlagOnDocumentLoad } from '@/features/feed/utils/followingPageView.js'

syncFollowingFeedFlagOnDocumentLoad()

createRoot(document.getElementById('root')).render(
  <AppProviders>
    <App />
  </AppProviders>,
)
