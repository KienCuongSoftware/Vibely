import React from 'react'
import { FeedStyleVideoDetailPage } from '@/features/post/components/FeedStyleVideoDetailPage.jsx'
import { buildActivityVideoUrl } from '@/features/post/utils/videoPublicId.js'

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
