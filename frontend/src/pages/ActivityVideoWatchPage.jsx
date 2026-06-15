import React from 'react'
import { FeedStyleVideoDetailPage } from '../components/watch/FeedStyleVideoDetailPage.jsx'
import { buildActivityVideoUrl } from '../utils/videoPublicId.js'

export function ActivityVideoWatchPage() {
  return (
    <FeedStyleVideoDetailPage
      activeMenu="activity"
      buildDetailVideoUrl={buildActivityVideoUrl}
      relatedLayout="list"
      useActivitySidebar
    />
  )
}
